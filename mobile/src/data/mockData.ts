import {
  AppNotification,
  CommunityChatMessage,
  CommunityPost,
  CommunitySpace,
  DirectChatMessage,
  DirectChatThread,
  MarketplaceChatMessage,
  MarketplaceChatThread,
  MarketplaceOrder,
  Product,
  Reel,
  ReelBoostCampaign,
  ReelBoostPlan,
  ReelComment,
  SavedPost,
  Story,
  SubscriptionPlan,
  User,
} from "../types/models";

export const seedUsers: User[] = [
  {
    id: "user-1",
    name: "Layla Noor",
    username: "laylanoor",
    email: "layla@pulseora.app",
    profileImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    bio: "Fashion creator sharing fast styling edits and sellable looks.",
    headline: "Fashion reels creator",
    language: "en",
    planType: "yearly",
    followers: ["user-2", "user-3"],
    following: ["user-2"],
    reelIds: ["reel-1", "reel-4"],
    productIds: ["product-1"],
  },
  {
    id: "user-2",
    name: "Omar Kassim",
    username: "omarkassim",
    email: "omar@pulseora.app",
    profileImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    bio: "Growth marketer turning content into sales.",
    headline: "Growth strategist",
    language: "en",
    planType: "monthly",
    followers: ["user-1"],
    following: ["user-1"],
    reelIds: ["reel-2"],
    productIds: ["product-2"],
  },
  {
    id: "user-3",
    name: "Sofia Meret",
    username: "sofiameret",
    email: "sofia@pulseora.app",
    profileImage:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    bio: "Productivity creator and digital template seller.",
    headline: "Template seller",
    language: "fr",
    planType: "free",
    followers: [],
    following: ["user-1"],
    reelIds: ["reel-3"],
    productIds: ["product-3"],
  },
];

export const seedReels: Reel[] = [
  {
    id: "reel-1",
    userId: "user-1",
    videoUrl: "https://example.com/video/fashion-shift.mp4",
    caption: "Three outfit transitions for one weekend trip.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80",
    createdAt: "2026-03-29T08:30:00.000Z",
    tags: ["fashion", "viral", "weekend"],
    likedBy: ["user-2", "user-3"],
    repostCount: 12,
    viewCount: 6400,
    reachCount: 18300,
  },
  {
    id: "reel-2",
    userId: "user-2",
    videoUrl: "https://example.com/video/creator-funnel.mp4",
    caption: "How creators turn one reel into three income streams.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80",
    createdAt: "2026-03-28T13:15:00.000Z",
    tags: ["marketing", "growth", "business"],
    likedBy: ["user-1"],
    repostCount: 6,
    viewCount: 18900,
    reachCount: 54200,
  },
  {
    id: "reel-3",
    userId: "user-3",
    videoUrl: "https://example.com/video/template-workflow.mp4",
    caption: "A simple daily planner template workflow in 20 seconds.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1000&q=80",
    createdAt: "2026-03-27T09:40:00.000Z",
    tags: ["templates", "productivity", "creator"],
    likedBy: ["user-1", "user-2"],
    repostCount: 10,
    viewCount: 5200,
    reachCount: 16400,
  },
  {
    id: "reel-4",
    userId: "user-1",
    videoUrl: "https://example.com/video/store-launch.mp4",
    caption: "Launching a mini fashion drop directly from the reel feed.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
    createdAt: "2026-03-26T17:20:00.000Z",
    tags: ["store", "launch", "fashion"],
    likedBy: [],
    repostCount: 3,
    viewCount: 2300,
    reachCount: 7200,
  },
];

export const reelBoostPlans: ReelBoostPlan[] = [
  {
    id: "starter",
    title: "Starter Push",
    priceLabel: "$5",
    budgetUsd: 5,
    estimatedViews: 1200,
    estimatedReach: 5000,
    durationDays: 2,
    badge: "Fast test",
    description: "A lightweight push to test fresh creative and get your reel in front of more viewers quickly.",
  },
  {
    id: "growth",
    title: "Growth Burst",
    priceLabel: "$15",
    budgetUsd: 15,
    estimatedViews: 4800,
    estimatedReach: 18000,
    durationDays: 5,
    badge: "Best value",
    description: "The main boost package for creators who want more reach, more views, and better signal fast.",
  },
  {
    id: "viral",
    title: "Viral Blast",
    priceLabel: "$35",
    budgetUsd: 35,
    estimatedViews: 14000,
    estimatedReach: 50000,
    durationDays: 7,
    badge: "Scale hard",
    description: "A bigger ad push built for reels that already have a strong hook and want maximum momentum.",
  },
];

export const seedReelBoosts: ReelBoostCampaign[] = [
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

export const seedComments: ReelComment[] = [
  {
    id: "comment-1",
    reelId: "reel-1",
    userId: "user-2",
    userName: "Omar Kassim",
    userAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    text: "The first transition is super clean.",
    createdAt: "2026-03-29T09:00:00.000Z",
  },
  {
    id: "comment-2",
    reelId: "reel-2",
    userId: "user-1",
    userName: "Layla Noor",
    userAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    text: "This would be perfect as a carousel too.",
    createdAt: "2026-03-28T15:00:00.000Z",
  },
];

export const seedStories: Story[] = [
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

export const seedSavedPosts: SavedPost[] = [
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

export const seedNotifications: AppNotification[] = [
  {
    id: "notification-1",
    userId: "user-1",
    type: "follow",
    title: "New follower",
    body: "Omar Kassim started following you.",
    actorId: "user-2",
    actorName: "Omar Kassim",
    actorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-03-29T18:25:00.000Z",
  },
  {
    id: "notification-2",
    userId: "user-1",
    type: "comment",
    title: "New comment",
    body: "Omar Kassim commented on your reel.",
    actorId: "user-2",
    actorName: "Omar Kassim",
    actorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
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
    actorName: "Omar Kassim",
    actorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
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
    actorName: "Omar Kassim",
    actorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    conversationId: "direct-thread-1",
    conversationType: "direct",
    createdAt: "2026-03-31T04:26:00.000Z",
  },
];

export const seedProducts: Product[] = [
  {
    id: "product-1",
    userId: "user-1",
    title: "Vintage mirrorless camera",
    description: "Compact creator camera with charger, strap, and extra battery. Great for Facebook-style local pickup listings.",
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
  {
    id: "product-3",
    userId: "user-3",
    title: "Minimalist desk lamp",
    description: "Warm LED lamp with dimmer. Clean condition and ideal for home office setups.",
    price: 35,
    imageUrl:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80",
    ],
    category: "Home Goods",
    condition: "New",
    location: "Shah Alam, Malaysia",
    listingStatus: "available",
    createdAt: "2026-03-25T12:20:00.000Z",
  },
];

export const seedCommunities: CommunitySpace[] = [
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

export const seedCommunityPosts: CommunityPost[] = [
  {
    id: "community-post-1",
    communityId: "community-1",
    authorId: "user-1",
    authorName: "Layla Noor",
    authorAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    text: "New style drop this Friday. I am sharing three reel concepts and one shoppable look bundle here first.",
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    createdAt: "2026-03-31T09:10:00.000Z",
  },
  {
    id: "community-post-2",
    communityId: "community-2",
    authorId: "user-2",
    authorName: "Omar Kassim",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    text: "Drop your worst-performing reel from this week and I will help everyone rewrite the first three seconds.",
    createdAt: "2026-03-31T07:30:00.000Z",
  },
  {
    id: "community-post-3",
    communityId: "community-3",
    authorId: "user-3",
    authorName: "Sofia Meret",
    authorAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    text: "Template drop: a new creator workflow pack is live in the channel today.",
    createdAt: "2026-03-31T06:15:00.000Z",
  },
];

export const seedCommunityChatMessages: CommunityChatMessage[] = [
  {
    id: "community-chat-1",
    communityId: "community-2",
    senderId: "user-2",
    senderName: "Omar Kassim",
    senderAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    text: "Welcome to the group chat. Drop your reel link and the retention graph if you have it.",
    createdAt: "2026-03-31T08:00:00.000Z",
    deliveredToUserIds: ["user-2", "user-1"],
    seenByUserIds: ["user-2", "user-1"],
  },
  {
    id: "community-chat-2",
    communityId: "community-2",
    senderId: "user-1",
    senderName: "Layla Noor",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    text: "I am posting one later today. I want feedback on the hook and caption framing.",
    createdAt: "2026-03-31T08:12:00.000Z",
    deliveredToUserIds: ["user-1", "user-2"],
    seenByUserIds: ["user-1"],
  },
];

export const seedDirectThreads: DirectChatThread[] = [
  {
    id: "direct-thread-1",
    participantIds: ["user-1", "user-2"],
    createdAt: "2026-03-31T04:10:00.000Z",
    updatedAt: "2026-03-31T04:26:00.000Z",
    lastMessagePreview: "Yes, send it over and I will review the hook.",
    lastMessageAt: "2026-03-31T04:26:00.000Z",
  },
];

export const seedDirectMessages: DirectChatMessage[] = [
  {
    id: "direct-message-1",
    threadId: "direct-thread-1",
    senderId: "user-2",
    senderName: "Omar Kassim",
    senderAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    text: "You want to swap reel feedback tonight?",
    createdAt: "2026-03-31T04:10:00.000Z",
    deliveredToUserIds: ["user-2", "user-1"],
    seenByUserIds: ["user-2", "user-1"],
  },
  {
    id: "direct-message-2",
    threadId: "direct-thread-1",
    senderId: "user-1",
    senderName: "Layla Noor",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    text: "Yes, send it over and I will review the hook.",
    createdAt: "2026-03-31T04:26:00.000Z",
    deliveredToUserIds: ["user-1", "user-2"],
    seenByUserIds: ["user-1"],
  },
];

export const seedMarketplaceThreads: MarketplaceChatThread[] = [
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

export const seedMarketplaceMessages: MarketplaceChatMessage[] = [
  {
    id: "message-1",
    threadId: "thread-1",
    senderId: "user-1",
    senderName: "Layla Noor",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    text: "Hi, is this standing desk still available?",
    createdAt: "2026-03-31T02:20:00.000Z",
    deliveredToUserIds: ["user-1", "user-2"],
    seenByUserIds: ["user-1", "user-2"],
  },
  {
    id: "message-2",
    threadId: "thread-1",
    senderId: "user-2",
    senderName: "Omar Kassim",
    senderAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    text: "Yes, pickup after 7PM works for me.",
    createdAt: "2026-03-31T03:05:00.000Z",
    deliveredToUserIds: ["user-2", "user-1"],
    seenByUserIds: ["user-2"],
  },
];

export const seedMarketplaceOrders: MarketplaceOrder[] = [
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

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "weekly",
    title: "Weekly Creator Pass",
    priceLabel: "$3",
    cadence: "per week",
    description: "Best for testing premium AI workflows before going all in.",
    benefits: [
      "Viral AI engine access",
      "3 voice and video generations each week",
      "Avatar creator via pay-per-avatar",
      "Premium badge in profile",
    ],
  },
  {
    id: "monthly",
    title: "Premium Creator",
    priceLabel: "$10",
    cadence: "per month",
    description: "The main money plan for creators who want viral scripts, AI voice, and faster content production.",
    benefits: [
      "Everything in weekly",
      "Trend Hijacker AI premium access",
      "Personal AI Growth Coach",
      "Avatar creator included in plan",
      "Unlimited viral score checks",
      "AI voice previews and premium render queue",
    ],
  },
  {
    id: "yearly",
    title: "Yearly Growth Pass",
    priceLabel: "$120",
    cadence: "per year",
    description: "Built for serious creators who want the best annual value and future AI tools.",
    benefits: [
      "Everything in monthly",
      "Trend Hijacker AI included",
      "Personal AI Growth Coach included",
      "Unlimited avatar creator access",
      "Priority access to new AI tools",
      "Watermark-free exports later",
    ],
  },
];

export const marketplaceCategories = [
  "All",
  "Electronics",
  "Vehicles",
  "Home Goods",
  "Fashion",
  "Hobbies",
  "Garden",
  "Family",
];
