import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { apiKeys as seedApiKeys, apiLogs as seedApiLogs, initialGenerations, models, teamMembers, voices as seedVoices } from "./mockData";
import { cloneVoice, deleteVoice, fetchLiveVoices, fetchVoiceStatus, previewDesignedVoice, saveDesignedVoice, synthesizeSpeech, toDataUrl } from "./api";
import { pickPlaygroundVoices } from "./curatedVoices";
import type { ApiKey, ApiLog, Generation, ModelId, Role, Route, Voice } from "./types";
import { copyToClipboard, makeRequestId } from "./utils";
import "../styles.css";

const routes: Route[] = ["home", "playground", "models", "voices", "clone", "design", "docs", "usage", "logs", "pricing", "safety", "team"];

const roleConfig: Record<Role, { defaultRoute: Route; routes: Route[]; summary: string; focus: string[] }> = {
  Admin: {
    defaultRoute: "team",
    routes: ["home", "playground", "models", "voices", "clone", "design", "docs", "usage", "logs", "pricing", "safety", "team"],
    summary: "Manage team, API keys, usage, billing and safety controls.",
    focus: ["Team", "API Keys", "Usage", "Logs", "Pricing", "Safety"]
  },
  Developer: {
    defaultRoute: "docs",
    routes: ["home", "playground", "models", "voices", "docs", "usage", "logs"],
    summary: "Integrate TTS API, inspect your own logs and debug model or voice parameters.",
    focus: ["Docs", "Playground", "Models", "Voices", "Logs", "Usage"]
  },
  Creator: {
    defaultRoute: "playground",
    routes: ["home", "playground", "models", "voices", "clone", "design"],
    summary: "Create speech, choose voices, clone voices and design new voice styles.",
    focus: ["Playground", "Voices", "Clone", "Design", "Models"]
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

function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const [role, setRole] = useState<Role | null>(() => (localStorage.getItem("voxai-role") as Role | null) ?? null);
  const [voices, setVoices] = useState<Voice[]>(seedVoices);
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [logs, setLogs] = useState<ApiLog[]>(seedApiLogs);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(seedApiKeys);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(seedVoices[0]?.id ?? "");
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
          setVoices((current) => mergeVoices(payload.voices, current));
          setSelectedVoiceId((current) => (payload.voices.some((voice) => voice.id === current) ? current : payload.voices[0].id));
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

  function loginAs(nextRole: Role) {
    setRole(nextRole);
    localStorage.setItem("voxai-role", nextRole);
    window.location.hash = `#${roleConfig[nextRole].defaultRoute}`;
  }

  function logout() {
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

  async function refreshVoices() {
    setVoicesLoading(true);
    setVoicesError(null);
    try {
      const payload = await fetchLiveVoices();
      setVoices((current) => mergeVoices(payload.voices, current));
      if (payload.voices.length) {
        setSelectedVoiceId((current) => (payload.voices.some((voice) => voice.id === current) ? current : payload.voices[0].id));
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
    setVoices((current) => mergeVoices([voice], current));
    setSelectedVoiceId(voice.id);
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
    setShowApiKeyModal(false);
  }

  if (!role) {
    return <RoleLogin onLogin={loginAs} />;
  }

  return (
    <div className="site-shell">
      <Topbar route={route} role={role} onLogout={logout} onCreateApiKey={() => setShowApiKeyModal(true)} />
      <main>
        {route === "home" && <Home voices={voices} generations={generations} />}
        {route === "playground" && (
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
          />
        )}
        {route === "clone" && <Clone onCreateVoice={addVoice} onLog={addLog} onDeleteVoice={removeVoice} onRefreshVoices={refreshVoices} />}
        {route === "design" && <Design onCreateVoice={addVoice} onLog={addLog} onDeleteVoice={removeVoice} onRefreshVoices={refreshVoices} />}
        {route === "docs" && <Docs />}
        {route === "usage" && <Usage role={role} generations={generations} logs={logs} onSelectLog={setSelectedLog} />}
        {route === "logs" && <Logs role={role} logs={logs} onSelectLog={setSelectedLog} />}
        {route === "pricing" && <Pricing />}
        {route === "safety" && role === "Admin" && <Safety />}
        {route === "team" && <Team apiKeys={apiKeys} onCreateApiKey={() => setShowApiKeyModal(true)} />}
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
        <span className="brand login-brand"><span className="brand-mark" />VoxAI</span>
        <span className="eyebrow">Role-based workspace</span>
        <h1>Choose how you want to enter the voice platform.</h1>
        <p>不同角色会加载不同的默认页面和功能导航。后续接入真实账号系统时，可由后端返回 role 和 permissions。</p>
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
  return (
    <header className="topbar">
      <a className="brand" href="#home" aria-label="VoxAI Home">
        <span className="brand-mark" />
        <span>VoxAI</span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">
        {visibleRoutes.map((item) => (
          <a key={item} href={`#${item}`} className={route === item ? "active" : ""}>
            {routeLabels[item]}
          </a>
        ))}
      </nav>
      <div className="topbar-actions">
        {(role === "Admin" || role === "Developer") && (
          <button className="ghost-action" onClick={onCreateApiKey}>
            Create API Key
          </button>
        )}
        <span className="role-chip">{role}</span>
        <button className="ghost-action" onClick={onLogout}>Switch role</button>
        <a className="ghost-link" href="#docs">
          API Docs
        </a>
        <a className="console-button" href="#playground">
          Try Playground
        </a>
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
          <span className="eyebrow">Multilingual TTS API Platform</span>
          <h1>Engineering-grade voice intelligence for multilingual products.</h1>
          <p>
            用 VoxLite 和 VoxPrime 构建低延迟、多语言、可克隆、可设计的 AI 语音服务。从 Playground 试音，到
            API、WebSocket、声音资产管理，一套平台完成。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#playground">
              Try Playground
            </a>
            <a className="secondary-button" href="#docs">
              View API Docs
            </a>
            <a className="text-button" href="#voices">
              Explore Voices
            </a>
          </div>
          <div className="hero-metrics">
            <Metric value="2" label="Model series" />
            <Metric value="40+" label="Languages" />
            <Metric value="WS" label="Streaming ready" />
          </div>
        </div>
        <DemoPanel />
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Core capabilities</span>
          <h2>把 MiniMax 式 API 平台和 ElevenLabs 式声音体验结合起来。</h2>
        </div>
        <div className="feature-grid">
          <Feature href="#docs" icon="API" title="Text to Speech API" text="HTTP 接口支持模型、voice_id、语言、音频格式和 request_id 追踪。" />
          <Feature href="#playground" icon="WS" title="Streaming TTS" text="面向实时对话和语音助手，展示首包延迟、chunk 和会话状态。" />
          <Feature href="#clone" icon="VC" title="Voice Clone" text="上传或录制样本，完成质量检测、授权确认，并生成稳定 voice_id。" />
          <Feature href="#design" icon="VD" title="Voice Design" text="通过自然语言描述生成候选音色，试听后保存到声音库。" />
        </div>
      </section>

      <section className="section split-section">
        <div>
          <span className="eyebrow">Model system</span>
          <h2>VoxLite for speed. VoxPrime for expression.</h2>
          <p>对外不暴露参数规模，用清晰的体验定位和版本号管理模型升级。</p>
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
        <SummaryPanel voices={voices} generations={generations} />
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

function DemoPanel() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="hero-demo panel dark-panel">
      <div className="panel-header">
        <span>Live TTS Demo</span>
        <span className="status-pill ready">ready</span>
      </div>
      <textarea aria-label="Demo text" defaultValue="欢迎使用 VoxAI。用多语言语音模型，为你的产品生成自然、稳定、可控的声音。" />
      <div className="control-grid compact">
        <label>
          Model
          <select defaultValue="vox-prime-v1">
            <option>vox-prime-v1</option>
            <option>vox-lite-v1</option>
          </select>
        </label>
        <label>
          Voice
          <select defaultValue="luna_warm">
            <option>luna_warm</option>
            <option>kai_clear</option>
          </select>
        </label>
      </div>
      <button className="generate-button" onClick={() => setPlaying((value) => !value)}>
        Generate Speech
      </button>
      <WavePlayer playing={playing} onToggle={() => setPlaying((value) => !value)} duration="0:08" />
      <code className="inline-code">POST /v1/audio/speech · request_id: req_demo_42</code>
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

function SummaryPanel({ voices, generations }: { voices: Voice[]; generations: Generation[] }) {
  return (
    <div className="overview-grid">
      <section className="panel">
        <div className="panel-header">
          <span>Recent generations</span>
          <a href="#playground">Open</a>
        </div>
        <div className="stack-list">
          {generations.slice(0, 3).map((generation) => (
            <div key={generation.id} className="stack-item">
              <span>{generation.text}</span>
              <b>{generation.model}</b>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <span>Recommended voices</span>
          <a href="#voices">Explore</a>
        </div>
        <div className="stack-list">
          {voices.slice(0, 3).map((voice) => (
            <div key={voice.id} className="stack-item">
              <span>{voice.name}</span>
              <b>{voice.id}</b>
            </div>
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
  const [text, setText] = useState("欢迎使用 VoxAI 多语言语音平台，试试不同音色的表达效果。");
  const [model, setModel] = useState<ModelId>("vox-prime-v1");
  const [language, setLanguage] = useState("Chinese");
  const [format, setFormat] = useState<Generation["format"]>("mp3");
  const [status, setStatus] = useState<"idle" | "generating" | "succeeded" | "failed">("idle");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [durationLabel, setDurationLabel] = useState("0:00");
  const [creditCost, setCreditCost] = useState<number | null>(null);
  const playgroundVoices = useMemo(() => pickPlaygroundVoices(voices), [voices]);
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
      <PageTitle eyebrow="Playground" title="TTS Playground" text="调试文本、模型、声音与输出格式，并实时生成等价 API 请求。" />
      <div className="playground-grid">
        <section className="panel">
          <div className="panel-header">
            <span>Input</span>
            <span className="status-pill">{status}</span>
          </div>
          <textarea className="large-input" value={text} onChange={(event) => setText(event.target.value)} />
          {voicesError && <p className="inline-note error-note">Voice load error: {voicesError}</p>}
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
          <p className="inline-note">
            {voicesLoading
              ? "Loading public voices..."
              : `${playgroundVoices.length} public voices from id.txt${selectedVoice?.previewText ? ` · ${selectedVoice.previewText}` : ""}`}
          </p>
        </section>
        <section className="panel">
          <div className="panel-header">
            <span>Voice settings</span>
            <span>live request</span>
          </div>
          {["Speed", "Volume", "Pitch", "Stability", "Similarity"].map((item, index) => (
            <div className="slider-row" key={item}>
              <span>{item}</span>
              <input type="range" defaultValue={[50, 70, 45, 72, 82][index]} />
              <b>{["1.0", "1.2", "0", "0.72", "0.82"][index]}</b>
            </div>
          ))}
          <button className="primary-button full" onClick={generate} disabled={status === "generating" || !selectedVoiceId}>
            {status === "generating" ? "Generating..." : "Generate"}
          </button>
        </section>
        <section className="panel result-panel">
          <div className="panel-header">
            <span>Result</span>
            <span className={`status-pill ${status === "succeeded" ? "ready" : status === "failed" ? "warn" : ""}`}>{status === "succeeded" ? "succeeded" : status === "failed" ? "failed" : "waiting"}</span>
          </div>
          {audioUrl ? <audio className="native-audio" controls src={audioUrl} /> : <WavePlayer playing={false} onToggle={() => undefined} duration="0:00" large />}
          {error && <p className="inline-note error-note">{error}</p>}
          <div className="meta-list">
            <span>
              request_id <b>{generations[0]?.requestId ?? "pending"}</b>
            </span>
            <span>
              characters <b>{text.length}</b>
            </span>
            <span>
              voice <b>{selectedVoice ? selectedVoice.name : selectedVoiceId || "pending"}</b>
            </span>
            <span>
              model <b>{model}</b>
            </span>
            <span>
              duration <b>{durationLabel}</b>
            </span>
            <span>
              cost <b>{creditCost === null ? "pending" : `${creditCost.toFixed(3)} credits`}</b>
            </span>
          </div>
        </section>
        <section className="panel code-panel">
          <div className="panel-header">
            <span>Equivalent API request</span>
            <button className="copy-button" onClick={copyCode}>
              {copied ? "Copied" : "Copy"}
            </button>
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
      <PageTitle eyebrow="Models" title="Two model series, stable versioning." text="用 VoxLite 和 VoxPrime 表达体验定位，用 v1、preview、snapshot 管理升级。" />
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
              <th>VoxLite</th>
              <th>VoxPrime</th>
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
  voicesError
}: {
  voices: Voice[];
  onToggleFavorite: (voiceId: string) => void;
  onUseVoice: (voiceId: string) => void;
  onDeleteVoice: (voiceId: string) => Promise<void>;
  onRefreshVoices: () => Promise<void>;
  voicesLoading: boolean;
  voicesError: string | null;
}) {
  const [source, setSource] = useState("All");
  const [language, setLanguage] = useState("All");
  const [query, setQuery] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [deletingVoiceId, setDeletingVoiceId] = useState<string | null>(null);
  const [confirmDeleteVoice, setConfirmDeleteVoice] = useState<Voice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        text: voice.previewText || "Preview this voice in the VoxAI Playground.",
        voiceId: voice.id,
        model: voice.availableModels[0] || "vox-prime-v1"
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
      voices: filteredVoices.filter((voice) => voice.source === "cloned")
    },
    {
      key: "designed",
      title: "My Designed Voices",
      description: "Voices generated from prompt design and then saved as reusable IDs.",
      voices: filteredVoices.filter((voice) => voice.source === "designed")
    }
  ];

  return (
    <section className="workspace">
      <PageTitle eyebrow="Voices" title="Voice Library" text="搜索、试听、收藏和复制 voice_id。系统声音、克隆声音、设计声音统一管理。" />
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
    <article className="voice-card">
      <button className="icon-button play-toggle" onClick={onPlay} aria-label={`Play ${voice.name}`}>
        {previewing ? "…" : playing ? "■" : "▶"}
      </button>
      <h3>{voice.name}</h3>
      <p>{voice.language} · {voice.style} · {voice.scenario}</p>
      <span>{voice.source} · {voice.status || "ACTIVE"}</span>
      <button onClick={onUse}>Use</button>
      <button onClick={onOpenDetails}>Details</button>
      <button onClick={copyVoiceId}>{copied ? "Copied" : "Copy voice_id"}</button>
      <button onClick={() => onToggleFavorite(voice.id)}>{voice.favorite ? "★ Favorited" : "☆ Favorite"}</button>
      {voice.source !== "system" && <button onClick={onDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>}
      <code>{voice.id}</code>
    </article>
  );
}

function VoiceDrawer({ voice, onClose, onDelete, onRefresh }: { voice: Voice; onClose: () => void; onDelete?: () => void; onRefresh: () => Promise<void> }) {
  return (
    <Drawer title={voice.name} onClose={onClose}>
      <div className="drawer-section">
        <span className="status-pill ready">{voice.source}</span>
        <h3>{voice.id}</h3>
        <p>{voice.language} · {voice.gender} · {voice.style} · {voice.scenario}</p>
        <p>Status: {voice.status || "ACTIVE"}{voice.createdAt ? ` · Created ${voice.createdAt}` : ""}</p>
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
  onRefreshVoices
}: {
  onCreateVoice: (voice: Voice) => void;
  onLog: (log: ApiLog) => void;
  onDeleteVoice: (voiceId: string) => Promise<void>;
  onRefreshVoices: () => Promise<void>;
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
      setVoiceId(result.clone.voice_id);
      setStatus(result.voice ? "ready" : "processing");
      setMessage(result.voice ? "Voice is active and ready for synthesis." : "Clone job created. MOSI is still processing the voice.");
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/voice/clone",
        model: "vox-prime-v1",
        status: 200,
        requestId: result.requestId,
        latencyMs: 0
      });
      if (result.voice) onCreateVoice(result.voice);
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Clone request failed");
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/voice/clone",
        model: "vox-prime-v1",
        status: 500,
        requestId: makeRequestId(),
        latencyMs: 0,
        errorCode: error instanceof Error ? error.message : "clone_failed"
      });
    }
  }

  function saveVoice() {
    if (voiceId) window.location.hash = "#voices";
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
      <PageTitle eyebrow="Voice Clone" title="Create a private voice." text="上传或录制样本，完成质量检测与授权确认后生成可复用 voice_id。" />
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
          <div className="panel-header"><span>2. Quality check</span><span className={`status-pill ${status === "ready" ? "ready" : status === "failed" ? "warn" : ""}`}>{status}</span></div>
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
  onRefreshVoices
}: {
  onCreateVoice: (voice: Voice) => void;
  onLog: (log: ApiLog) => void;
  onDeleteVoice: (voiceId: string) => Promise<void>;
  onRefreshVoices: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("A calm and warm female narrator for multilingual product tutorials.");
  const [previewText, setPreviewText] = useState("Welcome to VoxAI. This preview is generated from a prompt-designed voice.");
  const [voiceName, setVoiceName] = useState("Prompt Designed Voice");
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"idle" | "generating" | "previewed" | "saving" | "saved" | "failed">("idle");
  const [audioBase64, setAudioBase64] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [savedVoiceId, setSavedVoiceId] = useState("");
  const [busyAction, setBusyAction] = useState<"retry" | "refresh" | "delete" | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [message, setMessage] = useState("Describe the voice you want, preview it, then save it as a reusable voice_id.");

  async function regenerate() {
    setStatus("generating");
    setActive(1);
    setMessage("Generating prompt-designed voice preview...");
    try {
      const result = await previewDesignedVoice({ text: previewText, instruction: prompt });
      setAudioBase64(result.audioBase64);
      setAudioUrl(toDataUrl(result.audioBase64, result.audioMimeType));
      setStatus("previewed");
      setActive(2);
      setMessage(`Preview ready. Cost ${result.usage.credit_cost?.toFixed(3) ?? "0"} credits.`);
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/audio/speech",
        model: "vox-prime-v1",
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
        model: "vox-prime-v1",
        status: 500,
        requestId: makeRequestId(),
        latencyMs: 0,
        errorCode: error instanceof Error ? error.message : "design_failed"
      });
    }
  }

  async function saveCandidate() {
    if (!audioBase64) return;
    setStatus("saving");
    setActive(3);
    setMessage("Saving preview as a reusable cloned voice...");
    try {
      const result = await saveDesignedVoice(voiceName, audioBase64);
      if (result.voice) onCreateVoice(result.voice);
      setSavedVoiceId(result.voice?.id || result.clone.voice_id);
      setStatus("saved");
      setMessage(result.voice ? `Voice saved as ${result.voice.id}.` : `Clone job created with voice_id ${result.clone.voice_id}.`);
      onLog({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endpoint: "/api/v1/voice/clone",
        model: "vox-prime-v1",
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
      setStatus("previewed");
      setMessage("Saved voice deleted. Preview remains available until you save again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="workspace">
      <PageTitle eyebrow="Voice Design" title="Design voices from prompts." text="通过文本描述生成试听音频，再固化成可复用 voice_id。" />
      <Stepper steps={["Prompt", "Generate", "Preview", "Save"]} active={active} />
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
        <section className="candidate-grid">
          <article className="voice-card candidate">
            <button className="icon-button play-toggle">{audioUrl ? "♪" : "▶"}</button>
            <h3>{voiceName}</h3>
            <p>{status === "previewed" || status === "saved" ? "prompt designed · live preview" : "waiting for preview"}</p>
            {audioUrl ? <audio className="native-audio" controls src={audioUrl} /> : <p className="inline-note">No preview generated yet.</p>}
            <p className={`inline-note ${status === "failed" ? "error-note" : ""}`}>{message}</p>
            {savedVoiceId && <code>{savedVoiceId}</code>}
            <div className="chip-row">
              <button onClick={() => void retryPreview()} disabled={busyAction !== null || status === "generating"}>{busyAction === "retry" ? "Retrying..." : "Retry preview"}</button>
              <button onClick={() => void refreshSavedVoice()} disabled={!savedVoiceId || busyAction !== null}>{busyAction === "refresh" ? "Refreshing..." : "Refresh status"}</button>
              <button onClick={() => setConfirmDeleteOpen(true)} disabled={!savedVoiceId || busyAction !== null}>{busyAction === "delete" ? "Deleting..." : "Delete voice"}</button>
            </div>
            <button onClick={saveCandidate} disabled={!audioBase64 || status === "saving" || status === "saved"}>{status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save as Voice"}</button>
          </article>
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
    "text": "Hello from VoxAI."
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
            <tr><td>4004</td><td>voice_id 不存在或无权限</td><td>检查实时声音库或重新克隆</td></tr>
            <tr><td>4290</td><td>请求频率超限</td><td>降低并发或稍后重试</td></tr>
            <tr><td>5000</td><td>服务器内部错误</td><td>记录 request_id 并排查</td></tr>
          </tbody>
        </table>
      </article>
    </section>
  );
}

function Usage({ role, generations, logs, onSelectLog }: { role: Role; generations: Generation[]; logs: ApiLog[]; onSelectLog: (log: ApiLog) => void }) {
  const chars = generations.reduce((total, item) => total + item.characters, 0);
  const overLimit = chars > 120;
  const isAdmin = role === "Admin";
  return (
    <section className="workspace">
      <PageTitle
        eyebrow="Usage"
        title={isAdmin ? "Team usage & API health" : "My usage & API health"}
        text={isAdmin ? "追踪团队级字符消耗、成功率、延迟、错误码和模型调用占比。" : "追踪当前开发者/API Key 视角的调用量、成功率、延迟和错误状态。"}
      />
      <div className="alert-grid">
        <div className={`alert-card ${overLimit ? "warn" : "ready"}`}>
          <b>{overLimit ? "Quota warning" : "Quota healthy"}</b>
          <span>{isAdmin ? (overLimit ? "当前团队 mock 用量已接近免费额度，请考虑升级套餐。" : "当前团队用量处于健康范围。") : (overLimit ? "当前 API Key mock 用量接近上限，请联系 Admin 或切换环境。" : "当前 API Key 用量处于健康范围。")}</span>
          <a href={isAdmin ? "#pricing" : "#docs"}>{isAdmin ? "View plans" : "View limits"}</a>
        </div>
        <div className="alert-card">
          <b>Error state</b>
          <span>{isAdmin ? "最近 24 小时团队内有 1 次 rate_limited，可在日志详情中排查。" : "最近 24 小时当前开发者/API Key 有 1 次 rate_limited，可在日志详情中排查。"}</span>
          <a href="#logs">Open logs</a>
        </div>
      </div>
      <div className="metric-grid">
        <MetricCard label="Characters" value={`${chars.toLocaleString()}`} detail={isAdmin ? "team total" : "my API key"} />
        <MetricCard label="Success rate" value="99.3%" detail={isAdmin ? "team last 24h" : "my last 24h"} />
        <MetricCard label="Avg latency" value="812ms" detail="HTTP TTS" />
        <MetricCard label="Streaming sessions" value={isAdmin ? "4,820" : "318"} detail={isAdmin ? "team this month" : "my this month"} />
      </div>
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
    </section>
  );
}

function Logs({ role, logs, onSelectLog }: { role: Role; logs: ApiLog[]; onSelectLog: (log: ApiLog) => void }) {
  const isAdmin = role === "Admin";
  return (
    <section className="workspace">
      <PageTitle
        eyebrow="Logs"
        title={isAdmin ? "Team request logs" : "My request logs"}
        text={isAdmin ? "按成员、endpoint、模型、状态码和 request_id 排查团队 API 请求。" : "按当前开发者/API Key 的 endpoint、模型、状态码和 request_id 排查请求。"}
      />
      <section className="panel table-panel">
        <div className="panel-header"><span>{isAdmin ? "API Logs" : "My API Logs"}</span><span>{logs.length} requests</span></div>
        <table className="data-table">
          <thead><tr><th>Time</th><th>Endpoint</th><th>Model</th><th>Latency</th><th>Status</th><th>request_id</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr className="clickable-row" key={log.requestId} onClick={() => onSelectLog(log)}>
                <td>{log.time}</td><td>{log.endpoint}</td><td>{log.model}</td><td>{log.latencyMs}ms</td>
                <td><span className={`status-pill ${log.status === 200 ? "ready" : "warn"}`}>{log.status}</span></td><td>{log.requestId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function Team({ apiKeys, onCreateApiKey }: { apiKeys: ApiKey[]; onCreateApiKey: () => void }) {
  const [showInvite, setShowInvite] = useState(false);
  return (
    <section className="workspace">
      <PageTitle eyebrow="Team" title="Members, roles and audit logs." text="管理团队成员、API 权限、声音资产权限和高风险操作审计。" />
      <div className="team-grid">
        <section className="panel table-panel">
          <div className="panel-header"><span>Members</span><button className="secondary-button small" onClick={() => setShowInvite(true)}>Invite</button></div>
          <table className="data-table">
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.email}><td>{member.name}</td><td>{member.role}</td><td>{member.status}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel table-panel">
          <div className="panel-header"><span>Audit logs</span><span>last 24h</span></div>
          <ul className="audit-list">
            <li>Created API key <b>prod-key</b></li>
            <li>Created voice <b>brand_voice</b></li>
            <li>Changed role for <b>Creator</b></li>
            <li>Blocked risky clone request</li>
          </ul>
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
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
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

const docsContent: Record<string, { title: string; text: string }> = {
  Quickstart: { title: "Generate speech with one MOSI request.", text: "先通过 `/api/v1/voices` 拿到可用 voice_id，再调用 `POST /v1/audio/tts` 返回 base64 WAV 音频。" },
  Authentication: { title: "Authenticate with API keys.", text: "所有 MOSI 请求使用 Bearer token。当前原型通过本地代理读取 `.env.local`，避免前端泄露密钥。" },
  "HTTP TTS": { title: "Text to Speech API.", text: "本次集成已打通 `POST https://studio.mosi.cn/v1/audio/tts`，请求体使用 `model: moss-tts`、`text` 和 `voice_id`。" },
  WebSocket: { title: "Streaming TTS over WebSocket.", text: "当前原型没有接真实 WebSocket，页面仍保留该信息架构，后续需要拿到 MOSI 的实时协议后再实现。" },
  Voices: { title: "Voice management.", text: "已打通 `GET /api/v1/voices`、`POST /api/v1/files/upload` 和 `POST /api/v1/voice/clone`，支持加载实时声音库与创建新音色。" },
  Errors: { title: "Structured errors.", text: "MOSI 已知错误码包括 4000、4001、4004、4290、5000。当前前端会把失败信息显示在 Playground、Clone、Design 页面。" },
  "Rate limits": { title: "Rate limits and quotas.", text: "当前页面没有读取团队级套餐接口，额度和限流仍沿用原型信息展示，真实请求成本会在生成结果中显示 credit_cost。" }
};

function Pricing() {
  return (
    <section className="workspace">
      <PageTitle eyebrow="Pricing" title="Plans for API scale." text="按照模型档位、字符量、并发和企业 SLA 组织套餐。" />
      <div className="pricing-grid">
        {[
          ["Starter", "$0", "100k chars", "VoxLite", "1 team seat"],
          ["Growth", "$49", "2M chars", "VoxLite + VoxPrime", "5 team seats"],
          ["Enterprise", "Custom", "Dedicated quota", "SLA + audit", "Private voices"]
        ].map(([name, price, quota, model, team]) => (
          <article className="panel price-card" key={name}>
            <span className="eyebrow">{name}</span>
            <h2>{price}</h2>
            <p>{quota}</p>
            <ul><li>{model}</li><li>{team}</li><li>Usage analytics</li></ul>
            <button className={name === "Growth" ? "primary-button full" : "secondary-button full"}>{name === "Enterprise" ? "Contact sales" : "Choose plan"}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Safety() {
  return (
    <section className="workspace">
      <PageTitle eyebrow="Safety" title="Voice safety and enterprise control." text="围绕声音授权、滥用防控、API 权限和审计建立企业信任。" />
      <div className="feature-grid">
        <Feature href="#clone" icon="AUTH" title="Consent first" text="克隆前必须确认声音授权，质量检测和风险提示不可跳过。" />
        <Feature href="#team" icon="RBAC" title="Role-based access" text="API Key、声音资产、账单和日志按团队角色隔离。" />
        <Feature href="#logs" icon="LOG" title="Audit trail" text="关键操作保留 actor、resource、request_id 和时间。" />
        <Feature href="#docs" icon="ERR" title="Policy errors" text="违规输入返回结构化错误码，便于产品接入处理。" />
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

function InviteModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Invite member" onClose={onClose}>
      <label>Email<input placeholder="teammate@example.com" /></label>
      <label>Role<select><option>Developer</option><option>Creator</option><option>Viewer</option><option>Admin</option></select></label>
      <button className="primary-button full" onClick={onClose}>Send invite</button>
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
      <span className="eyebrow">{eyebrow}</span>
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
