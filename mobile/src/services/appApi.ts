import {
  AppNotification,
  CommunityChatMessage,
  CommunityPost,
  CommunitySpace,
  CreateCommunityPayload,
  CreateCommunityPostPayload,
  DirectChatMessage,
  DirectChatThread,
  CreateProductPayload,
  CreateMarketplaceOrderPayload,
  CreateReelPayload,
  CreateReelBoostPayload,
  LanguageOption,
  MarketplaceChatMessage,
  MarketplaceChatThread,
  MarketplaceOrder,
  PlanType,
  Product,
  Reel,
  ReelBoostCampaign,
  SavedPost,
  Story,
  CreateStoryPayload,
  UpdateProfilePayload,
  User,
} from "../types/models";

const API_BASE_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EXPO_PUBLIC_API_BASE_URL?.replace(
    /\/$/,
    ""
  ) ?? "";

export interface ApiUserPayload {
  id: string;
  name: string;
  username: string;
  email: string;
  profileImage: string;
  bio: string;
  headline: string;
  language: string;
  followersCount?: number;
  followingCount?: number;
}

interface ApiReelPayload {
  id: string;
  userId: string;
  videoUrl: string;
  caption: string;
  thumbnailUrl: string;
  likedBy?: string[];
  repostCount: number;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
  viewCount?: number;
  reachCount?: number;
  activeBoost?: ApiReelBoostPayload | null;
  creator?: ApiUserPayload | null;
}

interface ApiReelBoostPayload {
  id: string;
  reelId: string;
  userId: string;
  planId: "starter" | "growth" | "viral";
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

interface ApiProductPayload {
  id: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls: string[];
  category: string;
  condition: "New" | "Like New" | "Good" | "Fair";
  location: string;
  listingStatus: "available" | "pending" | "sold";
  createdAt: string;
  seller?: ApiUserPayload | null;
}

interface ApiStoryPayload {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  creator?: ApiUserPayload | null;
}

interface ApiProfilePayload extends ApiUserPayload {
  reelsCount?: number;
  productsCount?: number;
  reels?: ApiReelPayload[];
  products?: ApiProductPayload[];
}

interface ApiSubscriptionPayload {
  planType: Exclude<PlanType, "free">;
  status: "active" | "inactive" | "trial";
}

interface ApiSavedPostPayload {
  id: string;
  userId: string;
  entityType: "reel" | "product";
  entityId: string;
  createdAt: string;
}

interface ApiNotificationPayload {
  id: string;
  userId: string;
  type: "like" | "comment" | "follow" | "repost" | "boost" | "save" | "message" | "order" | "system";
  title: string;
  body: string;
  actorId?: string;
  entityType?: "reel" | "product";
  entityId?: string;
  conversationId?: string;
  conversationType?: "marketplace" | "direct";
  createdAt: string;
  readAt?: string;
  actor?: ApiUserPayload | null;
}

interface ApiCommunityPayload {
  id: string;
  ownerId: string;
  kind: "page" | "group" | "channel";
  name: string;
  description: string;
  category: string;
  coverImage: string;
  visibility: "public" | "private";
  memberIds: string[];
  createdAt: string;
  owner?: ApiUserPayload | null;
}

interface ApiCommunityPostPayload {
  id: string;
  communityId: string;
  authorId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  author?: ApiUserPayload | null;
}

export interface ApiCommunityChatMessagePayload {
  id: string;
  communityId: string;
  senderId: string;
  text: string;
  createdAt: string;
  deliveredToUserIds?: string[];
  seenByUserIds?: string[];
  sender?: ApiUserPayload | null;
  communityKind?: "page" | "group" | "channel" | null;
}

export interface ApiDirectChatThreadPayload {
  id: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
}

export interface ApiDirectChatMessagePayload {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  createdAt: string;
  deliveredToUserIds?: string[];
  seenByUserIds?: string[];
  sender?: ApiUserPayload | null;
}

export interface ApiMarketplaceChatThreadPayload {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
}

export interface ApiMarketplaceChatMessagePayload {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  createdAt: string;
  deliveredToUserIds?: string[];
  seenByUserIds?: string[];
  sender?: ApiUserPayload | null;
}

interface ApiMarketplaceOrderPayload {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  amountUsd: number;
  deliveryMethod: "pickup" | "shipping";
  paymentMethod: "card" | "cash";
  shippingAddress?: string;
  buyerNote?: string;
  status: "placed" | "paid";
  createdAt: string;
  buyer?: ApiUserPayload | null;
  seller?: ApiUserPayload | null;
  product?: ApiProductPayload | null;
}

export class AppApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = "AppApiError";
    this.status = options?.status;
    this.code = options?.code;
  }
}

export function isAppApiConfigured() {
  return Boolean(API_BASE_URL);
}

export async function loginWithApi(email: string, password: string) {
  return request<{ token: string; user: ApiUserPayload }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function registerWithApi(payload: { name: string; username: string; email: string; password: string; language: LanguageOption }) {
  return request<{ token: string; user: ApiUserPayload }>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export async function fetchApiBootstrap(token: string) {
  const [me, profile, reels, products, communities, stories, boosts, savedPosts, notifications, subscription, direct, marketplace] = await Promise.all([
    request<{ user: ApiUserPayload }>("/auth/me", { method: "GET", token }),
    request<{ profile: ApiProfilePayload }>("/profiles/me", { method: "GET", token }),
    request<{ reels: ApiReelPayload[] }>("/reels", { method: "GET" }),
    request<{ products: ApiProductPayload[] }>("/products", { method: "GET" }),
    request<{ communities: ApiCommunityPayload[] }>("/communities", { method: "GET" }),
    request<{ stories: ApiStoryPayload[] }>("/stories", { method: "GET" }),
    request<{ boosts: ApiReelBoostPayload[] }>("/reels/boosts", { method: "GET" }),
    request<{ savedPosts: ApiSavedPostPayload[] }>("/saved/me", { method: "GET", token }),
    request<{ notifications: ApiNotificationPayload[] }>("/notifications/me", { method: "GET", token }),
    request<{ subscription: ApiSubscriptionPayload | null }>("/subscriptions/me", { method: "GET", token }),
    request<{ threads: ApiDirectChatThreadPayload[]; messages: ApiDirectChatMessagePayload[] }>("/direct/inbox/me", { method: "GET", token }),
    request<{ threads: ApiMarketplaceChatThreadPayload[]; messages: ApiMarketplaceChatMessagePayload[]; orders: ApiMarketplaceOrderPayload[] }>("/marketplace/inbox/me", {
      method: "GET",
      token,
    }),
  ]);

  return {
    me: me.user,
    profile: profile.profile,
    reels: reels.reels,
    products: products.products,
    communities: communities.communities,
    stories: stories.stories,
    boosts: boosts.boosts,
    savedPosts: savedPosts.savedPosts,
    notifications: notifications.notifications,
    subscription: subscription.subscription,
    directThreads: direct.threads,
    directMessages: direct.messages,
    marketplaceThreads: marketplace.threads,
    marketplaceMessages: marketplace.messages,
    marketplaceOrders: marketplace.orders,
  };
}

export async function fetchApiCatalog() {
  const [reels, products, communities, stories, boosts] = await Promise.all([
    request<{ reels: ApiReelPayload[] }>("/reels", { method: "GET" }),
    request<{ products: ApiProductPayload[] }>("/products", { method: "GET" }),
    request<{ communities: ApiCommunityPayload[] }>("/communities", { method: "GET" }),
    request<{ stories: ApiStoryPayload[] }>("/stories", { method: "GET" }),
    request<{ boosts: ApiReelBoostPayload[] }>("/reels/boosts", { method: "GET" }),
  ]);

  return {
    reels: reels.reels,
    products: products.products,
    communities: communities.communities,
    stories: stories.stories,
    boosts: boosts.boosts,
  };
}

export async function createReelWithApi(token: string, payload: CreateReelPayload) {
  const response = await request<{ reel: ApiReelPayload }>("/reels", {
    method: "POST",
    token,
    body: {
      caption: payload.caption.trim(),
      videoUrl: payload.videoUrl.trim(),
      thumbnailUrl: payload.thumbnailUrl.trim() || undefined,
    },
  });

  return response.reel;
}

export async function createProductWithApi(token: string, payload: CreateProductPayload) {
  const response = await request<{ product: ApiProductPayload }>("/products", {
    method: "POST",
    token,
    body: {
      title: payload.title.trim(),
      description: payload.description.trim(),
      price: Number(payload.price) || 0,
      imageUrls: payload.imageUrls.map((item) => item.trim()).filter(Boolean),
      category: payload.category.trim(),
      condition: payload.condition,
      location: payload.location.trim(),
    },
  });

  return response.product;
}

export async function createCommunityWithApi(token: string, payload: CreateCommunityPayload) {
  const response = await request<{ community: ApiCommunityPayload }>("/communities", {
    method: "POST",
    token,
    body: {
      kind: payload.kind,
      name: payload.name.trim(),
      description: payload.description.trim(),
      category: payload.category.trim(),
      coverImage: payload.coverImage.trim(),
      visibility: payload.visibility,
    },
  });

  return response.community;
}

export async function fetchCommunitiesWithApi() {
  const response = await request<{ communities: ApiCommunityPayload[] }>("/communities", {
    method: "GET",
  });

  return response.communities;
}

export async function fetchCommunityActivityWithApi(token: string, communityId: string) {
  return request<{
    community: ApiCommunityPayload;
    posts: ApiCommunityPostPayload[];
    chatMessages: ApiCommunityChatMessagePayload[];
  }>(`/communities/${communityId}/activity`, {
    method: "GET",
    token,
  });
}

export async function createCommunityPostWithApi(token: string, payload: CreateCommunityPostPayload) {
  return request<{ post: ApiCommunityPostPayload }>(`/communities/${payload.communityId}/posts`, {
    method: "POST",
    token,
    body: {
      text: payload.text.trim(),
      imageUrl: payload.imageUrl?.trim() || undefined,
    },
  });
}

export async function sendCommunityChatMessageWithApi(token: string, communityId: string, text: string) {
  return request<{ message: ApiCommunityChatMessagePayload }>(`/communities/${communityId}/chat`, {
    method: "POST",
    token,
    body: {
      text: text.trim(),
    },
  });
}

export async function fetchDirectInboxWithApi(token: string) {
  return request<{ threads: ApiDirectChatThreadPayload[]; messages: ApiDirectChatMessagePayload[] }>("/direct/inbox/me", {
    method: "GET",
    token,
  });
}

export async function startDirectChatWithApi(token: string, targetUserId: string) {
  return request<{ thread: ApiDirectChatThreadPayload; messages: ApiDirectChatMessagePayload[] }>("/direct/threads", {
    method: "POST",
    token,
    body: {
      targetUserId,
    },
  });
}

export async function fetchDirectThreadWithApi(token: string, threadId: string) {
  return request<{ thread: ApiDirectChatThreadPayload; messages: ApiDirectChatMessagePayload[] }>(`/direct/threads/${threadId}`, {
    method: "GET",
    token,
  });
}

export async function sendDirectMessageWithApi(token: string, threadId: string, text: string) {
  return request<{ thread: ApiDirectChatThreadPayload; message: ApiDirectChatMessagePayload }>(
    `/direct/threads/${threadId}/messages`,
    {
      method: "POST",
      token,
      body: {
        text: text.trim(),
      },
    }
  );
}

export async function createStoryWithApi(token: string, payload: CreateStoryPayload) {
  const response = await request<{ story: ApiStoryPayload }>("/stories", {
    method: "POST",
    token,
    body: {
      imageUrl: payload.imageUrl.trim(),
      caption: payload.caption?.trim() || undefined,
    },
  });

  return response.story;
}

export async function updateProfileWithApi(token: string, payload: UpdateProfilePayload) {
  const response = await request<{ profile: ApiProfilePayload }>("/profiles/me", {
    method: "PATCH",
    token,
    body: {
      name: payload.name.trim(),
      username: payload.username.trim(),
      bio: payload.bio.trim(),
      headline: payload.headline.trim(),
      profileImage: payload.profileImage.trim() || undefined,
    },
  });

  return response.profile;
}

export async function createCommentWithApi(token: string, reelId: string, text: string) {
  const response = await request<{
    comment: {
      id: string;
      reelId: string;
      userId: string;
      text: string;
      createdAt: string;
      author?: ApiUserPayload | null;
    };
  }>(`/reels/${reelId}/comments`, {
    method: "POST",
    token,
    body: {
      text: text.trim(),
    },
  });

  return response.comment;
}

export async function toggleLikeWithApi(token: string, reelId: string) {
  const response = await request<{ reel: ApiReelPayload }>(`/reels/${reelId}/like`, {
    method: "POST",
    token,
  });

  return response.reel;
}

export async function repostReelWithApi(token: string, reelId: string) {
  const response = await request<{ reel: ApiReelPayload }>(`/reels/${reelId}/repost`, {
    method: "POST",
    token,
  });

  return response.reel;
}

export async function createSubscriptionCheckoutSessionWithApi(
  token: string,
  planType: Exclude<PlanType, "free">
) {
  return request<{
    message: string;
    status: "pending";
    checkoutUrl: string;
    sessionId: string;
    mode: "subscription";
  }>("/subscriptions/checkout-session", {
    method: "POST",
    token,
    body: {
      planType,
    },
  });
}

export async function toggleFollowWithApi(token: string, targetUserId: string) {
  return request<{
    result: {
      following: boolean;
    };
    targetUser: ApiUserPayload;
  }>(`/profiles/users/${targetUserId}/follow`, {
    method: "POST",
    token,
  });
}

export async function boostReelWithApi(token: string, payload: CreateReelBoostPayload) {
  const response = await request<{ reel: ApiReelPayload; boost: ApiReelBoostPayload }>(`/reels/${payload.reelId}/boost`, {
    method: "POST",
    token,
    body: {
      planId: payload.planId,
    },
  });

  return response;
}

export async function createBoostCheckoutSessionWithApi(token: string, payload: CreateReelBoostPayload) {
  return request<{
    message: string;
    status: "pending";
    checkoutUrl: string;
    sessionId: string;
    mode: "payment";
  }>(`/reels/${payload.reelId}/boost/checkout-session`, {
    method: "POST",
    token,
    body: {
      planId: payload.planId,
    },
  });
}

export async function toggleSaveReelWithApi(token: string, reelId: string) {
  return request<{ saved: boolean; savedPost: ApiSavedPostPayload | null }>(`/reels/${reelId}/save`, {
    method: "POST",
    token,
  });
}

export async function toggleSaveProductWithApi(token: string, productId: string) {
  return request<{ saved: boolean; savedPost: ApiSavedPostPayload | null }>(`/products/${productId}/save`, {
    method: "POST",
    token,
  });
}

export async function updateProductListingStatusWithApi(
  token: string,
  productId: string,
  listingStatus: Product["listingStatus"]
) {
  const response = await request<{ product: ApiProductPayload }>(`/products/${productId}/status`, {
    method: "PATCH",
    token,
    body: {
      listingStatus,
    },
  });

  return response.product;
}

export async function fetchNotificationsWithApi(token: string) {
  const response = await request<{ notifications: ApiNotificationPayload[] }>("/notifications/me", {
    method: "GET",
    token,
  });

  return response.notifications;
}

export async function markAllNotificationsReadWithApi(token: string) {
  const response = await request<{ notifications: ApiNotificationPayload[] }>("/notifications/read-all", {
    method: "POST",
    token,
  });

  return response.notifications;
}

export async function fetchMarketplaceInboxWithApi(token: string) {
  return request<{ threads: ApiMarketplaceChatThreadPayload[]; messages: ApiMarketplaceChatMessagePayload[]; orders: ApiMarketplaceOrderPayload[] }>("/marketplace/inbox/me", {
    method: "GET",
    token,
  });
}

export async function startMarketplaceChatWithApi(token: string, productId: string) {
  return request<{ thread: ApiMarketplaceChatThreadPayload; messages: ApiMarketplaceChatMessagePayload[] }>("/marketplace/chats", {
    method: "POST",
    token,
    body: {
      productId,
    },
  });
}

export async function fetchMarketplaceThreadWithApi(token: string, threadId: string) {
  return request<{ thread: ApiMarketplaceChatThreadPayload; messages: ApiMarketplaceChatMessagePayload[] }>(
    `/marketplace/chats/${threadId}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function sendMarketplaceMessageWithApi(token: string, threadId: string, text: string) {
  return request<{ thread: ApiMarketplaceChatThreadPayload; message: ApiMarketplaceChatMessagePayload }>(
    `/marketplace/chats/${threadId}/messages`,
    {
      method: "POST",
      token,
      body: {
        text: text.trim(),
      },
    }
  );
}

export async function createMarketplaceOrderWithApi(token: string, payload: CreateMarketplaceOrderPayload) {
  return request<{
    order: ApiMarketplaceOrderPayload;
    thread: ApiMarketplaceChatThreadPayload;
    product: ApiProductPayload | null;
  }>("/marketplace/orders", {
    method: "POST",
    token,
    body: {
      productId: payload.productId,
      deliveryMethod: payload.deliveryMethod,
      paymentMethod: payload.paymentMethod,
      shippingAddress: payload.shippingAddress?.trim() || undefined,
      buyerNote: payload.buyerNote?.trim() || undefined,
    },
  });
}

export async function fetchSavedPostsWithApi(token: string) {
  const response = await request<{ savedPosts: ApiSavedPostPayload[] }>("/saved/me", {
    method: "GET",
    token,
  });

  return response.savedPosts;
}

export function mapApiUserToMobile(
  apiUser: ApiUserPayload,
  options?: {
    existing?: User;
    planType?: PlanType;
    followers?: string[];
    following?: string[];
    reelIds?: string[];
    productIds?: string[];
  }
): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    username: apiUser.username,
    email: apiUser.email || options?.existing?.email || `${apiUser.username}@viraflow.app`,
    profileImage: apiUser.profileImage,
    bio: apiUser.bio,
    headline: apiUser.headline,
    language: normalizeLanguage(apiUser.language, options?.existing?.language),
    planType: options?.planType ?? options?.existing?.planType ?? "free",
    followers: options?.followers ?? options?.existing?.followers ?? [],
    following: options?.following ?? options?.existing?.following ?? [],
    reelIds: options?.reelIds ?? options?.existing?.reelIds ?? [],
    productIds: options?.productIds ?? options?.existing?.productIds ?? [],
  };
}

export function mapApiReelToMobile(apiReel: ApiReelPayload, existing?: Reel): Reel {
  const likedBy = Array.isArray(apiReel.likedBy) ? apiReel.likedBy : existing?.likedBy ?? [];
  const viewCount = apiReel.viewCount ?? existing?.viewCount ?? Math.max(240, likedBy.length * 320 + 1400);

  return {
    id: apiReel.id,
    userId: apiReel.userId,
    videoUrl: apiReel.videoUrl,
    caption: apiReel.caption,
    thumbnailUrl: apiReel.thumbnailUrl,
    createdAt: apiReel.createdAt,
    tags: existing?.tags ?? buildTagsFromCaption(apiReel.caption),
    likedBy,
    repostCount: apiReel.repostCount,
    viewCount,
    reachCount: apiReel.reachCount ?? existing?.reachCount ?? Math.max(viewCount * 3, viewCount + 900),
  };
}

export function mapApiProductToMobile(apiProduct: ApiProductPayload, existing?: Product): Product {
  return {
    id: apiProduct.id,
    userId: apiProduct.userId,
    title: apiProduct.title,
    description: apiProduct.description,
    price: apiProduct.price,
    imageUrl: apiProduct.imageUrl,
    imageUrls: apiProduct.imageUrls?.length ? apiProduct.imageUrls : existing?.imageUrls ?? [apiProduct.imageUrl],
    category: apiProduct.category,
    condition: apiProduct.condition,
    location: apiProduct.location,
    listingStatus: apiProduct.listingStatus,
    createdAt: apiProduct.createdAt,
  };
}

export function mapApiCommunityToMobile(apiCommunity: ApiCommunityPayload): CommunitySpace {
  return {
    id: apiCommunity.id,
    ownerId: apiCommunity.ownerId,
    kind: apiCommunity.kind,
    name: apiCommunity.name,
    description: apiCommunity.description,
    category: apiCommunity.category,
    coverImage: apiCommunity.coverImage,
    visibility: apiCommunity.visibility,
    memberIds: apiCommunity.memberIds ?? [],
    createdAt: apiCommunity.createdAt,
  };
}

export function mapApiCommunityPostToMobile(apiPost: ApiCommunityPostPayload, existingUser?: User): CommunityPost {
  return {
    id: apiPost.id,
    communityId: apiPost.communityId,
    authorId: apiPost.authorId,
    authorName: apiPost.author?.name ?? existingUser?.name ?? "Community member",
    authorAvatar:
      apiPost.author?.profileImage ??
      existingUser?.profileImage ??
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80",
    text: apiPost.text,
    imageUrl: apiPost.imageUrl,
    createdAt: apiPost.createdAt,
  };
}

export function mapApiCommunityChatMessageToMobile(
  apiMessage: ApiCommunityChatMessagePayload,
  existingUser?: User
): CommunityChatMessage {
  return {
    id: apiMessage.id,
    communityId: apiMessage.communityId,
    senderId: apiMessage.senderId,
    senderName: apiMessage.sender?.name ?? existingUser?.name ?? "Community member",
    senderAvatar:
      apiMessage.sender?.profileImage ??
      existingUser?.profileImage ??
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80",
    text: apiMessage.text,
    createdAt: apiMessage.createdAt,
    deliveredToUserIds: apiMessage.deliveredToUserIds ?? [],
    seenByUserIds: apiMessage.seenByUserIds ?? [],
  };
}

export function mapApiDirectThreadToMobile(apiThread: ApiDirectChatThreadPayload): DirectChatThread {
  return {
    id: apiThread.id,
    participantIds: apiThread.participantIds ?? [],
    createdAt: apiThread.createdAt,
    updatedAt: apiThread.updatedAt,
    lastMessagePreview: apiThread.lastMessagePreview,
    lastMessageAt: apiThread.lastMessageAt,
  };
}

export function mapApiDirectMessageToMobile(apiMessage: ApiDirectChatMessagePayload, existingUser?: User): DirectChatMessage {
  return {
    id: apiMessage.id,
    threadId: apiMessage.threadId,
    senderId: apiMessage.senderId,
    senderName: apiMessage.sender?.name ?? existingUser?.name ?? "Creator",
    senderAvatar:
      apiMessage.sender?.profileImage ??
      existingUser?.profileImage ??
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80",
    text: apiMessage.text,
    createdAt: apiMessage.createdAt,
    deliveredToUserIds: apiMessage.deliveredToUserIds ?? [],
    seenByUserIds: apiMessage.seenByUserIds ?? [],
  };
}

export function mapApiStoryToMobile(apiStory: ApiStoryPayload): Story {
  return {
    id: apiStory.id,
    userId: apiStory.userId,
    imageUrl: apiStory.imageUrl,
    caption: apiStory.caption,
    createdAt: apiStory.createdAt,
    expiresAt: apiStory.expiresAt,
  };
}

export function mapApiBoostToMobile(apiBoost: ApiReelBoostPayload): ReelBoostCampaign {
  return {
    id: apiBoost.id,
    reelId: apiBoost.reelId,
    userId: apiBoost.userId,
    planId: apiBoost.planId,
    planTitle: apiBoost.planTitle,
    amountUsd: apiBoost.amountUsd,
    estimatedViews: apiBoost.estimatedViews,
    estimatedReach: apiBoost.estimatedReach,
    status: apiBoost.status,
    startedAt: apiBoost.startedAt,
    endsAt: apiBoost.endsAt,
    targetAudience: apiBoost.targetAudience,
    note: apiBoost.note,
  };
}

export function mapApiSavedPostToMobile(apiSavedPost: ApiSavedPostPayload): SavedPost {
  return {
    id: apiSavedPost.id,
    userId: apiSavedPost.userId,
    entityType: apiSavedPost.entityType,
    entityId: apiSavedPost.entityId,
    createdAt: apiSavedPost.createdAt,
  };
}

export function mapApiNotificationToMobile(apiNotification: ApiNotificationPayload): AppNotification {
  return {
    id: apiNotification.id,
    userId: apiNotification.userId,
    type: apiNotification.type,
    title: apiNotification.title,
    body: apiNotification.body,
    actorId: apiNotification.actorId,
    actorName: apiNotification.actor?.name,
    actorAvatar: apiNotification.actor?.profileImage,
    entityType: apiNotification.entityType,
    entityId: apiNotification.entityId,
    conversationId: apiNotification.conversationId,
    conversationType: apiNotification.conversationType,
    createdAt: apiNotification.createdAt,
    readAt: apiNotification.readAt,
  };
}

export function mapApiMarketplaceThreadToMobile(apiThread: ApiMarketplaceChatThreadPayload): MarketplaceChatThread {
  return {
    id: apiThread.id,
    productId: apiThread.productId,
    buyerId: apiThread.buyerId,
    sellerId: apiThread.sellerId,
    createdAt: apiThread.createdAt,
    updatedAt: apiThread.updatedAt,
    lastMessagePreview: apiThread.lastMessagePreview,
    lastMessageAt: apiThread.lastMessageAt,
  };
}

export function mapApiMarketplaceMessageToMobile(
  apiMessage: ApiMarketplaceChatMessagePayload,
  existingUser?: User
): MarketplaceChatMessage {
  return {
    id: apiMessage.id,
    threadId: apiMessage.threadId,
    senderId: apiMessage.senderId,
    senderName: apiMessage.sender?.name ?? existingUser?.name ?? "Marketplace user",
    senderAvatar:
      apiMessage.sender?.profileImage ??
      existingUser?.profileImage ??
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80",
    text: apiMessage.text,
    createdAt: apiMessage.createdAt,
    deliveredToUserIds: apiMessage.deliveredToUserIds ?? [],
    seenByUserIds: apiMessage.seenByUserIds ?? [],
  };
}

export function mapApiMarketplaceOrderToMobile(apiOrder: ApiMarketplaceOrderPayload): MarketplaceOrder {
  return {
    id: apiOrder.id,
    productId: apiOrder.productId,
    buyerId: apiOrder.buyerId,
    sellerId: apiOrder.sellerId,
    amountUsd: apiOrder.amountUsd,
    deliveryMethod: apiOrder.deliveryMethod,
    paymentMethod: apiOrder.paymentMethod,
    shippingAddress: apiOrder.shippingAddress,
    buyerNote: apiOrder.buyerNote,
    status: apiOrder.status,
    createdAt: apiOrder.createdAt,
  };
}

export function derivePlanType(
  subscription: ApiSubscriptionPayload | null | undefined,
  existing?: User
): PlanType {
  if (subscription?.status === "active") {
    return subscription.planType;
  }

  return existing?.planType ?? "free";
}

function buildTagsFromCaption(caption: string) {
  const words = caption
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  const unique = [...new Set(words)];
  return unique.slice(0, 3).length > 0 ? unique.slice(0, 3) : ["creator", "viral"];
}

function normalizeLanguage(language: string | undefined, fallback?: LanguageOption): LanguageOption {
  if (language === "en" || language === "ar" || language === "fr" || language === "es") {
    return language;
  }

  return fallback ?? "en";
}

async function request<T>(
  path: string,
  options: { method: "GET" | "POST" | "PATCH"; token?: string; body?: unknown }
): Promise<T> {
  if (!API_BASE_URL) {
    throw new AppApiError("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let errorCode: string | undefined;

      try {
        const errorBody = (await response.json()) as { message?: string; code?: string };
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
        errorCode = errorBody.code;
      } catch {
        // Keep the generic error when the response body is not JSON.
      }

      throw new AppApiError(errorMessage, { status: response.status, code: errorCode });
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AppApiError) {
      throw error;
    }

    throw new AppApiError("Could not reach the ViraFlow backend. Start the API and try again.");
  }
}
