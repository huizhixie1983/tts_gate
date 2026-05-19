export type Route =
  | "home"
  | "playground"
  | "models"
  | "voices"
  | "clone"
  | "design"
  | "docs"
  | "usage"
  | "logs"
  | "pricing"
  | "safety"
  | "team";

export type Role = "Admin" | "Developer" | "Creator";

export type ModelId = "vox-lite-v1" | "vox-prime-v1";

export type VoiceSource = "system" | "cloned" | "designed";

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  style: string;
  scenario: string;
  source: VoiceSource;
  availableModels: ModelId[];
  favorite: boolean;
  status?: string;
  previewText?: string;
  createdAt?: string | null;
}

export interface ModelInfo {
  id: ModelId;
  name: string;
  tier: "lite" | "prime";
  positioning: string;
  bestFor: string[];
  latency: string;
  cost: string;
  emotion: string;
}

export interface Generation {
  id: string;
  requestId: string;
  text: string;
  voiceId: string;
  model: ModelId;
  format: "mp3" | "wav" | "pcm";
  latencyMs: number;
  characters: number;
  createdAt: string;
  audioUrl?: string;
  providerModel?: string;
  creditCost?: number;
}

export interface ApiLog {
  time: string;
  endpoint: string;
  model: ModelId;
  status: number;
  requestId: string;
  latencyMs: number;
  errorCode?: string;
}

export interface TeamMember {
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Developer" | "Creator" | "Viewer";
  status: "Active" | "Pending";
}

export interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
  status: "Active" | "Disabled";
}
