import { curatedPublicVoices } from "./curatedVoices";
import type { ApiKey, ApiLog, AuditEvent, Generation, ModelInfo, PricingPlan, TeamMember, UsagePolicy, UsageSnapshot, Voice, VoiceGovernance } from "./types";

export const models: ModelInfo[] = [
  {
    id: "auralith-one-1.0",
    name: "Auralith One",
    tier: "lite",
    positioning: "Low latency, low cost, and high concurrency",
    bestFor: ["Support narration", "Batch generation", "Real-time applications"],
    latency: "Low",
    cost: "Economy",
    emotion: "Basic"
  },
  {
    id: "auralith-ultra-1.0",
    name: "Auralith Ultra",
    tier: "prime",
    positioning: "High naturalness, strong expression, and premium multilingual generation",
    bestFor: ["Content creation", "Brand voices", "Character performances"],
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
    id: "gen_1007",
    requestId: "req_61af11",
    text: "Launch the new assistant voice experience across support, onboarding, and product walkthroughs.",
    voiceId: "2001910895478837248",
    model: "auralith-ultra-1.0",
    format: "mp3",
    latencyMs: 904,
    characters: 95,
    createdAt: "11:28"
  },
  {
    id: "gen_1006",
    requestId: "req_2bc8f3",
    text: "Your order has shipped and will arrive tomorrow before 6 PM.",
    voiceId: "2020009311371005952",
    model: "auralith-one-1.0",
    format: "mp3",
    latencyMs: 438,
    characters: 61,
    createdAt: "11:12"
  },
  {
    id: "gen_1005",
    requestId: "req_984a30",
    text: "Welcome to the weekly release notes briefing for the platform team.",
    voiceId: "2001931510222950400",
    model: "auralith-ultra-1.0",
    format: "wav",
    latencyMs: 790,
    characters: 71,
    createdAt: "10:58"
  },
  {
    id: "gen_1004",
    requestId: "req_14dc7a",
    text: "Please verify your account to continue using the production environment.",
    voiceId: "2002991117984862208",
    model: "auralith-one-1.0",
    format: "mp3",
    latencyMs: 402,
    characters: 72,
    createdAt: "10:49"
  },
  {
    id: "gen_1003",
    requestId: "req_0f51c9",
    text: "Create a calm bilingual narration track for the onboarding flow.",
    voiceId: "2001257729754140672",
    model: "auralith-ultra-1.0",
    format: "mp3",
    latencyMs: 861,
    characters: 66,
    createdAt: "10:46"
  },
  {
    id: "gen_1002",
    requestId: "req_7d74ee",
    text: "The support queue is below target and the SLA remains healthy.",
    voiceId: "2020008594694475776",
    model: "auralith-one-1.0",
    format: "mp3",
    latencyMs: 388,
    characters: 67,
    createdAt: "10:44"
  },
  {
    id: "gen_1001",
    requestId: "req_4f8a21",
    text: "Create natural multilingual speech with Auralith in minutes.",
    voiceId: "2020008594694475776",
    model: "auralith-ultra-1.0",
    format: "mp3",
    latencyMs: 842,
    characters: 62,
    createdAt: "10:42"
  },
  {
    id: "gen_1000",
    requestId: "req_91c771",
    text: "Welcome to the Auralith multilingual voice platform.",
    voiceId: "2001257729754140672",
    model: "auralith-one-1.0",
    format: "mp3",
    latencyMs: 516,
    characters: 22,
    createdAt: "10:31"
  }
];

export const apiLogs: ApiLog[] = [
  { time: "10:42", endpoint: "/v1/audio/speech", model: "auralith-ultra-1.0", status: 200, requestId: "req_4f8a21", latencyMs: 842 },
  { time: "10:38", endpoint: "/v1/audio/speech/stream", model: "auralith-one-1.0", status: 200, requestId: "req_91c771", latencyMs: 184 },
  { time: "10:31", endpoint: "/v1/audio/speech", model: "auralith-one-1.0", status: 429, requestId: "req_2dd901", latencyMs: 21, errorCode: "rate_limited" }
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

export const pricingPlans: PricingPlan[] = [
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
];

export const usageSnapshots: UsageSnapshot[] = [
  { time: "06:00", characters: 18500, requests: 142 },
  { time: "08:00", characters: 26400, requests: 208 },
  { time: "10:00", characters: 34900, requests: 291 },
  { time: "12:00", characters: 42100, requests: 338 },
  { time: "14:00", characters: 38700, requests: 312 },
  { time: "16:00", characters: 46200, requests: 356 },
  { time: "18:00", characters: 39800, requests: 304 }
];

export const usagePolicy: UsagePolicy = {
  monthlyQuota: 2000000,
  concurrencyLimit: 24,
  alertThreshold: 80,
  overageAction: "Throttle"
};

export const auditEvents: AuditEvent[] = [
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
];

export const voiceGovernance: VoiceGovernance[] = [
  {
    voiceId: voices[0]?.id ?? "2020008594694475776",
    visibility: "Public",
    reviewStatus: "Approved",
    consentStatus: "Verified"
  },
  {
    voiceId: voices[1]?.id ?? "2020009311371005952",
    visibility: "Restricted",
    reviewStatus: "Needs review",
    consentStatus: "Pending"
  },
  {
    voiceId: voices[2]?.id ?? "2001257729754140672",
    visibility: "Private",
    reviewStatus: "Flagged",
    consentStatus: "Missing"
  }
];
