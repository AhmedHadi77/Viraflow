export const LANGUAGE_CODES = ["en", "ar", "fr", "es", "pt", "de", "tr", "ru", "hi", "ur", "ms", "id", "zh", "ja"] as const;
export type LanguageOption = (typeof LANGUAGE_CODES)[number];

export function isLanguageOption(value: unknown): value is LanguageOption {
  return typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
}

export type PlanType = "free" | "weekly" | "monthly" | "yearly";
export type AppSubscriptionStatus = "inactive" | "active" | "canceled" | "expired";
export type ReelBoostPlanId = "starter" | "growth" | "viral";
export type SavedEntityType = "reel" | "product" | "post";
export type ProductCondition = "New" | "Like New" | "Good" | "Fair";
export type ProductListingStatus = "available" | "pending" | "sold";
export type CommunityKind = "page" | "group" | "channel";
export type CommunityVisibility = "public" | "private";
export type MarketplaceDeliveryMethod = "pickup" | "shipping";
export type MarketplacePaymentMethod = "card" | "cash";
export type MarketplaceOrderStatus = "placed" | "paid";
export type ConversationType = "marketplace" | "direct";
export type StoryMediaType = "image" | "video";
export type PostMediaType = "image" | "video";
export type ChatMessageMediaType = "image" | "video";
export type StudioPlaybackRate = 0.5 | 1 | 1.5 | 2;
export type UserRole = "user" | "admin";
export type ReportStatus = "open" | "reviewed" | "resolved";
export type ReportedEntityType = "post" | "reel" | "story" | "user";
export type PushNotificationsMode = "remote" | "local" | "unavailable";
export type PushPermissionStatus = "granted" | "denied" | "undetermined";
export type NotificationType =
  | "post_like"
  | "post_comment"
  | "reel_like"
  | "reel_comment"
  | "story_view"
  | "mention"
  | "like"
  | "comment"
  | "follow"
  | "repost"
  | "boost"
  | "save"
  | "message"
  | "order"
  | "call"
  | "system";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  profileImage: string;
  bio: string;
  headline: string;
  website?: string;
  language: LanguageOption;
  /** ISO 3166 country code the user picked in Settings, e.g. "MY". */
  region?: string;
  planType: PlanType;
  followers: string[];
  following: string[];
  reelIds: string[];
  productIds: string[];
  role?: UserRole;
  isBanned?: boolean;
  bannedAt?: string;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface Reel {
  id: string;
  userId: string;
  videoUrl: string;
  caption: string;
  thumbnailUrl: string;
  createdAt: string;
  tags: string[];
  likedBy: string[];
  repostCount: number;
  viewCount: number;
  reachCount: number;
  boostedUntil?: string;
  studio?: MediaStudioData;
}

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface PostMediaItem {
  id: string;
  type: PostMediaType;
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  durationSeconds?: number;
  studio?: MediaStudioData;
}

export interface Post {
  id: string;
  userId: string;
  caption: string;
  hashtags: string[];
  location?: string;
  media: PostMediaItem[];
  likedBy: string[];
  commentCount: number;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  imageUrl: string;
  mediaType?: StoryMediaType;
  videoUrl?: string;
  videoDurationSeconds?: number;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewerIds: string[];
  highlightedAt?: string;
  highlightLabel?: string;
  studio?: MediaStudioData;
}

export interface Product {
  id: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls: string[];
  category: string;
  condition: ProductCondition;
  location: string;
  listingStatus: ProductListingStatus;
  /** ISO 4217 currency the seller listed the price in. Older listings have none and are treated as USD. */
  currency?: string;
  /** ISO 3166 country code of the seller when the listing was created. */
  region?: string;
  createdAt: string;
}

export interface CommunitySpace {
  id: string;
  ownerId: string;
  kind: CommunityKind;
  name: string;
  description: string;
  category: string;
  coverImage: string;
  visibility: CommunityVisibility;
  memberIds: string[];
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CommunityChatMessage {
  id: string;
  communityId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  deliveredToUserIds: string[];
  seenByUserIds: string[];
}

export interface DirectChatThread {
  id: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
}

export interface DirectChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  mediaType?: ChatMessageMediaType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  createdAt: string;
  deliveredToUserIds: string[];
  seenByUserIds: string[];
}

export interface MarketplaceChatThread {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
}

export interface MarketplaceChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  deliveredToUserIds: string[];
  seenByUserIds: string[];
}

export interface MarketplaceOrder {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  amountUsd: number;
  deliveryMethod: MarketplaceDeliveryMethod;
  paymentMethod: MarketplacePaymentMethod;
  shippingAddress?: string;
  buyerNote?: string;
  status: MarketplaceOrderStatus;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: PlanType;
  title: string;
  priceLabel: string;
  cadence: string;
  description: string;
  benefits: string[];
}

export interface AppSubscription {
  id: string;
  userId: string;
  planType: PlanType;
  status: AppSubscriptionStatus;
  startedAt: string;
  endsAt?: string;
  autoRenew: boolean;
}

export interface PushNotificationsStatus {
  mode: PushNotificationsMode;
  permissionStatus: PushPermissionStatus;
  token?: string;
  message: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  provider?: "firebase" | "supabase" | "api";
  refreshToken?: string;
  expiresAt?: number;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface MediaEditFilters {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: number;
  /** 0..100 darkened edges. */
  vignette?: number;
  /** 0..100 film grain. */
  grain?: number;
  /** 0..100 extra sharpness. */
  sharpen?: number;
}

export interface MediaOverlayPosition {
  x: number;
  y: number;
}

export interface MediaStickerPlacement extends MediaOverlayPosition {
  value: string;
}

export type StudioTextStyle = "classic" | "modern" | "neon" | "typewriter" | "strong";
export type StudioTextBackground = "none" | "solid" | "soft";
export type StudioStickerKind = "emoji" | "location" | "mention" | "hashtag" | "time";

/** A piece of text placed on a photo or video in the editor. Position is the centre, as 0..1 of the frame. */
export interface StudioTextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  style: StudioTextStyle;
  background: StudioTextBackground;
  align: "left" | "center" | "right";
}

export interface StudioStickerLayer {
  id: string;
  kind: StudioStickerKind;
  value: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

/** A soundtrack: a track from the Sohba library (trackId) or the creator's own uploaded sound (url). */
export interface StudioMusic {
  trackId?: string;
  url?: string;
  title: string;
  artist: string;
  startSeconds: number;
  volume: number;
  /** Only while editing: the creator's own sound file before it is uploaded. */
  localUri?: string;
  mimeType?: string;
  durationSeconds?: number;
}

/** Editor results that are shown live on top of the media (text, stickers) or played with it (music). */
export interface MediaStudioData {
  texts?: StudioTextLayer[];
  stickers?: StudioStickerLayer[];
  music?: StudioMusic;
  /** Volume of the video's own sound, 0..1. */
  originalVolume?: number;
  filterName?: string;
}

export interface MediaEditConfig {
  overlayText?: string;
  overlayTextPosition?: MediaOverlayPosition;
  stickers?: MediaStickerPlacement[];
  filters?: MediaEditFilters;
  trimStartRatio?: number;
  trimEndRatio?: number;
  playbackRate?: StudioPlaybackRate;
  /** Live layers and soundtrack from the editor (kept with the post, reel or story). */
  studio?: MediaStudioData;
}

export interface CreateReelPayload {
  caption: string;
  hashtags?: string[];
  videoUrl: string;
  thumbnailUrl: string;
  videoMimeType?: string;
  videoFileName?: string;
  videoDurationSeconds?: number;
  thumbnailMimeType?: string;
  thumbnailFileName?: string;
  editConfig?: MediaEditConfig;
}

export interface CreateReelBoostPayload {
  reelId: string;
  planId: ReelBoostPlanId;
}

export interface ReelBoostPlan {
  id: ReelBoostPlanId;
  title: string;
  priceLabel: string;
  budgetUsd: number;
  estimatedViews: number;
  estimatedReach: number;
  durationDays: number;
  badge: string;
  description: string;
}

export interface ReelBoostCampaign {
  id: string;
  reelId: string;
  userId: string;
  planId: ReelBoostPlanId;
  planTitle: string;
  amountUsd: number;
  estimatedViews: number;
  estimatedReach: number;
  status: "active" | "completed";
  startedAt: string;
  endsAt: string;
  targetAudience: string;
  note: string;
}

export interface SavedPost {
  id: string;
  userId: string;
  entityType: SavedEntityType;
  entityId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  entityType?: SavedEntityType;
  entityId?: string;
  conversationId?: string;
  conversationType?: ConversationType;
  createdAt: string;
  readAt?: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  entityType: ReportedEntityType;
  entityId: string;
  ownerId?: string;
  reason: string;
  details?: string;
  createdAt: string;
  status: ReportStatus;
}

export interface CreateMarketplaceOrderPayload {
  productId: string;
  deliveryMethod: MarketplaceDeliveryMethod;
  paymentMethod: MarketplacePaymentMethod;
  shippingAddress?: string;
  buyerNote?: string;
}

export interface CreateDirectMessagePayload {
  text?: string;
  mediaUri?: string;
  mediaType?: ChatMessageMediaType;
  mediaMimeType?: string;
  mediaFileName?: string;
  mediaDurationSeconds?: number;
  mediaThumbnailUri?: string;
}

export interface CreateProductPayload {
  title: string;
  description: string;
  price: string;
  imageUrls: string[];
  category: string;
  condition: ProductCondition;
  location: string;
  /** Filled in from the seller's region when omitted. */
  currency?: string;
  region?: string;
}

export interface CreateCommunityPayload {
  kind: CommunityKind;
  name: string;
  description: string;
  category: string;
  coverImage: string;
  visibility: CommunityVisibility;
}

export interface CreateCommunityPostPayload {
  communityId: string;
  text: string;
  imageUrl?: string;
}

export interface CreateStoryPayload {
  imageUrl: string;
  videoUrl?: string;
  mediaType?: StoryMediaType;
  videoMimeType?: string;
  videoFileName?: string;
  videoDurationSeconds?: number;
  caption?: string;
  saveToHighlights?: boolean;
  highlightLabel?: string;
  editConfig?: MediaEditConfig;
}

export interface CreatePostMediaPayload {
  uri: string;
  type: PostMediaType;
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
  editConfig?: MediaEditConfig;
}

export interface CreatePostPayload {
  caption: string;
  hashtags: string[];
  location?: string;
  mediaItems: CreatePostMediaPayload[];
}

export interface UpdateProfilePayload {
  name: string;
  username: string;
  bio: string;
  headline: string;
  website: string;
  profileImage: string;
}

export type AITextMode = "captions" | "script" | "product_copy";
export type AIVoiceOption = "alloy" | "coral" | "marin" | "cedar" | "sage";

export interface AIStatusPayload {
  demoMode: boolean;
  textModel: string;
  imageModel: string;
  videoModel: string;
  voiceModel: string;
}

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
  /** "local" when the trend comes from creators in the requested region. Older servers omit it. */
  scope?: "local" | "global";
  region?: string;
  reelCount?: number;
  postCount?: number;
  creatorCount?: number;
  windowDays?: number;
}

export interface AITrendHijackRequest {
  trendId: string;
  /** Viewer's country so the remix can be adapted to the local audience. */
  region?: string;
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
    source: "auto" | "caption";
  };
  retentionGraph: AIFailureAuditRetentionPoint[];
  quickWins: string[];
  nextMove: string;
  createdAt: string;
  demoMode: boolean;
}

export function isReelBoostActive(reel: Pick<Reel, "boostedUntil">, now = Date.now()) {
  return Boolean(reel.boostedUntil && new Date(reel.boostedUntil).getTime() > now);
}
