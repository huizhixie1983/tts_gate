import type { Voice } from "./types";

/** Public voice IDs from id.txt — used for Playground and initial seed data. */
export const CURATED_VOICE_IDS = [
  "2020008594694475776",
  "2020009311371005952",
  "2001257729754140672",
  "2001286865130360832",
  "2001898421836845056",
  "2001910895478837248",
  "2001931510222950400",
  "2002941772480647168",
  "2002991117984862208"
] as const;

export const curatedPublicVoices: Voice[] = [
  {
    id: "2020008594694475776",
    name: "Beijing Male Voice",
    language: "Chinese",
    gender: "Male",
    style: "Clear and natural",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "Standard Mandarin with a light Beijing accent, clear diction, and a relaxed, approachable tone."
  },
  {
    id: "2020009311371005952",
    name: "Taiwan Female Voice",
    language: "Chinese",
    gender: "Female",
    style: "Soft and soothing",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "A soft Taiwanese accent with steady pacing, low emotional intensity, and a warm finish."
  },
  {
    id: "2001257729754140672",
    name: "Ashu",
    language: "Chinese",
    gender: "Unknown",
    style: "Relaxed and textured",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "A low-pressure, reflective tone with calm pacing and a slightly cinematic texture."
  },
  {
    id: "2001286865130360832",
    name: "Zhouzhou",
    language: "Chinese",
    gender: "Unknown",
    style: "Reflective monologue",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "Quiet, intimate, and slightly analog in feel, like a close-range spoken monologue."
  },
  {
    id: "2001898421836845056",
    name: "Ziqi",
    language: "Chinese",
    gender: "Female",
    style: "Bright and energetic",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "Light, crisp, and energetic, with a youthful edge and a compact delivery style."
  },
  {
    id: "2001910895478837248",
    name: "Xiaoman",
    language: "Chinese",
    gender: "Female",
    style: "Light and vivid",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "A bright upper register with a natural sweetness, brisk rhythm, and confident energy."
  },
  {
    id: "2001931510222950400",
    name: "Chengshu",
    language: "Chinese",
    gender: "Male",
    style: "Podcast analytical",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "A balanced mid-low register with clear diction, natural pacing, and a composed editorial tone."
  },
  {
    id: "2002941772480647168",
    name: "Aning",
    language: "Chinese",
    gender: "Unknown",
    style: "Gentle",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "Soft, stable, and reassuring, with a patient cadence that feels supportive rather than urgent."
  },
  {
    id: "2002991117984862208",
    name: "Liangzi",
    language: "Chinese",
    gender: "Male",
    style: "Broadcast professional",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["auralith-one-1.0", "auralith-ultra-1.0"],
    favorite: false,
    status: "PUBLIC",
    previewText: "Clear articulation with a professional news-style profile, but relaxed enough for long-form listening."
  }
];

export function isCuratedVoiceId(id: string) {
  return (CURATED_VOICE_IDS as readonly string[]).includes(id);
}

export function pickPlaygroundVoices(allVoices: Voice[], selectedVoiceId?: string) {
  const curated = allVoices.filter((voice) => isCuratedVoiceId(voice.id));
  const prioritized = curated.length > 0
    ? CURATED_VOICE_IDS.map((id) => curated.find((voice) => voice.id === id)).filter((voice): voice is Voice => Boolean(voice))
    : curatedPublicVoices;

  if (!selectedVoiceId) return prioritized;

  const selectedVoice = allVoices.find((voice) => voice.id === selectedVoiceId);
  if (!selectedVoice) return prioritized;
  if (prioritized.some((voice) => voice.id === selectedVoiceId)) return prioritized;

  return [selectedVoice, ...prioritized];
}
