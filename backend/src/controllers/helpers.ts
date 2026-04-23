import {
  getProductById,
  getActiveBoostForReel,
  getCommunityById,
  getSubscriptionForUser,
  getUserById,
  listCommentsByReel,
  listFollowers,
  listFollowing,
} from "../data/mockDb";
import {
  Comment,
  CommunityChatMessage,
  CommunityPost,
  CommunitySpace,
  DirectChatMessage,
  DirectChatThread,
  MarketplaceChatMessage,
  MarketplaceChatThread,
  MarketplaceOrder,
  Notification,
  Product,
  Reel,
  SavedPost,
  Story,
  User,
} from "../types/models";

export function toPublicUser(user: User) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export function buildProfile(user: User) {
  return {
    ...toPublicUser(user),
    followersCount: listFollowers(user.id).length,
    followingCount: listFollowing(user.id).length,
    reelsCount: 0,
    productsCount: 0,
    subscription: getSubscriptionForUser(user.id) ?? null,
  };
}

export function buildReelPayload(reel: Reel) {
  const creator = getUserById(reel.userId);

  return {
    ...reel,
    likesCount: reel.likedBy.length,
    commentsCount: listCommentsByReel(reel.id).length,
    activeBoost: getActiveBoostForReel(reel.id) ?? null,
    creator: creator ? toPublicUser(creator) : null,
  };
}

export function buildCommentPayload(comment: Comment) {
  const author = getUserById(comment.userId);

  return {
    ...comment,
    author: author ? toPublicUser(author) : null,
  };
}

export function buildProductPayload(product: Product) {
  const seller = getUserById(product.userId);

  return {
    ...product,
    seller: seller ? toPublicUser(seller) : null,
  };
}

export function buildCommunityPayload(community: CommunitySpace) {
  const owner = getUserById(community.ownerId);

  return {
    ...community,
    owner: owner ? toPublicUser(owner) : null,
  };
}

export function buildCommunityPostPayload(post: CommunityPost) {
  const author = getUserById(post.authorId);

  return {
    ...post,
    author: author ? toPublicUser(author) : null,
  };
}

export function buildCommunityChatMessagePayload(message: CommunityChatMessage) {
  const sender = getUserById(message.senderId);
  const community = getCommunityById(message.communityId);

  return {
    ...message,
    sender: sender ? toPublicUser(sender) : null,
    communityKind: community?.kind ?? null,
  };
}

export function buildMarketplaceThreadPayload(thread: MarketplaceChatThread) {
  return {
    ...thread,
  };
}

export function buildDirectThreadPayload(thread: DirectChatThread) {
  return {
    ...thread,
  };
}

export function buildDirectMessagePayload(message: DirectChatMessage) {
  const sender = getUserById(message.senderId);

  return {
    ...message,
    sender: sender ? toPublicUser(sender) : null,
  };
}

export function buildMarketplaceMessagePayload(message: MarketplaceChatMessage) {
  const sender = getUserById(message.senderId);

  return {
    ...message,
    sender: sender ? toPublicUser(sender) : null,
  };
}

export function buildMarketplaceOrderPayload(order: MarketplaceOrder) {
  const buyer = getUserById(order.buyerId);
  const seller = getUserById(order.sellerId);
  const product = getProductById(order.productId);

  return {
    ...order,
    buyer: buyer ? toPublicUser(buyer) : null,
    seller: seller ? toPublicUser(seller) : null,
    product: product ? buildProductPayload(product) : null,
  };
}

export function buildStoryPayload(story: Story) {
  const creator = getUserById(story.userId);

  return {
    ...story,
    creator: creator ? toPublicUser(creator) : null,
  };
}

export function buildSavedPostPayload(savedPost: SavedPost) {
  return {
    ...savedPost,
  };
}

export function buildNotificationPayload(notification: Notification) {
  const actor = notification.actorId ? getUserById(notification.actorId) : undefined;

  return {
    ...notification,
    actor: actor ? toPublicUser(actor) : null,
  };
}

export function withUserCounts(user: User) {
  return {
    ...toPublicUser(user),
    followersCount: listFollowers(user.id).length,
    followingCount: listFollowing(user.id).length,
  };
}
