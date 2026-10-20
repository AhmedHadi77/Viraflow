import type { CopyStrings } from "../data/locales/en";
import { AppNotification } from "../types/models";
import { fill } from "../utils/labels";
import { formatRelativeTime } from "../utils/timeFormatting";

export interface NotificationStack {
  id: string;
  grouping: "content" | "actor" | "conversation" | "single";
  items: AppNotification[];
  primary: AppNotification;
  unreadCount: number;
}

export function buildNotificationStacks(items: AppNotification[]) {
  const ordered = [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const stacks = new Map<string, NotificationStack>();

  ordered.forEach((item) => {
    const key = buildStackKey(item);
    const existing = stacks.get(key);
    if (!existing) {
      stacks.set(key, {
        id: key,
        grouping: key.startsWith("content:")
          ? "content"
          : key.startsWith("actor:")
            ? "actor"
            : key.startsWith("conversation:")
              ? "conversation"
              : "single",
        items: [item],
        primary: item,
        unreadCount: item.readAt ? 0 : 1,
      });
      return;
    }

    existing.items.push(item);
    existing.unreadCount += item.readAt ? 0 : 1;
  });

  return Array.from(stacks.values()).sort((left, right) => right.primary.createdAt.localeCompare(left.primary.createdAt));
}

type Copy = CopyStrings;

/** Content the actor wrote (comment, message, mention or order item) that is worth previewing. */
function contentPreview(item: AppNotification) {
  if (
    item.type === "post_comment" ||
    item.type === "reel_comment" ||
    item.type === "comment" ||
    item.type === "message" ||
    item.type === "mention" ||
    item.type === "order"
  ) {
    return item.body?.trim() ?? "";
  }
  return "";
}

/** One full sentence for a single notification, written in the reader's language. */
export function describeNotification(item: AppNotification, copy: Copy) {
  const name = item.actorName?.trim() || copy.appName;
  const isReel = item.entityType === "reel";
  switch (item.type) {
    case "post_like":
      return fill(copy.fsLikedPost, { name });
    case "reel_like":
      return fill(copy.fsLikedReel, { name });
    case "like":
      return fill(isReel ? copy.fsLikedReel : item.entityType === "post" ? copy.fsLikedPost : copy.fsLiked, { name });
    case "post_comment":
      return fill(copy.fsCommentedPost, { name });
    case "reel_comment":
      return fill(copy.fsCommentedReel, { name });
    case "comment":
      return fill(isReel ? copy.fsCommentedReel : copy.fsCommentedPost, { name });
    case "story_view":
      return fill(copy.fsViewedStory, { name });
    case "mention":
      return fill(copy.fsMentioned, { name });
    case "follow":
      return fill(copy.fsFollowed, { name });
    case "message":
      return fill(item.conversationType === "marketplace" ? copy.fsMarketMessage : copy.fsMessaged, { name });
    case "order":
      return fill(copy.fsOrder, { name });
    case "repost":
      return fill(copy.fsReposted, { name });
    case "save":
      return fill(copy.fsSaved, { name });
    case "call":
      return fill(copy.fsCalled, { name });
    default:
      // Announcements and system updates keep the text they were sent with.
      return item.title;
  }
}

function groupedVerb(item: AppNotification, copy: Copy) {
  const isReel = item.entityType === "reel";
  switch (item.type) {
    case "post_like":
    case "reel_like":
    case "like":
      return isReel ? copy.nvLikedReel : copy.nvLikedPost;
    case "post_comment":
    case "reel_comment":
    case "comment":
      return isReel ? copy.nvCommentedReel : copy.nvCommentedPost;
    case "story_view":
      return copy.nvViewedStory;
    case "mention":
      return copy.nvMentioned;
    case "follow":
      return copy.nvFollowed;
    case "message":
      return copy.nvMessaged;
    default:
      return copy.nvInteracted;
  }
}

export function getNotificationStackSummary(stack: NotificationStack, copy: Copy) {
  const primary = stack.primary;
  if (stack.items.length === 1 || primary.type === "system") {
    return {
      title: describeNotification(primary, copy),
      body: primary.type === "system" ? primary.body : contentPreview(primary),
    };
  }

  if (stack.grouping === "conversation") {
    return {
      title: describeNotification(primary, copy),
      body: fill(copy.nfNewMessages, { count: stack.items.length }),
    };
  }

  const uniqueTypes = new Set(stack.items.map((item) => item.type));
  const verb = uniqueTypes.size === 1 ? groupedVerb(primary, copy) : copy.nvInteracted;
  return {
    title: buildActorsLabel(stack.items, copy),
    body: verb,
  };
}

export function getNotificationStackPreviewUri(
  stack: NotificationStack,
  posts: { id: string; media: { url: string; thumbnailUrl?: string }[] }[],
  reels: { id: string; thumbnailUrl: string }[],
  stories: { id: string; imageUrl: string; videoUrl?: string }[]
) {
  const notification = stack.primary;

  if (notification.entityType === "post" && notification.entityId) {
    const post = posts.find((item) => item.id === notification.entityId);
    const firstMedia = post?.media[0];
    return firstMedia?.thumbnailUrl || firstMedia?.url;
  }

  if (notification.entityType === "reel" && notification.entityId) {
    return reels.find((item) => item.id === notification.entityId)?.thumbnailUrl;
  }

  if (notification.type === "story_view" && notification.entityId) {
    return stories.find((item) => item.id === notification.entityId)?.imageUrl;
  }

  return undefined;
}

export function formatNotificationTime(value: string, copy: Copy) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp) || Date.now() - timestamp < 60000) {
    return copy.nfJustNow;
  }
  return formatRelativeTime(timestamp, null, { style: "narrow", fallbackToDateAfterDays: 7 });
}

export function getNotificationMeta(type: AppNotification["type"], copy: Copy) {
  switch (type) {
    case "follow":
      return { icon: "person-add-outline", label: copy.nlFollow, color: "#36e0a1", tint: "rgba(54,224,161,0.14)" } as const;
    case "post_like":
    case "reel_like":
    case "like":
      return { icon: "heart-outline", label: copy.nlLike, color: "#ff7a2f", tint: "rgba(255,122,47,0.14)" } as const;
    case "post_comment":
    case "reel_comment":
    case "comment":
      return { icon: "chatbubble-ellipses-outline", label: copy.nlComment, color: "#ff7a2f", tint: "rgba(255,122,47,0.14)" } as const;
    case "story_view":
      return { icon: "eye-outline", label: copy.nlStory, color: "#ff7a2f", tint: "rgba(255,122,47,0.14)" } as const;
    case "mention":
      return { icon: "at-outline", label: copy.nlMention, color: "#ff7a2f", tint: "rgba(255,122,47,0.14)" } as const;
    case "message":
      return { icon: "paper-plane-outline", label: copy.nlMessage, color: "#36e0a1", tint: "rgba(54,224,161,0.14)" } as const;
    case "order":
      return { icon: "bag-handle-outline", label: copy.nlOrder, color: "#36e0a1", tint: "rgba(54,224,161,0.14)" } as const;
    case "boost":
      return { icon: "flash-outline", label: copy.nlBoost, color: "#ff7a2f", tint: "rgba(255,122,47,0.14)" } as const;
    case "repost":
      return { icon: "repeat-outline", label: copy.nlRepost, color: "#36e0a1", tint: "rgba(54,224,161,0.14)" } as const;
    case "save":
      return { icon: "bookmark-outline", label: copy.nlSave, color: "#36e0a1", tint: "rgba(54,224,161,0.14)" } as const;
    case "call":
      return { icon: "call-outline", label: copy.nlCall, color: "#36e0a1", tint: "rgba(54,224,161,0.14)" } as const;
    case "system":
      return { icon: "megaphone-outline", label: copy.nlAnnouncement, color: "#36e0a1", tint: "rgba(54,224,161,0.14)" } as const;
    default:
      return { icon: "notifications-outline", label: copy.nlUpdate, color: "#36e0a1", tint: "rgba(54,224,161,0.14)" } as const;
  }
}

function buildStackKey(item: AppNotification) {
  if (item.type === "message" && item.conversationId) {
    return `conversation:${item.conversationType ?? "direct"}:${item.conversationId}`;
  }

  if (item.entityType && item.entityId && isContentGroupingType(item.type)) {
    return `content:${item.entityType}:${item.entityId}`;
  }

  if (item.actorId) {
    return `actor:${item.actorId}`;
  }

  return `single:${item.id}`;
}

function isContentGroupingType(type: AppNotification["type"]) {
  return (
    type === "post_like" ||
    type === "post_comment" ||
    type === "reel_like" ||
    type === "reel_comment" ||
    type === "story_view" ||
    type === "mention" ||
    type === "like" ||
    type === "comment"
  );
}

function buildActorsLabel(items: AppNotification[], copy: Copy) {
  const actorNames = Array.from(
    new Set(items.map((item) => item.actorName?.trim()).filter((value): value is string => Boolean(value)))
  );
  if (actorNames.length === 0) {
    return copy.appName;
  }
  if (actorNames.length === 1) {
    return actorNames[0];
  }
  if (actorNames.length === 2) {
    return fill(copy.nfTwo, { a: actorNames[0], b: actorNames[1] });
  }
  return fill(copy.nfMany, { a: actorNames[0], count: actorNames.length - 1 });
}
