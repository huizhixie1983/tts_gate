import http from "node:http";
import https from "node:https";
import Busboy from "busboy";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const API_BASE = "https://studio.mosi.cn";
const PORT = Number(process.env.MOSI_PROXY_PORT || 8787);
const ADMIN_STATE_FILE = join(process.cwd(), "data", "admin-state.json");
const VOICE_SOURCE_OVERRIDES_FILE = join(process.cwd(), "data", "voice-source-overrides.json");

loadEnvFile(join(process.cwd(), ".env.local"));

const MOSI_API_KEY = process.env.MOSI_API_KEY || process.env.MOSS_API_KEY || process.env.MOSI_TTS_API_KEY;
const CURATED_PUBLIC_VOICES = loadCuratedPublicVoices();

const DEFAULT_ADMIN_STATE = {
  teamMembers: [
    { name: "Admin", email: "admin@example.com", role: "Owner", status: "Active" },
    { name: "Developer", email: "dev@example.com", role: "Developer", status: "Active" },
    { name: "Creator", email: "creator@example.com", role: "Creator", status: "Pending" }
  ],
  apiKeys: [
    {
      id: "key_prod",
      name: "prod-key",
      scopes: ["tts:write", "voices:read", "usage:read"],
      createdAt: "2026-05-12",
      lastUsedAt: "10:42",
      status: "Active"
    }
  ],
  pricingPlans: [
    {
      id: "starter",
      name: "Starter",
      price: "$0",
      quota: "100k chars",
      modelAccess: "Auralith One",
      teamSeats: "1 team seat",
      ctaLabel: "Choose plan",
      features: ["Usage analytics", "Community support", "Basic rate limits"],
      status: "Published"
    },
    {
      id: "growth",
      name: "Growth",
      price: "$49",
      quota: "2M chars",
      modelAccess: "Auralith One + Auralith Ultra",
      teamSeats: "5 team seats",
      ctaLabel: "Choose plan",
      highlighted: true,
      features: ["Usage analytics", "Priority support", "Higher concurrency"],
      status: "Published"
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      quota: "Dedicated quota",
      modelAccess: "SLA + audit",
      teamSeats: "Private voices",
      ctaLabel: "Contact sales",
      features: ["Dedicated capacity", "Advanced security review", "Custom onboarding"],
      status: "Published"
    }
  ],
  pricingDrafts: [
    {
      id: "starter",
      name: "Starter",
      price: "$0",
      quota: "100k chars",
      modelAccess: "Auralith One",
      teamSeats: "1 team seat",
      ctaLabel: "Choose plan",
      features: ["Usage analytics", "Community support", "Basic rate limits"],
      status: "Published"
    },
    {
      id: "growth",
      name: "Growth",
      price: "$49",
      quota: "2M chars",
      modelAccess: "Auralith One + Auralith Ultra",
      teamSeats: "5 team seats",
      ctaLabel: "Choose plan",
      highlighted: true,
      features: ["Usage analytics", "Priority support", "Higher concurrency"],
      status: "Published"
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      quota: "Dedicated quota",
      modelAccess: "SLA + audit",
      teamSeats: "Private voices",
      ctaLabel: "Contact sales",
      features: ["Dedicated capacity", "Advanced security review", "Custom onboarding"],
      status: "Published"
    }
  ],
  usagePolicy: {
    monthlyQuota: 2000000,
    concurrencyLimit: 24,
    alertThreshold: 80,
    overageAction: "Throttle"
  },
  auditEvents: [
    {
      id: "audit_1003",
      time: "10:46",
      actor: "Admin",
      action: "Updated pricing plan",
      resource: "Growth",
      severity: "info"
    },
    {
      id: "audit_1002",
      time: "10:41",
      actor: "Admin",
      action: "Disabled API key",
      resource: "staging-key",
      severity: "warn"
    },
    {
      id: "audit_1001",
      time: "10:34",
      actor: "Risk engine",
      action: "Flagged cloned voice consent",
      resource: "voice_7f2a",
      severity: "critical"
    }
  ],
  voiceGovernance: {}
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function sendJsonWithHeaders(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, extra = {}) {
  sendJson(res, status, { error: message, ...extra });
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return Object.fromEntries(
    raw
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function getSessionRole(req) {
  const cookies = parseCookies(req);
  const role = cookies.voxai_role;
  return role === "Admin" || role === "Developer" || role === "Creator" ? role : null;
}

function requireAdmin(req) {
  const role = getSessionRole(req);
  if (role !== "Admin") {
    throw { status: 403, data: { error: "Admin role required" } };
  }
  return role;
}

function inferLanguage(sample = "") {
  if (/[\u3040-\u30ff]/u.test(sample)) return "Japanese";
  if (/[\u4e00-\u9fff]/u.test(sample)) return "Chinese";
  if (sample.trim()) return "English";
  return "Multilingual";
}

function inferSource(voiceName = "", sourceType = "") {
  if (voiceName.startsWith("Studio-GENERATED|")) return "designed";
  if (voiceName.startsWith("Studio-UPLOADED|")) return "cloned";
  if (sourceType === "VOICE_CLONE") return "cloned";
  if (sourceType === "CUSTOM_VOICE" || sourceType === "VOICE_GENERATED") return "designed";
  return "system";
}

function mapVoice(rawVoice) {
  const originalName = rawVoice.voice_name || rawVoice.voice_id;
  const source = inferSource(rawVoice.voice_name || "", rawVoice.source_type || "");
  const sampleText = rawVoice.transcription_text || "Preview this voice in the Auralith Playground.";
  const displayName = originalName.replace(/^Studio-(?:GENERATED|UPLOADED)\|/u, "").trim();
  return {
    id: rawVoice.voice_id,
    name: displayName || rawVoice.voice_id,
    language: inferLanguage(sampleText),
    gender: "Unknown",
    style: source === "cloned" ? "Cloned" : source === "designed" ? "Designed" : "Studio",
    scenario: source === "cloned" ? "Private Voice" : source === "designed" ? "Prompt Designed" : "General",
    source,
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: rawVoice.status || "UNKNOWN",
    previewText: sampleText,
    createdAt: rawVoice.created_at || null,
    ownedByUser: /^Studio-(?:GENERATED|UPLOADED)\|/u.test(originalName)
  };
}

function loadCuratedPublicVoices() {
  const filePath = join(process.cwd(), "id.txt");
  if (!existsSync(filePath)) return [];
  const text = readFileSync(filePath, "utf8");
  const result = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("VOICE ID")) continue;
    const parts = trimmed.split(",").map((part) => part.trim());
    const voiceId = parts[0];
    if (!/^\d{16,}$/.test(voiceId) || parts.length < 4) continue;
    const name = parts[1];
    const description = parts[2];
    const tag = parts.slice(3).join(",").trim();
    result.push({
      id: voiceId,
      name,
      language: "Chinese",
      gender: name.includes("男") ? "Male" : name.includes("女") ? "Female" : "Unknown",
      style: tag,
      scenario: "Public Voice",
      source: "system",
      availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
      favorite: false,
      status: "PUBLIC",
      previewText: description,
      createdAt: null
    });
  }
  return result;
}

function readAdminState() {
  try {
    if (!existsSync(ADMIN_STATE_FILE)) return cloneJson(DEFAULT_ADMIN_STATE);
    const raw = JSON.parse(readFileSync(ADMIN_STATE_FILE, "utf8"));
    return {
      ...cloneJson(DEFAULT_ADMIN_STATE),
      ...raw,
      usagePolicy: { ...DEFAULT_ADMIN_STATE.usagePolicy, ...(raw.usagePolicy || {}) },
      voiceGovernance: { ...DEFAULT_ADMIN_STATE.voiceGovernance, ...(raw.voiceGovernance || {}) }
    };
  } catch {
    return cloneJson(DEFAULT_ADMIN_STATE);
  }
}

function writeAdminState(state) {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(ADMIN_STATE_FILE, JSON.stringify(state, null, 2));
}

function readVoiceSourceOverrides() {
  try {
    if (!existsSync(VOICE_SOURCE_OVERRIDES_FILE)) return {};
    return JSON.parse(readFileSync(VOICE_SOURCE_OVERRIDES_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeVoiceSourceOverrides(overrides) {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(VOICE_SOURCE_OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
}

function updateVoiceSourceOverride(voiceId, override) {
  const current = readVoiceSourceOverrides();
  current[voiceId] = { ...(current[voiceId] || {}), ...override };
  writeVoiceSourceOverrides(current);
  return current[voiceId];
}

function applyVoiceOverride(mappedVoice, override) {
  if (!override) return mappedVoice;
  const source = override.source || mappedVoice.source;
  return {
    ...mappedVoice,
    name: override.name || mappedVoice.name,
    source,
    ownedByUser: override.ownedByUser ?? mappedVoice.ownedByUser,
    style: source === "cloned" ? "Cloned" : source === "designed" ? "Designed" : mappedVoice.style,
    scenario: source === "cloned" ? "Private Voice" : source === "designed" ? "Prompt Designed" : mappedVoice.scenario
  };
}

function updateAdminState(mutator) {
  const current = readAdminState();
  const next = mutator(current);
  writeAdminState(next);
  return next;
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    let upload = null;

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (name, file, info) => {
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => {
        upload = {
          fieldName: name,
          filename: info.filename || "upload.wav",
          mimeType: info.mimeType || "application/octet-stream",
          buffer: Buffer.concat(chunks)
        };
      });
    });

    busboy.on("error", reject);
    busboy.on("close", () => resolve({ fields, file: upload }));
    req.pipe(busboy);
  });
}

async function mosiFetch(path, init = {}) {
  if (!MOSI_API_KEY) {
    throw { status: 500, data: { error: "MOSI_API_KEY is not configured in .env.local" } };
  }

  const headers = {
    ...(init.headers || {}),
    Authorization: `Bearer ${MOSI_API_KEY}`
  };
  const body = init.body ?? null;

  return new Promise((resolve, reject) => {
    const request = https.request(`${API_BASE}${path}`, {
      method: init.method || "GET",
      headers
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let data = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { raw: text };
          }
        }

        if ((response.statusCode || 500) >= 400) {
          reject({ status: response.statusCode || 500, data });
          return;
        }

        resolve(data);
      });
    });

    request.on("error", (error) => reject({ status: 500, data: { error: error.message || "Request failed" } }));

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

async function uploadBuffer(filename, buffer, mimeType = "audio/wav") {
  const boundary = `----voxai-${randomUUID()}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, buffer, tail]);
  return mosiFetch("/api/v1/files/upload", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length)
    },
    body
  });
}

async function listRawVoices(limit = 50, includeStatus) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (includeStatus) params.set("status", includeStatus);
  const query = params.toString();
  return mosiFetch(`/api/v1/voices${query ? `?${query}` : ""}`);
}

async function findVoiceById(voiceId) {
  const payload = await listRawVoices(200);
  return (payload.voices || []).find((voice) => voice.voice_id === voiceId) || null;
}

async function waitForActiveVoice(voiceId, timeoutMs = 40000, intervalMs = 2500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payload = await listRawVoices(100);
    const match = (payload.voices || []).find((voice) => voice.voice_id === voiceId);
    if (match && match.status === "ACTIVE") return match;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

async function handleCloneUpload(fileBuffer, filename, mimeType, voiceName) {
  const upload = await uploadBuffer(filename, fileBuffer, mimeType);
  const clone = await mosiFetch("/api/v1/voice/clone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: upload.file_id, name: voiceName })
  });

  const activeVoice = await waitForActiveVoice(clone.voice_id);

  return {
    requestId: randomUUID(),
    file: upload,
    clone,
    voice: activeVoice ? mapVoice(activeVoice) : null
  };
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return sendError(res, 404, "Missing URL");

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, configured: Boolean(MOSI_API_KEY) });
    }

    if (req.method === "GET" && url.pathname === "/api/session") {
      return sendJson(res, 200, { role: getSessionRole(req) });
    }

    if (req.method === "POST" && url.pathname === "/api/session/login") {
      const body = await parseJsonBody(req);
      if (!["Admin", "Developer", "Creator"].includes(body.role)) return sendError(res, 400, "Valid role is required");
      return sendJsonWithHeaders(res, 200, { ok: true, role: body.role }, {
        "Set-Cookie": `voxai_role=${encodeURIComponent(body.role)}; Path=/; HttpOnly; SameSite=Lax`
      });
    }

    if (req.method === "POST" && url.pathname === "/api/session/logout") {
      return sendJsonWithHeaders(res, 200, { ok: true }, {
        "Set-Cookie": "voxai_role=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
      });
    }

    if (req.method === "GET" && url.pathname === "/api/public/pricing") {
      return sendJson(res, 200, { plans: readAdminState().pricingPlans });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/state") {
      requireAdmin(req);
      return sendJson(res, 200, readAdminState());
    }

    if (req.method === "POST" && url.pathname === "/api/admin/state") {
      requireAdmin(req);
      const body = await parseJsonBody(req);
      const nextState = {
        ...cloneJson(DEFAULT_ADMIN_STATE),
        ...body,
        usagePolicy: { ...DEFAULT_ADMIN_STATE.usagePolicy, ...(body.usagePolicy || {}) },
        voiceGovernance: { ...DEFAULT_ADMIN_STATE.voiceGovernance, ...(body.voiceGovernance || {}) }
      };
      writeAdminState(nextState);
      return sendJson(res, 200, { ok: true, updatedAt: new Date().toISOString() });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/api-keys") {
      requireAdmin(req);
      return sendJson(res, 200, { apiKeys: readAdminState().apiKeys });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/api-keys") {
      requireAdmin(req);
      const body = await parseJsonBody(req);
      const next = updateAdminState((state) => ({ ...state, apiKeys: body.apiKeys || state.apiKeys }));
      return sendJson(res, 200, { apiKeys: next.apiKeys });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/pricing/plans") {
      requireAdmin(req);
      return sendJson(res, 200, { pricingPlans: readAdminState().pricingPlans });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/pricing/drafts") {
      requireAdmin(req);
      return sendJson(res, 200, { pricingDrafts: readAdminState().pricingDrafts });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/pricing/drafts") {
      requireAdmin(req);
      const body = await parseJsonBody(req);
      const next = updateAdminState((state) => ({ ...state, pricingDrafts: body.pricingDrafts || state.pricingDrafts }));
      return sendJson(res, 200, { pricingDrafts: next.pricingDrafts });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/pricing/publish") {
      requireAdmin(req);
      const next = updateAdminState((state) => {
        const published = (state.pricingDrafts || []).map((plan) => ({ ...plan, status: "Published" }));
        return { ...state, pricingPlans: published, pricingDrafts: published };
      });
      return sendJson(res, 200, { pricingPlans: next.pricingPlans, pricingDrafts: next.pricingDrafts });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/usage-policy") {
      requireAdmin(req);
      return sendJson(res, 200, { usagePolicy: readAdminState().usagePolicy });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/usage-policy") {
      requireAdmin(req);
      const body = await parseJsonBody(req);
      const next = updateAdminState((state) => ({ ...state, usagePolicy: { ...state.usagePolicy, ...(body.usagePolicy || {}) } }));
      return sendJson(res, 200, { usagePolicy: next.usagePolicy });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/audit-events") {
      requireAdmin(req);
      const severity = url.searchParams.get("severity");
      const events = readAdminState().auditEvents.filter((event) => !severity || event.severity === severity);
      return sendJson(res, 200, { auditEvents: events });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/audit-events") {
      requireAdmin(req);
      const body = await parseJsonBody(req);
      const next = updateAdminState((state) => ({ ...state, auditEvents: body.auditEvents || state.auditEvents }));
      return sendJson(res, 200, { auditEvents: next.auditEvents });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/voice-governance") {
      requireAdmin(req);
      return sendJson(res, 200, { voiceGovernance: readAdminState().voiceGovernance });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/voice-governance") {
      requireAdmin(req);
      const body = await parseJsonBody(req);
      const next = updateAdminState((state) => ({ ...state, voiceGovernance: body.voiceGovernance || state.voiceGovernance }));
      return sendJson(res, 200, { voiceGovernance: next.voiceGovernance });
    }

    if (req.method === "GET" && url.pathname === "/api/mosi/voices") {
      const limit = Number(url.searchParams.get("limit") || 50);
      const status = url.searchParams.get("status") || "ACTIVE";
      const payload = await listRawVoices(limit, status);
      const overrides = readVoiceSourceOverrides();
      const liveVoices = (payload.voices || []).map((voice) => applyVoiceOverride(mapVoice(voice), overrides[voice.voice_id]));
      const merged = mergeCuratedVoices(liveVoices, CURATED_PUBLIC_VOICES);
      return sendJson(res, 200, {
        count: merged.length,
        voices: merged,
        raw: payload.voices || []
      });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/mosi/voices/")) {
      const voiceId = decodeURIComponent(url.pathname.replace("/api/mosi/voices/", ""));
      const liveVoice = await findVoiceById(voiceId);
      const curatedVoice = CURATED_PUBLIC_VOICES.find((voice) => voice.id === voiceId) || null;
      const override = readVoiceSourceOverrides()[voiceId];
      return sendJson(res, 200, {
        voice: liveVoice ? applyVoiceOverride(mapVoice(liveVoice), override) : curatedVoice ? applyVoiceOverride(curatedVoice, override) : null,
        exists: Boolean(liveVoice || curatedVoice),
        source: liveVoice ? "live" : curatedVoice ? "curated" : "missing"
      });
    }

    if (req.method === "POST" && url.pathname.endsWith("/source") && url.pathname.startsWith("/api/mosi/voices/")) {
      const voiceId = decodeURIComponent(url.pathname.replace("/api/mosi/voices/", "").replace(/\/source$/, ""));
      const body = await parseJsonBody(req);
      if (!["cloned", "designed"].includes(body.source)) return sendError(res, 400, "Valid source is required");
      const liveVoice = await findVoiceById(voiceId);
      const curatedVoice = CURATED_PUBLIC_VOICES.find((voice) => voice.id === voiceId) || null;
      const currentVoice = liveVoice ? mapVoice(liveVoice) : curatedVoice;
      if (!currentVoice) return sendError(res, 404, "Voice not found");
      const override = updateVoiceSourceOverride(voiceId, { source: body.source, name: currentVoice.name });
      return sendJson(res, 200, { voice: applyVoiceOverride(currentVoice, override) });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/mosi/voices/")) {
      const voiceId = decodeURIComponent(url.pathname.replace("/api/mosi/voices/", ""));
      const payload = await mosiFetch(`/api/v1/voices/${voiceId}`, {
        method: "DELETE"
      });
      const refreshed = await findVoiceById(voiceId);
      const override = readVoiceSourceOverrides()[voiceId];
      return sendJson(res, 200, {
        requestId: randomUUID(),
        deleted: payload.message || "voice deleted successfully",
        stillExists: Boolean(refreshed),
        voice: refreshed ? applyVoiceOverride(mapVoice(refreshed), override) : null
      });
    }

    if (req.method === "POST" && url.pathname === "/api/mosi/tts") {
      const body = await parseJsonBody(req);
      if (!body.text || !body.voiceId) return sendError(res, 400, "text and voiceId are required");
      const startedAt = Date.now();
      const payload = await mosiFetch("/v1/audio/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "moss-tts",
          text: body.text,
          voice_id: body.voiceId,
          sampling_params: body.samplingParams || { temperature: 1.5, top_p: 0.8, top_k: 25 }
        })
      });
      return sendJson(res, 200, {
        requestId: randomUUID(),
        providerModel: "moss-tts",
        durationSeconds: payload.duration_s || null,
        audioBase64: payload.audio_data,
        audioMimeType: "audio/wav",
        latencyMs: Date.now() - startedAt,
        usage: payload.usage || {}
      });
    }

    if (req.method === "POST" && url.pathname === "/api/mosi/design-preview") {
      const body = await parseJsonBody(req);
      if (!body.text || !body.instruction) return sendError(res, 400, "text and instruction are required");
      const startedAt = Date.now();
      const payload = await mosiFetch("/api/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "moss-voice-generator",
          text: body.text,
          instruction: body.instruction,
          sampling_params: body.samplingParams || { temperature: 1.5, top_p: 0.6, top_k: 50 }
        })
      });
      return sendJson(res, 200, {
        requestId: randomUUID(),
        providerModel: "moss-voice-generator",
        audioBase64: payload.audio_data,
        audioMimeType: "audio/wav",
        latencyMs: Date.now() - startedAt,
        usage: payload.usage || {}
      });
    }

    if (req.method === "POST" && url.pathname === "/api/mosi/clone") {
      const { fields, file } = await parseMultipart(req);
      if (!file?.buffer?.length) return sendError(res, 400, "file is required");
      const name = fields.name || "Uploaded Voice";
      const result = await handleCloneUpload(file.buffer, file.filename, file.mimeType, name);
      updateVoiceSourceOverride(result.clone.voice_id, { source: "cloned", name, ownedByUser: true });
      if (result.voice) result.voice = applyVoiceOverride(result.voice, { source: "cloned", name, ownedByUser: true });
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/api/mosi/design-save") {
      const body = await parseJsonBody(req);
      if (!body.audioBase64 || !body.name) return sendError(res, 400, "audioBase64 and name are required");
      const buffer = Buffer.from(body.audioBase64, "base64");
      const providerVoiceName = `Studio-GENERATED|${body.name}`;
      const result = await handleCloneUpload(buffer, `${body.name.replace(/\s+/g, "_").toLowerCase()}.wav`, "audio/wav", providerVoiceName);
      updateVoiceSourceOverride(result.clone.voice_id, { source: "designed", name: body.name, ownedByUser: true });
      if (result.voice) result.voice = applyVoiceOverride(result.voice, { source: "designed", name: body.name, ownedByUser: true });
      return sendJson(res, 200, result);
    }

    return sendError(res, 404, "Not found");
  } catch (error) {
    const status = error?.status || 500;
    const payload = error?.data || { error: error?.message || "Unknown error" };
    return sendJson(res, status, payload);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`MOSI proxy listening on http://127.0.0.1:${PORT}`);
});

function mergeCuratedVoices(liveVoices, curatedVoices) {
  const map = new Map(liveVoices.map((voice) => [voice.id, voice]));
  for (const voice of curatedVoices) {
    map.set(voice.id, { ...map.get(voice.id), ...voice });
  }
  return Array.from(map.values());
}
