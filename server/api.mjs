import http from "node:http";
import Busboy from "busboy";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const API_BASE = "https://studio.mosi.cn";
const PORT = Number(process.env.MOSI_PROXY_PORT || 8787);

loadEnvFile(join(process.cwd(), ".env.local"));

const MOSI_API_KEY = process.env.MOSI_API_KEY || process.env.MOSS_API_KEY || process.env.MOSI_TTS_API_KEY;
const CURATED_PUBLIC_VOICES = loadCuratedPublicVoices();

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

function sendError(res, status, message, extra = {}) {
  sendJson(res, status, { error: message, ...extra });
}

function inferLanguage(sample = "") {
  if (/[\u3040-\u30ff]/u.test(sample)) return "Japanese";
  if (/[\u4e00-\u9fff]/u.test(sample)) return "Chinese";
  if (sample.trim()) return "English";
  return "Multilingual";
}

function inferSource(voiceName = "", sourceType = "") {
  if (sourceType === "VOICE_CLONE") return "cloned";
  if (sourceType === "CUSTOM_VOICE" || sourceType === "VOICE_GENERATED") return "designed";
  if (voiceName.startsWith("Studio-UPLOADED")) return "cloned";
  if (voiceName.startsWith("Studio-GENERATED")) return "designed";
  return "system";
}

function mapVoice(rawVoice) {
  const source = inferSource(rawVoice.voice_name || "", rawVoice.source_type || "");
  const sampleText = rawVoice.transcription_text || "Preview this voice in the VoxAI Playground.";
  return {
    id: rawVoice.voice_id,
    name: rawVoice.voice_name || rawVoice.voice_id,
    language: inferLanguage(sampleText),
    gender: "Unknown",
    style: source === "cloned" ? "Cloned" : source === "designed" ? "Designed" : "Studio",
    scenario: source === "cloned" ? "Private Voice" : source === "designed" ? "Prompt Designed" : "General",
    source,
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: rawVoice.status || "UNKNOWN",
    previewText: sampleText,
    createdAt: rawVoice.created_at || null
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
      availableModels: ["vox-lite-v1", "vox-prime-v1"],
      favorite: false,
      status: "PUBLIC",
      previewText: description,
      createdAt: null
    });
  }
  return result;
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

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${MOSI_API_KEY}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    throw { status: response.status, data };
  }

  return data;
}

async function uploadBuffer(filename, buffer, mimeType = "audio/wav") {
  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: mimeType }), filename);
  return mosiFetch("/api/v1/files/upload", {
    method: "POST",
    body: formData
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

    if (req.method === "GET" && url.pathname === "/api/mosi/voices") {
      const limit = Number(url.searchParams.get("limit") || 50);
      const status = url.searchParams.get("status") || "ACTIVE";
      const payload = await listRawVoices(limit, status);
      const liveVoices = (payload.voices || []).map(mapVoice);
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
      return sendJson(res, 200, {
        voice: liveVoice ? mapVoice(liveVoice) : curatedVoice,
        exists: Boolean(liveVoice || curatedVoice),
        source: liveVoice ? "live" : curatedVoice ? "curated" : "missing"
      });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/mosi/voices/")) {
      const voiceId = decodeURIComponent(url.pathname.replace("/api/mosi/voices/", ""));
      const payload = await mosiFetch(`/api/v1/voices/${voiceId}`, {
        method: "DELETE"
      });
      const refreshed = await findVoiceById(voiceId);
      return sendJson(res, 200, {
        requestId: randomUUID(),
        deleted: payload.message || "voice deleted successfully",
        stillExists: Boolean(refreshed),
        voice: refreshed ? mapVoice(refreshed) : null
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
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/api/mosi/design-save") {
      const body = await parseJsonBody(req);
      if (!body.audioBase64 || !body.name) return sendError(res, 400, "audioBase64 and name are required");
      const buffer = Buffer.from(body.audioBase64, "base64");
      const result = await handleCloneUpload(buffer, `${body.name.replace(/\s+/g, "_").toLowerCase()}.wav`, "audio/wav", body.name);
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
