export type AITextMode = "captions" | "script" | "product_copy";
export type AIVoiceOption = "alloy" | "coral" | "marin" | "cedar" | "sage";

export interface AITextRequest {
  mode: AITextMode;
  prompt: string;
  tone?: string;
  audience?: string;
  goal?: string;
  language?: string;
}

export interface AITextResult {
  id: string;
  mode: AITextMode;
  outputs: string[];
  summary: string;
  model: string;
  createdAt: string;
  demoMode: boolean;
}

export interface AIImageRequest {
  prompt: string;
  style?: string;
  aspectRatio?: "1:1" | "9:16" | "16:9";
}

export interface AIImageResult {
  id: string;
  prompt: string;
  imageDataUrl: string;
  revisedPrompt?: string;
  model: string;
  createdAt: string;
  demoMode: boolean;
}

export interface AIVideoRequest {
  prompt: string;
  style?: string;
  shotType?: string;
  size?: "1280x720" | "720x1280" | "1920x1080" | "1080x1920";
  seconds?: 5 | 8 | 10 | 16 | 20;
  quality?: "speed" | "quality";
}

export interface AIVideoJob {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  model: string;
  prompt: string;
  size: string;
  seconds: string;
  createdAt: string;
  thumbnailDataUrl?: string;
  downloadPath?: string;
  demoMode: boolean;
  note?: string;
  error?: string;
}

export interface AIStatusPayload {
  demoMode: boolean;
  textModel: string;
  imageModel: string;
  videoModel: string;
  voiceModel: string;
}

export interface AIViralEngineRequest {
  prompt: string;
  niche?: string;
  audience?: string;
  offer?: string;
  tone?: string;
  language?: string;
  voice?: AIVoiceOption;
  size?: "1280x720" | "720x1280" | "1920x1080" | "1080x1920";
  seconds?: 5 | 8 | 10 | 16 | 20;
  quality?: "speed" | "quality";
}

export interface AIVoiceAsset {
  script: string;
  voice: AIVoiceOption;
  model: string;
  audioPath?: string;
  contentType?: string;
  disclosure: string;
}

export interface AIViralInsights {
  viralScore: number;
  bestPostingTime: string;
  targetAudience: string;
  reasons: string[];
}

export interface AIViralEngineResult {
  id: string;
  prompt: string;
  conceptTitle: string;
  script: {
    hook: string;
    body: string;
    cta: string;
    fullScript: string;
  };
  captions: string[];
  voice: AIVoiceAsset;
  video: AIVideoJob;
  insights: AIViralInsights;
  createdAt: string;
  demoMode: boolean;
}

export interface AITrendFeedItem {
  id: string;
  title: string;
  trendHook: string;
  niche: string;
  musicStyle: string;
  motionStyle: string;
  momentumScore: number;
  captionSeed: string;
  thumbnailUrl: string;
  demoMode: boolean;
}

export interface AITrendHijackRequest {
  trendId: string;
  userGoal?: string;
  audience?: string;
  offer?: string;
  language?: string;
  size?: "1280x720" | "720x1280" | "1920x1080" | "1080x1920";
  seconds?: 5 | 8 | 10 | 16 | 20;
  quality?: "speed" | "quality";
}

export interface AITrendHijackResult {
  id: string;
  trend: AITrendFeedItem;
  angle: string;
  similarVideoPrompt: string;
  musicStyle: string;
  optimizedCaptions: string[];
  video: AIVideoJob;
  createdAt: string;
  demoMode: boolean;
}

export type AIAvatarStyle = "anime" | "cartoon" | "influencer";

export interface AIAvatarCreatorRequest {
  sourceImageDataUrl: string;
  avatarMessage?: string;
  niche?: string;
  language?: string;
  size?: "1280x720" | "720x1280" | "1920x1080" | "1080x1920";
  seconds?: 5 | 8 | 10 | 16 | 20;
  quality?: "speed" | "quality";
}

export interface AIAvatarVariant {
  id: string;
  style: AIAvatarStyle;
  title: string;
  imageDataUrl: string;
  prompt: string;
  demoMode: boolean;
}

export interface AIAvatarCreatorResult {
  id: string;
  sourceImagePreview: string;
  variants: AIAvatarVariant[];
  talkingAvatar: AIVideoJob;
  monetization: {
    payPerAvatarLabel: string;
    premiumLabel: string;
  };
  createdAt: string;
  demoMode: boolean;
}

export interface AIGrowthCoachRequest {
  niche?: string;
  targetAudience?: string;
  recentPostTopic: string;
  recentCaption?: string;
  postGoal?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  retentionNote?: string;
  painPoint?: string;
  language?: string;
}

export interface AIGrowthCoachIdea {
  title: string;
  hook: string;
  format: string;
  reason: string;
}

export interface AIGrowthCoachResult {
  id: string;
  headline: string;
  diagnosis: string[];
  improvements: string[];
  nextPosts: AIGrowthCoachIdea[];
  coachSummary: string;
  premium: {
    lockedTo: "monthly" | "yearly";
    label: string;
  };
  createdAt: string;
  demoMode: boolean;
}

export interface AIFailureAuditRequest {
  sourceVideoName: string;
  durationSeconds?: number;
  caption?: string;
  retentionNote?: string;
  views?: number;
  niche?: string;
  targetAudience?: string;
  language?: string;
}

export interface AIFailureAuditSection {
  score: number;
  verdict: string;
  issue: string;
  fix: string;
}

export interface AIFailureAuditRetentionPoint {
  second: number;
  retention: number;
  label: string;
  note: string;
}

export interface AIFailureAuditResult {
  id: string;
  headline: string;
  hook: AIFailureAuditSection;
  retention: AIFailureAuditSection;
  captions: AIFailureAuditSection;
  transcript: {
    text: string;
    source: "auto" | "demo";
  };
  retentionGraph: AIFailureAuditRetentionPoint[];
  quickWins: string[];
  nextMove: string;
  createdAt: string;
  demoMode: boolean;
}
