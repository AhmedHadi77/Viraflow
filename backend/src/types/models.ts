export type LanguageOption = "en" | "ar" | "fr" | "es";

export type PlanType = "free" | "weekly" | "monthly" | "yearly";
export type ReelBoostPlanId = "starter" | "growth" | "viral";
export type SavedEntityType = "reel" | "product";
export type ProductCondition = "New" | "Like New" | "Good" | "Fair";
export type ProductListingStatus = "available" | "pending" | "sold";
export type CommunityKind = "page" | "group" | "channel";
export type CommunityVisibility = "public" | "private";
export type MarketplaceDeliveryMethod = "pickup" | "shipping";
export type MarketplacePaymentMethod = "card" | "cash";
export type MarketplaceOrderStatus = "placed" | "paid";
export type ConversationType = "marketplace" | "direct";
export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "repost"
  | "boost"
  | "save"
  | "message"
  | "order"
  | "system";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  profileImage: string;
  bio: string;
  headline: string;
  language: LanguageOption;
  createdAt: string;
}

export interface Reel {
  id: string;
  userId: string;
  videoUrl: string;
  caption: string;
  thumbnailUrl: string;
  likedBy: string[];
  repostCount: number;
  viewCount: number;
  reachCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  reelId: string;
  text: string;
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  expiresAt: string;
}

export interface FollowRelation {
  id: string;
  followerId: string;
  followingId: string;
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
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CommunityChatMessage {
  id: string;
  communityId: string;
  senderId: string;
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
  text: string;
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

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  status: "active" | "inactive" | "trial";
  stripeCustomerId: string;
  startedAt: string;
  endsAt: string;
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

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actorId?: string;
  entityType?: SavedEntityType;
  entityId?: string;
  conversationId?: string;
  conversationType?: ConversationType;
  createdAt: string;
  readAt?: string;
}
