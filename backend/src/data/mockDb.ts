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

const users: User[] = [
  {
    id: "user-1",
    name: "Layla Noor",
    username: "laylanoor",
    email: "layla@viraflow.app",
    passwordHash: "demo-hash",
    profileImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    bio: "Fashion creator sharing fast styling edits and sellable looks.",
    headline: "Fashion reels creator",
    language: "en",
    createdAt: "2026-03-20T10:00:00.000Z",
  },
  {
    id: "user-2",
    name: "Omar Kassim",
    username: "omarkassim",
    email: "omar@viraflow.app",
    passwordHash: "demo-hash",
    profileImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    bio: "Growth marketer turning content into sales.",
    headline: "Growth strategist",
    language: "en",
    createdAt: "2026-03-19T10:00:00.000Z",
  },
  {
    id: "user-3",
    name: "Sofia Meret",
    username: "sofiameret",
    email: "sofia@viraflow.app",
    passwordHash: "demo-hash",
    profileImage:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    bio: "Productivity creator and digital template seller.",
    headline: "Template seller",
    language: "fr",
    createdAt: "2026-03-18T10:00:00.000Z",
  },
];

const reels: Reel[] = [
  {
    id: "reel-1",
    userId: "user-1",
    videoUrl: "https://example.com/video/fashion-shift.mp4",
    caption: "Three outfit transitions for one weekend trip.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80",
    likedBy: ["user-2", "user-3"],
    repostCount: 12,
    viewCount: 6400,
    reachCount: 18300,
    createdAt: "2026-03-29T08:30:00.000Z",
  },
  {
    id: "reel-2",
    userId: "user-2",
    videoUrl: "https://example.com/video/creator-funnel.mp4",
    caption: "How creators turn one reel into three income streams.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80",
    likedBy: ["user-1"],
    repostCount: 6,
    viewCount: 18900,
    reachCount: 54200,
    createdAt: "2026-03-28T13:15:00.000Z",
  },
];

const comments: Comment[] = [
  {
    id: "comment-1",
    userId: "user-2",
    reelId: "reel-1",
    text: "The first transition is super clean.",
    createdAt: "2026-03-29T09:00:00.000Z",
  },
  {
    id: "comment-2",
    userId: "user-1",
    reelId: "reel-2",
    text: "This would be perfect as a carousel too.",
    createdAt: "2026-03-28T15:00:00.000Z",
  },
];

const stories: Story[] = [
  {
    id: "story-1",
    userId: "user-2",
    imageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    caption: "New funnel breakdown dropping tonight.",
    createdAt: "2026-03-31T01:20:00.000Z",
    expiresAt: "2026-04-01T01:20:00.000Z",
  },
  {
    id: "story-2",
    userId: "user-3",
    imageUrl:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80",
    caption: "Template preview before tomorrow's launch.",
    createdAt: "2026-03-31T00:45:00.000Z",
    expiresAt: "2026-04-01T00:45:00.000Z",
  },
];

const follows: FollowRelation[] = [
  { id: "follow-1", followerId: "user-2", followingId: "user-1" },
  { id: "follow-2", followerId: "user-3", followingId: "user-1" },
  { id: "follow-3", followerId: "user-1", followingId: "user-2" },
];

const products: Product[] = [
  {
    id: "product-1",
    userId: "user-1",
    title: "Vintage mirrorless camera",
    description: "Compact creator camera with charger, strap, and extra battery. Great for local pickup listings.",
    price: 420,
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=900&q=80",
    ],
    category: "Electronics",
    condition: "Like New",
    location: "Kuala Lumpur, Malaysia",
    listingStatus: "available",
    createdAt: "2026-03-29T11:00:00.000Z",
  },
  {
    id: "product-2",
    userId: "user-2",
    title: "Standing desk setup",
    description: "Height-adjustable desk with cable tray and monitor riser. Pickup only, already packed for fast collection.",
    price: 180,
    imageUrl:
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    ],
    category: "Home Goods",
    condition: "Good",
    location: "Petaling Jaya, Malaysia",
    listingStatus: "pending",
    createdAt: "2026-03-27T16:30:00.000Z",
  },
];

const communities: CommunitySpace[] = [
  {
    id: "community-1",
    ownerId: "user-1",
    kind: "page",
    name: "Layla Style Club",
    description: "A fashion page for outfit drops, styling reels, and creator collabs.",
    category: "Fashion",
    coverImage:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    visibility: "public",
    memberIds: ["user-1", "user-2"],
    createdAt: "2026-03-30T08:15:00.000Z",
  },
  {
    id: "community-2",
    ownerId: "user-2",
    kind: "group",
    name: "Creator Growth Circle",
    description: "A private group for growth experiments, monetization ideas, and review swaps.",
    category: "Business",
    coverImage:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    visibility: "private",
    memberIds: ["user-2", "user-1"],
    createdAt: "2026-03-29T14:40:00.000Z",
  },
  {
    id: "community-3",
    ownerId: "user-3",
    kind: "channel",
    name: "Template Drops Channel",
    description: "A channel for template launches, workflow updates, and quick creator resources.",
    category: "Productivity",
    coverImage:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80",
    visibility: "public",
    memberIds: ["user-3", "user-1"],
    createdAt: "2026-03-28T11:20:00.000Z",
  },
];

const communityPosts: CommunityPost[] = [
  {
    id: "community-post-1",
    communityId: "community-1",
    authorId: "user-1",
    text: "New style drop this Friday. I am sharing three reel concepts and one shoppable look bundle here first.",
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    createdAt: "2026-03-31T09:10:00.000Z",
  },
  {
    id: "community-post-2",
    communityId: "community-2",
    authorId: "user-2",
    text: "Drop your worst-performing reel from this week and I will help everyone rewrite the first three seconds.",
    createdAt: "2026-03-31T07:30:00.000Z",
  },
  {
    id: "community-post-3",
    communityId: "community-3",
    authorId: "user-3",
    text: "Template drop: a new creator workflow pack is live in the channel today.",
    createdAt: "2026-03-31T06:15:00.000Z",
  },
];

const communityChatMessages: CommunityChatMessage[] = [
  {
    id: "community-chat-1",
    communityId: "community-2",
    senderId: "user-2",
    text: "Welcome to the group chat. Drop your reel link and the retention graph if you have it.",
    createdAt: "2026-03-31T08:00:00.000Z",
    deliveredToUserIds: ["user-2", "user-1"],
    seenByUserIds: ["user-2", "user-1"],
  },
  {
    id: "community-chat-2",
    communityId: "community-2",
    senderId: "user-1",
    text: "I am posting one later today. I want feedback on the hook and caption framing.",
    createdAt: "2026-03-31T08:12:00.000Z",
    deliveredToUserIds: ["user-1", "user-2"],
    seenByUserIds: ["user-1"],
  },
];

const directThreads: DirectChatThread[] = [
  {
    id: "direct-thread-1",
    participantIds: ["user-1", "user-2"],
    createdAt: "2026-03-31T04:10:00.000Z",
    updatedAt: "2026-03-31T04:26:00.000Z",
    lastMessagePreview: "Yes, send it over and I will review the hook.",
    lastMessageAt: "2026-03-31T04:26:00.000Z",
  },
];

const directMessages: DirectChatMessage[] = [
  {
    id: "direct-message-1",
    threadId: "direct-thread-1",
    senderId: "user-2",
    text: "You want to swap reel feedback tonight?",
    createdAt: "2026-03-31T04:10:00.000Z",
    deliveredToUserIds: ["user-2", "user-1"],
    seenByUserIds: ["user-2", "user-1"],
  },
  {
    id: "direct-message-2",
    threadId: "direct-thread-1",
    senderId: "user-1",
    text: "Yes, send it over and I will review the hook.",
    createdAt: "2026-03-31T04:26:00.000Z",
    deliveredToUserIds: ["user-1", "user-2"],
    seenByUserIds: ["user-1"],
  },
];

const marketplaceThreads: MarketplaceChatThread[] = [
  {
    id: "thread-1",
    productId: "product-2",
    buyerId: "user-1",
    sellerId: "user-2",
    createdAt: "2026-03-31T02:20:00.000Z",
    updatedAt: "2026-03-31T03:05:00.000Z",
    lastMessagePreview: "Yes, pickup after 7PM works for me.",
    lastMessageAt: "2026-03-31T03:05:00.000Z",
  },
];

const marketplaceMessages: MarketplaceChatMessage[] = [
  {
    id: "message-1",
    threadId: "thread-1",
    senderId: "user-1",
    text: "Hi, is this standing desk still available?",
    createdAt: "2026-03-31T02:20:00.000Z",
    deliveredToUserIds: ["user-1", "user-2"],
    seenByUserIds: ["user-1", "user-2"],
  },
  {
    id: "message-2",
    threadId: "thread-1",
    senderId: "user-2",
    text: "Yes, pickup after 7PM works for me.",
    createdAt: "2026-03-31T03:05:00.000Z",
    deliveredToUserIds: ["user-2", "user-1"],
    seenByUserIds: ["user-2"],
  },
];

const marketplaceOrders: MarketplaceOrder[] = [
  {
    id: "order-1",
    productId: "product-2",
    buyerId: "user-1",
    sellerId: "user-2",
    amountUsd: 180,
    deliveryMethod: "pickup",
    paymentMethod: "cash",
    buyerNote: "I can collect it tonight after 7PM.",
    status: "placed",
    createdAt: "2026-03-31T03:10:00.000Z",
  },
];

const subscriptions: Subscription[] = [
  {
    id: "subscription-1",
    userId: "user-1",
    planType: "yearly",
    status: "active",
    stripeCustomerId: "cus_demo_layla",
    startedAt: "2026-03-01T00:00:00.000Z",
    endsAt: "2027-03-01T00:00:00.000Z",
  },
];

const savedPosts: SavedPost[] = [
  {
    id: "saved-1",
    userId: "user-1",
    entityType: "product",
    entityId: "product-2",
    createdAt: "2026-03-29T18:20:00.000Z",
  },
  {
    id: "saved-2",
    userId: "user-1",
    entityType: "reel",
    entityId: "reel-2",
    createdAt: "2026-03-29T18:10:00.000Z",
  },
];

const notifications: Notification[] = [
  {
    id: "notification-1",
    userId: "user-1",
    type: "follow",
    title: "New follower",
    body: "Omar Kassim started following you.",
    actorId: "user-2",
    createdAt: "2026-03-29T18:25:00.000Z",
  },
  {
    id: "notification-2",
    userId: "user-1",
    type: "comment",
    title: "New comment",
    body: "Omar Kassim commented on your reel.",
    actorId: "user-2",
    entityType: "reel",
    entityId: "reel-1",
    createdAt: "2026-03-29T18:15:00.000Z",
    readAt: "2026-03-29T18:30:00.000Z",
  },
  {
    id: "notification-3",
    userId: "user-1",
    type: "message",
    title: "New marketplace message",
    body: "Omar Kassim replied about the standing desk setup.",
    actorId: "user-2",
    entityType: "product",
    entityId: "product-2",
    conversationId: "thread-1",
    conversationType: "marketplace",
    createdAt: "2026-03-31T03:05:00.000Z",
  },
  {
    id: "notification-4",
    userId: "user-1",
    type: "message",
    title: "New direct message",
    body: "Omar Kassim sent you a direct message.",
    actorId: "user-2",
    conversationId: "direct-thread-1",
    conversationType: "direct",
    createdAt: "2026-03-31T04:26:00.000Z",
  },
];

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

const reelBoosts: ReelBoostCampaign[] = [
  {
    id: "boost-1",
    reelId: "reel-2",
    userId: "user-2",
    planId: "growth",
    planTitle: "Growth Burst",
    amountUsd: 15,
    estimatedViews: 4800,
    estimatedReach: 18000,
    status: "active",
    startedAt: "2026-03-30T01:15:00.000Z",
    endsAt: "2026-04-04T01:15:00.000Z",
    targetAudience: "Founders, creators, and small businesses interested in monetization content.",
    note: "Boost is actively distributing this reel to adjacent business and creator-growth audiences.",
  },
];

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
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80",
    bio: "New creator on ViraFlow.",
    headline: "Creator in progress",
    language: input.language,
    createdAt: new Date().toISOString(),
  };

  users.unshift(user);
  return user;
}

export function updateUser(userId: string, input: Partial<Pick<User, "name" | "username" | "bio" | "headline" | "profileImage">>) {
  const user = getUserById(userId);
  if (!user) {
    return undefined;
  }

  user.name = input.name?.trim() || user.name;
  user.username = input.username?.trim().replace(/\s+/g, "").toLowerCase() || user.username;
  user.bio = input.bio?.trim() || user.bio;
  user.headline = input.headline?.trim() || user.headline;
  user.profileImage = input.profileImage?.trim() || user.profileImage;
  return user;
}

export function listReels() {
  return [...reels].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function listStories() {
  const now = Date.now();
  return stories
    .filter((story) => new Date(story.expiresAt).getTime() > now)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createStory(userId: string, input: { imageUrl: string; caption?: string }) {
  const createdAt = new Date().toISOString();
  const story: Story = {
    id: `story-${Date.now()}`,
    userId,
    imageUrl: input.imageUrl.trim(),
    caption: input.caption?.trim() || undefined,
    createdAt,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  stories.unshift(story);
  return story;
}

export function getReelById(reelId: string) {
  return reels.find((reel) => reel.id === reelId);
}

export function createReel(userId: string, input: { videoUrl: string; caption: string; thumbnailUrl?: string }) {
  const reel: Reel = {
    id: `reel-${Date.now()}`,
    userId,
    videoUrl: input.videoUrl.trim(),
    caption: input.caption.trim(),
    thumbnailUrl:
      input.thumbnailUrl?.trim() ||
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=80",
    likedBy: [],
    repostCount: 0,
    viewCount: 120,
    reachCount: 520,
    createdAt: new Date().toISOString(),
  };

  reels.unshift(reel);
  return reel;
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

  reel.viewCount += plan.estimatedViews;
  reel.reachCount += plan.estimatedReach;
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
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80";
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
    location: input.location?.trim() || "Kuala Lumpur, Malaysia",
    listingStatus: "available",
    createdAt: new Date().toISOString(),
  };

  products.unshift(product);
  return product;
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

export function addDirectMessage(userId: string, threadId: string, text: string) {
  const thread = getDirectThreadById(threadId);
  if (!thread || !thread.participantIds.includes(userId)) {
    return undefined;
  }

  const counterpartId = thread.participantIds.find((participantId) => participantId !== userId);
  if (!counterpartId || !canUsersDirectMessage(userId, counterpartId)) {
    return undefined;
  }

  const createdAt = new Date().toISOString();
  const message: DirectChatMessage = {
    id: `direct-message-${Date.now()}`,
    threadId,
    senderId: userId,
    text: text.trim(),
    createdAt,
    deliveredToUserIds: [userId],
    seenByUserIds: [userId],
  };

  directMessages.push(message);
  thread.updatedAt = createdAt;
  thread.lastMessageAt = createdAt;
  thread.lastMessagePreview = message.text.slice(0, 120);

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
  return notification;
}

function addUniqueId(list: string[], value: string) {
  return list.includes(value) ? list : [value, ...list];
}
