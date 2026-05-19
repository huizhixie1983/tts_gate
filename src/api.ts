import type { ModelId, Voice } from "./types";

export interface LiveTtsResponse {
  requestId: string;
  providerModel: string;
  durationSeconds: number | null;
  audioBase64: string;
  audioMimeType: string;
  latencyMs: number;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    credit_cost?: number;
  };
}

export interface LiveCloneResponse {
  requestId: string;
  file: {
    file_id: string;
    file_name: string;
  };
  clone: {
    job_id: string;
    status: string;
    voice_id: string;
  };
  voice: Voice | null;
}

export interface VoiceStatusResponse {
  voice: Voice | null;
  exists: boolean;
  source: "live" | "curated" | "missing";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export async function fetchLiveVoices() {
  return apiFetch<{ count: number; voices: Voice[] }>("/api/mosi/voices?limit=50&status=ACTIVE");
}

export async function fetchVoiceStatus(voiceId: string) {
  return apiFetch<VoiceStatusResponse>(`/api/mosi/voices/${encodeURIComponent(voiceId)}`);
}

export async function deleteVoice(voiceId: string) {
  return apiFetch<{ requestId: string; deleted: string; stillExists: boolean; voice: Voice | null }>(`/api/mosi/voices/${encodeURIComponent(voiceId)}`, {
    method: "DELETE"
  });
}

export async function synthesizeSpeech(payload: {
  text: string;
  voiceId: string;
  model: ModelId;
  samplingParams?: { temperature: number; top_p: number; top_k: number };
}) {
  return apiFetch<LiveTtsResponse>("/api/mosi/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function previewDesignedVoice(payload: {
  text: string;
  instruction: string;
  samplingParams?: { temperature: number; top_p: number; top_k: number };
}) {
  return apiFetch<LiveTtsResponse>("/api/mosi/design-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function cloneVoice(file: File, name: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  return apiFetch<LiveCloneResponse>("/api/mosi/clone", {
    method: "POST",
    body: formData
  });
}

export async function saveDesignedVoice(name: string, audioBase64: string) {
  return apiFetch<LiveCloneResponse>("/api/mosi/design-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, audioBase64 })
  });
}

export function toDataUrl(base64: string, mimeType = "audio/wav") {
  return `data:${mimeType};base64,${base64}`;
}
