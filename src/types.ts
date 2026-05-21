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

export type ModelId = "auralith-one-1.0" | "auralith-ultra-1.0";

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
  ownedByUser?: boolean;
  avatarTone?: string;
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

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  quota: string;
  modelAccess: string;
  teamSeats: string;
  ctaLabel: string;
  highlighted?: boolean;
  features: string[];
  status?: "Published" | "Draft";
}

export interface UsagePolicy {
  monthlyQuota: number;
  concurrencyLimit: number;
  alertThreshold: number;
  overageAction: "Notify" | "Throttle" | "Block";
}

export interface AuditEvent {
  id: string;
  time: string;
  actor: string;
  action: string;
  resource: string;
  severity: "info" | "warn" | "critical";
}

export interface VoiceGovernance {
  voiceId: string;
  visibility: "Public" | "Private" | "Restricted";
  reviewStatus: "Approved" | "Needs review" | "Flagged";
  consentStatus: "Verified" | "Pending" | "Missing";
}

export interface UsageSnapshot {
  time: string;
  characters: number;
  requests: number;
}

export interface AdminState {
  teamMembers: TeamMember[];
  apiKeys: ApiKey[];
  pricingPlans: PricingPlan[];
  pricingDrafts: PricingPlan[];
  usagePolicy: UsagePolicy;
  auditEvents: AuditEvent[];
  voiceGovernance: Record<string, VoiceGovernance>;
}
