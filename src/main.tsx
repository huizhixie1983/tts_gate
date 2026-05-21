import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  apiKeys as seedApiKeys,
  apiLogs as seedApiLogs,
  auditEvents as seedAuditEvents,
  initialGenerations,
  models,
  pricingPlans as seedPricingPlans,
  teamMembers as seedTeamMembers,
  usagePolicy as seedUsagePolicy,
  usageSnapshots as seedUsageSnapshots,
  voiceGovernance as seedVoiceGovernance,
  voices as seedVoices
} from "./mockData";
import { cloneVoice, deleteVoice, fetchAdminState, fetchLiveVoices, fetchPublicPricingPlans, fetchVoiceStatus, loginSession, logoutSession, previewDesignedVoice, publishPricingDrafts, saveAdminState, saveDesignedVoice, synthesizeSpeech, toDataUrl, updateVoiceSource } from "./api";
import { pickPlaygroundVoices } from "./curatedVoices";
import type {
  AdminState,
  ApiKey,
  ApiLog,
  AuditEvent,
  Generation,
  ModelId,
  PricingPlan,
  Role,
  Route,
  TeamMember,
  UsagePolicy,
  UsageSnapshot,
  Voice,
  VoiceGovernance
} from "./types";
import { copyToClipboard, makeRequestId } from "./utils";
import "../styles.css";

const routes: Route[] = ["home", "models", "voices", "playground", "clone", "design", "docs", "usage", "logs", "pricing", "safety", "team"];
const VOICE_OVERRIDE_STORAGE_KEY = "auralith-voice-overrides";
const VOICE_AVATAR_TONES = ["emerald", "ocean", "sunset", "rose", "violet", "slate"] as const;

const roleConfig: Record<Role, { defaultRoute: Route; routes: Route[]; summary: string; focus: string[] }> = {
  Admin: {
    defaultRoute: "team",
    routes: ["usage", "logs", "pricing", "safety", "team"],
    summary: "Manage platform usage, investigate operations, review voice safety, and administer team access.",
    focus: ["Team", "Usage", "Logs", "Pricing", "Safety"]
  },
  Developer: {
    defaultRoute: "docs",
    routes: ["home", "models", "voices", "playground", "docs", "usage", "logs", "pricing"],
    summary: "Integrate TTS API, inspect your own logs, and design or debug voice experiences.",
    focus: ["Docs", "Playground", "Models", "Voices", "Logs", "Usage", "Pricing"]
  },
  Creator: {
    defaultRoute: "playground",
    routes: ["home", "models", "voices", "playground", "pricing"],
    summary: "Create speech, choose voices, clone voices and design new voice styles.",
    focus: ["Playground", "Voices", "Models", "Pricing"]
  }
};

function getRoute(): Route {
  const hash = window.location.hash.replace("#", "") as Route;
  return routes.includes(hash) ? hash : "home";
}

function mergeVoices(incoming: Voice[], existing: Voice[]) {
  const map = new Map(existing.map((voice) => [voice.id, voice]));
  for (const voice of incoming) {
    map.set(voice.id, { ...map.get(voice.id), ...voice });
  }
  return Array.from(map.values()).sort((left, right) => (right.createdAt || "").localeCompare(left.createdAt || ""));
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "0:00";
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function parsePlanQuota(quota: string) {
  const lower = quota.toLowerCase();
  const amount = Number.parseFloat(lower.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(amount)) return 0;
  if (lower.includes("m")) return Math.round(amount * 1_000_000);
  if (lower.includes("k")) return Math.round(amount * 1_000);
  return Math.round(amount);
}

function getPricingValidationErrors(plan: PricingPlan) {
  const errors: string[] = [];
  if (!plan.name.trim()) errors.push("Plan name is required.");
  if (!plan.price.trim()) errors.push("Price is required.");
  if (!plan.quota.trim()) errors.push("Quota is required.");
  if (!plan.ctaLabel.trim()) errors.push("CTA label is required.");
  if (!plan.modelAccess.trim()) errors.push("Model access is required.");
  if (!plan.teamSeats.trim()) errors.push("Team seat policy is required.");
  if (plan.features.length === 0) errors.push("At least one plan feature is required.");
  return errors;
}

function moveItem<T>(items: T[], fromIndex: number, direction: -1 | 1) {
  const nextIndex = fromIndex + direction;
  if (fromIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}

function makeDefaultGovernance(voice: Voice): VoiceGovernance {
  return {
    voiceId: voice.id,
    visibility: voice.source === "system" ? "Public" : "Private",
    reviewStatus: voice.source === "system" ? "Approved" : "Needs review",
    consentStatus: voice.source === "system" ? "Verified" : "Pending"
  };
}

function readVoiceOverrides(): Record<string, Partial<Pick<Voice, "source" | "name" | "ownedByUser" | "avatarTone">>> {
  try {
    const raw = localStorage.getItem(VOICE_OVERRIDE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeVoiceOverrides(overrides: Record<string, Partial<Pick<Voice, "source" | "name" | "ownedByUser" | "avatarTone">>>) {
  localStorage.setItem(VOICE_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
}

function rememberVoiceOverride(voiceId: string, override: Partial<Pick<Voice, "source" | "name" | "ownedByUser" | "avatarTone">>) {
  const current = readVoiceOverrides();
  current[voiceId] = { ...(current[voiceId] || {}), ...override };
  writeVoiceOverrides(current);
}

function applyVoiceOverrides(voices: Voice[]) {
  const overrides = readVoiceOverrides();
  return voices.map((voice) => {
    const override = overrides[voice.id];
    if (!override) return voice;
    return {
      ...voice,
      ...override
    };
  });
}

function getVoiceInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "V";
}

function inferMemberNameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "teammate";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ") || "Teammate";
}

function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const [role, setRole] = useState<Role | null>(() => (localStorage.getItem("voxai-role") as Role | null) ?? null);
  const [voices, setVoices] = useState<Voice[]>(seedVoices);
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [logs, setLogs] = useState<ApiLog[]>(seedApiLogs);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(seedTeamMembers);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(seedApiKeys);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>(seedPricingPlans);
  const [pricingDrafts, setPricingDrafts] = useState<PricingPlan[]>(seedPricingPlans.map((plan) => ({ ...plan, status: "Published" })));
  const [usagePolicy, setUsagePolicy] = useState<UsagePolicy>(seedUsagePolicy);
  const [usageSnapshots] = useState<UsageSnapshot[]>(seedUsageSnapshots);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(seedAuditEvents);
  const [voiceGovernance, setVoiceGovernance] = useState<Record<string, VoiceGovernance>>(Object.fromEntries(seedVoiceGovernance.map((item) => [item.voiceId, item])));
  const [adminStateLoaded, setAdminStateLoaded] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(seedVoices[0]?.id ?? "");
  const [focusedVoiceId, setFocusedVoiceId] = useState<string | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) window.location.hash = "#home";
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!role) return;
    if (route === "clone" || route === "design") {
      window.location.hash = "#playground";
      return;
    }
    const allowedRoutes = roleConfig[role].routes;
    if (!allowedRoutes.includes(route)) {
      window.location.hash = `#${roleConfig[role].defaultRoute}`;
    }
  }, [role, route]);

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    setVoicesLoading(true);
    setVoicesError(null);
    fetchLiveVoices()
      .then((payload) => {
        if (cancelled) return;
        if (payload.voices.length) {
          const nextVoices = applyVoiceOverrides(payload.voices);
          setVoices((current) => mergeVoices(nextVoices, current));
          setSelectedVoiceId((current) => (nextVoices.some((voice) => voice.id === current) ? current : nextVoices[0].id));
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setVoicesError(error.message);
      })
      .finally(() => {
        if (!cancelled) setVoicesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    setAdminStateLoaded(false);
    const load = role === "Admin" ? fetchAdminState().then((payload) => {
      if (cancelled) return;
      if (payload.teamMembers) setTeamMembers(payload.teamMembers);
      if (payload.apiKeys) setApiKeys(payload.apiKeys);
      if (payload.pricingPlans) setPricingPlans(payload.pricingPlans);
      if (payload.pricingDrafts) setPricingDrafts(payload.pricingDrafts);
      if (payload.usagePolicy) setUsagePolicy(payload.usagePolicy);
      if (payload.auditEvents) setAuditEvents(payload.auditEvents);
      if (payload.voiceGovernance) setVoiceGovernance(payload.voiceGovernance);
    }) : fetchPublicPricingPlans().then((payload) => {
      if (!cancelled) setPricingPlans(payload.plans);
    });

    load.finally(() => {
      if (!cancelled) setAdminStateLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (!adminStateLoaded || role !== "Admin") return;
    const timer = window.setTimeout(() => {
      const payload: AdminState = {
        teamMembers,
        apiKeys,
        pricingPlans,
        pricingDrafts,
        usagePolicy,
        auditEvents,
        voiceGovernance
      };
      void saveAdminState(payload);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [adminStateLoaded, teamMembers, apiKeys, pricingPlans, pricingDrafts, usagePolicy, auditEvents, voiceGovernance]);

  async function loginAs(nextRole: Role) {
    await loginSession(nextRole);
    setRole(nextRole);
    localStorage.setItem("voxai-role", nextRole);
    window.location.hash = `#${roleConfig[nextRole].defaultRoute}`;
  }

  async function logout() {
    await logoutSession();
    setRole(null);
    localStorage.removeItem("voxai-role");
    window.location.hash = "#home";
  }

  function addGeneration(generation: Generation) {
    setGenerations((current) => [generation, ...current].slice(0, 8));
  }

  function addLog(log: ApiLog) {
    setLogs((current) => [log, ...current].slice(0, 20));
  }

  function addAuditEvent(action: string, resource: string, severity: AuditEvent["severity"] = "info", actor = "Admin") {
    const now = new Date();
    setAuditEvents((current) => [
      {
        id: `audit_${Date.now().toString(16)}`,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actor,
        action,
        resource,
        severity
      },
      ...current
    ].slice(0, 12));
  }

  async function refreshVoices() {
    setVoicesLoading(true);
    setVoicesError(null);
    try {
      const payload = await fetchLiveVoices();
      const nextVoices = applyVoiceOverrides(payload.voices);
      setVoices((current) => mergeVoices(nextVoices, current));
      if (nextVoices.length) {
        setSelectedVoiceId((current) => (nextVoices.some((voice) => voice.id === current) ? current : nextVoices[0].id));
      }
    } catch (error) {
      setVoicesError(error instanceof Error ? error.message : "Failed to refresh voices");
    } finally {
      setVoicesLoading(false);
    }
  }

  async function removeVoice(voiceId: string) {
    setVoices((current) => current.filter((voice) => voice.id !== voiceId));
    setSelectedVoiceId((current) => (current === voiceId ? "" : current));
    await refreshVoices();
  }

  function toggleFavorite(voiceId: string) {
    setVoices((current) => current.map((voice) => (voice.id === voiceId ? { ...voice, favorite: !voice.favorite } : voice)));
  }

  function addVoice(voice: Voice) {
    const existingOverride = readVoiceOverrides()[voice.id];
    if (voice.source !== "system" && !existingOverride?.source) {
      rememberVoiceOverride(voice.id, { source: voice.source, name: voice.name, ownedByUser: true });
    }
    const [nextVoice] = applyVoiceOverrides([voice]);
    setVoices((current) => mergeVoices([nextVoice], current));
    setSelectedVoiceId(nextVoice.id);
  }

  function openVoiceInLibrary(voiceId: string) {
    setFocusedVoiceId(voiceId);
    window.location.hash = "#voices";
  }

  function createApiKey(name: string, scopes: string[]) {
    setApiKeys((current) => [
      {
        id: `key_${Date.now().toString(16)}`,
        name,
        scopes,
        createdAt: new Date().toISOString().slice(0, 10),
        lastUsedAt: "Never",
        status: "Active"
      },
      ...current
    ]);
    addAuditEvent("Created API key", name);
    setShowApiKeyModal(false);
  }

  function inviteTeamMember(email: string, nextRole: TeamMember["role"]) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    const existing = teamMembers.find((member) => member.email.toLowerCase() === normalizedEmail);
    if (existing) {
      setTeamMembers((current) =>
        current.map((member) =>
          member.email.toLowerCase() === normalizedEmail ? { ...member, role: nextRole, status: "Pending" } : member
        )
      );
      addAuditEvent("Re-sent team invite", normalizedEmail, "warn");
      return;
    }

    setTeamMembers((current) => [
      {
        name: inferMemberNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        role: nextRole,
        status: "Pending"
      },
      ...current
    ]);
    addAuditEvent("Invited team member", normalizedEmail, "info");
  }

  function updateTeamMember(email: string, patch: Partial<TeamMember>) {
    const target = teamMembers.find((member) => member.email === email);
    if (!target) return;
    setTeamMembers((current) => current.map((member) => (member.email === email ? { ...member, ...patch } : member)));
    if (patch.role && patch.role !== target.role) addAuditEvent("Updated team role", `${target.email} → ${patch.role}`, "warn");
    if (patch.status && patch.status !== target.status) addAuditEvent("Updated team member status", `${target.email} → ${patch.status}`, patch.status === "Pending" ? "warn" : "info");
  }

  function removeTeamMember(email: string) {
    const target = teamMembers.find((member) => member.email === email);
    if (!target || target.role === "Owner") return;
    setTeamMembers((current) => current.filter((member) => member.email !== email));
    addAuditEvent("Removed team member", target.email, "warn");
  }

  function updatePricingPlan(planId: string, patch: Partial<PricingPlan>) {
    setPricingDrafts((current) => current.map((plan) => (plan.id === planId ? { ...plan, ...patch, status: "Draft" } : plan)));
  }

  function addPricingDraft() {
    const nextId = `custom_${Date.now().toString(16)}`;
    setPricingDrafts((current) => [
      ...current,
      {
        id: nextId,
        name: "New Plan",
        price: "$99",
        quota: "5M chars",
        modelAccess: "Auralith One + Auralith Ultra",
        teamSeats: "10 team seats",
        ctaLabel: "Choose plan",
        highlighted: false,
        features: ["Usage analytics", "Priority support"],
        status: "Draft"
      }
    ]);
    addAuditEvent("Created pricing draft", nextId, "info");
  }

  function removePricingDraft(planId: string) {
    const target = pricingDrafts.find((plan) => plan.id === planId);
    if (!target) return;
    setPricingDrafts((current) => current.filter((plan) => plan.id !== planId));
    addAuditEvent("Removed pricing draft", target.name, "warn");
  }

  function duplicatePricingDraft(planId: string) {
    const target = pricingDrafts.find((plan) => plan.id === planId);
    if (!target) return;
    const duplicate = {
      ...target,
      id: `copy_${Date.now().toString(16)}`,
      name: `${target.name} Copy`,
      status: "Draft" as const,
      highlighted: false
    };
    setPricingDrafts((current) => [...current, duplicate]);
    addAuditEvent("Duplicated pricing draft", target.name, "info");
  }

  function movePricingDraft(planId: string, direction: -1 | 1) {
    const index = pricingDrafts.findIndex((plan) => plan.id === planId);
    if (index === -1) return;
    setPricingDrafts((current) => moveItem(current, index, direction).map((plan) => ({ ...plan, status: "Draft" as const })));
    addAuditEvent(direction === -1 ? "Moved pricing draft up" : "Moved pricing draft down", planId, "info");
  }

  async function publishPricingChanges() {
    const payload = await publishPricingDrafts();
    const nextPublished = payload.pricingPlans;
    setPricingPlans(nextPublished);
    setPricingDrafts(payload.pricingDrafts);
    setUsagePolicy((current) => ({
      ...current,
      monthlyQuota: nextPublished.reduce((max, plan) => Math.max(max, parsePlanQuota(plan.quota)), current.monthlyQuota)
    }));
    addAuditEvent("Published pricing changes", "Pricing", "info");
  }

  function resetPricingDrafts() {
    setPricingDrafts(pricingPlans.map((plan) => ({ ...plan, status: "Published" as const })));
    addAuditEvent("Reset pricing draft", "Pricing", "warn");
  }

  function updateUsageSettings(nextPolicy: UsagePolicy) {
    setUsagePolicy(nextPolicy);
    addAuditEvent("Updated usage policy", `${nextPolicy.monthlyQuota.toLocaleString()} chars`, "warn");
  }

  function toggleApiKeyStatus(keyId: string) {
    const target = apiKeys.find((key) => key.id === keyId);
    if (!target) return;
    const nextStatus = target.status === "Active" ? "Disabled" : "Active";
    setApiKeys((current) => current.map((key) => (key.id === keyId ? { ...key, status: nextStatus } : key)));
    addAuditEvent(`${nextStatus === "Disabled" ? "Disabled" : "Re-enabled"} API key`, target.name, nextStatus === "Disabled" ? "warn" : "info");
  }

  function updateVoicePolicy(voiceId: string, patch: Partial<VoiceGovernance>) {
    const voice = voices.find((item) => item.id === voiceId);
    const current = voiceGovernance[voiceId] ?? (voice ? makeDefaultGovernance(voice) : null);
    if (!current) return;

    const next = { ...current, ...patch };
    setVoiceGovernance((currentMap) => ({ ...currentMap, [voiceId]: next }));

    if (patch.reviewStatus) addAuditEvent(`Updated voice review`, `${voice?.name ?? voiceId} → ${patch.reviewStatus}`, patch.reviewStatus === "Flagged" ? "critical" : "warn");
    if (patch.visibility) addAuditEvent("Updated voice visibility", `${voice?.name ?? voiceId} → ${patch.visibility}`);
    if (patch.consentStatus) addAuditEvent("Updated voice consent", `${voice?.name ?? voiceId} → ${patch.consentStatus}`, patch.consentStatus === "Missing" ? "critical" : "warn");
  }

  if (!role) {
    return <RoleLogin onLogin={(nextRole) => { void loginAs(nextRole); }} />;
  }

  return (
    <div className="site-shell">
      <Topbar route={route} role={role} onLogout={() => { void logout(); }} onCreateApiKey={() => setShowApiKeyModal(true)} />
      <main>
        {route === "home" && <Home voices={voices} generations={generations} />}
        {route === "playground" && (
          <>
            <Playground
              voices={voices}
              onGenerate={addGeneration}
              onLog={addLog}
              generations={generations}
              selectedVoiceId={selectedVoiceId}
              onSelectVoice={setSelectedVoiceId}
              voicesLoading={voicesLoading}
              voicesError={voicesError}
            />
            {role !== "Admin" && <Clone onCreateVoice={addVoice} onLog={addLog} onDeleteVoice={removeVoice} onRefreshVoices={refreshVoices} onOpenVoiceLibrary={openVoiceInLibrary} />}
            {role !== "Admin" && <Design onCreateVoice={addVoice} onLog={addLog} onDeleteVoice={removeVoice} onRefreshVoices={refreshVoices} onOpenVoiceLibrary={openVoiceInLibrary} />}
          </>
        )}
        {route === "models" && <Models />}
        {route === "voices" && (
          <Voices
            voices={voices}
            onToggleFavorite={toggleFavorite}
            onUseVoice={(voiceId) => {
              setSelectedVoiceId(voiceId);
              window.location.hash = "#playground";
            }}
            onDeleteVoice={removeVoice}
            onRefreshVoices={refreshVoices}
            voicesLoading={voicesLoading}
            voicesError={voicesError}
            focusedVoiceId={focusedVoiceId}
            onFocusHandled={() => setFocusedVoiceId(null)}
          />
        )}
        {route === "docs" && <Docs />}
        {route === "usage" && (
          <Usage
            role={role}
            generations={generations}
            logs={logs}
            onSelectLog={setSelectedLog}
            usagePolicy={usagePolicy}
            onUpdateUsagePolicy={updateUsageSettings}
            usageSnapshots={usageSnapshots}
            voices={voices}
            voiceGovernance={voiceGovernance}
            onUpdateVoiceGovernance={updateVoicePolicy}
          />
        )}
        {route === "logs" && (
          <Logs
            role={role}
            logs={logs}
            onSelectLog={setSelectedLog}
            apiKeys={apiKeys}
            auditEvents={auditEvents}
            onCreateApiKey={() => setShowApiKeyModal(true)}
            onToggleApiKeyStatus={toggleApiKeyStatus}
          />
        )}
        {route === "pricing" && (
          <Pricing
            role={role}
            plans={pricingPlans}
            drafts={pricingDrafts}
            onUpdatePlan={updatePricingPlan}
            onPublishChanges={publishPricingChanges}
            onResetDrafts={resetPricingDrafts}
            onAddDraft={addPricingDraft}
            onRemoveDraft={removePricingDraft}
            onDuplicateDraft={duplicatePricingDraft}
            onMoveDraft={movePricingDraft}
          />
        )}
        {route === "safety" && role === "Admin" && (
          <Safety
            voices={voices}
            apiKeys={apiKeys}
            usagePolicy={usagePolicy}
            auditEvents={auditEvents}
            voiceGovernance={voiceGovernance}
            onUpdateVoiceGovernance={updateVoicePolicy}
          />
        )}
        {route === "team" && role === "Admin" && (
          <Team
            members={teamMembers}
            apiKeys={apiKeys}
            auditEvents={auditEvents}
            onCreateApiKey={() => setShowApiKeyModal(true)}
            onInviteMember={inviteTeamMember}
            onUpdateMember={updateTeamMember}
            onRemoveMember={removeTeamMember}
          />
        )}
      </main>
      {showApiKeyModal && <ApiKeyModal onClose={() => setShowApiKeyModal(false)} onCreate={createApiKey} />}
      {selectedLog && <LogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}

function RoleLogin({ onLogin }: { onLogin: (role: Role) => void }) {
  return (
    <main className="login-page">
      <section className="login-hero">
        <span className="brand login-brand"><span className="brand-mark" />Auralith</span>
        <h1>Choose a role to enter the voice platform.</h1>
        <p>Each role loads a different default view and navigation set. In production, roles and permissions would come from the identity service.</p>
      </section>
      <section className="role-grid">
        {(Object.keys(roleConfig) as Role[]).map((item) => (
          <button className="role-card" key={item} onClick={() => onLogin(item)}>
            <span className="role-badge">{item}</span>
            <h2>{item}</h2>
            <p>{roleConfig[item].summary}</p>
            <div className="chip-row">
              {roleConfig[item].focus.map((focus) => <span key={focus}>{focus}</span>)}
            </div>
            <strong>Enter {routeLabels[roleConfig[item].defaultRoute]} →</strong>
          </button>
        ))}
      </section>
    </main>
  );
}

function Topbar({ route, role, onLogout, onCreateApiKey }: { route: Route; role: Role; onLogout: () => void; onCreateApiKey: () => void }) {
  const visibleRoutes = roleConfig[role].routes;
  const homeHref = visibleRoutes.includes("home") ? "#home" : `#${roleConfig[role].defaultRoute}`;
  return (
    <header className="topbar">
      <a className="brand" href={homeHref} aria-label="Auralith Home">
        <span className="brand-mark" />
        <span>Auralith</span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">
        {visibleRoutes.map((item) => (
          <a key={item} href={`#${item}`} className={route === item ? "active" : ""}>
            {routeLabels[item]}
          </a>
        ))}
      </nav>
      <div className="topbar-actions">
        {role === "Admin" && (
          <button className="ghost-action" onClick={onCreateApiKey}>
            Create API Key
          </button>
        )}
        <span className="role-chip">{role}</span>
        <button className="ghost-action" onClick={onLogout}>Switch role</button>
        {visibleRoutes.includes("docs") && <a className="ghost-link" href="#docs">API Docs</a>}
        {visibleRoutes.includes("playground") && <a className="console-button" href="#playground">Open Playground</a>}
      </div>
    </header>
  );
}

const routeLabels: Record<Route, string> = {
  home: "Home",
  playground: "Playground",
  models: "Models",
  voices: "Voices",
  clone: "Clone",
  design: "Design",
  docs: "Docs",
  usage: "Usage",
  logs: "Logs",
  pricing: "Pricing",
  safety: "Safety",
  team: "Team"
};

function Home({ voices, generations }: { voices: Voice[]; generations: Generation[] }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>Engineering-grade voice intelligence for multilingual products.</h1>
          <p>
            Build multilingual voice workflows with Auralith One and Auralith Ultra.
            Go from instant text to speech generation to reusable voice assets and production-ready API delivery in one system.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#playground">
              Open Playground
            </a>
            <a className="secondary-button" href="#docs">
              Open API Docs
            </a>
            <a className="text-button" href="#voices">
              Explore Voices
            </a>
          </div>
          <div className="hero-metrics">
            <Metric value="2" label="Model series" />
            <Metric value="40+" label="Languages" />
            <Metric value="Pro" label="Voice control" />
          </div>
        </div>
        <DemoPanel voices={voices} />
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Core Capabilities</span>
          <h2>Combine API-first delivery with a production voice workflow.</h2>
        </div>
        <div className="feature-grid">
          <Feature href="#docs" icon="API" title="Text to Speech API" text="HTTP endpoints support model selection, voice IDs, language routing, audio formats, and request tracking." />
          <Feature href="#playground" icon="EXP" title="Expressive TTS" text="Designed for nuanced delivery, richer emotional control, and premium long-form voice experiences." />
          <Feature href="#clone" icon="VC" title="Voice Clone" text="Upload or record a sample, pass consent and quality checks, and create a reusable voice ID." />
          <Feature href="#playground" icon="VD" title="Voice Design" text="Describe a target voice in natural language, preview it, and save it into the library." />
        </div>
      </section>

      <section className="section split-section">
        <div>
          <span className="eyebrow">Model System</span>
          <h2>Auralith One for speed. Auralith Ultra for expression.</h2>
          <p>Choose Auralith One for responsive, cost-efficient generation, or Auralith Ultra for richer emotion, nuance, and premium long-form delivery.</p>
        </div>
        <div className="model-pair">
          {models.map((model) => (
            <a key={model.id} className={`model-card ${model.tier}`} href="#models">
              <span>{model.name}</span>
              <strong>{model.id}</strong>
              <p>{model.positioning}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="section dashboard-preview">
        <SummaryPanel voices={voices} />
      </section>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function DemoPanel({ voices }: { voices: Voice[] }) {
  const demoVoices = useMemo(() => pickPlaygroundVoices(voices).slice(0, 2), [voices]);
  const fallbackVoiceId = demoVoices[0]?.id ?? "2020008594694475776";
  const [text, setText] = useState("Welcome to Auralith. Generate stable, natural, and controllable speech for your product with multilingual voice models.");
  const [model, setModel] = useState<ModelId>("auralith-ultra-1.0");
  const [voiceId, setVoiceId] = useState(fallbackVoiceId);
  const [status, setStatus] = useState<"ready" | "generating" | "failed">("ready");
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [durationLabel, setDurationLabel] = useState("0:00");

  useEffect(() => {
    if (!demoVoices.length) return;
    if (!demoVoices.some((voice) => voice.id === voiceId)) {
      setVoiceId(demoVoices[0].id);
    }
  }, [demoVoices, voiceId]);

  async function generateDemo() {
    if (!voiceId) {
      setError("No demo voice is available yet.");
      setStatus("failed");
      return;
    }

    setStatus("generating");
    setError(null);
    try {
      const result = await synthesizeSpeech({
        text,
        voiceId,
        model
      });
      setAudioUrl(toDataUrl(result.audioBase64, result.audioMimeType));
      setDurationLabel(formatDuration(result.durationSeconds));
      setStatus("ready");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Synthesis failed");
      setAudioUrl("");
      setDurationLabel("0:00");
      setStatus("failed");
    }
  }

  return (
    <div className="hero-demo panel dark-panel">
      <div className="panel-header">
        <span>Live TTS Demo</span>
      </div>
      <textarea aria-label="Demo text" value={text} onChange={(event) => setText(event.target.value)} />
      <div className="control-grid compact">
        <label>
          Model
          <select value={model} onChange={(event) => setModel(event.target.value as ModelId)}>
            <option>auralith-ultra-1.0</option>
            <option>auralith-one-1.0</option>
          </select>
        </label>
        <label>
          Voice
          <select value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
            {demoVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="generate-button" onClick={() => void generateDemo()} disabled={status === "generating" || !voiceId}>
        {status === "generating" ? "Generating..." : "Generate Speech"}
      </button>
      {audioUrl ? (
        <audio className="native-audio" controls src={audioUrl} />
      ) : status === "generating" ? (
        <div className="audio-state-panel audio-state-panel-dark">
          <WavePlayer playing onToggle={() => undefined} duration={durationLabel} />
          <p>Generating audio preview...</p>
        </div>
      ) : (
        <div className="audio-empty-state audio-empty-state-dark">
          <strong>Click to generate a preview</strong>
          <p>Try the live demo to hear the result instantly.</p>
        </div>
      )}
      {error && <p className="inline-note error-note">{error}</p>}
    </div>
  );
}

function Feature({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <a className="feature-card" href={href}>
      <span className="feature-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </a>
  );
}

function SummaryPanel({ voices }: { voices: Voice[] }) {
  const featuredVoices = voices.slice(0, 3);

  return (
    <div className="overview-grid home-overview-grid">
      <section className="panel home-story-panel">
        <div className="panel-header">
          <span>Built for production teams</span>
          <a href="#docs">View API</a>
        </div>
        <div className="home-story-list">
          <article>
            <strong>Support and operations</strong>
            <p>Use Auralith One for dependable, low-latency narration across alerts, onboarding, and transactional flows.</p>
          </article>
          <article>
            <strong>Brand and content</strong>
            <p>Use Auralith Ultra when tone, emotional detail, and long-form naturalness matter more than raw throughput.</p>
          </article>
          <article>
            <strong>Reusable voice assets</strong>
            <p>Move from system voices to cloned or designed voices without leaving the same product surface.</p>
          </article>
        </div>
      </section>
      <section className="panel home-voice-panel">
        <div className="panel-header">
          <span>Featured voices</span>
          <a href="#voices">Explore library</a>
        </div>
        <div className="featured-voice-list">
          {featuredVoices.map((voice) => (
            <article key={voice.id} className="featured-voice-row">
              <div>
                <strong>{voice.name}</strong>
                <p>{voice.previewText || `${voice.language} · ${voice.style}`}</p>
              </div>
              <span>{voice.style}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Playground({
  voices,
  onGenerate,
  generations,
  onLog,
  selectedVoiceId,
  onSelectVoice,
  voicesLoading,
  voicesError
}: {
  voices: Voice[];
  onGenerate: (generation: Generation) => void;
  generations: Generation[];
  onLog: (log: ApiLog) => void;
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
  voicesLoading: boolean;
  voicesError: string | null;
}) {
  const [text, setText] = useState("Welcome to Auralith. Try the same script with different voices, models, and output formats.");
  const [model, setModel] = useState<ModelId>("auralith-ultra-1.0");
  const [language, setLanguage] = useState("Chinese");
  const [format, setFormat] = useState<Generation["format"]>("mp3");
  const [status, setStatus] = useState<"idle" | "generating" | "succeeded" | "failed">("idle");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [durationLabel, setDurationLabel] = useState("0:00");
  const [creditCost, setCreditCost] = useState<number | null>(null);
  const playgroundVoices = useMemo(() => pickPlaygroundVoices(voices, selectedVoiceId), [selectedVoiceId, voices]);
  const selectedVoice = playgroundVoices.find((voice) => voice.id === selectedVoiceId) || null;

  useEffect(() => {
    if (!playgroundVoices.length) return;
    if (!playgroundVoices.some((voice) => voice.id === selectedVoiceId)) {
      onSelectVoice(playgroundVoices[0].id);
    }
  }, [onSelectVoice, playgroundVoices, selectedVoiceId]);

  const apiRequest = useMemo(
    () =>
      JSON.stringify(
        {
          routing_profile: model,
          provider_model: "moss-tts",
          voice_id: selectedVoiceId,
          text,
          sampling_params: { temperature: 1.5, top_p: 0.8, top_k: 25 },
          output: { format, actual_provider_format: "wav" },
          language
        },
        null,
        2
      ),
    [format, language, model, selectedVoiceId, text]
  );

  async function generate() {
    if (!selectedVoiceId) {
      setError("No live voice is available yet.");
      return;
    }
    setStatus("generating");
    setError(null);
    try {
      const result = await synthesizeSpeech({
        text,
        voiceId: selectedVoiceId,
        model
      });
      const nextAudioUrl = toDataUrl(result.audioBase64, result.audioMimeType);
      setAudioUrl(nextAudioUrl);
      setDurationLabel(formatDuration(result.durationSeconds));
      setCreditCost(result.usage.credit_cost ?? null);
      const generation: Generation = {
        id: `gen_${Date.now()}`,
        requestId: result.requestId || makeRequestId(),
        text,
        voiceId: selectedVoiceId,
        model,
        format,
        latencyMs: result.latencyMs,
        characters: text.length,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        audioUrl: nextAudioUrl,
        providerModel: result.providerModel,
        creditCost: result.usage.credit_cost
      };
      onGenerate(generation);
      onLog({
        time: generation.createdAt,
        endpoint: "/v1/audio/tts",
        model,
        status: 200,
        requestId: generation.requestId,
        latencyMs: result.latencyMs
      });
      setStatus("succeeded");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "TTS request failed";
      setError(message);
      setStatus("failed");
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/v1/audio/tts",
        model,
        status: 500,
        requestId: makeRequestId(),
        latencyMs: 0,
        errorCode: message
      });
    }
  }

  async function copyCode() {
    await copyToClipboard(apiRequest);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <section className="workspace">
      <PageTitle eyebrow="Playground" title="Speech Generation" text="Write your script, choose a voice, tune delivery settings, and generate production-ready speech." />
      <div className="playground-grid">
        <section className="panel playground-input-panel">
          <div className="panel-header">
            <span>Speech setup</span>
          </div>
          <textarea className="large-input" value={text} onChange={(event) => setText(event.target.value)} />
          {voicesError && <p className="inline-note error-note">Voice load error: {voicesError}</p>}
          <div className="playground-action-row">
            <button className="generate-button playground-generate-button" onClick={generate} disabled={status === "generating" || !selectedVoiceId}>
              {status === "generating" ? "Generating..." : "Generate Speech"}
            </button>
          </div>
          <div className="control-grid">
            <Select label="Language" value={language} onChange={setLanguage} options={["English", "Chinese", "Japanese"]} />
            <LabeledSelect
              label="Voice"
              value={selectedVoiceId || playgroundVoices[0]?.id || ""}
              onChange={onSelectVoice}
              options={playgroundVoices.map((voice) => ({
                value: voice.id,
                label: `${voice.name} · ${voice.style}`
              }))}
            />
            <Select label="Model" value={model} onChange={(value) => setModel(value as ModelId)} options={models.map((item) => item.id)} />
            <Select label="Format" value={format} onChange={(value) => setFormat(value as Generation["format"])} options={["mp3", "wav", "pcm"]} />
          </div>
          <div className="voice-description-card">
            <strong>{selectedVoice ? `${selectedVoice.name} · ${selectedVoice.style}` : "Voice preview"}</strong>
            <p>
              {voicesLoading
                ? "Loading public voices..."
                : (selectedVoice?.previewText || "Select a voice to preview its tone and speaking style.")}
            </p>
          </div>
          <div className="panel-header">
            <span>Voice settings</span>
          </div>
          {["Speed", "Volume", "Pitch", "Stability", "Similarity"].map((item, index) => (
            <div className="slider-row" key={item}>
              <span>{item}</span>
              <input type="range" defaultValue={[50, 70, 45, 72, 82][index]} />
              <b>{["1.0", "1.2", "0", "0.72", "0.82"][index]}</b>
            </div>
          ))}
        </section>
        <section className="panel result-panel">
          <div className="panel-header">
            <span>Result</span>
            <button className="copy-button" onClick={copyCode}>
              {copied ? "Copied" : "Copy API Request"}
            </button>
          </div>
          {audioUrl ? (
            <audio className="native-audio" controls src={audioUrl} />
          ) : status === "generating" ? (
            <div className="audio-state-panel">
              <WavePlayer playing onToggle={() => undefined} duration={durationLabel} large />
              <p>Generating audio preview...</p>
            </div>
          ) : (
            <div className="audio-empty-state">
              <strong>Click to generate a preview</strong>
              <p>Generate speech to hear the result instantly.</p>
            </div>
          )}
          {error && <p className="inline-note error-note">{error}</p>}
          <div className="meta-list">
            <span>
              request_id <b>{generations[0]?.requestId ?? "—"}</b>
            </span>
            <span>
              characters <b>{text.length}</b>
            </span>
            <span>
              voice <b>{selectedVoice ? selectedVoice.name : selectedVoiceId || "—"}</b>
            </span>
            <span>
              model <b>{model}</b>
            </span>
            <span>
              duration <b>{durationLabel}</b>
            </span>
            <span>
              cost <b>{creditCost === null ? "—" : `${creditCost.toFixed(3)} credits`}</b>
            </span>
          </div>
          <pre>
            <code>{apiRequest}</code>
          </pre>
        </section>
      </div>
    </section>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Models() {
  return (
    <section className="workspace">
      <PageTitle eyebrow="Models" title="Two model series for distinct voice workloads." text="Use Auralith One for fast, efficient generation and Auralith Ultra for higher expressiveness, stronger emotional detail, and premium voice quality." />
      <div className="model-comparison">
        {models.map((model) => (
          <article key={model.id} className={`panel model-detail ${model.tier === "prime" ? "accent" : ""}`}>
            <span className={`model-badge ${model.tier}`}>{model.name}</span>
            <h2>{model.id}</h2>
            <p>{model.positioning}</p>
            <dl>
              <div>
                <dt>Latency</dt>
                <dd>{model.latency}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>{model.cost}</dd>
              </div>
              <div>
                <dt>Emotion</dt>
                <dd>{model.emotion}</dd>
              </div>
            </dl>
            <button className={model.tier === "prime" ? "primary-button" : "secondary-button"} onClick={() => copyToClipboard(model.id)}>
              Copy model id
            </button>
          </article>
        ))}
      </div>
      <section className="panel table-panel">
        <div className="panel-header">
          <span>Capability matrix</span>
          <span className="status-pill ready">stable</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Capability</th>
              <th>Auralith One</th>
              <th>Auralith Ultra</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Multilingual TTS</td><td>Supported</td><td>Supported</td></tr>
            <tr><td>Low latency</td><td>Best</td><td>Good</td></tr>
            <tr><td>Emotion</td><td>Basic</td><td>Enhanced</td></tr>
            <tr><td>Voice clone</td><td>Supported</td><td>Recommended</td></tr>
            <tr><td>Voice design</td><td>Supported</td><td>Recommended</td></tr>
          </tbody>
        </table>
      </section>
    </section>
  );
}

function Voices({
  voices,
  onToggleFavorite,
  onUseVoice,
  onDeleteVoice,
  onRefreshVoices,
  voicesLoading,
  voicesError,
  focusedVoiceId,
  onFocusHandled
}: {
  voices: Voice[];
  onToggleFavorite: (voiceId: string) => void;
  onUseVoice: (voiceId: string) => void;
  onDeleteVoice: (voiceId: string) => Promise<void>;
  onRefreshVoices: () => Promise<void>;
  voicesLoading: boolean;
  voicesError: string | null;
  focusedVoiceId: string | null;
  onFocusHandled: () => void;
}) {
  const [source, setSource] = useState("All");
  const [language, setLanguage] = useState("All");
  const [query, setQuery] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [deletingVoiceId, setDeletingVoiceId] = useState<string | null>(null);
  const [reclassifyingVoiceId, setReclassifyingVoiceId] = useState<string | null>(null);
  const [confirmDeleteVoice, setConfirmDeleteVoice] = useState<Voice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceRefs = useRef<Record<string, HTMLElement | null>>({});

  const filteredVoices = voices.filter((voice) => {
    const matchesSource = source === "All" || voice.source === source.toLowerCase();
    const matchesLanguage = language === "All" || voice.language === language;
    const matchesQuery = `${voice.name} ${voice.id} ${voice.style} ${voice.scenario}`.toLowerCase().includes(query.toLowerCase());
    return matchesSource && matchesLanguage && matchesQuery;
  });

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  useEffect(() => {
    if (!focusedVoiceId) return;
    const target = voiceRefs.current[focusedVoiceId];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    onFocusHandled();
  }, [focusedVoiceId, onFocusHandled, filteredVoices.length]);

  async function playPreview(voice: Voice) {
    if (playingVoiceId === voice.id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    setPreviewError(null);
    setPreviewingVoiceId(voice.id);
    try {
      const result = await synthesizeSpeech({
        text: voice.previewText || "Preview this voice in the Auralith Playground.",
        voiceId: voice.id,
        model: voice.availableModels[0] || "auralith-ultra-1.0"
      });
      const nextAudio = new Audio(toDataUrl(result.audioBase64, result.audioMimeType));
      nextAudio.onended = () => setPlayingVoiceId(null);
      audioRef.current?.pause();
      audioRef.current = nextAudio;
      setPlayingVoiceId(voice.id);
      await nextAudio.play();
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Preview failed");
      setPlayingVoiceId(null);
    } finally {
      setPreviewingVoiceId(null);
    }
  }

  async function handleDeleteVoice(voiceId: string) {
    setDeletingVoiceId(voiceId);
    setPreviewError(null);
    try {
      const result = await deleteVoice(voiceId);
      await onDeleteVoice(voiceId);
      setPreviewError(result.stillExists ? `Delete returned success but the provider still reports ${voiceId} in the list. Try refresh again in a few seconds.` : null);
      if (selectedVoice?.id === voiceId) setSelectedVoice(null);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingVoiceId(null);
    }
  }

  async function handleReclassifyVoice(voiceId: string, source: "cloned" | "designed") {
    setReclassifyingVoiceId(voiceId);
    setPreviewError(null);
    try {
      const payload = await updateVoiceSource(voiceId, source);
      const currentVoice = voices.find((voice) => voice.id === voiceId);
      rememberVoiceOverride(voiceId, { source, name: currentVoice?.name, ownedByUser: true });
      if (payload.voice) {
        setSelectedVoice(payload.voice);
      }
      await onRefreshVoices();
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Update source failed");
    } finally {
      setReclassifyingVoiceId(null);
    }
  }

  function handleUpdateAvatarTone(voiceId: string, avatarTone: Voice["avatarTone"]) {
    const currentVoice = voices.find((voice) => voice.id === voiceId);
    rememberVoiceOverride(voiceId, {
      source: currentVoice?.source,
      name: currentVoice?.name,
      ownedByUser: currentVoice?.ownedByUser,
      avatarTone
    });
    setSelectedVoice((current) => (current && current.id === voiceId ? { ...current, avatarTone } : current));
  }

  const groupedVoices = [
    {
      key: "system",
      title: "Public Voices",
      description: "Curated public voice IDs from `id.txt` and provider-visible general voices.",
      voices: filteredVoices.filter((voice) => voice.source === "system")
    },
    {
      key: "cloned",
      title: "My Cloned Voices",
      description: "Voices created from uploaded reference samples.",
      voices: filteredVoices.filter((voice) => voice.source === "cloned" && voice.ownedByUser)
    },
    {
      key: "designed",
      title: "My Designed Voices",
      description: "Voices generated from prompt design and then saved as reusable IDs.",
      voices: filteredVoices.filter((voice) => voice.source === "designed" && voice.ownedByUser)
    }
  ];

  return (
    <section className="workspace">
      <PageTitle eyebrow="Voices" title="Voice Library" text="Search, preview, favorite, and copy voice IDs across public, cloned, and prompt-designed voices." />
      {(voicesError || previewError) && <p className="inline-note error-note">{voicesError || previewError}</p>}
      <div className="voice-layout">
        <aside className="filter-panel panel">
          <h3>Filters</h3>
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="voice name or id" />
          </label>
          <Select label="Source" value={source} onChange={setSource} options={["All", "System", "Cloned", "Designed"]} />
          <Select label="Language" value={language} onChange={setLanguage} options={["All", "English", "Chinese", "Japanese", "Multilingual"]} />
          <p className="inline-note">{voicesLoading ? "Refreshing live MOSI voices..." : `${filteredVoices.length} voices available.`}</p>
          <button className="secondary-button full" onClick={() => void onRefreshVoices()} disabled={voicesLoading}>Refresh library</button>
        </aside>
        <div className="voice-sections">
          {(source === "All" ? groupedVoices : groupedVoices.filter((group) => group.key === source.toLowerCase())).map((group) => (
            group.voices.length > 0 ? (
              <section key={group.key} className="voice-group">
                <div className="voice-group-header">
                  <div>
                    <h3>{group.title}</h3>
                    <p>{group.description}</p>
                  </div>
                  <span className="status-pill">{group.voices.length}</span>
                </div>
                <div className="voice-grid">
                  {group.voices.map((voice) => (
                    <VoiceCard
                      key={voice.id}
                      voice={voice}
                      playing={playingVoiceId === voice.id}
                      previewing={previewingVoiceId === voice.id}
                      deleting={deletingVoiceId === voice.id}
                      focused={focusedVoiceId === voice.id}
                      onMountRef={(element) => {
                        voiceRefs.current[voice.id] = element;
                      }}
                      onPlay={() => playPreview(voice)}
                      onOpenDetails={() => setSelectedVoice(voice)}
                      onUse={() => onUseVoice(voice.id)}
                      onDelete={() => setConfirmDeleteVoice(voice)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            ) : null
          ))}
        </div>
      </div>
      {selectedVoice && (
        <VoiceDrawer
          voice={selectedVoice}
          onClose={() => setSelectedVoice(null)}
          onDelete={selectedVoice.source !== "system" ? () => setConfirmDeleteVoice(selectedVoice) : undefined}
          reclassifying={reclassifyingVoiceId === selectedVoice.id}
          onReclassify={selectedVoice.source !== "system" ? (source) => handleReclassifyVoice(selectedVoice.id, source) : undefined}
          onUpdateAvatarTone={(tone) => handleUpdateAvatarTone(selectedVoice.id, tone)}
          onRefresh={async () => {
            const payload = await fetchVoiceStatus(selectedVoice.id);
            if (payload.voice) {
              setSelectedVoice(payload.voice);
            } else {
              setSelectedVoice(null);
            }
            await onRefreshVoices();
          }}
        />
      )}
      {confirmDeleteVoice && (
        <ConfirmDeleteModal
          title="Delete voice"
          targetName={confirmDeleteVoice.name}
          detail={`voice_id: ${confirmDeleteVoice.id}`}
          onClose={() => setConfirmDeleteVoice(null)}
          onConfirm={async () => {
            await handleDeleteVoice(confirmDeleteVoice.id);
            setConfirmDeleteVoice(null);
          }}
        />
      )}
    </section>
  );
}

function VoiceCard({
  voice,
  playing,
  previewing,
  deleting,
  focused,
  onMountRef,
  onPlay,
  onOpenDetails,
  onUse,
  onDelete,
  onToggleFavorite
}: {
  voice: Voice;
  playing: boolean;
  previewing: boolean;
  deleting: boolean;
  focused: boolean;
  onMountRef: (element: HTMLElement | null) => void;
  onPlay: () => void;
  onOpenDetails: () => void;
  onUse: () => void;
  onDelete: () => void;
  onToggleFavorite: (voiceId: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyVoiceId() {
    await copyToClipboard(voice.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1000);
  }

  return (
    <article className={`voice-card ${focused ? "focused" : ""}`} ref={onMountRef}>
      <div className="voice-card-top">
        <div className={`voice-avatar tone-${voice.avatarTone || "emerald"}`}>{getVoiceInitials(voice.name)}</div>
        <button className="icon-button play-toggle" onClick={onPlay} aria-label={`Play ${voice.name}`}>
          {previewing ? "…" : playing ? "■" : "▶"}
        </button>
      </div>
      <h3>{voice.name}</h3>
      <p>{voice.previewText || `${voice.language} · ${voice.style} · ${voice.scenario}`}</p>
      <div className="voice-card-meta">
        <span>{voice.style}</span>
        <span>{voice.language}</span>
      </div>
      <div className="voice-card-actions">
        <button onClick={onUse}>Use</button>
        <button onClick={onOpenDetails}>Details</button>
      </div>
      <div className="voice-card-actions">
        <button onClick={copyVoiceId}>{copied ? "Copied" : "Copy voice_id"}</button>
        <button onClick={() => onToggleFavorite(voice.id)}>{voice.favorite ? "★ Favorited" : "☆ Favorite"}</button>
      </div>
      {voice.source !== "system" && <button onClick={onDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>}
      <code>{voice.id}</code>
    </article>
  );
}

function VoiceDrawer({
  voice,
  onClose,
  onDelete,
  onRefresh,
  onReclassify,
  reclassifying,
  onUpdateAvatarTone
}: {
  voice: Voice;
  onClose: () => void;
  onDelete?: () => void;
  onRefresh: () => Promise<void>;
  onReclassify?: (source: "cloned" | "designed") => Promise<void>;
  reclassifying?: boolean;
  onUpdateAvatarTone: (tone: Voice["avatarTone"]) => void;
}) {
  return (
    <Drawer title={voice.name} onClose={onClose}>
      <div className="drawer-section">
        <div className={`voice-avatar large tone-${voice.avatarTone || "emerald"}`}>{getVoiceInitials(voice.name)}</div>
        <h3>{voice.id}</h3>
        <p>{voice.language} · {voice.gender} · {voice.style} · {voice.scenario}</p>
        <p>Status: {voice.status || "ACTIVE"}{voice.createdAt ? ` · Created ${voice.createdAt}` : ""}</p>
      </div>
      <div className="drawer-section">
        <h4>Avatar style</h4>
        <div className="voice-tone-grid">
          {VOICE_AVATAR_TONES.map((tone) => (
            <button
              key={tone}
              className={`voice-tone-button ${voice.avatarTone === tone ? "active" : ""}`}
              onClick={() => onUpdateAvatarTone(tone)}
            >
              <span className={`voice-avatar mini tone-${tone}`}>{getVoiceInitials(voice.name)}</span>
              {tone}
            </button>
          ))}
        </div>
      </div>
      <div className="drawer-section">
        <h4>Available models</h4>
        <div className="chip-row">
          {voice.availableModels.map((model) => (
            <button key={model} onClick={() => copyToClipboard(model)}>{model}</button>
          ))}
        </div>
      </div>
      <div className="chip-row">
        <button onClick={() => void onRefresh()}>Refresh status</button>
        {onReclassify && (
          <>
            <button onClick={() => void onReclassify("designed")} disabled={reclassifying || voice.source === "designed"}>
              {reclassifying && voice.source !== "designed" ? "Updating..." : "Mark as Designed"}
            </button>
            <button onClick={() => void onReclassify("cloned")} disabled={reclassifying || voice.source === "cloned"}>
              {reclassifying && voice.source !== "cloned" ? "Updating..." : "Mark as Cloned"}
            </button>
          </>
        )}
        {onDelete && <button onClick={onDelete}>Delete voice</button>}
      </div>
      <pre><code>{JSON.stringify({ voice_id: voice.id, model: voice.availableModels[0], input: "Preview this voice." }, null, 2)}</code></pre>
      <button className="primary-button full" onClick={() => (window.location.hash = "#playground")}>Use in Playground</button>
    </Drawer>
  );
}

function Clone({
  onCreateVoice,
  onLog,
  onDeleteVoice,
  onRefreshVoices,
  onOpenVoiceLibrary
}: {
  onCreateVoice: (voice: Voice) => void;
  onLog: (log: ApiLog) => void;
  onDeleteVoice: (voiceId: string) => Promise<void>;
  onRefreshVoices: () => Promise<void>;
  onOpenVoiceLibrary: (voiceId: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "ready" | "failed">("idle");
  const [name, setName] = useState("Brand Voice");
  const [file, setFile] = useState<File | null>(null);
  const [voiceId, setVoiceId] = useState("");
  const [message, setMessage] = useState("Upload a clean 10-30 second sample to create a reusable voice_id.");
  const [busyAction, setBusyAction] = useState<"retry" | "refresh" | "delete" | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const activeStep = status === "ready" ? 4 : status === "processing" ? 3 : status === "uploading" ? 2 : confirmed ? 1 : 0;

  async function startClone() {
    if (!confirmed || !file) return;
    setStatus("uploading");
    setMessage("Uploading sample to MOSI...");
    try {
      const result = await cloneVoice(file, name);
      rememberVoiceOverride(result.clone.voice_id, { source: "cloned", name, ownedByUser: true });
      setVoiceId(result.clone.voice_id);
      setStatus(result.voice ? "ready" : "processing");
      setMessage(result.voice ? "Voice is active and ready for synthesis." : "Clone job created. MOSI is still processing the voice.");
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/voice/clone",
        model: "auralith-ultra-1.0",
        status: 200,
        requestId: result.requestId,
        latencyMs: 0
      });
      if (result.voice) {
        onCreateVoice(result.voice);
        onOpenVoiceLibrary(result.voice.id);
      }
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Clone request failed");
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/voice/clone",
        model: "auralith-ultra-1.0",
        status: 500,
        requestId: makeRequestId(),
        latencyMs: 0,
        errorCode: error instanceof Error ? error.message : "clone_failed"
      });
    }
  }

  function saveVoice() {
    if (voiceId) onOpenVoiceLibrary(voiceId);
  }

  async function refreshStatus() {
    if (!voiceId) return;
    setBusyAction("refresh");
    try {
      const payload = await fetchVoiceStatus(voiceId);
      if (payload.voice) {
        onCreateVoice(payload.voice);
        setStatus(payload.voice.status === "ACTIVE" ? "ready" : "processing");
        setMessage(`Current provider status: ${payload.voice.status}.`);
        if (payload.voice.status === "ACTIVE") onOpenVoiceLibrary(payload.voice.id);
      } else {
        setStatus("failed");
        setMessage("Voice is no longer returned by the provider.");
      }
      await onRefreshVoices();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function retryClone() {
    setBusyAction("retry");
    await startClone();
    setBusyAction(null);
  }

  async function removeClonedVoice() {
    if (!voiceId) return;
    setBusyAction("delete");
    try {
      await deleteVoice(voiceId);
      await onDeleteVoice(voiceId);
      setVoiceId("");
      setStatus("idle");
      setMessage("Voice deleted. You can upload and clone again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="workspace">
      <PageTitle eyebrow="Voice Clone" title="Create a private voice" text="Upload or record a reference sample, pass the quality and consent checks, and create a reusable voice ID." />
      <Stepper steps={["Upload", "Consent", "Check", "Create", "Save"]} active={activeStep} />
      <div className="step-grid">
        <section className="panel upload-zone">
          <div className="panel-header"><span>1. Upload sample</span><span>mp3 / wav / m4a / ogg</span></div>
          <label className="drop-area" htmlFor="clone-file">
            {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Drop audio here or click to upload"}
          </label>
          <input id="clone-file" type="file" accept=".wav,.mp3,.m4a,.ogg,audio/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <label className="check-row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I confirm I have rights to use this voice.</label>
          <button className="primary-button full" disabled={!confirmed || !file || status === "uploading" || status === "processing"} onClick={startClone}>{status === "uploading" || status === "processing" ? "Cloning..." : "Start clone"}</button>
        </section>
        <section className="panel">
          <div className="panel-header"><span>2. Quality check</span></div>
          <ul className="quality-list">
            <li><span /> Clear speech</li>
            <li><span /> Single speaker</li>
            <li><span /> Low noise</li>
            <li><span /> Enough duration</li>
          </ul>
          <div className="spectrum"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <p className={`inline-note ${status === "failed" ? "error-note" : ""}`}>{message}</p>
        </section>
        <section className="panel">
          <div className="panel-header"><span>3. Voice asset</span><span>voice_id</span></div>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Visibility<select><option>Private</option><option>Team</option></select></label>
          <code className="block-code">{voiceId || "pending_from_mosi"}</code>
          <div className="chip-row">
            <button onClick={() => void refreshStatus()} disabled={!voiceId || busyAction !== null}>{busyAction === "refresh" ? "Refreshing..." : "Refresh status"}</button>
            <button onClick={() => void retryClone()} disabled={!file || !confirmed || busyAction !== null}>{busyAction === "retry" ? "Retrying..." : "Retry"}</button>
            <button onClick={() => setConfirmDeleteOpen(true)} disabled={!voiceId || busyAction !== null}>{busyAction === "delete" ? "Deleting..." : "Delete voice"}</button>
          </div>
          <button className="secondary-button full" disabled={status !== "ready"} onClick={saveVoice}>Open in Voice Library</button>
        </section>
      </div>
      {confirmDeleteOpen && (
        <ConfirmDeleteModal
          title="Delete cloned voice"
          targetName={name}
          detail={`voice_id: ${voiceId}`}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            await removeClonedVoice();
            setConfirmDeleteOpen(false);
          }}
        />
      )}
    </section>
  );
}

function Design({
  onCreateVoice,
  onLog,
  onDeleteVoice,
  onRefreshVoices,
  onOpenVoiceLibrary
}: {
  onCreateVoice: (voice: Voice) => void;
  onLog: (log: ApiLog) => void;
  onDeleteVoice: (voiceId: string) => Promise<void>;
  onRefreshVoices: () => Promise<void>;
  onOpenVoiceLibrary: (voiceId: string) => void;
}) {
  const [prompt, setPrompt] = useState("A calm and warm female narrator for multilingual product tutorials.");
  const [previewText, setPreviewText] = useState("Welcome to Auralith. This preview is generated from a prompt-designed voice.");
  const [voiceName, setVoiceName] = useState("Prompt Designed Voice");
  const [status, setStatus] = useState<"idle" | "generating" | "previewed" | "draft" | "saving" | "saved" | "failed">("idle");
  const [audioBase64, setAudioBase64] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [savedVoiceId, setSavedVoiceId] = useState("");
  const [busyAction, setBusyAction] = useState<"retry" | "refresh" | "delete" | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [cloneSuccessModal, setCloneSuccessModal] = useState<{ name: string; voiceId: string } | null>(null);
  const [message, setMessage] = useState("Describe the voice you want, preview it, save the draft, then clone it into a reusable voice.");

  const activeStep =
    status === "generating" ? 1 :
    status === "previewed" ? 2 :
    status === "draft" ? 3 :
    status === "saving" || status === "saved" ? 4 :
    status === "failed" ? (savedVoiceId ? 4 : audioBase64 ? 3 : 1) :
    0;

  async function regenerate() {
    setStatus("generating");
    setSavedVoiceId("");
    setMessage("Generating prompt-designed voice preview...");
    try {
      const result = await previewDesignedVoice({ text: previewText, instruction: prompt });
      setAudioBase64(result.audioBase64);
      setAudioUrl(toDataUrl(result.audioBase64, result.audioMimeType));
      setStatus("previewed");
      setMessage(`Preview ready. Cost ${result.usage.credit_cost?.toFixed(3) ?? "0"} credits.`);
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/audio/speech",
        model: "auralith-ultra-1.0",
        status: 200,
        requestId: result.requestId,
        latencyMs: result.latencyMs
      });
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Voice design preview failed");
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/audio/speech",
        model: "auralith-ultra-1.0",
        status: 500,
        requestId: makeRequestId(),
        latencyMs: 0,
        errorCode: error instanceof Error ? error.message : "design_failed"
      });
    }
  }

  function saveDraft() {
    if (!audioBase64) return;
    setStatus("draft");
    setMessage("Draft saved. You can now clone this preview into a reusable voice.");
  }

  async function cloneDraft() {
    if (!audioBase64) return;
    setStatus("saving");
    setMessage("Cloning saved draft into a reusable voice...");
    try {
      const result = await saveDesignedVoice(voiceName, audioBase64);
      rememberVoiceOverride(result.clone.voice_id, { source: "designed", name: voiceName, ownedByUser: true });
      if (result.voice) onCreateVoice(result.voice);
      setSavedVoiceId(result.voice?.id || result.clone.voice_id);
      setStatus("saved");
      const nextVoiceId = result.voice?.id || result.clone.voice_id;
      setMessage(`Cloned as ${voiceName} · ${nextVoiceId}.`);
      setCloneSuccessModal({ name: voiceName, voiceId: nextVoiceId });
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/voice/clone",
        model: "auralith-ultra-1.0",
        status: 200,
        requestId: result.requestId,
        latencyMs: 0
      });
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Saving designed voice failed");
    }
  }

  async function refreshSavedVoice() {
    if (!savedVoiceId) return;
    setBusyAction("refresh");
    try {
      const payload = await fetchVoiceStatus(savedVoiceId);
      if (payload.voice) {
        onCreateVoice(payload.voice);
        setMessage(`Current provider status: ${payload.voice.status}.`);
      } else {
        setMessage("Saved voice is no longer returned by the provider.");
      }
      await onRefreshVoices();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function retryPreview() {
    setBusyAction("retry");
    await regenerate();
    setBusyAction(null);
  }

  async function removeDesignedVoice() {
    if (!savedVoiceId) return;
    setBusyAction("delete");
    try {
      await deleteVoice(savedVoiceId);
      await onDeleteVoice(savedVoiceId);
      setSavedVoiceId("");
      setStatus("draft");
      setMessage("Cloned voice deleted. Draft is still available if you want to clone again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="workspace">
      <PageTitle eyebrow="Voice Design" title="Design voices from prompts" text="Generate a preview, save it as a draft, then clone it into a reusable voice ID." />
      <Stepper steps={["Prompt", "Generate", "Preview", "Save Draft", "Clone Voice"]} active={activeStep} />
      <div className="design-grid">
        <section className="panel">
          <div className="panel-header"><span>Prompt</span><span>guided</span></div>
          <textarea className="large-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <label>Preview text<textarea className="large-input" value={previewText} onChange={(event) => setPreviewText(event.target.value)} /></label>
          <label>Voice name<input value={voiceName} onChange={(event) => setVoiceName(event.target.value)} /></label>
          <div className="chip-row">
            {["Warm", "Calm", "Narration", "Customer Support", "Character"].map((chip) => (
              <button key={chip} onClick={() => setPrompt((value) => `${value} ${chip.toLowerCase()}.`)}>{chip}</button>
            ))}
          </div>
          <button className="primary-button full" onClick={regenerate} disabled={status === "generating" || status === "saving"}>{status === "generating" ? "Generating..." : "Generate preview"}</button>
        </section>
        <section className="panel design-preview-panel">
          <div className="panel-header"><span>Preview</span></div>
          <h3>{voiceName}</h3>
          {audioUrl ? <audio className="native-audio" controls src={audioUrl} /> : <p className="inline-note">No preview generated yet.</p>}
          <p className={`inline-note ${status === "failed" ? "error-note" : ""}`}>{message}</p>
          <div className="chip-row">
            <button onClick={() => void retryPreview()} disabled={busyAction !== null || status === "generating"}>{busyAction === "retry" ? "Retrying..." : "Retry preview"}</button>
            <button className="secondary-button" onClick={saveDraft} disabled={!audioBase64 || status === "generating" || status === "saving" || status === "saved"}>
              {status === "draft" || status === "saved" ? "Draft saved" : "Save draft"}
            </button>
          </div>
        </section>
        <section className="panel design-clone-panel">
          <div className="panel-header"><span>Clone Voice</span></div>
          <label>Voice name<input value={voiceName} onChange={(event) => setVoiceName(event.target.value)} /></label>
          <label>Visibility<select><option>Private</option><option>Team</option></select></label>
          <code className="block-code">{savedVoiceId || "voice_id will appear after cloning"}</code>
          <div className="chip-row">
            <button onClick={() => void refreshSavedVoice()} disabled={!savedVoiceId || busyAction !== null}>{busyAction === "refresh" ? "Refreshing..." : "Refresh status"}</button>
            <button onClick={() => setConfirmDeleteOpen(true)} disabled={!savedVoiceId || busyAction !== null}>{busyAction === "delete" ? "Deleting..." : "Delete voice"}</button>
          </div>
          <button className="primary-button full" onClick={cloneDraft} disabled={status !== "draft"}>
            {status === "saving" ? "Cloning..." : status === "saved" ? "Cloned" : "Clone as voice"}
          </button>
        </section>
      </div>
      {confirmDeleteOpen && (
        <ConfirmDeleteModal
          title="Delete designed voice"
          targetName={voiceName}
          detail={`voice_id: ${savedVoiceId}`}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            await removeDesignedVoice();
            setConfirmDeleteOpen(false);
          }}
        />
      )}
      {cloneSuccessModal && (
        <Modal title="Clone completed" onClose={() => setCloneSuccessModal(null)}>
          <p className="inline-note">Voice cloned successfully.</p>
          <code className="block-code">{`${cloneSuccessModal.name} · ${cloneSuccessModal.voiceId}`}</code>
          <div className="modal-actions">
            <button className="secondary-button full" onClick={() => setCloneSuccessModal(null)}>Stay here</button>
            <button
              className="primary-button full"
              onClick={() => {
                const targetId = cloneSuccessModal.voiceId;
                setCloneSuccessModal(null);
                onOpenVoiceLibrary(targetId);
              }}
            >
              Open Voice Library
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function Docs() {
  const [copied, setCopied] = useState(false);
  const [section, setSection] = useState("Quickstart");
  const sections = ["Quickstart", "Authentication", "HTTP TTS", "WebSocket", "Voices", "Errors", "Rate limits"];
  const curl = `curl https://studio.mosi.cn/v1/audio/tts \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "moss-tts",
    "voice_id": "2056406571142877184",
    "text": "Hello from Auralith."
  }'`;
  return (
    <section className="workspace docs-layout">
      <aside className="docs-nav panel">
        {sections.map((item) => (
          <button className={section === item ? "active" : ""} key={item} onClick={() => setSection(item)}>{item}</button>
        ))}
      </aside>
      <article className="panel docs-content">
        <span className="eyebrow">Developer Docs</span>
        <h1>{docsContent[section].title}</h1>
        <p>{docsContent[section].text}</p>
        <p className="inline-note">This prototype uses a local `/api/mosi/*` proxy in development so the API key never reaches the browser.</p>
        <div className="panel-header"><span>cURL</span><button className="copy-button" onClick={async () => { await copyToClipboard(curl); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button></div>
        <pre><code>{curl}</code></pre>
        <table className="data-table">
          <thead><tr><th>Error code</th><th>Meaning</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>4004</td><td>Voice ID not found or not permitted</td><td>Check the live voice library or clone the voice again</td></tr>
            <tr><td>4290</td><td>Request rate exceeded</td><td>Reduce concurrency or retry later</td></tr>
            <tr><td>5000</td><td>Internal server error</td><td>Capture the request ID and investigate</td></tr>
          </tbody>
        </table>
      </article>
    </section>
  );
}

function Usage({
  role,
  generations,
  logs,
  onSelectLog,
  usagePolicy,
  onUpdateUsagePolicy,
  usageSnapshots,
  voices,
  voiceGovernance,
  onUpdateVoiceGovernance
}: {
  role: Role;
  generations: Generation[];
  logs: ApiLog[];
  onSelectLog: (log: ApiLog) => void;
  usagePolicy: UsagePolicy;
  onUpdateUsagePolicy: (nextPolicy: UsagePolicy) => void;
  usageSnapshots: UsageSnapshot[];
  voices: Voice[];
  voiceGovernance: Record<string, VoiceGovernance>;
  onUpdateVoiceGovernance: (voiceId: string, patch: Partial<VoiceGovernance>) => void;
}) {
  const chars = generations.reduce((total, item) => total + item.characters, 0);
  const isAdmin = role === "Admin";
  const [draftPolicy, setDraftPolicy] = useState(usagePolicy);
  const [windowSize, setWindowSize] = useState<"6h" | "12h" | "all">("12h");
  const [usageMetric, setUsageMetric] = useState<"characters" | "requests">("characters");
  const [voiceSourceFilter, setVoiceSourceFilter] = useState<"All" | "System" | "Cloned" | "Designed">("All");
  const [governanceQuery, setGovernanceQuery] = useState("");
  const effectiveQuota = Math.max(usagePolicy.monthlyQuota, 1);
  const usedPercent = Math.round((chars / effectiveQuota) * 100);
  const overLimit = usedPercent >= usagePolicy.alertThreshold;
  const governanceCandidates = voices.filter((voice) => {
    const sourceMatches = voiceSourceFilter === "All" || voice.source === voiceSourceFilter.toLowerCase();
    const query = governanceQuery.trim().toLowerCase();
    const queryMatches = !query || `${voice.name} ${voice.id} ${voice.style}`.toLowerCase().includes(query);
    return sourceMatches && queryMatches;
  });
  const governedVoices = governanceCandidates.slice(0, 6).map((voice) => ({
    voice,
    policy: voiceGovernance[voice.id] ?? makeDefaultGovernance(voice)
  }));
  const voiceMap = useMemo(() => new Map(voices.map((voice) => [voice.id, voice])), [voices]);
  const filteredSnapshots = windowSize === "6h" ? usageSnapshots.slice(-3) : windowSize === "12h" ? usageSnapshots.slice(-6) : usageSnapshots;
  const modelStats = models.map((model) => {
    const entries = generations.filter((generation) => generation.model === model.id);
    return {
      label: model.name,
      detail: `${entries.length} requests`,
      value: usageMetric === "characters" ? entries.reduce((sum, generation) => sum + generation.characters, 0) : entries.length
    };
  }).sort((left, right) => right.value - left.value);
  const topVoiceStats = Array.from(
    generations.reduce((map, generation) => {
      const voice = voiceMap.get(generation.voiceId);
      if (voiceSourceFilter !== "All" && voice?.source !== voiceSourceFilter.toLowerCase()) return map;
      const current = map.get(generation.voiceId) ?? { requests: 0, characters: 0 };
      map.set(generation.voiceId, {
        requests: current.requests + 1,
        characters: current.characters + generation.characters
      });
      return map;
    }, new Map<string, { requests: number; characters: number }>())
  )
    .map(([voiceId, stats]) => ({
      label: voiceMap.get(voiceId)?.name ?? voiceId,
      detail: `${stats.requests} requests`,
      value: usageMetric === "characters" ? stats.characters : stats.requests
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

  useEffect(() => {
    setDraftPolicy(usagePolicy);
  }, [usagePolicy]);

  return (
    <section className="workspace">
      <PageTitle
        eyebrow="Usage"
        title={isAdmin ? "Team usage and API health" : "My usage and API health"}
        text={isAdmin ? "Track team-wide character volume, success rate, latency, error codes, and model mix." : "Track usage, latency, and error states from the current developer or API key perspective."}
      />
      <div className="alert-grid">
        <div className={`alert-card ${overLimit ? "warn" : "ready"}`}>
          <b>{overLimit ? "Quota warning" : "Quota healthy"}</b>
          <span>{isAdmin ? (overLimit ? "Team usage is nearing the configured threshold. Review pricing or raise the quota policy." : "Team usage is within the configured threshold.") : (overLimit ? "This API key is nearing its current threshold. Contact an admin or switch environments." : "This API key is operating within the configured threshold.")}</span>
          <a href={isAdmin ? "#pricing" : "#docs"}>{isAdmin ? "Review plans" : "Review limits"}</a>
        </div>
        <div className="alert-card">
          <b>Error state</b>
          <span>{isAdmin ? "One rate-limited request was recorded in the last 24 hours. Review logs for the request context." : "One rate-limited request was recorded for this developer or API key in the last 24 hours."}</span>
          <a href="#logs">Inspect logs</a>
        </div>
      </div>
      <div className="metric-grid">
        <MetricCard label="Characters" value={`${chars.toLocaleString()}`} detail={isAdmin ? "team total" : "my API key"} />
        <MetricCard label="Success rate" value="99.3%" detail={isAdmin ? "team last 24h" : "my last 24h"} />
        <MetricCard label="Avg latency" value="812ms" detail="HTTP TTS" />
        <MetricCard label="Streaming sessions" value={isAdmin ? "4,820" : "318"} detail={isAdmin ? "team this month" : "my this month"} />
      </div>
      <div className="dashboard-controls panel">
        <Select label="Window" value={windowSize} onChange={setWindowSize} options={["6h", "12h", "all"]} />
        <Select label="Metric" value={usageMetric} onChange={setUsageMetric} options={["characters", "requests"]} />
        <Select label="Voice source" value={voiceSourceFilter} onChange={setVoiceSourceFilter} options={["All", "System", "Cloned", "Designed"]} />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-header"><span>Usage timeline</span><span>{windowSize === "all" ? "all points" : `last ${windowSize}`}</span></div>
          <UsageTimelineChart data={filteredSnapshots} />
        </section>
        <section className="panel chart-panel">
          <div className="panel-header"><span>Model consumption</span><span>{usageMetric}</span></div>
          <UsageBarList items={modelStats} />
        </section>
        <section className="panel chart-panel">
          <div className="panel-header"><span>Top voices</span><span>{usageMetric}</span></div>
          <UsageBarList items={topVoiceStats} />
        </section>
      </div>
      {isAdmin && (
        <div className="team-grid">
          <section className="panel table-panel">
            <div className="panel-header"><span>Quota controls</span><span>Internal admin</span></div>
            <div className="control-grid">
              <label>
                Monthly quota
                <input
                  type="number"
                  value={draftPolicy.monthlyQuota}
                  onChange={(event) => setDraftPolicy((current) => ({ ...current, monthlyQuota: Number(event.target.value) || 0 }))}
                />
              </label>
              <label>
                Concurrency limit
                <input
                  type="number"
                  value={draftPolicy.concurrencyLimit}
                  onChange={(event) => setDraftPolicy((current) => ({ ...current, concurrencyLimit: Number(event.target.value) || 0 }))}
                />
              </label>
              <label>
                Alert threshold %
                <input
                  type="number"
                  value={draftPolicy.alertThreshold}
                  onChange={(event) => setDraftPolicy((current) => ({ ...current, alertThreshold: Number(event.target.value) || 0 }))}
                />
              </label>
              <label>
                Overage action
                <select
                  value={draftPolicy.overageAction}
                  onChange={(event) => setDraftPolicy((current) => ({ ...current, overageAction: event.target.value as UsagePolicy["overageAction"] }))}
                >
                  <option>Notify</option>
                  <option>Throttle</option>
                  <option>Block</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button full" onClick={() => setDraftPolicy(usagePolicy)}>Reset</button>
              <button className="primary-button full" onClick={() => onUpdateUsagePolicy(draftPolicy)}>Save policy</button>
            </div>
          </section>
          <section className="panel table-panel">
            <div className="panel-header"><span>Policy summary</span><span>live</span></div>
            <ul className="audit-list">
              <li>Monthly quota <b>{usagePolicy.monthlyQuota.toLocaleString()} chars</b></li>
              <li>Concurrency limit <b>{usagePolicy.concurrencyLimit}</b></li>
              <li>Alert threshold <b>{usagePolicy.alertThreshold}%</b></li>
              <li>Overage action <b>{usagePolicy.overageAction}</b></li>
            </ul>
            <p className="inline-note">Current consumption is {usedPercent}% of the configured monthly quota.</p>
          </section>
        </div>
      )}
      <section className="panel table-panel">
        <div className="panel-header"><span>{isAdmin ? "Recent team API logs" : "Recent my API logs"}</span><span>live</span></div>
        <table className="data-table">
          <thead><tr><th>Time</th><th>Endpoint</th><th>Model</th><th>Status</th><th>request_id</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.requestId} onClick={() => onSelectLog(log)} className="clickable-row">
                <td>{log.time}</td>
                <td>{log.endpoint}</td>
                <td>{log.model}</td>
                <td><span className={`status-pill ${log.status === 200 ? "ready" : "warn"}`}>{log.status}</span></td>
                <td>{log.requestId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {isAdmin && (
        <section className="panel table-panel section-card">
          <div className="panel-header"><span>Voice governance</span><span>{governedVoices.length} tracked</span></div>
          <div className="control-grid compact">
            <label>
              Search voices
              <input value={governanceQuery} onChange={(event) => setGovernanceQuery(event.target.value)} placeholder="voice name or id" />
            </label>
            <label>
              Source scope
              <select value={voiceSourceFilter} onChange={(event) => setVoiceSourceFilter(event.target.value as "All" | "System" | "Cloned" | "Designed")}>
                <option>All</option>
                <option>System</option>
                <option>Cloned</option>
                <option>Designed</option>
              </select>
            </label>
          </div>
          <table className="data-table">
            <thead><tr><th>Voice</th><th>Source</th><th>Visibility</th><th>Review</th><th>Consent</th></tr></thead>
            <tbody>
              {governedVoices.map(({ voice, policy }) => (
                <tr key={voice.id}>
                  <td>{voice.name}</td>
                  <td>{voice.source}</td>
                  <td>
                    <select value={policy.visibility} onChange={(event) => onUpdateVoiceGovernance(voice.id, { visibility: event.target.value as VoiceGovernance["visibility"] })}>
                      <option>Public</option>
                      <option>Private</option>
                      <option>Restricted</option>
                    </select>
                  </td>
                  <td>
                    <select value={policy.reviewStatus} onChange={(event) => onUpdateVoiceGovernance(voice.id, { reviewStatus: event.target.value as VoiceGovernance["reviewStatus"] })}>
                      <option>Approved</option>
                      <option>Needs review</option>
                      <option>Flagged</option>
                    </select>
                  </td>
                  <td>
                    <select value={policy.consentStatus} onChange={(event) => onUpdateVoiceGovernance(voice.id, { consentStatus: event.target.value as VoiceGovernance["consentStatus"] })}>
                      <option>Verified</option>
                      <option>Pending</option>
                      <option>Missing</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}

function Logs({
  role,
  logs,
  onSelectLog,
  apiKeys,
  auditEvents,
  onCreateApiKey,
  onToggleApiKeyStatus
}: {
  role: Role;
  logs: ApiLog[];
  onSelectLog: (log: ApiLog) => void;
  apiKeys: ApiKey[];
  auditEvents: AuditEvent[];
  onCreateApiKey: () => void;
  onToggleApiKeyStatus: (keyId: string) => void;
}) {
  const isAdmin = role === "Admin";
  const [query, setQuery] = useState("");
  const [modelFilter, setModelFilter] = useState<"All" | ModelId>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Success" | "Error">("All");
  const [severityFilter, setSeverityFilter] = useState<"All" | AuditEvent["severity"]>("All");
  const [copiedExport, setCopiedExport] = useState(false);
  const filteredLogs = logs.filter((log) => {
    const queryMatches = !query.trim() || `${log.requestId} ${log.endpoint} ${log.model} ${log.errorCode ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const modelMatches = modelFilter === "All" || log.model === modelFilter;
    const statusMatches = statusFilter === "All" || (statusFilter === "Success" ? log.status < 400 : log.status >= 400);
    return queryMatches && modelMatches && statusMatches;
  });
  const filteredAuditEvents = auditEvents.filter((event) => severityFilter === "All" || event.severity === severityFilter);

  async function copyLogExport() {
    const csv = [
      ["time", "endpoint", "model", "latency_ms", "status", "request_id", "error_code"].join(","),
      ...filteredLogs.map((log) => [log.time, log.endpoint, log.model, log.latencyMs, log.status, log.requestId, log.errorCode ?? ""].map((field) => `"${String(field).replace(/"/g, "\"\"")}"`).join(","))
    ].join("\n");
    await copyToClipboard(csv);
    setCopiedExport(true);
    window.setTimeout(() => setCopiedExport(false), 1200);
  }

  return (
    <section className="workspace">
      <PageTitle
        eyebrow="Logs"
        title={isAdmin ? "Team request logs" : "My request logs"}
        text={isAdmin ? "Investigate team API requests by actor, endpoint, model, status code, and request ID." : "Investigate requests from the current developer or API key by endpoint, model, status code, and request ID."}
      />
      <div className="dashboard-controls panel">
        <label>
          Search
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="request ID or endpoint" />
        </label>
        <Select label="Model" value={modelFilter} onChange={setModelFilter} options={["All", "auralith-one-1.0", "auralith-ultra-1.0"]} />
        <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={["All", "Success", "Error"]} />
        {isAdmin && <Select label="Audit severity" value={severityFilter} onChange={setSeverityFilter} options={["All", "info", "warn", "critical"]} />}
      </div>
      <section className="panel table-panel">
        <div className="panel-header">
          <span>{isAdmin ? "API Logs" : "My API Logs"}</span>
          <div className="pricing-card-actions">
            <span>{filteredLogs.length} requests</span>
            <button className="secondary-button small" onClick={() => void copyLogExport()}>{copiedExport ? "Copied CSV" : "Copy CSV"}</button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Time</th><th>Endpoint</th><th>Model</th><th>Latency</th><th>Status</th><th>request_id</th></tr></thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr className="clickable-row" key={log.requestId} onClick={() => onSelectLog(log)}>
                <td>{log.time}</td><td>{log.endpoint}</td><td>{log.model}</td><td>{log.latencyMs}ms</td>
                <td><span className={`status-pill ${log.status === 200 ? "ready" : "warn"}`}>{log.status}</span></td><td>{log.requestId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {isAdmin && (
        <>
          <div className="team-grid">
            <section className="panel table-panel">
              <div className="panel-header"><span>API keys & scopes</span><button className="secondary-button small" onClick={onCreateApiKey}>Create key</button></div>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Scopes</th><th>Status</th><th>Last used</th><th>Action</th></tr></thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td>{key.name}</td>
                      <td>{key.scopes.join(", ")}</td>
                      <td><span className={`status-pill ${key.status === "Active" ? "ready" : "warn"}`}>{key.status}</span></td>
                      <td>{key.lastUsedAt}</td>
                      <td><button className="secondary-button small" onClick={() => onToggleApiKeyStatus(key.id)}>{key.status === "Active" ? "Disable" : "Enable"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="panel table-panel">
              <div className="panel-header"><span>Admin audit trail</span><span>{filteredAuditEvents.length} events</span></div>
              <table className="data-table">
                <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Severity</th></tr></thead>
                <tbody>
                  {filteredAuditEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.time}</td>
                      <td>{event.actor}</td>
                      <td>{event.action}</td>
                      <td>{event.resource}</td>
                      <td><span className={`status-pill ${event.severity === "info" ? "ready" : "warn"} ${event.severity === "critical" ? "critical" : ""}`}>{event.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </section>
  );
}

function Team({
  members,
  apiKeys,
  auditEvents,
  onCreateApiKey,
  onInviteMember,
  onUpdateMember,
  onRemoveMember
}: {
  members: TeamMember[];
  apiKeys: ApiKey[];
  auditEvents: AuditEvent[];
  onCreateApiKey: () => void;
  onInviteMember: (email: string, role: TeamMember["role"]) => void;
  onUpdateMember: (email: string, patch: Partial<TeamMember>) => void;
  onRemoveMember: (email: string) => void;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [query, setQuery] = useState("");
  const filteredMembers = members.filter((member) => {
    const haystack = `${member.name} ${member.email} ${member.role} ${member.status}`.toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  });

  return (
    <section className="workspace">
      <PageTitle eyebrow="Team" title="Members, roles, and audit logs." text="Manage team members, API permissions, voice access, and high-risk operational actions." />
      <div className="dashboard-controls panel">
        <label>
          Search members
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="name, email, or role" />
        </label>
        <MetricCard label="Members" value={String(members.length)} detail="active workspace identities" />
        <MetricCard label="Active keys" value={String(apiKeys.filter((key) => key.status === "Active").length)} detail="usable credentials" />
      </div>
      <div className="team-grid">
        <section className="panel table-panel">
          <div className="panel-header"><span>Members</span><button className="secondary-button small" onClick={() => setShowInvite(true)}>Invite</button></div>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.email}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>
                    {member.role === "Owner" ? (
                      member.role
                    ) : (
                      <select value={member.role} onChange={(event) => onUpdateMember(member.email, { role: event.target.value as TeamMember["role"] })}>
                        <option>Admin</option>
                        <option>Developer</option>
                        <option>Creator</option>
                        <option>Viewer</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <select value={member.status} onChange={(event) => onUpdateMember(member.email, { status: event.target.value as TeamMember["status"] })}>
                      <option>Active</option>
                      <option>Pending</option>
                    </select>
                  </td>
                  <td>
                    <button className="secondary-button small" onClick={() => onRemoveMember(member.email)} disabled={member.role === "Owner"}>
                      {member.role === "Owner" ? "Protected" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel table-panel">
          <div className="panel-header"><span>Recent audit activity</span><span>{auditEvents.length} events</span></div>
          <table className="data-table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th></tr></thead>
            <tbody>
              {auditEvents.slice(0, 6).map((event) => (
                <tr key={event.id}>
                  <td>{event.time}</td>
                  <td>{event.actor}</td>
                  <td>{event.action}</td>
                  <td>{event.resource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <section className="panel table-panel section-card">
        <div className="panel-header"><span>API Keys & scopes</span><button className="secondary-button small" onClick={onCreateApiKey}>Create key</button></div>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Scopes</th><th>Status</th><th>Last used</th></tr></thead>
          <tbody>{apiKeys.map((key) => <tr key={key.id}><td>{key.name}</td><td>{key.scopes.join(", ")}</td><td>{key.status}</td><td>{key.lastUsedAt}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel table-panel section-card">
        <div className="panel-header"><span>Role matrix</span><span>scopes</span></div>
        <table className="data-table">
          <thead><tr><th>Permission</th><th>Owner</th><th>Admin</th><th>Developer</th><th>Creator</th><th>Viewer</th></tr></thead>
          <tbody>
            {["API Key management", "Voice creation", "Billing", "Usage logs", "Playground"].map((permission, index) => (
              <tr key={permission}><td>{permission}</td><td>✓</td><td>✓</td><td>{index === 2 ? "—" : "✓"}</td><td>{index > 2 ? "✓" : "—"}</td><td>{index === 3 ? "✓" : "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={(email, nextRole) => {
            onInviteMember(email, nextRole);
            setShowInvite(false);
          }}
        />
      )}
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function UsageTimelineChart({ data }: { data: UsageSnapshot[] }) {
  const maxChars = Math.max(...data.map((item) => item.characters), 1);

  return (
    <div className="timeline-chart" aria-label="Usage timeline chart">
      {data.map((item) => (
        <div className="timeline-column" key={item.time}>
          <span className="timeline-value">{Math.round(item.characters / 1000)}k</span>
          <div className="timeline-bar-wrap">
            <div className="timeline-bar" style={{ height: `${Math.max(14, (item.characters / maxChars) * 100)}%` }} />
          </div>
          <strong>{item.time}</strong>
          <small>{item.requests} req</small>
        </div>
      ))}
    </div>
  );
}

function UsageBarList({ items }: { items: { label: string; detail: string; value: number }[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="usage-bar-list">
      {items.map((item) => (
        <div className="usage-bar-row" key={item.label}>
          <div className="usage-bar-meta">
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </div>
          <div className="usage-bar-track">
            <div className="usage-bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <b>{item.value.toLocaleString()}</b>
        </div>
      ))}
    </div>
  );
}

const docsContent: Record<string, { title: string; text: string }> = {
  Quickstart: { title: "Generate speech with one MOSI request.", text: "Fetch an available voice ID from `/api/v1/voices`, then call `POST /v1/audio/tts` to receive base64-encoded WAV audio." },
  Authentication: { title: "Authenticate with API keys.", text: "All MOSI requests use a Bearer token. This prototype reads the token from a local proxy via `.env.local` so the browser never receives the secret." },
  "HTTP TTS": { title: "Text to Speech API.", text: "This prototype integrates `POST https://studio.mosi.cn/v1/audio/tts` using `model: moss-tts`, `text`, and `voice_id`." },
  WebSocket: { title: "Streaming TTS over WebSocket.", text: "The current prototype keeps the streaming information architecture in place, but does not yet implement the provider's real-time protocol." },
  Voices: { title: "Voice management.", text: "The app integrates `GET /api/v1/voices`, `POST /api/v1/files/upload`, and `POST /api/v1/voice/clone` to load the live library and create new voices." },
  Errors: { title: "Structured errors.", text: "Known MOSI error codes include 4000, 4001, 4004, 4290, and 5000. Failed requests surface directly in the Playground, Clone, and Design flows." },
  "Rate limits": { title: "Rate limits and quotas.", text: "Quota and overage policy are configurable in the Admin workspace and persist through the local admin state, while real generation costs surface as `credit_cost` in the response." }
};

function Pricing({
  role,
  plans,
  drafts,
  onUpdatePlan,
  onPublishChanges,
  onResetDrafts,
  onAddDraft,
  onRemoveDraft,
  onDuplicateDraft,
  onMoveDraft
}: {
  role: Role;
  plans: PricingPlan[];
  drafts: PricingPlan[];
  onUpdatePlan: (planId: string, patch: Partial<PricingPlan>) => void;
  onPublishChanges: () => void;
  onResetDrafts: () => void;
  onAddDraft: () => void;
  onRemoveDraft: (planId: string) => void;
  onDuplicateDraft: (planId: string) => void;
  onMoveDraft: (planId: string, direction: -1 | 1) => void;
}) {
  const isAdmin = role === "Admin";
  const draftDirty = JSON.stringify(plans) !== JSON.stringify(drafts.map((draft) => ({ ...draft, status: "Published" })));
  const publishedPlanIds = new Set(plans.map((plan) => plan.id));
  const draftValidation = drafts.map((plan) => ({ id: plan.id, errors: getPricingValidationErrors(plan) }));
  const hasDraftErrors = draftValidation.some((item) => item.errors.length > 0);
  const publishedMap = new Map(plans.map((plan) => [plan.id, plan]));

  return (
    <section className="workspace">
      <PageTitle
        eyebrow="Pricing"
        title="Plans for API scale."
        text={isAdmin ? "All roles can review plans here, while internal admins can maintain pricing, quotas, plan benefits, and CTA labels." : "Review currently available plans, character quotas, and model access levels."}
      />
      <div className="alert-grid">
        <article className="alert-card ready">
          <strong>Visible to all roles</strong>
          <span>`Pricing` is available to Admin, Developer, and Creator roles so plan differences are visible before adoption or upgrade decisions.</span>
        </article>
        <article className="alert-card">
          <strong>{isAdmin ? "Admin edit mode" : "Read-only mode"}</strong>
          <span>{isAdmin ? (hasDraftErrors ? "Resolve validation issues before publishing pricing changes." : draftDirty ? "Draft changes are staged in the editor and will not affect the published cards until you publish them." : "No unpublished pricing changes are currently staged.") : "Plan details are maintained by internal admins and are not editable from your role."}</span>
        </article>
      </div>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <article className={`panel price-card ${plan.highlighted ? "featured-plan" : ""}`} key={plan.id}>
            <span className="eyebrow">{plan.name}</span>
            <h2>{plan.price}</h2>
            <p>{plan.quota}</p>
            <ul>
              <li>{plan.modelAccess}</li>
              <li>{plan.teamSeats}</li>
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <button className={plan.highlighted ? "primary-button full" : "secondary-button full"}>{plan.ctaLabel}</button>
          </article>
        ))}
      </div>
      {isAdmin && (
        <section className="panel pricing-editor">
          <div className="panel-header">
            <span>Pricing editor</span>
            <span>{draftDirty ? "Draft staged" : "Published state"}</span>
          </div>
          <div className="pricing-editor-banner">
            <span className={`status-pill ${draftDirty ? "warn" : "ready"}`}>{draftDirty ? "Unpublished changes" : "Published"}</span>
            <p>Published cards remain stable for all users until the draft is published.</p>
          </div>
          <div className="pricing-admin-grid">
            <section className="panel pricing-preview-panel">
              <div className="panel-header">
                <span>Published plans</span>
                <span>{plans.length} live</span>
              </div>
              <div className="pricing-mini-list">
                {plans.map((plan) => (
                  <article className="pricing-mini-card" key={plan.id}>
                    <strong>{plan.name}</strong>
                    <span>{plan.price} · {plan.quota}</span>
                    <small>{plan.modelAccess}</small>
                  </article>
                ))}
              </div>
            </section>
            <section className="panel pricing-preview-panel">
              <div className="panel-header">
                <span>Draft preview</span>
                <button className="secondary-button small" onClick={onAddDraft}>Add plan</button>
              </div>
              <div className="pricing-mini-list">
                {drafts.map((plan) => (
                  <article className="pricing-mini-card" key={plan.id}>
                    <strong>{plan.name}</strong>
                    <span>{plan.price} · {plan.quota}</span>
                    <small>{publishedPlanIds.has(plan.id) ? "Editing existing published plan" : "New draft plan"}</small>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <div className="pricing-editor-grid">
            {drafts.map((plan, index) => (
              <article className="pricing-editor-card" key={plan.id}>
                <div className="panel-header">
                  <span>{plan.name}</span>
                  <div className="pricing-card-actions">
                    <span>{plan.status || "Draft"}</span>
                    <button className="ghost-action" onClick={() => onMoveDraft(plan.id, -1)} disabled={index === 0}>Up</button>
                    <button className="ghost-action" onClick={() => onMoveDraft(plan.id, 1)} disabled={index === drafts.length - 1}>Down</button>
                    <button className="ghost-action" onClick={() => onDuplicateDraft(plan.id)}>Duplicate</button>
                    <button className="ghost-action" onClick={() => onRemoveDraft(plan.id)}>Remove</button>
                  </div>
                </div>
                {publishedMap.has(plan.id) && (
                  <p className="inline-note">Published now: {publishedMap.get(plan.id)?.price} · {publishedMap.get(plan.id)?.quota}</p>
                )}
                <div className="control-grid">
                  <label>
                    Plan name
                    <input value={plan.name} onChange={(event) => onUpdatePlan(plan.id, { name: event.target.value })} />
                  </label>
                  <label>
                    Price
                    <input value={plan.price} onChange={(event) => onUpdatePlan(plan.id, { price: event.target.value })} />
                  </label>
                  <label>
                    Quota
                    <input value={plan.quota} onChange={(event) => onUpdatePlan(plan.id, { quota: event.target.value })} />
                  </label>
                  <label>
                    Model access
                    <input value={plan.modelAccess} onChange={(event) => onUpdatePlan(plan.id, { modelAccess: event.target.value })} />
                  </label>
                  <label>
                    Team seats
                    <input value={plan.teamSeats} onChange={(event) => onUpdatePlan(plan.id, { teamSeats: event.target.value })} />
                  </label>
                  <label>
                    CTA label
                    <input value={plan.ctaLabel} onChange={(event) => onUpdatePlan(plan.id, { ctaLabel: event.target.value })} />
                  </label>
                  <label className="check-row pricing-check">
                    <input type="checkbox" checked={Boolean(plan.highlighted)} onChange={(event) => onUpdatePlan(plan.id, { highlighted: event.target.checked })} />
                    Featured recommendation
                  </label>
                </div>
                <label>
                  Features
                  <textarea
                    className="pricing-feature-input"
                    value={plan.features.join("\n")}
                    onChange={(event) =>
                      onUpdatePlan(plan.id, {
                        features: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean)
                      })
                    }
                  />
                </label>
                {draftValidation.find((item) => item.id === plan.id)?.errors.length ? (
                  <ul className="validation-list">
                    {draftValidation.find((item) => item.id === plan.id)?.errors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                ) : (
                  <p className="inline-note">Draft is valid and ready to publish.</p>
                )}
              </article>
            ))}
          </div>
          <div className="pricing-publish-row">
            <p className="inline-note">Publish after editing to update the visible plan cards and record the change in the internal audit trail.</p>
            <div className="pricing-actions">
              <button className="secondary-button" onClick={onResetDrafts} disabled={!draftDirty}>Reset draft</button>
              <button className="primary-button" onClick={onPublishChanges} disabled={!draftDirty || hasDraftErrors}>Publish pricing update</button>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

function Safety({
  voices,
  apiKeys,
  usagePolicy,
  auditEvents,
  voiceGovernance,
  onUpdateVoiceGovernance
}: {
  voices: Voice[];
  apiKeys: ApiKey[];
  usagePolicy: UsagePolicy;
  auditEvents: AuditEvent[];
  voiceGovernance: Record<string, VoiceGovernance>;
  onUpdateVoiceGovernance: (voiceId: string, patch: Partial<VoiceGovernance>) => void;
}) {
  const [reviewFilter, setReviewFilter] = useState<"All" | VoiceGovernance["reviewStatus"]>("All");
  const [consentFilter, setConsentFilter] = useState<"All" | VoiceGovernance["consentStatus"]>("All");
  const governedVoices = voices.map((voice) => ({
    voice,
    policy: voiceGovernance[voice.id] ?? makeDefaultGovernance(voice)
  }));
  const filteredVoices = governedVoices.filter(({ policy }) => {
    const reviewMatches = reviewFilter === "All" || policy.reviewStatus === reviewFilter;
    const consentMatches = consentFilter === "All" || policy.consentStatus === consentFilter;
    return reviewMatches && consentMatches;
  });
  const flaggedCount = governedVoices.filter(({ policy }) => policy.reviewStatus === "Flagged").length;
  const pendingConsentCount = governedVoices.filter(({ policy }) => policy.consentStatus !== "Verified").length;
  const disabledKeys = apiKeys.filter((key) => key.status === "Disabled").length;
  const criticalEvents = auditEvents.filter((event) => event.severity === "critical");

  return (
    <section className="workspace">
      <PageTitle eyebrow="Safety" title="Voice safety and enterprise control." text="Build internal trust with consent checks, misuse controls, API permissions, and operational auditability." />
      <div className="metric-grid">
        <MetricCard label="Flagged voices" value={String(flaggedCount)} detail="requires manual review" />
        <MetricCard label="Consent gaps" value={String(pendingConsentCount)} detail="pending or missing evidence" />
        <MetricCard label="Disabled keys" value={String(disabledKeys)} detail="credential risk controls" />
        <MetricCard label="Alert threshold" value={`${usagePolicy.alertThreshold}%`} detail="quota escalation policy" />
      </div>
      <div className="dashboard-controls panel">
        <Select label="Review" value={reviewFilter} onChange={setReviewFilter} options={["All", "Approved", "Needs review", "Flagged"]} />
        <Select label="Consent" value={consentFilter} onChange={setConsentFilter} options={["All", "Verified", "Pending", "Missing"]} />
      </div>
      <div className="team-grid">
        <section className="panel table-panel">
          <div className="panel-header"><span>Voice governance queue</span><span>{filteredVoices.length} voices</span></div>
          <table className="data-table">
            <thead><tr><th>Voice</th><th>Visibility</th><th>Review</th><th>Consent</th></tr></thead>
            <tbody>
              {filteredVoices.slice(0, 8).map(({ voice, policy }) => (
                <tr key={voice.id}>
                  <td>
                    <div className="stack-item">
                      <span>{voice.name}</span>
                      <b>{voice.id}</b>
                    </div>
                  </td>
                  <td>
                    <select value={policy.visibility} onChange={(event) => onUpdateVoiceGovernance(voice.id, { visibility: event.target.value as VoiceGovernance["visibility"] })}>
                      <option>Public</option>
                      <option>Private</option>
                      <option>Restricted</option>
                    </select>
                  </td>
                  <td>
                    <select value={policy.reviewStatus} onChange={(event) => onUpdateVoiceGovernance(voice.id, { reviewStatus: event.target.value as VoiceGovernance["reviewStatus"] })}>
                      <option>Approved</option>
                      <option>Needs review</option>
                      <option>Flagged</option>
                    </select>
                  </td>
                  <td>
                    <select value={policy.consentStatus} onChange={(event) => onUpdateVoiceGovernance(voice.id, { consentStatus: event.target.value as VoiceGovernance["consentStatus"] })}>
                      <option>Verified</option>
                      <option>Pending</option>
                      <option>Missing</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel table-panel">
          <div className="panel-header"><span>Critical audit events</span><span>{criticalEvents.length} events</span></div>
          <table className="data-table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th></tr></thead>
            <tbody>
              {criticalEvents.slice(0, 6).map((event) => (
                <tr key={event.id}>
                  <td>{event.time}</td>
                  <td>{event.actor}</td>
                  <td>{event.action}</td>
                  <td>{event.resource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <div className="feature-grid">
        <Feature href="#clone" icon="AUTH" title="Consent first" text="Voice cloning remains gated behind explicit consent and a governance review queue you can now manage in-place." />
        <Feature href="#team" icon="RBAC" title="Role-based access" text="Team members and API keys are now editable from the Admin workspace instead of staying as static placeholders." />
        <Feature href="#logs" icon="LOG" title="Audit trail" text="Audit events are shared across pricing, key management, team invites, and governance changes." />
        <Feature href="#usage" icon="ERR" title="Policy controls" text="Quota and overage settings continue to feed admin health alerts alongside governance review status." />
      </div>
    </section>
  );
}

function Stepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="stepper">
      {steps.map((step, index) => (
        <li key={step} className={index <= active ? "active" : ""}><span>{index + 1}</span>{step}</li>
      ))}
    </ol>
  );
}

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header"><h2>{title}</h2><button className="icon-button" onClick={onClose}>×</button></div>
        {children}
      </aside>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal panel" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header"><h2>{title}</h2><button className="icon-button" onClick={onClose}>×</button></div>
        {children}
      </section>
    </div>
  );
}

function ApiKeyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, scopes: string[]) => void }) {
  const [name, setName] = useState("staging-key");
  const [scopes, setScopes] = useState(["tts:write", "voices:read"]);
  const allScopes = ["tts:write", "voices:read", "voices:write", "usage:read", "team:read"];
  return (
    <Modal title="Create API Key" onClose={onClose}>
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <div className="scope-grid">
        {allScopes.map((scope) => (
          <label className="check-row" key={scope}>
            <input type="checkbox" checked={scopes.includes(scope)} onChange={(event) => setScopes((current) => event.target.checked ? [...current, scope] : current.filter((item) => item !== scope))} />
            {scope}
          </label>
        ))}
      </div>
      <button className="primary-button full" onClick={() => onCreate(name, scopes)}>Create key</button>
    </Modal>
  );
}

function InviteModal({
  onClose,
  onInvite
}: {
  onClose: () => void;
  onInvite: (email: string, role: TeamMember["role"]) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("Developer");
  const valid = /\S+@\S+\.\S+/.test(email.trim());

  return (
    <Modal title="Invite member" onClose={onClose}>
      <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" /></label>
      <label>
        Role
        <select value={role} onChange={(event) => setRole(event.target.value as TeamMember["role"])}>
          <option>Developer</option>
          <option>Creator</option>
          <option>Viewer</option>
          <option>Admin</option>
        </select>
      </label>
      <button className="primary-button full" onClick={() => onInvite(email, role)} disabled={!valid}>Send invite</button>
    </Modal>
  );
}

function ConfirmDeleteModal({
  title,
  targetName,
  detail,
  onClose,
  onConfirm
}: {
  title: string;
  targetName: string;
  detail: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal title={title} onClose={onClose}>
      <p className="inline-note">This will call the provider delete endpoint for <b>{targetName}</b>.</p>
      <code className="block-code">{detail}</code>
      <div className="modal-actions">
        <button className="secondary-button full" onClick={onClose} disabled={submitting}>Cancel</button>
        <button
          className="primary-button full destructive"
          onClick={async () => {
            setSubmitting(true);
            try {
              await onConfirm();
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting}
        >
          {submitting ? "Deleting..." : "Confirm delete"}
        </button>
      </div>
    </Modal>
  );
}

function LogDrawer({ log, onClose }: { log: ApiLog; onClose: () => void }) {
  return (
    <Drawer title={log.requestId} onClose={onClose}>
      <div className="meta-list">
        <span>Endpoint <b>{log.endpoint}</b></span>
        <span>Model <b>{log.model}</b></span>
        <span>Status <b>{log.status}</b></span>
        <span>Latency <b>{log.latencyMs}ms</b></span>
        <span>Error <b>{log.errorCode ?? "none"}</b></span>
      </div>
      <pre><code>{JSON.stringify(log, null, 2)}</code></pre>
    </Drawer>
  );
}

function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

function WavePlayer({
  playing,
  onToggle,
  duration,
  large
}: {
  playing: boolean;
  onToggle: () => void;
  duration: string;
  large?: boolean;
}) {
  return (
    <div className={`wave-player ${large ? "large" : ""} ${playing ? "playing" : ""}`}>
      <button className="icon-button play-toggle" onClick={onToggle} aria-label="Play audio">
        {playing ? "■" : "▶"}
      </button>
      <div className="waveform" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => <i key={index} />)}
      </div>
      <span>{duration}</span>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
