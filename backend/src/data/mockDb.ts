import {
  Comment,
  CommunityChatMessage,
  CommunityPost,
  CommunitySpace,
  DirectChatMessage,
  DirectChatThread,
  FollowRelation,
  LanguageOption,
  MarketplaceChatMessage,
  MarketplaceChatThread,
  MarketplaceDeliveryMethod,
  MarketplaceOrder,
  MarketplacePaymentMethod,
  Notification,
  NotificationType,
  PlanType,
  Product,
  Reel,
  ReelBoostCampaign,
  ReelBoostPlanId,
  SavedEntityType,
  SavedPost,
  Story,
  Subscription,
  User,
} from "../types/models";
import { DEFAULT_PROFILE_IMAGE, MEDIA_UNAVAILABLE_IMAGE } from "./defaultMedia";

const HOURS_IN_MS = 60 * 60 * 1000;
const STORY_LIFETIME_MS = 24 * HOURS_IN_MS;
let notificationCreatedListener: ((notification: Notification) => void) | null = null;

const users: User[] = [];

const reels: Reel[] = [];

const comments: Comment[] = [];

const stories: Story[] = [];

const follows: FollowRelation[] = [];

const products: Product[] = [];

const communities: CommunitySpace[] = [];

const communityPosts: CommunityPost[] = [];

const communityChatMessages: CommunityChatMessage[] = [];

const directThreads: DirectChatThread[] = [];

const directMessages: DirectChatMessage[] = [];

const marketplaceThreads: MarketplaceChatThread[] = [];

const marketplaceMessages: MarketplaceChatMessage[] = [];

const marketplaceOrders: MarketplaceOrder[] = [];

const subscriptions: Subscription[] = [];

const savedPosts: SavedPost[] = [];

const notifications: Notification[] = [];

const reelBoostPlans: Record<
  ReelBoostPlanId,
  {
    id: ReelBoostPlanId;
    title: string;
    budgetUsd: number;
    estimatedViews: number;
    estimatedReach: number;
    durationDays: number;
  }
> = {
  starter: {
    id: "starter",
    title: "Starter Push",
    budgetUsd: 5,
    estimatedViews: 1200,
    estimatedReach: 5000,
    durationDays: 2,
  },
  growth: {
    id: "growth",
    title: "Growth Burst",
    budgetUsd: 15,
    estimatedViews: 4800,
    estimatedReach: 18000,
    durationDays: 5,
  },
  viral: {
    id: "viral",
    title: "Viral Blast",
    budgetUsd: 35,
    estimatedViews: 14000,
    estimatedReach: 50000,
    durationDays: 7,
  },
};

const reelBoosts: ReelBoostCampaign[] = [];

export function listUsers() {
  return [...users];
}

export function getUserById(userId: string) {
  return users.find((user) => user.id === userId);
}

export function getLatestUserActivityAt(userId: string) {
  const timestamps = [
    getUserById(userId)?.createdAt,
    ...reels.filter((item) => item.userId === userId).map((item) => item.createdAt),
    ...comments.filter((item) => item.userId === userId).map((item) => item.createdAt),
    ...stories.filter((item) => item.userId === userId).map((item) => item.createdAt),
    ...products.filter((item) => item.userId === userId).map((item) => item.createdAt),
    ...communityPosts.filter((item) => item.authorId === userId).map((item) => item.createdAt),
    ...communityChatMessages.filter((item) => item.senderId === userId).map((item) => item.createdAt),
    ...directMessages.filter((item) => item.senderId === userId).map((item) => item.createdAt),
    ...marketplaceMessages.filter((item) => item.senderId === userId).map((item) => item.createdAt),
    ...marketplaceOrders
      .filter((item) => item.buyerId === userId || item.sellerId === userId)
      .map((item) => item.createdAt),
  ].filter((value): value is string => Boolean(value));

  return timestamps.sort((left, right) => right.localeCompare(left))[0];
}

export function findUserByEmail(email: string) {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findUserByUsername(username: string) {
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

export function createUser(input: {
  name: string;
  username: string;
  email: string;
  language: LanguageOption;
}) {
  const user: User = {
    id: `user-${Date.now()}`,
    name: input.name.trim(),
    username: input.username.trim().replace(/\s+/g, "").toLowerCase(),
    email: input.email.trim().toLowerCase(),
    passwordHash: "demo-hash",
    profileImage:
      DEFAULT_PROFILE_IMAGE,
    bio: "New creator on ViraFlow.",
    headline: "Creator in progress",
    website: "",
    language: input.language,
    createdAt: new Date().toISOString(),
  };

  users.unshift(user);
  return user;
}

export function createExternalUser(input: {
  id: string;
  name: string;
  username: string;
  email: string;
  language: LanguageOption;
  profileImage?: string;
}) {
  const user: User = {
    id: input.id,
    name: input.name.trim() || "Sohba Creator",
    username: input.username.trim().replace(/\s+/g, "").toLowerCase(),
    email: input.email.trim().toLowerCase(),
    passwordHash: "external-auth",
    profileImage:
      input.profileImage?.trim() ||
      DEFAULT_PROFILE_IMAGE,
    bio: "New creator on Sohba.",
    headline: "Creator in progress",
    website: "",
    language: input.language,
    createdAt: new Date().toISOString(),
  };

  users.unshift(user);
  return user;
}

export function updateUser(
  userId: string,
  input: Partial<Pick<User, "name" | "username" | "bio" | "headline" | "website" | "profileImage">>
) {
  const user = getUserById(userId);
  if (!user) {
    return undefined;
  }

  user.name = input.name !== undefined ? input.name.trim() || user.name : user.name;
  user.username =
    input.username !== undefined ? input.username.trim().replace(/\s+/g, "").toLowerCase() || user.username : user.username;
  user.bio = input.bio !== undefined ? input.bio.trim() : user.bio;
  user.headline = input.headline !== undefined ? input.headline.trim() : user.headline;
  user.website = input.website !== undefined ? input.website.trim() : user.website;
  user.profileImage = input.profileImage !== undefined ? input.profileImage.trim() || user.profileImage : user.profileImage;
  return user;
}

export function setUserBanStatus(userId: string, banned: boolean) {
  const user = getUserById(userId);
  if (!user) {
    return undefined;
  }

  user.isBanned = banned;
  user.bannedAt = banned ? new Date().toISOString() : undefined;
  return user;
}

export function listReels() {
  return [...reels].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function listStories() {
  return stories
    .filter((story) => new Date(story.expiresAt).getTime() > Date.now() || Boolean(story.highlightedAt))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createStory(
  userId: string,
  input: {
    imageUrl: string;
    mediaType?: "image" | "video";
    videoUrl?: string;
    videoDurationSeconds?: number;
    caption?: string;
    saveToHighlights?: boolean;
    highlightLabel?: string;
  }
) {
  const createdAt = new Date().toISOString();
  const story: Story = {
    id: `story-${Date.now()}`,
    userId,
    imageUrl: input.imageUrl.trim(),
    mediaType: input.mediaType ?? (input.videoUrl?.trim() ? "video" : "image"),
    videoUrl: input.videoUrl?.trim() || undefined,
    videoDurationSeconds: input.videoDurationSeconds,
    caption: input.caption?.trim() || undefined,
    createdAt,
    expiresAt: new Date(Date.now() + STORY_LIFETIME_MS).toISOString(),
    viewerIds: [],
    highlightedAt: input.saveToHighlights ? createdAt : undefined,
    highlightLabel: input.saveToHighlights
      ? input.highlightLabel?.trim() || input.caption?.trim() || "Highlight"
      : undefined,
  };

  stories.unshift(story);
  return story;
}

export function markStoryViewed(storyId: string, viewerId: string) {
  const targetStory = stories.find((story) => story.id === storyId);
  if (!targetStory) {
    return undefined;
  }

  if (targetStory.userId === viewerId || targetStory.viewerIds.includes(viewerId)) {
    return targetStory;
  }

  targetStory.viewerIds = [...targetStory.viewerIds, viewerId];
  return targetStory;
}

export function toggleStoryHighlight(
  storyId: string,
  userId: string,
  input: { highlighted: boolean; highlightLabel?: string }
) {
  const targetStory = stories.find((story) => story.id === storyId && story.userId === userId);
  if (!targetStory) {
    return undefined;
  }

  targetStory.highlightedAt = input.highlighted ? new Date().toISOString() : undefined;
  targetStory.highlightLabel = input.highlighted
    ? input.highlightLabel?.trim() || targetStory.highlightLabel || targetStory.caption || "Highlight"
    : undefined;
  return targetStory;
}

export function deleteStory(storyId: string, userId: string, options: { allowAdmin?: boolean } = {}) {
  const index = stories.findIndex((story) => story.id === storyId && (options.allowAdmin || story.userId === userId));
  if (index < 0) {
    return false;
  }

  stories.splice(index, 1);
  return true;
}

export function getReelById(reelId: string) {
  return reels.find((reel) => reel.id === reelId);
}

export function deleteReel(reelId: string, userId: string, options: { allowAdmin?: boolean } = {}) {
  const index = reels.findIndex((reel) => reel.id === reelId && (options.allowAdmin || reel.userId === userId));
  if (index < 0) {
    return false;
  }

  reels.splice(index, 1);
  removeItems(comments, (comment) => comment.reelId === reelId);
  removeItems(savedPosts, (savedPost) => savedPost.entityType === "reel" && savedPost.entityId === reelId);
  removeItems(notifications, (notification) => notification.entityType === "reel" && notification.entityId === reelId);
  removeItems(reelBoosts, (boost) => boost.reelId === reelId);
  return true;
}

export function createReel(userId: string, input: { videoUrl: string; caption: string; thumbnailUrl?: string; hashtags?: string[] }) {
  const normalizedCaption = input.caption.trim();
  const reel: Reel = {
    id: `reel-${Date.now()}`,
    userId,
    videoUrl: input.videoUrl.trim(),
    caption: normalizedCaption,
    thumbnailUrl:
      input.thumbnailUrl?.trim() ||
      MEDIA_UNAVAILABLE_IMAGE,
    tags: buildReelTags(normalizedCaption, input.hashtags),
    likedBy: [],
    repostCount: 0,
    viewCount: 0,
    reachCount: 0,
    createdAt: new Date().toISOString(),
  };

  reels.unshift(reel);
  return reel;
}

function buildReelTags(caption: string, hashtags: string[] = []) {
  const normalizedHashtags = hashtags.map((tag) => tag.trim().replace(/^#+/, "").toLowerCase()).filter(Boolean);
  const extracted = caption.match(/#[a-zA-Z0-9_]+/g)?.map((tag) => tag.replace("#", "").toLowerCase()) ?? [];
  const merged = [...new Set([...normalizedHashtags, ...extracted])];
  if (merged.length > 0) {
    return merged.slice(0, 6);
  }

  const words = caption
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);
  return [...new Set(words)].slice(0, 4).length > 0 ? [...new Set(words)].slice(0, 4) : ["creator", "reel"];
}

export function toggleLike(userId: string, reelId: string) {
  const reel = getReelById(reelId);
  if (!reel) {
    return undefined;
  }

  const hasLiked = reel.likedBy.includes(userId);
  reel.likedBy = hasLiked ? reel.likedBy.filter((id) => id !== userId) : [userId, ...reel.likedBy];

  if (!hasLiked && reel.userId !== userId) {
    createNotification({
      userId: reel.userId,
      type: "like",
      title: "Your reel got a new like",
      body: `${getUserById(userId)?.name ?? "A creator"} liked your reel.`,
      actorId: userId,
      entityType: "reel",
      entityId: reel.id,
    });
  }

  return reel;
}

export function repostReel(userId: string, reelId: string) {
  const reel = getReelById(reelId);
  if (!reel) {
    return undefined;
  }

  reel.repostCount += 1;

  if (reel.userId !== userId) {
    createNotification({
      userId: reel.userId,
      type: "repost",
      title: "Your reel was reposted",
      body: `${getUserById(userId)?.name ?? "A creator"} reposted your reel.`,
      actorId: userId,
      entityType: "reel",
      entityId: reel.id,
    });
  }

  return reel;
}

export function listReelBoosts() {
  return [...reelBoosts].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export function getActiveBoostForReel(reelId: string) {
  return reelBoosts.find((boost) => boost.reelId === reelId && boost.status === "active");
}

export function createReelBoost(userId: string, reelId: string, planId: ReelBoostPlanId, targetAudience: string) {
  const reel = getReelById(reelId);
  const plan = reelBoostPlans[planId];

  if (!reel || !plan) {
    return undefined;
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const boost: ReelBoostCampaign = {
    id: `boost-${Date.now()}`,
    reelId,
    userId,
    planId: plan.id,
    planTitle: plan.title,
    amountUsd: plan.budgetUsd,
    estimatedViews: plan.estimatedViews,
    estimatedReach: plan.estimatedReach,
    status: "active",
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    targetAudience,
    note: "Your ad campaign is live and pushing this reel to more high-fit viewers now.",
  };

  reelBoosts.unshift(boost);
  createNotification({
    userId,
    type: "boost",
    title: "Boost is live",
    body: `${plan.title} is now pushing your reel to more viewers.`,
    entityType: "reel",
    entityId: reelId,
  });
  return {
    boost,
    reel,
  };
}

export function listCommentsByReel(reelId: string) {
  return comments
    .filter((comment) => comment.reelId === reelId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function addComment(userId: string, reelId: string, text: string) {
  const comment: Comment = {
    id: `comment-${Date.now()}`,
    userId,
    reelId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  comments.unshift(comment);

  const reel = getReelById(reelId);
  if (reel && reel.userId !== userId) {
    createNotification({
      userId: reel.userId,
      type: "comment",
      title: "New comment on your reel",
      body: `${getUserById(userId)?.name ?? "A creator"} commented: "${text.trim().slice(0, 72)}"`,
      actorId: userId,
      entityType: "reel",
      entityId: reelId,
    });
  }

  return comment;
}

export function listProducts() {
  return [...products].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getProductById(productId: string) {
  return products.find((product) => product.id === productId);
}

export function createProduct(userId: string, input: {
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  imageUrls?: string[];
  category?: string;
  condition?: Product["condition"];
  location?: string;
}) {
  const firstImage =
    input.imageUrls?.[0]?.trim() ||
    input.imageUrl?.trim() ||
    MEDIA_UNAVAILABLE_IMAGE;
  const product: Product = {
    id: `product-${Date.now()}`,
    userId,
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    imageUrl: firstImage,
    imageUrls: input.imageUrls?.map((item) => item.trim()).filter(Boolean) ?? [firstImage],
    category: input.category?.trim() || "Home Goods",
    condition: input.condition || "Good",
    location: input.location?.trim() || "",
    listingStatus: "available",
    createdAt: new Date().toISOString(),
  };

  products.unshift(product);
  return product;
}

export function deleteProduct(productId: string, userId: string, options: { allowAdmin?: boolean } = {}) {
  const product = getProductById(productId);
  if (!product || (!options.allowAdmin && product.userId !== userId)) {
    return false;
  }

  removeItems(products, (item) => item.id === productId);
  removeItems(savedPosts, (savedPost) => savedPost.entityType === "product" && savedPost.entityId === productId);
  removeItems(notifications, (notification) => notification.entityType === "product" && notification.entityId === productId);
  return true;
}

export function listCommunities() {
  return [...communities].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getCommunityById(communityId: string) {
  return communities.find((community) => community.id === communityId);
}

export function createCommunity(
  ownerId: string,
  input: {
    kind: CommunitySpace["kind"];
    name: string;
    description: string;
    category: string;
    coverImage: string;
    visibility: CommunitySpace["visibility"];
  }
) {
  const community: CommunitySpace = {
    id: `community-${Date.now()}`,
    ownerId,
    kind: input.kind,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    coverImage: input.coverImage.trim(),
    visibility: input.visibility,
    memberIds: [ownerId],
    createdAt: new Date().toISOString(),
  };

  communities.unshift(community);
  return community;
}

export function listCommunityPosts(communityId: string) {
  return communityPosts
    .filter((post) => post.communityId === communityId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function listCommunityChatMessages(communityId: string) {
  return communityChatMessages
    .filter((message) => message.communityId === communityId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function canAccessCommunity(userId: string | undefined, community: CommunitySpace) {
  if (community.visibility === "public") {
    return true;
  }

  if (!userId) {
    return false;
  }

  return community.ownerId === userId || community.memberIds.includes(userId);
}

export function canContributeToCommunity(userId: string, community: CommunitySpace) {
  return community.ownerId === userId || community.memberIds.includes(userId);
}

export function addCommunityPost(
  userId: string,
  communityId: string,
  input: {
    text: string;
    imageUrl?: string;
  }
) {
  const community = getCommunityById(communityId);
  if (!community || !canContributeToCommunity(userId, community)) {
    return undefined;
  }

  const post: CommunityPost = {
    id: `community-post-${Date.now()}`,
    communityId,
    authorId: userId,
    text: input.text.trim(),
    imageUrl: input.imageUrl?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  communityPosts.unshift(post);
  return post;
}

export function deleteCommunityPost(communityId: string, postId: string, userId: string) {
  const post = communityPosts.find((item) => item.id === postId && item.communityId === communityId);
  if (!post || post.authorId !== userId) {
    return false;
  }

  removeItems(communityPosts, (item) => item.id === postId && item.communityId === communityId);
  return true;
}

export function addCommunityChatMessage(userId: string, communityId: string, text: string) {
  const community = getCommunityById(communityId);
  if (!community || community.kind !== "group" || !canContributeToCommunity(userId, community)) {
    return undefined;
  }

  const message: CommunityChatMessage = {
    id: `community-chat-${Date.now()}`,
    communityId,
    senderId: userId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    deliveredToUserIds: [userId],
    seenByUserIds: [userId],
  };

  communityChatMessages.push(message);
  return message;
}

export function markCommunityChatRead(userId: string, communityId: string) {
  const community = getCommunityById(communityId);
  if (!community || community.kind !== "group" || !canContributeToCommunity(userId, community)) {
    return undefined;
  }

  const updatedMessageIds: string[] = [];
  communityChatMessages.forEach((message) => {
    if (message.communityId !== communityId || message.seenByUserIds.includes(userId)) {
      return;
    }

    message.deliveredToUserIds = addUniqueId(message.deliveredToUserIds, userId);
    message.seenByUserIds = addUniqueId(message.seenByUserIds, userId);
    updatedMessageIds.push(message.id);
  });

  return {
    community,
    updatedMessageIds,
  };
}

export function markCommunityChatDelivered(userId: string, communityId: string) {
  const community = getCommunityById(communityId);
  if (!community || community.kind !== "group" || !canContributeToCommunity(userId, community)) {
    return undefined;
  }

  const updatedMessageIds: string[] = [];
  communityChatMessages.forEach((message) => {
    if (message.communityId !== communityId || message.deliveredToUserIds.includes(userId)) {
      return;
    }

    message.deliveredToUserIds = addUniqueId(message.deliveredToUserIds, userId);
    updatedMessageIds.push(message.id);
  });

  return {
    community,
    updatedMessageIds,
  };
}

export function updateProductListingStatus(
  userId: string,
  productId: string,
  listingStatus: Product["listingStatus"]
) {
  const product = getProductById(productId);
  if (!product || product.userId !== userId) {
    return undefined;
  }

  product.listingStatus = listingStatus;
  return product;
}

export function listMarketplaceThreadsByUser(userId: string) {
  return marketplaceThreads
    .filter((thread) => thread.buyerId === userId || thread.sellerId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getMarketplaceThreadById(threadId: string) {
  return marketplaceThreads.find((thread) => thread.id === threadId);
}

export function listMarketplaceMessagesByThread(threadId: string) {
  return marketplaceMessages
    .filter((message) => message.threadId === threadId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function createOrGetMarketplaceThread(buyerId: string, productId: string) {
  const product = getProductById(productId);
  if (!product) {
    return undefined;
  }

  const sellerId = product.userId;
  if (sellerId === buyerId) {
    return undefined;
  }

  const existing = marketplaceThreads.find(
    (thread) => thread.productId === productId && thread.buyerId === buyerId && thread.sellerId === sellerId
  );
  if (existing) {
    return existing;
  }

  const createdAt = new Date().toISOString();
  const thread: MarketplaceChatThread = {
    id: `thread-${Date.now()}`,
    productId,
    buyerId,
    sellerId,
    createdAt,
    updatedAt: createdAt,
    lastMessagePreview: "Conversation started",
    lastMessageAt: createdAt,
  };

  marketplaceThreads.unshift(thread);
  return thread;
}

export function addMarketplaceMessage(userId: string, threadId: string, text: string) {
  const thread = getMarketplaceThreadById(threadId);
  if (!thread) {
    return undefined;
  }

  const isParticipant = thread.buyerId === userId || thread.sellerId === userId;
  if (!isParticipant) {
    return undefined;
  }

  const createdAt = new Date().toISOString();
  const message: MarketplaceChatMessage = {
    id: `message-${Date.now()}`,
    threadId,
    senderId: userId,
    text: text.trim(),
    createdAt,
    deliveredToUserIds: [userId],
    seenByUserIds: [userId],
  };

  marketplaceMessages.push(message);
  thread.updatedAt = createdAt;
  thread.lastMessageAt = createdAt;
  thread.lastMessagePreview = message.text.slice(0, 120);

  const recipientId = thread.buyerId === userId ? thread.sellerId : thread.buyerId;
  const product = getProductById(thread.productId);
  createNotification({
    userId: recipientId,
    type: "message",
    title: "New marketplace message",
    body: `${getUserById(userId)?.name ?? "A buyer"} sent a message about ${product?.title ?? "your listing"}.`,
    actorId: userId,
    entityType: "product",
    entityId: thread.productId,
    conversationId: thread.id,
    conversationType: "marketplace",
  });

  return {
    thread,
    message,
  };
}

export function markMarketplaceThreadRead(userId: string, threadId: string) {
  const thread = getMarketplaceThreadById(threadId);
  if (!thread) {
    return undefined;
  }

  const isParticipant = thread.buyerId === userId || thread.sellerId === userId;
  if (!isParticipant) {
    return undefined;
  }

  const updatedMessageIds: string[] = [];
  marketplaceMessages.forEach((message) => {
    if (message.threadId !== threadId || message.seenByUserIds.includes(userId)) {
      return;
    }

    message.deliveredToUserIds = addUniqueId(message.deliveredToUserIds, userId);
    message.seenByUserIds = addUniqueId(message.seenByUserIds, userId);
    updatedMessageIds.push(message.id);
  });

  return {
    thread,
    updatedMessageIds,
  };
}

export function markMarketplaceThreadDelivered(userId: string, threadId: string) {
  const thread = getMarketplaceThreadById(threadId);
  if (!thread) {
    return undefined;
  }

  const isParticipant = thread.buyerId === userId || thread.sellerId === userId;
  if (!isParticipant) {
    return undefined;
  }

  const updatedMessageIds: string[] = [];
  marketplaceMessages.forEach((message) => {
    if (message.threadId !== threadId || message.deliveredToUserIds.includes(userId)) {
      return;
    }

    message.deliveredToUserIds = addUniqueId(message.deliveredToUserIds, userId);
    updatedMessageIds.push(message.id);
  });

  return {
    thread,
    updatedMessageIds,
  };
}

export function listMarketplaceOrdersByUser(userId: string) {
  return marketplaceOrders
    .filter((order) => order.buyerId === userId || order.sellerId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createMarketplaceOrder(
  buyerId: string,
  input: {
    productId: string;
    deliveryMethod: MarketplaceDeliveryMethod;
    paymentMethod: MarketplacePaymentMethod;
    shippingAddress?: string;
    buyerNote?: string;
  }
) {
  const product = getProductById(input.productId);
  if (!product) {
    return undefined;
  }

  if (product.userId === buyerId || product.listingStatus !== "available") {
    return undefined;
  }

  const createdAt = new Date().toISOString();
  const thread = createOrGetMarketplaceThread(buyerId, product.id);
  if (!thread) {
    return undefined;
  }

  const order: MarketplaceOrder = {
    id: `order-${Date.now()}`,
    productId: product.id,
    buyerId,
    sellerId: product.userId,
    amountUsd: product.price,
    deliveryMethod: input.deliveryMethod,
    paymentMethod: input.paymentMethod,
    shippingAddress: input.shippingAddress?.trim() || undefined,
    buyerNote: input.buyerNote?.trim() || undefined,
    status: input.paymentMethod === "card" ? "paid" : "placed",
    createdAt,
  };

  marketplaceOrders.unshift(order);
  product.listingStatus = "pending";

  const orderMessageText = input.buyerNote?.trim()
    ? `I placed an order for this item. Note: ${input.buyerNote.trim()}`
    : "I placed an order for this item.";
  const message = addMarketplaceMessage(buyerId, thread.id, orderMessageText);

  createNotification({
    userId: product.userId,
    type: "order",
    title: "New marketplace order",
    body: `${getUserById(buyerId)?.name ?? "A buyer"} placed an order for ${product.title}.`,
    actorId: buyerId,
    entityType: "product",
    entityId: product.id,
    conversationId: thread.id,
    conversationType: "marketplace",
  });

  return {
    order,
    thread: message?.thread ?? thread,
    orderMessage: message?.message,
    product,
  };
}

export function listFollowers(userId: string) {
  return follows.filter((relation) => relation.followingId === userId);
}

export function listFollowing(userId: string) {
  return follows.filter((relation) => relation.followerId === userId);
}

export function canUsersDirectMessage(firstUserId: string, secondUserId: string) {
  const firstFollowsSecond = follows.some(
    (relation) => relation.followerId === firstUserId && relation.followingId === secondUserId
  );
  const secondFollowsFirst = follows.some(
    (relation) => relation.followerId === secondUserId && relation.followingId === firstUserId
  );

  return firstFollowsSecond && secondFollowsFirst;
}

export function listDirectThreadsByUser(userId: string) {
  return directThreads
    .filter((thread) => thread.participantIds.includes(userId))
    .filter((thread) => thread.participantIds.length === 2 && canUsersDirectMessage(thread.participantIds[0], thread.participantIds[1]))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getDirectThreadById(threadId: string) {
  return directThreads.find((thread) => thread.id === threadId);
}

export function listDirectMessagesByThread(threadId: string) {
  return directMessages
    .filter((message) => message.threadId === threadId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function createOrGetDirectThread(userId: string, targetUserId: string) {
  if (userId === targetUserId || !getUserById(targetUserId) || !canUsersDirectMessage(userId, targetUserId)) {
    return undefined;
  }

  const existing = directThreads.find(
    (thread) => thread.participantIds.includes(userId) && thread.participantIds.includes(targetUserId)
  );
  if (existing) {
    return existing;
  }

  const createdAt = new Date().toISOString();
  const thread: DirectChatThread = {
    id: `direct-thread-${Date.now()}`,
    participantIds: [userId, targetUserId],
    createdAt,
    updatedAt: createdAt,
    lastMessagePreview: "Conversation started",
    lastMessageAt: createdAt,
  };

  directThreads.unshift(thread);
  return thread;
}

export function addDirectMessage(
  userId: string,
  threadId: string,
  payload: {
    text?: string;
    mediaType?: DirectChatMessage["mediaType"];
    mediaUrl?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
  }
) {
  const thread = getDirectThreadById(threadId);
  if (!thread || !thread.participantIds.includes(userId)) {
    return undefined;
  }

  const counterpartId = thread.participantIds.find((participantId) => participantId !== userId);
  if (!counterpartId || !canUsersDirectMessage(userId, counterpartId)) {
    return undefined;
  }

  const normalizedText = payload.text?.trim() ?? "";
  if (!normalizedText && !payload.mediaUrl?.trim()) {
    return undefined;
  }

  const createdAt = new Date().toISOString();
  const message: DirectChatMessage = {
    id: `direct-message-${Date.now()}`,
    threadId,
    senderId: userId,
    text: normalizedText,
    mediaType: payload.mediaType,
    mediaUrl: payload.mediaUrl?.trim() || undefined,
    thumbnailUrl: payload.thumbnailUrl?.trim() || undefined,
    durationSeconds: payload.durationSeconds,
    createdAt,
    deliveredToUserIds: [userId],
    seenByUserIds: [userId],
  };

  directMessages.push(message);
  thread.updatedAt = createdAt;
  thread.lastMessageAt = createdAt;
  thread.lastMessagePreview = buildDirectMessagePreview(message);

  createNotification({
    userId: counterpartId,
    type: "message",
    title: "New direct message",
    body: `${getUserById(userId)?.name ?? "A creator"} sent you a direct message.`,
    actorId: userId,
    conversationId: thread.id,
    conversationType: "direct",
  });

  return {
    thread,
    message,
  };
}

export function markDirectThreadRead(userId: string, threadId: string) {
  const thread = getDirectThreadById(threadId);
  if (!thread || !thread.participantIds.includes(userId)) {
    return undefined;
  }

  const counterpartId = thread.participantIds.find((participantId) => participantId !== userId);
  if (!counterpartId || !canUsersDirectMessage(userId, counterpartId)) {
    return undefined;
  }

  const updatedMessageIds: string[] = [];
  directMessages.forEach((message) => {
    if (message.threadId !== threadId || message.seenByUserIds.includes(userId)) {
      return;
    }

    message.deliveredToUserIds = addUniqueId(message.deliveredToUserIds, userId);
    message.seenByUserIds = addUniqueId(message.seenByUserIds, userId);
    updatedMessageIds.push(message.id);
  });

  return {
    thread,
    updatedMessageIds,
  };
}

export function markDirectThreadDelivered(userId: string, threadId: string) {
  const thread = getDirectThreadById(threadId);
  if (!thread || !thread.participantIds.includes(userId)) {
    return undefined;
  }

  const counterpartId = thread.participantIds.find((participantId) => participantId !== userId);
  if (!counterpartId || !canUsersDirectMessage(userId, counterpartId)) {
    return undefined;
  }

  const updatedMessageIds: string[] = [];
  directMessages.forEach((message) => {
    if (message.threadId !== threadId || message.deliveredToUserIds.includes(userId)) {
      return;
    }

    message.deliveredToUserIds = addUniqueId(message.deliveredToUserIds, userId);
    updatedMessageIds.push(message.id);
  });

  return {
    thread,
    updatedMessageIds,
  };
}

function buildDirectMessagePreview(message: DirectChatMessage) {
  if (message.text.trim()) {
    return message.text.slice(0, 120);
  }

  if (message.mediaType === "video") {
    return "Sent a video";
  }

  if (message.mediaType === "image") {
    return "Sent a photo";
  }

  return "Conversation updated";
}

export function listSavedPostsByUser(userId: string) {
  return savedPosts
    .filter((item) => item.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function toggleSavedPost(userId: string, entityType: SavedEntityType, entityId: string) {
  const existing = savedPosts.find(
    (item) => item.userId === userId && item.entityType === entityType && item.entityId === entityId
  );

  if (existing) {
    const index = savedPosts.findIndex((item) => item.id === existing.id);
    savedPosts.splice(index, 1);
    return { saved: false };
  }

  const savedPost: SavedPost = {
    id: `saved-${Date.now()}`,
    userId,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
  };

  savedPosts.unshift(savedPost);
  return { saved: true, savedPost };
}

export function listNotificationsByUser(userId: string) {
  return notifications
    .filter((item) => item.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function markAllNotificationsRead(userId: string) {
  const readAt = new Date().toISOString();
  notifications.forEach((notification) => {
    if (notification.userId === userId && !notification.readAt) {
      notification.readAt = readAt;
    }
  });

  return listNotificationsByUser(userId);
}

export function markNotificationRead(userId: string, notificationId: string) {
  const notification = notifications.find((item) => item.id === notificationId && item.userId === userId);
  if (!notification) {
    return undefined;
  }

  if (!notification.readAt) {
    notification.readAt = new Date().toISOString();
  }

  return notification;
}

export function setNotificationCreatedListener(listener: ((notification: Notification) => void) | null) {
  notificationCreatedListener = listener;
}

export function toggleFollow(followerId: string, followingId: string) {
  const existing = follows.find(
    (relation) => relation.followerId === followerId && relation.followingId === followingId
  );

  if (existing) {
    const index = follows.findIndex((relation) => relation.id === existing.id);
    follows.splice(index, 1);
    return { following: false };
  }

  follows.unshift({
    id: `follow-${Date.now()}`,
    followerId,
    followingId,
  });

  createNotification({
    userId: followingId,
    type: "follow",
    title: "New follower",
    body: `${getUserById(followerId)?.name ?? "A creator"} started following you.`,
    actorId: followerId,
  });

  return { following: true };
}

export function getSubscriptionForUser(userId: string) {
  return subscriptions.find((subscription) => subscription.userId === userId);
}

export function setSubscription(userId: string, planType: Exclude<PlanType, "free">) {
  const existing = getSubscriptionForUser(userId);
  const startedAt = new Date().toISOString();
  const endsAt =
    planType === "weekly"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : planType === "monthly"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  if (existing) {
    existing.planType = planType;
    existing.status = "active";
    existing.startedAt = startedAt;
    existing.endsAt = endsAt.toISOString();
    return existing;
  }

  const created: Subscription = {
    id: `subscription-${Date.now()}`,
    userId,
    planType,
    status: "active",
    stripeCustomerId: `cus_demo_${userId}`,
    startedAt,
    endsAt: endsAt.toISOString(),
  };

  subscriptions.push(created);
  return created;
}

function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actorId?: string;
  entityType?: SavedEntityType;
  entityId?: string;
  conversationId?: string;
  conversationType?: "marketplace" | "direct";
}) {
  const notification: Notification = {
    id: `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    actorId: input.actorId,
    entityType: input.entityType,
    entityId: input.entityId,
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(notification);
  notificationCreatedListener?.(notification);
  return notification;
}

function addUniqueId(list: string[], value: string) {
  return list.includes(value) ? list : [value, ...list];
}

function removeItems<T>(list: T[], predicate: (item: T) => boolean) {
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (predicate(list[index])) {
      list.splice(index, 1);
    }
  }
}
