import { isReelBoostActive, Post, PostMediaItem, Reel, User } from "../types/models";

export interface ExploreHashtagSummary {
  tag: string;
  count: number;
  recentAt: string;
}

export interface ExploreGridItem {
  id: string;
  kind: "post" | "reel";
  entityId: string;
  userId: string;
  imageUrl: string;
  badge: string;
  title: string;
  subtitle: string;
  aspectRatio: number;
  score: number;
  createdAt: string;
}

export interface ExplorePostResult {
  post: Post;
  author?: User;
  imageUrl: string;
  badge: string;
}

export interface ExploreSearchResults {
  users: User[];
  hashtags: ExploreHashtagSummary[];
  posts: ExplorePostResult[];
}

export function buildSuggestedUsers(users: User[], currentUser: User | null, limit = 8, region?: string) {
  const followingSet = new Set(currentUser?.following ?? []);
  return users
    .filter((user) => user.id !== currentUser?.id)
    .filter((user) => !followingSet.has(user.id))
    .sort((left, right) => {
      // Creators from the viewer's region are suggested first.
      const localDelta = Number(Boolean(region) && right.region === region) - Number(Boolean(region) && left.region === region);
      if (localDelta !== 0) {
        return localDelta;
      }
      const followerDelta = right.followers.length - left.followers.length;
      if (followerDelta !== 0) {
        return followerDelta;
      }

      return left.username.localeCompare(right.username);
    })
    .slice(0, limit);
}

export function buildPopularReels(reels: Reel[], localCreatorIds?: Set<string>) {
  const score = (reel: Reel) => buildReelScore(reel) * (localCreatorIds?.has(reel.userId) ? 1.35 : 1);
  return [...reels].sort((left, right) => score(right) - score(left)).slice(0, 10);
}

export function buildRecentPosts(posts: Post[]) {
  return [...posts]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 8);
}

export function collectExploreHashtags(posts: Post[], reels: Reel[]) {
  const hashtagMap = new Map<string, ExploreHashtagSummary>();

  posts.forEach((post) => {
    post.hashtags.forEach((tag) => {
      const normalized = normalizeTag(tag);
      if (!normalized) {
        return;
      }

      const existing = hashtagMap.get(normalized);
      hashtagMap.set(normalized, {
        tag: normalized,
        count: (existing?.count ?? 0) + 1,
        recentAt: existing ? maxIso(existing.recentAt, post.createdAt) : post.createdAt,
      });
    });
  });

  reels.forEach((reel) => {
    reel.tags.forEach((tag) => {
      const normalized = normalizeTag(tag);
      if (!normalized) {
        return;
      }

      const existing = hashtagMap.get(normalized);
      hashtagMap.set(normalized, {
        tag: normalized,
        count: (existing?.count ?? 0) + 1,
        recentAt: existing ? maxIso(existing.recentAt, reel.createdAt) : reel.createdAt,
      });
    });
  });

  return [...hashtagMap.values()].sort((left, right) => {
    const countDelta = right.count - left.count;
    if (countDelta !== 0) {
      return countDelta;
    }

    return right.recentAt.localeCompare(left.recentAt);
  });
}

export function searchExploreEntities(
  input: {
    currentUser: User | null;
    users: User[];
    posts: Post[];
    reels: Reel[];
  },
  query: string
): ExploreSearchResults {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedTagQuery = normalizeTag(query);
  if (!normalizedQuery) {
    return {
      users: [],
      hashtags: [],
      posts: [],
    };
  }

  const hashtags = collectExploreHashtags(input.posts, input.reels)
    .filter((entry) => entry.tag.includes(normalizedTagQuery))
    .slice(0, 10);

  const users = input.users
    .filter((user) => user.id !== input.currentUser?.id)
    .filter((user) => {
      const haystack = [user.name, user.username, user.headline, user.bio].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((left, right) => {
      const followerDelta = right.followers.length - left.followers.length;
      if (followerDelta !== 0) {
        return followerDelta;
      }

      return left.username.localeCompare(right.username);
    })
    .slice(0, 8);

  const postMatches = input.posts
    .map((post): ExplorePostResult | null => {
      const author = input.users.find((user) => user.id === post.userId);
      const haystack = [
        post.caption,
        post.location ?? "",
        post.hashtags.flatMap((tag) => {
          const normalizedTag = normalizeTag(tag);
          return normalizedTag ? [normalizedTag, `#${normalizedTag}`] : [];
        }).join(" "),
        author?.name ?? "",
        author?.username ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        return null;
      }

      const media = getPrimaryPostMedia(post);
      return {
        post,
        author,
        imageUrl: media?.thumbnailUrl || media?.url || author?.profileImage || "",
        badge: post.media.length > 1 ? `${post.media.length} media` : media?.type === "video" ? "video post" : "photo post",
      } satisfies ExplorePostResult;
    })
    .filter((entry): entry is ExplorePostResult => entry !== null)
    .sort((left, right) => right.post.createdAt.localeCompare(left.post.createdAt))
    .slice(0, 8);

  return {
    users,
    hashtags,
    posts: postMatches,
  };
}

export function buildTrendingExploreGrid(posts: Post[], reels: Reel[], users: User[]) {
  const items: ExploreGridItem[] = [];

  posts.forEach((post, index) => {
    const author = users.find((user) => user.id === post.userId);
    const media = getPrimaryPostMedia(post);
    if (!media?.url) {
      return;
    }

    items.push({
      id: `post-${post.id}`,
      kind: "post",
      entityId: post.id,
      userId: post.userId,
      imageUrl: media.thumbnailUrl || media.url,
      badge: post.media.length > 1 ? `carousel` : media.type === "video" ? "video" : "post",
      title: author ? `@${author.username}` : "Sohba post",
      subtitle: post.location?.trim() || post.caption,
      aspectRatio: getPostAspectRatio(media, index),
      score: buildPostScore(post),
      createdAt: post.createdAt,
    });
  });

  reels.forEach((reel, index) => {
    const author = users.find((user) => user.id === reel.userId);
    items.push({
      id: `reel-${reel.id}`,
      kind: "reel",
      entityId: reel.id,
      userId: reel.userId,
      imageUrl: reel.thumbnailUrl,
      badge: "reel",
      title: author ? `@${author.username}` : "Sohba reel",
      subtitle: reel.caption,
      aspectRatio: getReelAspectRatio(index),
      score: buildReelScore(reel),
      createdAt: reel.createdAt,
    });
  });

  return items
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.createdAt.localeCompare(left.createdAt);
    })
    .slice(0, 30);
}

export function splitExploreGridItems(items: ExploreGridItem[], columnCount: number) {
  const safeColumnCount = Math.max(1, columnCount);
  const columns = Array.from({ length: safeColumnCount }, () => [] as ExploreGridItem[]);
  const heights = Array.from({ length: safeColumnCount }, () => 0);

  items.forEach((item) => {
    let targetColumnIndex = 0;
    for (let index = 1; index < heights.length; index += 1) {
      if (heights[index] < heights[targetColumnIndex]) {
        targetColumnIndex = index;
      }
    }

    columns[targetColumnIndex].push(item);
    heights[targetColumnIndex] += 1 / Math.max(item.aspectRatio, 0.45);
  });

  return columns;
}

export function buildHashtagFeed(tag: string, input: { posts: Post[]; reels: Reel[]; users: User[] }) {
  const normalizedTag = normalizeTag(tag);
  const matchingPosts = input.posts
    .filter((post) => post.hashtags.map(normalizeTag).includes(normalizedTag))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const matchingReels = input.reels
    .filter((reel) => reel.tags.map(normalizeTag).includes(normalizedTag))
    .sort((left, right) => buildReelScore(right) - buildReelScore(left));

  const creatorIds = new Set<string>([
    ...matchingPosts.map((post) => post.userId),
    ...matchingReels.map((reel) => reel.userId),
  ]);
  const creators = input.users
    .filter((user) => creatorIds.has(user.id))
    .sort((left, right) => right.followers.length - left.followers.length);

  const relatedHashtags = collectExploreHashtags(matchingPosts, matchingReels)
    .filter((entry) => entry.tag !== normalizedTag)
    .slice(0, 10);

  return {
    tag: normalizedTag,
    posts: matchingPosts,
    reels: matchingReels,
    creators,
    relatedHashtags,
    gridItems: buildTrendingExploreGrid(matchingPosts, matchingReels, input.users),
  };
}

export function getPrimaryPostMedia(post: Post) {
  return post.media[0];
}

function buildPostScore(post: Post) {
  const ageHours = Math.max((Date.now() - new Date(post.createdAt).getTime()) / 3_600_000, 1);
  const freshnessBonus = Math.max(120 - ageHours, 0);
  return post.likedBy.length * 16 + post.commentCount * 22 + freshnessBonus;
}

function buildReelScore(reel: Reel) {
  const ageHours = Math.max((Date.now() - new Date(reel.createdAt).getTime()) / 3_600_000, 1);
  const freshnessBonus = Math.max(144 - ageHours, 0);
  const boostBonus = isReelBoostActive(reel) ? 10_000 : 0;
  return reel.viewCount * 0.18 + reel.reachCount * 0.12 + reel.likedBy.length * 24 + reel.repostCount * 18 + freshnessBonus + boostBonus;
}

function getPostAspectRatio(media: PostMediaItem, index: number) {
  if (media.type === "video") {
    return 0.74;
  }

  const pattern = [1, 0.82, 1.2, 0.92];
  return pattern[index % pattern.length];
}

function getReelAspectRatio(index: number) {
  const pattern = [0.62, 0.68, 0.72];
  return pattern[index % pattern.length];
}

function normalizeTag(value: string) {
  return value.trim().replace(/^#+/, "").toLowerCase();
}

function normalizeSearchQuery(value: string) {
  return value.trim().replace(/^#+/, "").toLowerCase();
}

function maxIso(left: string, right: string) {
  return left > right ? left : right;
}
