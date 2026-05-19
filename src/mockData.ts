import { curatedPublicVoices } from "./curatedVoices";
import type { ApiKey, ApiLog, Generation, ModelInfo, TeamMember, Voice } from "./types";

export const models: ModelInfo[] = [
  {
    id: "vox-lite-v1",
    name: "VoxLite",
    tier: "lite",
    positioning: "低延迟、低成本、高并发",
    bestFor: ["客服播报", "批量生成", "实时应用"],
    latency: "Low",
    cost: "Economy",
    emotion: "Basic"
  },
  {
    id: "vox-prime-v1",
    name: "VoxPrime",
    tier: "prime",
    positioning: "高自然度、高表现力、多语言精品生成",
    bestFor: ["内容创作", "品牌声音", "角色语音"],
    latency: "Balanced",
    cost: "Premium",
    emotion: "Enhanced"
  }
];

export const voices: Voice[] = curatedPublicVoices.map((voice, index) => ({
  ...voice,
  favorite: index === 0
}));

export const initialGenerations: Generation[] = [
  {
    id: "gen_1001",
    requestId: "req_4f8a21",
    text: "Create natural multilingual speech with VoxAI in minutes.",
    voiceId: "2020008594694475776",
    model: "vox-prime-v1",
    format: "mp3",
    latencyMs: 842,
    characters: 62,
    createdAt: "10:42"
  },
  {
    id: "gen_1000",
    requestId: "req_91c771",
    text: "欢迎使用 VoxAI 多语言语音平台。",
    voiceId: "2001257729754140672",
    model: "vox-lite-v1",
    format: "mp3",
    latencyMs: 516,
    characters: 22,
    createdAt: "10:31"
  }
];

export const apiLogs: ApiLog[] = [
  { time: "10:42", endpoint: "/v1/audio/speech", model: "vox-prime-v1", status: 200, requestId: "req_4f8a21", latencyMs: 842 },
  { time: "10:38", endpoint: "/v1/audio/speech/stream", model: "vox-lite-v1", status: 200, requestId: "req_91c771", latencyMs: 184 },
  { time: "10:31", endpoint: "/v1/audio/speech", model: "vox-lite-v1", status: 429, requestId: "req_2dd901", latencyMs: 21, errorCode: "rate_limited" }
];

export const teamMembers: TeamMember[] = [
  { name: "Admin", email: "admin@example.com", role: "Owner", status: "Active" },
  { name: "Developer", email: "dev@example.com", role: "Developer", status: "Active" },
  { name: "Creator", email: "creator@example.com", role: "Creator", status: "Pending" }
];

export const apiKeys: ApiKey[] = [
  {
    id: "key_prod",
    name: "prod-key",
    scopes: ["tts:write", "voices:read", "usage:read"],
    createdAt: "2026-05-12",
    lastUsedAt: "10:42",
    status: "Active"
  }
];
