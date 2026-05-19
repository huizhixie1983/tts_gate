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
    name: "北京男声（清朗男生）",
    language: "Chinese",
    gender: "Male",
    style: "清晰自然",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "普通话标准，带轻微北京口音，发音清晰自然，语气松弛有亲和力。"
  },
  {
    id: "2020009311371005952",
    name: "台湾女声（温柔女生）",
    language: "Chinese",
    gender: "Female",
    style: "温柔治愈",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "台湾口音柔和细腻，语气温柔平稳，情绪收敛但有温度。"
  },
  {
    id: "2001257729754140672",
    name: "阿树",
    language: "Chinese",
    gender: "Unknown",
    style: "松弛耐听",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "冬天清晨的灰白天空，风很冷，但阳光迟早会出来。"
  },
  {
    id: "2001286865130360832",
    name: "周周",
    language: "Chinese",
    gender: "Unknown",
    style: "独白讲述",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "薄雾里的风、旧磁带、夜里低声自言自语。"
  },
  {
    id: "2001898421836845056",
    name: "子琪",
    language: "Chinese",
    gender: "Female",
    style: "轻快元气",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "雨后未干的水泥地，空气里有点凉，音量不大，却带着倔强的边角。"
  },
  {
    id: "2001910895478837248",
    name: "小满",
    language: "Chinese",
    gender: "Female",
    style: "轻快明亮",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "音色清透偏高，带自然甜感，节奏轻快但不浮，语气坚定、有朝气。"
  },
  {
    id: "2001931510222950400",
    name: "程述",
    language: "Chinese",
    gender: "Male",
    style: "播客理性",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "中低音偏中，发音清晰标准，语速自然不过快，语气沉稳但不老成，带轻微电台感与亲和力。"
  },
  {
    id: "2002941772480647168",
    name: "阿宁",
    language: "Chinese",
    gender: "Unknown",
    style: "温柔",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "声音柔和而稳定，不催促、不打断，给人被照顾的安心感。"
  },
  {
    id: "2002991117984862208",
    name: "梁子",
    language: "Chinese",
    gender: "Male",
    style: "新闻专业",
    scenario: "Public Voice",
    source: "system",
    availableModels: ["vox-lite-v1", "vox-prime-v1"],
    favorite: false,
    status: "PUBLIC",
    previewText: "咬字清晰，但语气放松，不会给人太多的听感压力。"
  }
];

export function isCuratedVoiceId(id: string) {
  return (CURATED_VOICE_IDS as readonly string[]).includes(id);
}

export function pickPlaygroundVoices(allVoices: Voice[]) {
  const curated = allVoices.filter((voice) => isCuratedVoiceId(voice.id));
  if (curated.length > 0) {
    return CURATED_VOICE_IDS.map((id) => curated.find((voice) => voice.id === id)).filter((voice): voice is Voice => Boolean(voice));
  }
  return curatedPublicVoices;
}
