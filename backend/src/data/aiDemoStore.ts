import { AIVideoJob, AIVideoRequest } from "../types/ai";

interface DemoVideoRecord {
  id: string;
  prompt: string;
  size: string;
  seconds: string;
  model: string;
  createdAt: string;
  seedImageUrl: string;
}

const demoVideoJobs = new Map<string, DemoVideoRecord>();

export function createDemoVideoJob(input: AIVideoRequest) {
  const id = `demo-video-${Date.now()}`;
  const record: DemoVideoRecord = {
    id,
    prompt: input.prompt.trim(),
    size: input.size ?? "720x1280",
    seconds: String(input.seconds ?? 8),
    model: input.quality === "quality" ? "sora-2-pro" : "sora-2",
    createdAt: new Date().toISOString(),
    seedImageUrl: pickPreviewImage(input.prompt),
  };

  demoVideoJobs.set(id, record);
  return hydrateDemoVideoJob(record);
}

export function getDemoVideoJob(id: string) {
  const record = demoVideoJobs.get(id);
  if (!record) {
    return undefined;
  }

  return hydrateDemoVideoJob(record);
}

function hydrateDemoVideoJob(record: DemoVideoRecord): AIVideoJob {
  const elapsedMs = Date.now() - new Date(record.createdAt).getTime();

  if (elapsedMs < 2500) {
    return {
      ...baseJob(record),
      status: "queued",
      progress: 8,
      note: "Demo mode: render job queued locally.",
    };
  }

  if (elapsedMs < 6500) {
    return {
      ...baseJob(record),
      status: "in_progress",
      progress: 58,
      note: "Demo mode: stitching motion, timing, and scene transitions.",
    };
  }

  return {
    ...baseJob(record),
    status: "completed",
    progress: 100,
    thumbnailDataUrl: record.seedImageUrl,
    note: "Demo mode: video preview is simulated. Add OPENAI_API_KEY for live renders.",
  };
}

function baseJob(record: DemoVideoRecord) {
  return {
    id: record.id,
    model: record.model,
    prompt: record.prompt,
    size: record.size,
    seconds: record.seconds,
    createdAt: record.createdAt,
    demoMode: true,
  };
}

function pickPreviewImage(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("fashion") || normalized.includes("outfit")) {
    return "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("product") || normalized.includes("market")) {
    return "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("night") || normalized.includes("car")) {
    return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";
  }

  return "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80";
}

