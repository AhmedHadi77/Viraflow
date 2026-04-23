import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import {
  seedCommunityChatMessages,
  seedCommunityPosts,
  seedCommunities,
  seedDirectMessages,
  seedDirectThreads,
  seedMarketplaceMessages,
  seedMarketplaceOrders,
  seedMarketplaceThreads,
  reelBoostPlans,
  seedComments,
  seedNotifications,
  seedProducts,
  seedReelBoosts,
  seedReels,
  seedSavedPosts,
  seedStories,
  seedUsers,
  subscriptionPlans,
} from "../data/mockData";
import {
  AppApiError,
  ApiUserPayload,
  createBoostCheckoutSessionWithApi,
  createCommunityWithApi,
  createCommunityPostWithApi,
  createMarketplaceOrderWithApi,
  createCommentWithApi,
  createProductWithApi,
  createReelWithApi,
  createSubscriptionCheckoutSessionWithApi,
  createStoryWithApi,
  derivePlanType,
  fetchApiBootstrap,
  fetchApiCatalog,
  fetchCommunityActivityWithApi,
  fetchCommunitiesWithApi,
  fetchDirectInboxWithApi,
  fetchDirectThreadWithApi,
  fetchMarketplaceInboxWithApi,
  fetchMarketplaceThreadWithApi,
  fetchNotificationsWithApi,
  isAppApiConfigured,
  loginWithApi,
  mapApiDirectMessageToMobile,
  mapApiDirectThreadToMobile,
  mapApiMarketplaceMessageToMobile,
  mapApiMarketplaceOrderToMobile,
  mapApiMarketplaceThreadToMobile,
  mapApiCommunityChatMessageToMobile,
  mapApiCommunityToMobile,
  mapApiCommunityPostToMobile,
  mapApiBoostToMobile,
  mapApiNotificationToMobile,
  mapApiProductToMobile,
  mapApiReelToMobile,
  mapApiSavedPostToMobile,
  mapApiStoryToMobile,
  mapApiUserToMobile,
  markAllNotificationsReadWithApi,
  repostReelWithApi,
  registerWithApi,
  sendCommunityChatMessageWithApi,
  sendDirectMessageWithApi,
  sendMarketplaceMessageWithApi,
  startDirectChatWithApi,
  startMarketplaceChatWithApi,
  toggleFollowWithApi,
  toggleLikeWithApi,
  toggleSaveProductWithApi,
  toggleSaveReelWithApi,
  updateProductListingStatusWithApi,
  updateProfileWithApi,
} from "../services/appApi";
import {
  fetchFirebaseChatSnapshot,
  fetchFirebaseCommunityChatForUser,
  fetchFirebaseDirectThread,
  fetchFirebaseMarketplaceThread,
  getFirebaseChatErrorMessage,
  isFirebaseChatConfigured,
  markFirebaseCommunityMessagesDelivered,
  markFirebaseCommunityMessagesRead,
  markFirebaseDirectMessagesDelivered,
  markFirebaseDirectMessagesRead,
  markFirebaseMarketplaceMessagesDelivered,
  markFirebaseMarketplaceMessagesRead,
  sendFirebaseCommunityChatMessage,
  sendFirebaseDirectMessage,
  sendFirebaseMarketplaceMessage,
  startFirebaseDirectChat,
  startFirebaseMarketplaceChat,
  subscribeToFirebaseChat,
} from "../services/firebaseChat";
import {
  createFirebaseCommunity,
  createFirebaseCommunityPost,
  createFirebaseMarketplaceOrder,
  fetchFirebaseCommunityActivity,
  fetchFirebaseCommunityCommerceSnapshot,
  getFirebaseCommunityCommerceErrorMessage,
  isFirebaseCommunityCommerceConfigured,
  subscribeToFirebaseCommunityCommerce,
} from "../services/firebaseCommunityCommerce";
import {
  createFirebaseProduct,
  createFirebaseReel,
  createFirebaseStory,
  fetchFirebaseCatalogFromFirestore,
  getFirebaseContentErrorMessage,
  isFirebaseContentConfigured,
  updateFirebaseProductListingStatus,
} from "../services/firebaseContent";
import {
  addFirebaseReelComment,
  fetchFirebaseEngagementSnapshot,
  getFirebaseEngagementErrorMessage,
  isFirebaseEngagementConfigured,
  repostFirebaseReel,
  subscribeToFirebaseEngagement,
  toggleFirebaseFollow,
  toggleFirebaseReelLike,
} from "../services/firebaseEngagement";
import {
  createFirebaseNotification,
  fetchFirebaseInboxSnapshot,
  getFirebaseInboxErrorMessage,
  isFirebaseInboxConfigured,
  markAllFirebaseNotificationsRead,
  subscribeToFirebaseInbox,
  toggleFirebaseSavedPost,
} from "../services/firebaseInbox";
import {
  activateFirebaseSubscription,
  createFirebaseReelBoost,
  fetchFirebaseMonetizationSnapshot,
  getFirebaseMonetizationErrorMessage,
  isFirebaseMonetizationConfigured,
  subscribeToFirebaseMonetization,
} from "../services/firebaseMonetization";
import {
  getCurrentFirebaseIdToken,
  getFirebaseProfileById,
  getFirebaseProfileErrorMessage,
  isFirebaseProfilesConfigured,
  loginWithFirebaseProfile,
  logoutFromFirebaseProfile,
  registerWithFirebaseProfile,
  updateFirebaseUserProfile,
} from "../services/firebaseProfiles";
import {
  buildCloudinaryVideoThumbnailUrl,
  checkUploadedMediaSafety,
  isMediaApiConfigured,
  MediaFolder,
  uploadDataUrlToCloudinary,
  uploadMediaToCloudinary,
} from "../services/mediaUpload";
import {
  DEFAULT_PUSH_NOTIFICATIONS_STATUS,
  registerForPushNotificationsAsync,
  scheduleLocalNotificationFromAppNotification,
  sendPushNotificationToUser,
} from "../services/pushNotifications";
import {
  CommunityMessageRealtimeEvent,
  connectRealtime,
  DeliveredRealtimeEvent,
  DirectMessageRealtimeEvent,
  disconnectRealtime,
  emitDeliveredRealtime,
  emitReadRealtime,
  emitTypingRealtime,
  isRealtimeConfigured,
  MarketplaceMessageRealtimeEvent,
  PresenceRealtimeEvent,
  ReadRealtimeEvent,
  TypingRealtimeEvent,
} from "../services/realtime";
import {
  AppSubscription,
  PushNotificationsStatus,
  AppNotification,
  CommunityChatMessage,
  CommunityPost,
  CommunitySpace,
  CreateCommunityPayload,
  CreateCommunityPostPayload,
  AuthSession,
  DirectChatMessage,
  DirectChatThread,
  CreateMarketplaceOrderPayload,
  CreateProductPayload,
  CreateReelBoostPayload,
  CreateReelPayload,
  CreateStoryPayload,
  LanguageOption,
  MarketplaceChatMessage,
  MarketplaceChatThread,
  MarketplaceOrder,
  PlanType,
  Product,
  Reel,
  ReelBoostCampaign,
  ReelBoostPlan,
  ReelComment,
  RegisterPayload,
  SavedPost,
  Story,
  SubscriptionPlan,
  UpdateProfilePayload,
  User,
  UserPresence,
} from "../types/models";
import { blockedUserContentMessage, containsSexualContent } from "../utils/contentSafety";

const STORAGE_KEYS = {
  language: "viraflow.language",
  session: "viraflow.session",
  firebaseUser: "viraflow.firebaseUser",
} as const;

interface AppContextValue {
  isBootstrapping: boolean;
  language: LanguageOption | null;
  session: AuthSession | null;
  currentUser: User | null;
  users: User[];
  stories: Story[];
  reels: Reel[];
  products: Product[];
  communities: CommunitySpace[];
  communityPosts: CommunityPost[];
  communityChatMessages: CommunityChatMessage[];
  directThreads: DirectChatThread[];
  directMessages: DirectChatMessage[];
  comments: ReelComment[];
  notifications: AppNotification[];
  savedPosts: SavedPost[];
  marketplaceThreads: MarketplaceChatThread[];
  marketplaceMessages: MarketplaceChatMessage[];
  marketplaceOrders: MarketplaceOrder[];
  activeSubscription: AppSubscription | null;
  pushNotificationsStatus: PushNotificationsStatus;
  plans: SubscriptionPlan[];
  boostPlans: ReelBoostPlan[];
  reelBoosts: ReelBoostCampaign[];
  refreshCatalog: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshDirectInbox: () => Promise<void>;
  refreshMarketplaceInbox: () => Promise<void>;
  refreshCommunities: () => Promise<void>;
  openCommunityActivity: (communityId: string) => Promise<{ ok: boolean; message?: string }>;
  setLanguage: (language: LanguageOption) => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (payload: RegisterPayload) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  markAllNotificationsRead: () => Promise<{ ok: boolean; message?: string }>;
  toggleLike: (reelId: string) => Promise<{ ok: boolean; message?: string }>;
  repostReel: (reelId: string) => Promise<{ ok: boolean; message?: string }>;
  addComment: (reelId: string, text: string) => Promise<{ ok: boolean; message?: string }>;
  toggleFollow: (targetUserId: string) => Promise<{ ok: boolean; message?: string }>;
  toggleSaveReel: (reelId: string) => Promise<{ ok: boolean; message?: string; saved?: boolean }>;
  toggleSaveProduct: (productId: string) => Promise<{ ok: boolean; message?: string; saved?: boolean }>;
  updateProductListingStatus: (
    productId: string,
    listingStatus: Product["listingStatus"]
  ) => Promise<{ ok: boolean; message?: string }>;
  startDirectChat: (targetUserId: string) => Promise<{ ok: boolean; message?: string; threadId?: string }>;
  openDirectThread: (threadId: string) => Promise<{ ok: boolean; message?: string }>;
  markDirectThreadRead: (threadId: string) => void;
  setDirectTyping: (threadId: string, isTyping: boolean) => void;
  sendDirectMessage: (threadId: string, text: string) => Promise<{ ok: boolean; message?: string }>;
  startMarketplaceChat: (productId: string) => Promise<{ ok: boolean; message?: string; threadId?: string }>;
  openMarketplaceThread: (threadId: string) => Promise<{ ok: boolean; message?: string }>;
  markMarketplaceThreadRead: (threadId: string) => void;
  setMarketplaceTyping: (threadId: string, isTyping: boolean) => void;
  sendMarketplaceMessage: (threadId: string, text: string) => Promise<{ ok: boolean; message?: string }>;
  createMarketplaceOrder: (
    payload: CreateMarketplaceOrderPayload
  ) => Promise<{ ok: boolean; message?: string; threadId?: string }>;
  createStory: (payload: CreateStoryPayload) => Promise<{ ok: boolean; message?: string }>;
  createReel: (payload: CreateReelPayload) => Promise<{ ok: boolean; message?: string }>;
  subscribeToPlan: (planType: PlanType) => Promise<{ ok: boolean; message?: string; subscription?: AppSubscription }>;
  boostReel: (payload: CreateReelBoostPayload) => Promise<{ ok: boolean; message?: string; boost?: ReelBoostCampaign }>;
  createProduct: (payload: CreateProductPayload) => Promise<{ ok: boolean; message?: string }>;
  createCommunity: (payload: CreateCommunityPayload) => Promise<{ ok: boolean; message?: string }>;
  createCommunityPost: (payload: CreateCommunityPostPayload) => Promise<{ ok: boolean; message?: string }>;
  markCommunityChatRead: (communityId: string) => void;
  setCommunityTyping: (communityId: string, isTyping: boolean) => void;
  sendCommunityChatMessage: (communityId: string, text: string) => Promise<{ ok: boolean; message?: string }>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<{ ok: boolean; message?: string }>;
  getUserById: (userId: string) => User | undefined;
  getCommunityById: (communityId: string) => CommunitySpace | undefined;
  getCommunityPosts: (communityId: string) => CommunityPost[];
  getCommunityChatMessages: (communityId: string) => CommunityChatMessage[];
  getCommunityTypingUsers: (communityId: string) => User[];
  getCommentsForReel: (reelId: string) => ReelComment[]; 
  getDirectMessagesForThread: (threadId: string) => DirectChatMessage[];
  getDirectTypingUsers: (threadId: string) => User[];
  getDirectUnreadCount: (threadId: string) => number;
  getTotalDirectUnreadCount: () => number;
  getMarketplaceMessagesForThread: (threadId: string) => MarketplaceChatMessage[];
  getMarketplaceTypingUsers: (threadId: string) => User[];
  getMarketplaceUnreadCount: (threadId: string) => number;
  getTotalMarketplaceUnreadCount: () => number;
  getUserPresence: (userId: string) => UserPresence;
  getBoostForReel: (reelId: string) => ReelBoostCampaign | undefined;
  canDirectMessageUser: (targetUserId: string) => boolean;
  isReelSaved: (reelId: string) => boolean;
  isProductSaved: (productId: string) => boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [language, setLanguageState] = useState<LanguageOption | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [stories, setStories] = useState<Story[]>(seedStories);
  const [reels, setReels] = useState<Reel[]>(seedReels);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [communities, setCommunities] = useState<CommunitySpace[]>(seedCommunities);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(seedCommunityPosts);
  const [communityChatMessages, setCommunityChatMessages] = useState<CommunityChatMessage[]>(seedCommunityChatMessages);
  const [communityTypingById, setCommunityTypingById] = useState<Record<string, string[]>>({});
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, UserPresence>>({});
  const [directThreads, setDirectThreads] = useState<DirectChatThread[]>(seedDirectThreads);
  const [directMessages, setDirectMessages] = useState<DirectChatMessage[]>(seedDirectMessages);
  const [directTypingByThread, setDirectTypingByThread] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<ReelComment[]>(seedComments);
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>(seedSavedPosts);
  const [marketplaceThreads, setMarketplaceThreads] = useState<MarketplaceChatThread[]>(seedMarketplaceThreads);
  const [marketplaceMessages, setMarketplaceMessages] = useState<MarketplaceChatMessage[]>(seedMarketplaceMessages);
  const [marketplaceTypingByThread, setMarketplaceTypingByThread] = useState<Record<string, string[]>>({});
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>(seedMarketplaceOrders);
  const [activeSubscription, setActiveSubscription] = useState<AppSubscription | null>(null);
  const [pushNotificationsStatus, setPushNotificationsStatus] = useState<PushNotificationsStatus>(
    DEFAULT_PUSH_NOTIFICATIONS_STATUS
  );
  const [reelBoosts, setReelBoosts] = useState<ReelBoostCampaign[]>(seedReelBoosts);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasPrimedNotificationFeedRef = useRef(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [storedLanguage, storedSession, storedFirebaseUser] = await AsyncStorage.multiGet([
          STORAGE_KEYS.language,
          STORAGE_KEYS.session,
          STORAGE_KEYS.firebaseUser,
        ]);

        const languageValue = storedLanguage[1] as LanguageOption | null;
        if (languageValue) {
          setLanguageState(languageValue);
        }

        const parsedSession = storedSession[1] ? (JSON.parse(storedSession[1]) as AuthSession) : null;
        const parsedFirebaseUser = parseStoredUser(storedFirebaseUser[1]);
        const shouldUseFirebaseSession = Boolean(
          parsedSession && isFirebaseProfilesConfigured() && !isDemoAccessToken(parsedSession.token)
        );

        if (parsedSession && shouldUseFirebaseSession) {
          setSession(parsedSession);

          if (parsedFirebaseUser?.id === parsedSession.userId) {
            setUsers((current) => withOwnedContent(upsertUser(current, parsedFirebaseUser), reels, products));
          } else {
            try {
              const firebaseProfile = await getFirebaseProfileById(parsedSession.userId);
              if (firebaseProfile) {
                setUsers((current) => withOwnedContent(upsertUser(current, firebaseProfile), reels, products));
                await AsyncStorage.setItem(STORAGE_KEYS.firebaseUser, JSON.stringify(firebaseProfile));
              }
            } catch {
              // Keep the cached session; Firebase Auth may restore a token after boot on slow devices.
            }
          }

          await hydrateCatalogFromFirebase(parsedFirebaseUser ?? undefined);
        } else if (parsedSession && (isAppApiConfigured() || seedUsers.some((item) => item.id === parsedSession.userId))) {
          setSession(parsedSession);
        }

        if (isAppApiConfigured() && !shouldUseFirebaseSession) {
          await hydrateCatalogFromApi();

          if (parsedSession && !shouldUseFirebaseSession) {
            const synced = await hydrateSessionFromApi(parsedSession);
            if (!synced) {
              setSession(null);
              setStories(seedStories);
              setSavedPosts([]);
              setNotifications([]);
              setCommunities(seedCommunities);
              setCommunityPosts(seedCommunityPosts);
              setCommunityChatMessages(seedCommunityChatMessages);
              setCommunityTypingById({});
              setDirectThreads(seedDirectThreads);
              setDirectMessages(seedDirectMessages);
              setDirectTypingByThread({});
              setMarketplaceThreads(seedMarketplaceThreads);
              setMarketplaceMessages(seedMarketplaceMessages);
              setMarketplaceTypingByThread({});
              setMarketplaceOrders(seedMarketplaceOrders);
              await AsyncStorage.removeItem(STORAGE_KEYS.session);
              await AsyncStorage.removeItem(STORAGE_KEYS.firebaseUser);
            }
          }
        }

        await delay(900);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrap();
  }, []);

  const currentUser = users.find((item) => item.id === session?.userId) ?? null;

  useEffect(() => {
    if (!session?.token || !isAppApiConfigured() || !isRealtimeConfigured()) {
      setPresenceByUserId({});
      disconnectRealtime();
      return;
    }

    const socket = connectRealtime(session.token);
    if (!socket) {
      return;
    }

    const handleDirectMessage = (payload: DirectMessageRealtimeEvent) => {
      setUsers((current) => upsertRealtimeUser(current, payload.message.sender));
      setDirectThreads((current) => upsertDirectThread(current, mapApiDirectThreadToMobile(payload.thread)));
      setDirectMessages((current) => mergeDirectMessages(current, [mapApiDirectMessageToMobile(payload.message)]));
      if (payload.message.senderId !== session.userId) {
        markDirectThreadDelivered(payload.thread.id);
      }
    };

    const handleMarketplaceMessage = (payload: MarketplaceMessageRealtimeEvent) => {
      setUsers((current) => upsertRealtimeUser(current, payload.message.sender));
      setMarketplaceThreads((current) => upsertMarketplaceThread(current, mapApiMarketplaceThreadToMobile(payload.thread)));
      setMarketplaceMessages((current) => mergeMarketplaceMessages(current, [mapApiMarketplaceMessageToMobile(payload.message)]));
      if (payload.message.senderId !== session.userId) {
        markMarketplaceThreadDelivered(payload.thread.id);
      }
    };

    const handleCommunityMessage = (payload: CommunityMessageRealtimeEvent) => {
      setUsers((current) => upsertRealtimeUser(current, payload.message.sender));
      setCommunityChatMessages((current) => mergeCommunityChatMessages(current, [mapApiCommunityChatMessageToMobile(payload.message)]));
      if (payload.message.senderId !== session.userId) {
        markCommunityChatDelivered(payload.communityId);
      }
    };

    const handleTyping = (payload: TypingRealtimeEvent) => {
      if (payload.userId === session.userId) {
        return;
      }

      if (payload.conversationType === "direct") {
        setDirectTypingByThread((current) => updateTypingBucket(current, payload.threadId, payload.userId, payload.isTyping));
        return;
      }

      if (payload.conversationType === "marketplace") {
        setMarketplaceTypingByThread((current) => updateTypingBucket(current, payload.threadId, payload.userId, payload.isTyping));
        return;
      }

      setCommunityTypingById((current) => updateTypingBucket(current, payload.communityId, payload.userId, payload.isTyping));
    };

    const handleRead = (payload: ReadRealtimeEvent) => {
      if (payload.userId === session.userId) {
        return;
      }

      if (payload.conversationType === "direct") {
        setDirectMessages((current) => applySeenStateToMessages(applyDeliveredStateToMessages(current, payload.messageIds, payload.userId), payload.messageIds, payload.userId));
        return;
      }

      if (payload.conversationType === "marketplace") {
        setMarketplaceMessages((current) =>
          applySeenStateToMessages(applyDeliveredStateToMessages(current, payload.messageIds, payload.userId), payload.messageIds, payload.userId)
        );
        return;
      }

      setCommunityChatMessages((current) =>
        applySeenStateToMessages(applyDeliveredStateToMessages(current, payload.messageIds, payload.userId), payload.messageIds, payload.userId)
      );
    };

    const handleDelivered = (payload: DeliveredRealtimeEvent) => {
      if (payload.userId === session.userId) {
        return;
      }

      if (payload.conversationType === "direct") {
        setDirectMessages((current) => applyDeliveredStateToMessages(current, payload.messageIds, payload.userId));
        return;
      }

      if (payload.conversationType === "marketplace") {
        setMarketplaceMessages((current) => applyDeliveredStateToMessages(current, payload.messageIds, payload.userId));
        return;
      }

      setCommunityChatMessages((current) => applyDeliveredStateToMessages(current, payload.messageIds, payload.userId));
    };

    const handlePresenceSnapshot = (payload: PresenceRealtimeEvent[]) => {
      setPresenceByUserId(
        payload.reduce<Record<string, UserPresence>>((next, item) => {
          next[item.userId] = item;
          return next;
        }, {})
      );
    };

    const handlePresenceUpdate = (payload: PresenceRealtimeEvent) => {
      setPresenceByUserId((current) => ({
        ...current,
        [payload.userId]: payload,
      }));
    };

    socket.on("chat:direct-message", handleDirectMessage);
    socket.on("chat:marketplace-message", handleMarketplaceMessage);
    socket.on("chat:community-message", handleCommunityMessage);
    socket.on("chat:delivered", handleDelivered);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:read", handleRead);
    socket.on("presence:snapshot", handlePresenceSnapshot);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("chat:direct-message", handleDirectMessage);
      socket.off("chat:marketplace-message", handleMarketplaceMessage);
      socket.off("chat:community-message", handleCommunityMessage);
      socket.off("chat:delivered", handleDelivered);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:read", handleRead);
      socket.off("presence:snapshot", handlePresenceSnapshot);
      socket.off("presence:update", handlePresenceUpdate);
      disconnectRealtime();
    };
  }, [session?.token]);

  useEffect(() => {
    if (!isFirebaseBackedSession(session)) {
      return;
    }

    return subscribeToFirebaseEngagement({
      onUsers: (nextUsers) => {
        setUsers((current) => mergeUsersById(nextUsers, current));
      },
      onReels: (nextReels) => {
        setReels(mergeReelsById(nextReels, seedReels));
      },
      onComments: (nextComments) => {
        setComments(mergeCommentsById(nextComments, seedComments));
      },
    });
  }, [session?.token]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      return;
    }

    return subscribeToFirebaseInbox(firebaseUserId, {
      onSavedPosts: setSavedPosts,
      onNotifications: setNotifications,
    });
  }, [session?.token, session?.userId]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      return;
    }

    return subscribeToFirebaseChat(firebaseUserId, {
      onDirectThreads: setDirectThreads,
      onDirectMessages: setDirectMessages,
      onMarketplaceThreads: setMarketplaceThreads,
      onMarketplaceMessages: setMarketplaceMessages,
      onCommunityMessages: setCommunityChatMessages,
    });
  }, [session?.token, session?.userId]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      return;
    }

    return subscribeToFirebaseCommunityCommerce(firebaseUserId, {
      onCommunities: setCommunities,
      onCommunityPosts: setCommunityPosts,
      onMarketplaceOrders: setMarketplaceOrders,
    });
  }, [session?.token, session?.userId]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      setActiveSubscription(null);
      return;
    }

    return subscribeToFirebaseMonetization(firebaseUserId, {
      onSubscription: (nextSubscription) => {
        setActiveSubscription(nextSubscription);
        setUsers((current) => applyPlanTypeToUsers(current, firebaseUserId, nextSubscription));
      },
      onBoosts: setReelBoosts,
    });
  }, [session?.token, session?.userId]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      setPushNotificationsStatus(DEFAULT_PUSH_NOTIFICATIONS_STATUS);
      return;
    }

    let isCancelled = false;
    void registerForPushNotificationsAsync(firebaseUserId)
      .then((status) => {
        if (!isCancelled) {
          setPushNotificationsStatus(status);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setPushNotificationsStatus({
            mode: "unavailable",
            permissionStatus: "undetermined",
            message: error instanceof Error ? error.message : "Push notifications could not be enabled right now.",
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [session?.token, session?.userId]);

  useEffect(() => {
    if (!session?.userId || !isFirebaseBackedSession(session)) {
      knownNotificationIdsRef.current = new Set();
      hasPrimedNotificationFeedRef.current = false;
      return;
    }

    const nextIds = new Set(notifications.map((item) => item.id));
    if (!hasPrimedNotificationFeedRef.current) {
      knownNotificationIdsRef.current = nextIds;
      hasPrimedNotificationFeedRef.current = true;
      return;
    }

    const previousIds = knownNotificationIdsRef.current;
    knownNotificationIdsRef.current = nextIds;

    if (pushNotificationsStatus.mode !== "local") {
      return;
    }

    const newUnreadNotifications = notifications.filter((item) => !previousIds.has(item.id) && !item.readAt);
    newUnreadNotifications.slice(0, 3).forEach((notification) => {
      void scheduleLocalNotificationFromAppNotification(notification).catch(() => undefined);
    });
  }, [notifications, pushNotificationsStatus.mode, session?.token, session?.userId]);

  async function hydrateCatalogFromFirebase(preferredUser?: User) {
    if (!isFirebaseContentConfigured()) {
      return false;
    }

    try {
      const firebaseUserId = preferredUser?.id ?? session?.userId;
      const [catalog, engagement, inbox, chat, communityCommerce, monetization] = await Promise.all([
        fetchFirebaseCatalogFromFirestore(),
        fetchFirebaseEngagementSnapshot(),
        firebaseUserId ? fetchFirebaseInboxSnapshot(firebaseUserId) : Promise.resolve({ savedPosts: [], notifications: [] }),
        firebaseUserId
          ? fetchFirebaseChatSnapshot(firebaseUserId)
          : Promise.resolve({
              directThreads: [],
              directMessages: [],
              marketplaceThreads: [],
              marketplaceMessages: [],
              communityChatMessages: [],
            }),
        firebaseUserId
          ? fetchFirebaseCommunityCommerceSnapshot(firebaseUserId)
          : Promise.resolve({
              communities: [],
              communityPosts: [],
              marketplaceOrders: [],
            }),
        firebaseUserId
          ? fetchFirebaseMonetizationSnapshot(firebaseUserId)
          : Promise.resolve({
              subscription: null,
              boosts: [],
            }),
      ]);
      const nextStories = filterActiveStories(mergeStoriesById(catalog.stories, seedStories));
      const nextReels = mergeReelsById(catalog.reels, seedReels);
      const nextProducts = mergeProductsById(catalog.products, seedProducts);

      setStories(nextStories);
      setReels(nextReels);
      setProducts(nextProducts);
      setComments(mergeCommentsById(engagement.comments, seedComments));
      setSavedPosts(inbox.savedPosts);
      setNotifications(inbox.notifications);
      setCommunities(communityCommerce.communities);
      setCommunityPosts(communityCommerce.communityPosts);
      setMarketplaceOrders(communityCommerce.marketplaceOrders);
      setActiveSubscription(monetization.subscription);
      setReelBoosts(monetization.boosts);
      setCommunityChatMessages(chat.communityChatMessages);
      setDirectThreads(chat.directThreads);
      setDirectMessages(chat.directMessages);
      setMarketplaceThreads(chat.marketplaceThreads);
      setMarketplaceMessages(chat.marketplaceMessages);
      setUsers((current) => {
        const mergedUsers = mergeUsersById(preferredUser ? [preferredUser, ...catalog.users] : catalog.users, current);
        return withOwnedContent(applyPlanTypeToUsers(mergedUsers, firebaseUserId ?? preferredUser?.id ?? "", monetization.subscription), nextReels, nextProducts);
      });
      return true;
    } catch {
      return false;
    }
  }

  async function hydrateCatalogFromApi() {
    try {
      const catalog = await fetchApiCatalog();
      const nextState = buildRemoteState({
        existingUsers: users,
        existingReels: reels,
        existingProducts: products,
        apiReels: catalog.reels,
        apiProducts: catalog.products,
      });
      setUsers(nextState.users);
      setReels(nextState.reels);
      setProducts(nextState.products);
      setCommunities(catalog.communities.map(mapApiCommunityToMobile));
      setStories(catalog.stories.map(mapApiStoryToMobile));
      setActiveSubscription(null);
      setReelBoosts(catalog.boosts.map(mapApiBoostToMobile));
      return true;
    } catch {
      return false;
    }
  }

  async function hydrateSessionFromApi(activeSession: AuthSession) {
    try {
      const bundle = await fetchApiBootstrap(activeSession.token);
      const existingCurrentUser = users.find((item) => item.id === activeSession.userId);
      const nextState = buildRemoteState({
        existingUsers: users,
        existingReels: reels,
        existingProducts: products,
        apiReels: bundle.reels,
        apiProducts: bundle.products,
        currentProfile: bundle.profile,
        currentPlanType: derivePlanType(bundle.subscription, existingCurrentUser),
      });
      setUsers(nextState.users);
      setReels(nextState.reels);
      setProducts(nextState.products);
      setCommunities(bundle.communities.map(mapApiCommunityToMobile));
      setCommunityPosts([]);
      setCommunityChatMessages([]);
      setCommunityTypingById({});
      setDirectThreads(bundle.directThreads.map(mapApiDirectThreadToMobile));
      setDirectMessages(
        bundle.directMessages.map((message) => mapApiDirectMessageToMobile(message, users.find((user) => user.id === message.senderId)))
      );
      setDirectTypingByThread({});
      setStories(bundle.stories.map(mapApiStoryToMobile));
      setReelBoosts(bundle.boosts.map(mapApiBoostToMobile));
      setSavedPosts(bundle.savedPosts.map(mapApiSavedPostToMobile));
      setNotifications(bundle.notifications.map(mapApiNotificationToMobile));
      setMarketplaceThreads(bundle.marketplaceThreads.map(mapApiMarketplaceThreadToMobile));
      setMarketplaceMessages(
        bundle.marketplaceMessages.map((message) =>
          mapApiMarketplaceMessageToMobile(message, users.find((user) => user.id === message.senderId))
        )
      );
      setMarketplaceTypingByThread({});
      setMarketplaceOrders(bundle.marketplaceOrders.map(mapApiMarketplaceOrderToMobile));
      setActiveSubscription(null);
      return true;
    } catch (error) {
      if (error instanceof AppApiError && (error.status === 401 || error.status === 404)) {
        return false;
      }

      return true;
    }
  }

  async function setLanguage(languageValue: LanguageOption) {
    setLanguageState(languageValue);
    await AsyncStorage.setItem(STORAGE_KEYS.language, languageValue);
  }

  async function publishFirebaseNotification(input: Parameters<typeof createFirebaseNotification>[0]) {
    const notification = await createFirebaseNotification(input);
    if (!notification) {
      return null;
    }

    await sendPushNotificationToUser(notification.userId, notification).catch(() => undefined);
    return notification;
  }

  async function persistCurrentFirebaseUser(nextUser: User, nextToken = session?.token) {
    if (!nextToken || isDemoAccessToken(nextToken)) {
      return;
    }

    await AsyncStorage.multiSet([
      [
        STORAGE_KEYS.session,
        JSON.stringify({
          token: nextToken,
          userId: nextUser.id,
        }),
      ],
      [STORAGE_KEYS.firebaseUser, JSON.stringify(nextUser)],
    ]);
  }

  async function refreshCatalog() {
    if (isFirebaseBackedSession(session)) {
      await hydrateCatalogFromFirebase(currentUser ?? undefined);
      return;
    }

    await hydrateCatalogFromApi();

    if (session) {
      await hydrateSessionFromApi(session);
    }
  }

  async function refreshCommunities() {
    if (isFirebaseBackedSession(session) && currentUser) {
      try {
        const snapshot = await fetchFirebaseCommunityCommerceSnapshot(currentUser.id);
        setCommunities(snapshot.communities);
        setCommunityPosts(snapshot.communityPosts);
      } catch {
        // Realtime Firestore listeners keep the current communities when refresh fails.
      }
      return;
    }

    if (!isAppApiConfigured()) {
      setCommunities((current) => [...current].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
      return;
    }

    try {
      const nextCommunities = await fetchCommunitiesWithApi();
      setCommunities(nextCommunities.map(mapApiCommunityToMobile));
    } catch {
      // Keep current communities when refresh fails.
    }
  }

  async function openCommunityActivity(communityId: string) {
    const community = communities.find((item) => item.id === communityId);
    if (!community) {
      return { ok: false, message: "Community not found." };
    }

    if (isFirebaseBackedSession(session) && currentUser) {
      try {
        const activity = await fetchFirebaseCommunityActivity(communityId);
        const messages = await fetchFirebaseCommunityChatForUser(currentUser.id, communityId);
        const deliverableMessageIds = messages
          .filter((message) => message.senderId !== currentUser.id && !message.deliveredToUserIds.includes(currentUser.id))
          .map((message) => message.id);
        setCommunities((current) =>
          [activity.community, ...current.filter((item) => item.id !== communityId)].sort((left, right) =>
            right.createdAt.localeCompare(left.createdAt)
          )
        );
        setCommunityPosts((current) =>
          mergeCommunityPosts(current.filter((item) => item.communityId !== communityId), activity.posts)
        );
        setCommunityChatMessages((current) =>
          mergeCommunityChatMessages(
            current.filter((item) => item.communityId !== communityId),
            applyDeliveredStateToMessages(messages, deliverableMessageIds, currentUser.id)
          )
        );
        await markFirebaseCommunityMessagesDelivered(currentUser.id, deliverableMessageIds).catch(() => undefined);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseCommunityCommerceErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await fetchCommunityActivityWithApi(session.token, communityId);
      setCommunities((current) =>
        [mapApiCommunityToMobile(response.community), ...current.filter((item) => item.id !== communityId)].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )
      );
      setCommunityPosts((current) =>
        mergeCommunityPosts(
          current.filter((item) => item.communityId !== communityId),
          response.posts.map((post) => mapApiCommunityPostToMobile(post, users.find((user) => user.id === post.authorId)))
        )
      );
      setCommunityChatMessages((current) =>
        mergeCommunityChatMessages(
          current.filter((item) => item.communityId !== communityId),
          response.chatMessages.map((message) =>
            mapApiCommunityChatMessageToMobile(message, users.find((user) => user.id === message.senderId))
          )
        )
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function refreshNotifications() {
    if (!session?.token) {
      return;
    }

    if (isFirebaseBackedSession(session) && currentUser) {
      try {
        const snapshot = await fetchFirebaseInboxSnapshot(currentUser.id);
        setNotifications(snapshot.notifications);
      } catch {
        // Firestore listeners keep the current notification list when a manual refresh fails.
      }
      return;
    }

    if (!isAppApiConfigured()) {
      setNotifications((current) => [...current].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
      return;
    }

    try {
      const nextNotifications = await fetchNotificationsWithApi(session.token);
      setNotifications(nextNotifications.map(mapApiNotificationToMobile));
    } catch {
      // Keep the current inbox state when refresh fails.
    }
  }

  async function refreshDirectInbox() {
    if (!currentUser) {
      return;
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const inbox = await fetchFirebaseChatSnapshot(currentUser.id);
        const deliverableMessageIds = inbox.directMessages
          .filter((message) => message.senderId !== currentUser.id && !message.deliveredToUserIds.includes(currentUser.id))
          .map((message) => message.id);
        setDirectThreads(
          inbox.directThreads.filter(
            (thread) =>
              thread.participantIds.length === 2 &&
              thread.participantIds.includes(currentUser.id) &&
              canUsersMutuallyDirectMessage(users, thread.participantIds[0], thread.participantIds[1])
          )
        );
        setDirectMessages(applyDeliveredStateToMessages(inbox.directMessages, deliverableMessageIds, currentUser.id));
        await markFirebaseDirectMessagesDelivered(currentUser.id, deliverableMessageIds).catch(() => undefined);
      } catch {
        // Firestore listeners keep the current direct inbox if a manual refresh fails.
      }
      return;
    }

    if (!isAppApiConfigured()) {
      setDirectThreads((current) =>
        [...current]
          .filter(
            (thread) =>
              thread.participantIds.includes(currentUser.id) &&
              thread.participantIds.length === 2 &&
              canUsersMutuallyDirectMessage(users, thread.participantIds[0], thread.participantIds[1])
          )
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      );
      return;
    }

    if (!session?.token) {
      return;
    }

    try {
      const inbox = await fetchDirectInboxWithApi(session.token);
      setDirectThreads(inbox.threads.map(mapApiDirectThreadToMobile));
      setDirectMessages((current) =>
        mergeDirectMessages(
          current,
          inbox.messages.map((message) => mapApiDirectMessageToMobile(message, users.find((user) => user.id === message.senderId)))
        )
      );
      inbox.threads.forEach((thread) => {
        markDirectThreadDelivered(thread.id);
      });
    } catch {
      // Keep the current direct inbox when refresh fails.
    }
  }

  async function refreshMarketplaceInbox() {
    if (!session?.token) {
      return;
    }

    if (isFirebaseBackedSession(session) && currentUser) {
      try {
        const [chatSnapshot, communityCommerceSnapshot] = await Promise.all([
          fetchFirebaseChatSnapshot(currentUser.id),
          fetchFirebaseCommunityCommerceSnapshot(currentUser.id),
        ]);
        const deliverableMessageIds = chatSnapshot.marketplaceMessages
          .filter((message) => message.senderId !== currentUser.id && !message.deliveredToUserIds.includes(currentUser.id))
          .map((message) => message.id);
        setMarketplaceThreads(chatSnapshot.marketplaceThreads);
        setMarketplaceMessages(
          applyDeliveredStateToMessages(chatSnapshot.marketplaceMessages, deliverableMessageIds, currentUser.id)
        );
        setMarketplaceOrders(communityCommerceSnapshot.marketplaceOrders);
        await markFirebaseMarketplaceMessagesDelivered(currentUser.id, deliverableMessageIds).catch(() => undefined);
      } catch {
        // Firestore listeners keep the current marketplace inbox if a manual refresh fails.
      }
      return;
    }

    if (!isAppApiConfigured()) {
      setMarketplaceThreads((current) => [...current].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
      setMarketplaceOrders((current) => [...current].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
      return;
    }

    try {
      const inbox = await fetchMarketplaceInboxWithApi(session.token);
      setMarketplaceThreads(inbox.threads.map(mapApiMarketplaceThreadToMobile));
      setMarketplaceMessages((current) =>
        mergeMarketplaceMessages(
          current,
          inbox.messages.map((message) =>
            mapApiMarketplaceMessageToMobile(message, users.find((user) => user.id === message.senderId))
          )
        )
      );
      setMarketplaceOrders(inbox.orders.map(mapApiMarketplaceOrderToMobile));
      inbox.threads.forEach((thread) => {
        markMarketplaceThreadDelivered(thread.id);
      });
    } catch {
      // Keep the current marketplace inbox state when refresh fails.
    }
  }

  function markDirectThreadRead(threadId: string) {
    if (!currentUser) {
      return;
    }

    const readableMessageIds = directMessages
      .filter((message) => message.threadId === threadId && !message.seenByUserIds.includes(currentUser.id))
      .map((message) => message.id);

    setDirectMessages((current) =>
      current.map((message) =>
        message.threadId === threadId && !message.seenByUserIds.includes(currentUser.id)
          ? {
              ...message,
              deliveredToUserIds: addUniqueId(message.deliveredToUserIds, currentUser.id),
              seenByUserIds: addUniqueId(message.seenByUserIds, currentUser.id),
            }
          : message
      )
    );

    if (isFirebaseBackedSession(session)) {
      void markFirebaseDirectMessagesRead(currentUser.id, readableMessageIds).catch(() => undefined);
      return;
    }

    if (!isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitReadRealtime({ conversationType: "direct", threadId });
  }

  function markDirectThreadDelivered(threadId: string) {
    if (!currentUser) {
      return;
    }

    const deliverableMessageIds = directMessages
      .filter((message) => message.threadId === threadId && !message.deliveredToUserIds.includes(currentUser.id))
      .map((message) => message.id);

    setDirectMessages((current) =>
      current.map((message) =>
        message.threadId === threadId && !message.deliveredToUserIds.includes(currentUser.id)
          ? { ...message, deliveredToUserIds: addUniqueId(message.deliveredToUserIds, currentUser.id) }
          : message
      )
    );

    if (isFirebaseBackedSession(session)) {
      void markFirebaseDirectMessagesDelivered(currentUser.id, deliverableMessageIds).catch(() => undefined);
      return;
    }

    if (!isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitDeliveredRealtime({ conversationType: "direct", threadId });
  }

  function setDirectTyping(threadId: string, isTyping: boolean) {
    if (!currentUser || !isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitTypingRealtime({ conversationType: "direct", threadId, isTyping });
  }

  function markMarketplaceThreadRead(threadId: string) {
    if (!currentUser) {
      return;
    }

    const readableMessageIds = marketplaceMessages
      .filter((message) => message.threadId === threadId && !message.seenByUserIds.includes(currentUser.id))
      .map((message) => message.id);

    setMarketplaceMessages((current) =>
      current.map((message) =>
        message.threadId === threadId && !message.seenByUserIds.includes(currentUser.id)
          ? {
              ...message,
              deliveredToUserIds: addUniqueId(message.deliveredToUserIds, currentUser.id),
              seenByUserIds: addUniqueId(message.seenByUserIds, currentUser.id),
            }
          : message
      )
    );

    if (isFirebaseBackedSession(session)) {
      void markFirebaseMarketplaceMessagesRead(currentUser.id, readableMessageIds).catch(() => undefined);
      return;
    }

    if (!isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitReadRealtime({ conversationType: "marketplace", threadId });
  }

  function markMarketplaceThreadDelivered(threadId: string) {
    if (!currentUser) {
      return;
    }

    const deliverableMessageIds = marketplaceMessages
      .filter((message) => message.threadId === threadId && !message.deliveredToUserIds.includes(currentUser.id))
      .map((message) => message.id);

    setMarketplaceMessages((current) =>
      current.map((message) =>
        message.threadId === threadId && !message.deliveredToUserIds.includes(currentUser.id)
          ? { ...message, deliveredToUserIds: addUniqueId(message.deliveredToUserIds, currentUser.id) }
          : message
      )
    );

    if (isFirebaseBackedSession(session)) {
      void markFirebaseMarketplaceMessagesDelivered(currentUser.id, deliverableMessageIds).catch(() => undefined);
      return;
    }

    if (!isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitDeliveredRealtime({ conversationType: "marketplace", threadId });
  }

  function setMarketplaceTyping(threadId: string, isTyping: boolean) {
    if (!currentUser || !isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitTypingRealtime({ conversationType: "marketplace", threadId, isTyping });
  }

  function markCommunityChatRead(communityId: string) {
    if (!currentUser) {
      return;
    }

    const readableMessageIds = communityChatMessages
      .filter((message) => message.communityId === communityId && !message.seenByUserIds.includes(currentUser.id))
      .map((message) => message.id);

    setCommunityChatMessages((current) =>
      current.map((message) =>
        message.communityId === communityId && !message.seenByUserIds.includes(currentUser.id)
          ? {
              ...message,
              deliveredToUserIds: addUniqueId(message.deliveredToUserIds, currentUser.id),
              seenByUserIds: addUniqueId(message.seenByUserIds, currentUser.id),
            }
          : message
      )
    );

    if (isFirebaseBackedSession(session)) {
      void markFirebaseCommunityMessagesRead(currentUser.id, readableMessageIds).catch(() => undefined);
      return;
    }

    if (!isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitReadRealtime({ conversationType: "community", communityId });
  }

  function markCommunityChatDelivered(communityId: string) {
    if (!currentUser) {
      return;
    }

    const deliverableMessageIds = communityChatMessages
      .filter((message) => message.communityId === communityId && !message.deliveredToUserIds.includes(currentUser.id))
      .map((message) => message.id);

    setCommunityChatMessages((current) =>
      current.map((message) =>
        message.communityId === communityId && !message.deliveredToUserIds.includes(currentUser.id)
          ? { ...message, deliveredToUserIds: addUniqueId(message.deliveredToUserIds, currentUser.id) }
          : message
      )
    );

    if (isFirebaseBackedSession(session)) {
      void markFirebaseCommunityMessagesDelivered(currentUser.id, deliverableMessageIds).catch(() => undefined);
      return;
    }

    if (!isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitDeliveredRealtime({ conversationType: "community", communityId });
  }

  function setCommunityTyping(communityId: string, isTyping: boolean) {
    if (!currentUser || !isAppApiConfigured() || !isRealtimeConfigured()) {
      return;
    }

    emitTypingRealtime({ conversationType: "community", communityId, isTyping });
  }

  async function login(email: string, password: string) {
    if (isFirebaseProfilesConfigured()) {
      try {
        const response = await loginWithFirebaseProfile(email, password);
        const nextSession = {
          token: response.token,
          userId: response.user.id,
        };

        setSession(nextSession);
        setUsers((current) => withOwnedContent(upsertUser(current, response.user), reels, products));
        setStories(seedStories);
        setSavedPosts([]);
        setNotifications([]);
        setCommunities(seedCommunities);
        setCommunityPosts(seedCommunityPosts);
        setCommunityChatMessages(seedCommunityChatMessages);
        setCommunityTypingById({});
        setDirectThreads([]);
        setDirectMessages([]);
        setDirectTypingByThread({});
        setMarketplaceThreads([]);
        setMarketplaceMessages([]);
        setMarketplaceTypingByThread({});
        setMarketplaceOrders([]);
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.session, JSON.stringify(nextSession)],
          [STORAGE_KEYS.firebaseUser, JSON.stringify(response.user)],
        ]);
        await hydrateCatalogFromFirebase(response.user);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseProfileErrorMessage(error) };
      }
    }

    if (isAppApiConfigured()) {
      try {
        const response = await loginWithApi(email.trim(), password);
        const nextSession = {
          token: response.token,
          userId: response.user.id,
        };

        setSession(nextSession);
        await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(nextSession));
        setUsers((current) => {
          const nextUser = mapApiUserToMobile(response.user, {
            existing: current.find((item) => item.id === response.user.id),
          });
          return withOwnedContent(upsertUser(current, nextUser), reels, products);
        });
        await hydrateSessionFromApi(nextSession);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    const matchedUser = users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!matchedUser) {
      return { ok: false, message: "No user found with that email." };
    }

    const nextSession = {
      token: `viraflow-token-${matchedUser.id}`,
      userId: matchedUser.id,
    };

    setSession(nextSession);
    setStories(seedStories);
    setSavedPosts(seedSavedPosts.filter((item) => item.userId === matchedUser.id));
    setNotifications(seedNotifications.filter((item) => item.userId === matchedUser.id));
    setCommunities(seedCommunities);
    setCommunityPosts(seedCommunityPosts);
    setCommunityChatMessages(seedCommunityChatMessages);
    setCommunityTypingById({});
    const nextDirectThreads = seedDirectThreads.filter(
      (item) =>
        item.participantIds.includes(matchedUser.id) &&
        item.participantIds.length === 2 &&
        canUsersMutuallyDirectMessage(users, item.participantIds[0], item.participantIds[1])
    );
    setDirectThreads(nextDirectThreads);
    setDirectMessages(seedDirectMessages.filter((item) => nextDirectThreads.some((thread) => thread.id === item.threadId)));
    setDirectTypingByThread({});
    const nextThreads = seedMarketplaceThreads.filter(
      (item) => item.buyerId === matchedUser.id || item.sellerId === matchedUser.id
    );
    setMarketplaceThreads(nextThreads);
    setMarketplaceMessages(seedMarketplaceMessages.filter((item) => nextThreads.some((thread) => thread.id === item.threadId)));
    setMarketplaceTypingByThread({});
    setMarketplaceOrders(
      seedMarketplaceOrders.filter((item) => item.buyerId === matchedUser.id || item.sellerId === matchedUser.id)
    );
    await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(nextSession));
    return { ok: true };
  }

  async function register(payload: RegisterPayload) {
    if (isFirebaseProfilesConfigured()) {
      try {
        const response = await registerWithFirebaseProfile(payload, language ?? "en");
        const nextSession = {
          token: response.token,
          userId: response.user.id,
        };

        setSession(nextSession);
        setUsers((current) => withOwnedContent(upsertUser(current, response.user), reels, products));
        setStories(seedStories);
        setSavedPosts([]);
        setNotifications([]);
        setCommunities(seedCommunities);
        setCommunityPosts(seedCommunityPosts);
        setCommunityChatMessages(seedCommunityChatMessages);
        setCommunityTypingById({});
        setDirectThreads([]);
        setDirectMessages([]);
        setDirectTypingByThread({});
        setMarketplaceThreads([]);
        setMarketplaceMessages([]);
        setMarketplaceTypingByThread({});
        setMarketplaceOrders([]);
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.session, JSON.stringify(nextSession)],
          [STORAGE_KEYS.firebaseUser, JSON.stringify(response.user)],
        ]);
        await hydrateCatalogFromFirebase(response.user);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseProfileErrorMessage(error) };
      }
    }

    if (isAppApiConfigured()) {
      try {
        const response = await registerWithApi({
          ...payload,
          language: language ?? "en",
        });
        const nextSession = {
          token: response.token,
          userId: response.user.id,
        };

        setSession(nextSession);
        await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(nextSession));
        setUsers((current) => {
          const nextUser = mapApiUserToMobile(response.user, {
            existing: current.find((item) => item.id === response.user.id),
            planType: "free",
          });
          return withOwnedContent(upsertUser(current, nextUser), reels, products);
        });
        await hydrateSessionFromApi(nextSession);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    const alreadyExists = users.some(
      (item) =>
        item.email.toLowerCase() === payload.email.trim().toLowerCase() ||
        item.username.toLowerCase() === payload.username.trim().toLowerCase()
    );

    if (alreadyExists) {
      return { ok: false, message: "That email or username is already in use." };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: payload.name.trim(),
      username: payload.username.trim().replace(/\s+/g, "").toLowerCase(),
      email: payload.email.trim().toLowerCase(),
      profileImage:
        "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=400&q=80",
      bio: "New creator on ViraFlow.",
      headline: "Creator in progress",
      language: language ?? "en",
      planType: "free",
      followers: [],
      following: [],
      reelIds: [],
      productIds: [],
    };

    setUsers((current) => [newUser, ...current]);

    const nextSession = {
      token: `viraflow-token-${newUser.id}`,
      userId: newUser.id,
    };

    setSession(nextSession);
    setStories(seedStories);
    setSavedPosts([]);
    setNotifications([]);
    setCommunities(seedCommunities);
    setCommunityPosts(seedCommunityPosts);
    setCommunityChatMessages(seedCommunityChatMessages);
    setCommunityTypingById({});
    setDirectThreads([]);
    setDirectMessages([]);
    setDirectTypingByThread({});
    setMarketplaceThreads([]);
    setMarketplaceMessages([]);
    setMarketplaceTypingByThread({});
    setMarketplaceOrders([]);
    await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(nextSession));
    return { ok: true };
  }

  async function logout() {
    if (isFirebaseProfilesConfigured()) {
      await logoutFromFirebaseProfile().catch(() => {
        // Local app state still needs to clear even if Firebase is already signed out.
      });
    }

    setSession(null);
    setStories(seedStories);
    setSavedPosts([]);
    setNotifications([]);
    setCommunities(seedCommunities);
    setCommunityPosts(seedCommunityPosts);
    setCommunityChatMessages(seedCommunityChatMessages);
    setCommunityTypingById({});
    setDirectThreads(seedDirectThreads);
    setDirectMessages(seedDirectMessages);
    setDirectTypingByThread({});
    setMarketplaceThreads(seedMarketplaceThreads);
    setMarketplaceMessages(seedMarketplaceMessages);
    setMarketplaceTypingByThread({});
    setMarketplaceOrders(seedMarketplaceOrders);
    await AsyncStorage.multiRemove([STORAGE_KEYS.session, STORAGE_KEYS.firebaseUser]);
  }

  async function toggleLike(reelId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before liking a reel." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const updatedReel = await toggleFirebaseReelLike(currentUser.id, reelId, reels.find((item) => item.id === reelId));
        setReels((current) => upsertReel(current, updatedReel));
        if (updatedReel.likedBy.includes(currentUser.id)) {
          await publishFirebaseNotification({
            userId: updatedReel.userId,
            type: "like",
            title: `${currentUser.name} liked your reel`,
            body: `"${truncateForNotification(updatedReel.caption)}"`,
            actor: currentUser,
            entityType: "reel",
            entityId: updatedReel.id,
            dedupeId: `like-${currentUser.id}-${updatedReel.id}`,
          }).catch(() => undefined);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseEngagementErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      setReels((current) =>
        current.map((reel) => {
          if (reel.id !== reelId) {
            return reel;
          }

          const hasLiked = reel.likedBy.includes(currentUser.id);
          return {
            ...reel,
            likedBy: hasLiked
              ? reel.likedBy.filter((item) => item !== currentUser.id)
              : [currentUser.id, ...reel.likedBy],
          };
        })
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const updatedReel = await toggleLikeWithApi(session.token, reelId);
      const nextReel = mapApiReelToMobile(updatedReel, reels.find((item) => item.id === updatedReel.id));
      setReels((current) => upsertReel(current, nextReel));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function repostReel(reelId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before reposting a reel." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const updatedReel = await repostFirebaseReel(currentUser.id, reelId, reels.find((item) => item.id === reelId));
        setReels((current) => upsertReel(current, updatedReel));
        await publishFirebaseNotification({
          userId: updatedReel.userId,
          type: "repost",
          title: `${currentUser.name} reposted your reel`,
          body: `"${truncateForNotification(updatedReel.caption)}"`,
          actor: currentUser,
          entityType: "reel",
          entityId: updatedReel.id,
          dedupeId: `repost-${currentUser.id}-${updatedReel.id}`,
        }).catch(() => undefined);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseEngagementErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      setReels((current) =>
        current.map((reel) => (reel.id === reelId ? { ...reel, repostCount: reel.repostCount + 1 } : reel))
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const updatedReel = await repostReelWithApi(session.token, reelId);
      const nextReel = mapApiReelToMobile(updatedReel, reels.find((item) => item.id === updatedReel.id));
      setReels((current) => upsertReel(current, nextReel));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function addComment(reelId: string, text: string) {
    if (!currentUser || !text.trim()) {
      return { ok: false, message: "Comment is empty." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([text])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      try {
        const newComment = await addFirebaseReelComment(reelId, currentUser, text);
        setComments((current) => mergeCommentsById([newComment], current));
        const targetReel = reels.find((item) => item.id === reelId);
        if (targetReel) {
          await publishFirebaseNotification({
            userId: targetReel.userId,
            type: "comment",
            title: `${currentUser.name} commented on your reel`,
            body: truncateForNotification(text),
            actor: currentUser,
            entityType: "reel",
            entityId: reelId,
          }).catch(() => undefined);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseEngagementErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([text])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const newComment: ReelComment = {
        id: `comment-${Date.now()}`,
        reelId,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.profileImage,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };

      setComments((current) => [newComment, ...current]);
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const created = await createCommentWithApi(session.token, reelId, text);
      const newComment: ReelComment = {
        id: created.id,
        reelId: created.reelId,
        userId: created.userId,
        userName: created.author?.name || currentUser.name,
        userAvatar: created.author?.profileImage || currentUser.profileImage,
        text: created.text,
        createdAt: created.createdAt,
      };

      setComments((current) => [newComment, ...current.filter((item) => item.id !== newComment.id)]);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function toggleFollow(targetUserId: string) {
    if (!currentUser || currentUser.id === targetUserId) {
      return { ok: false, message: "You can only follow other creators." };
    }

    if (isFirebaseBackedSession(session)) {
      const targetUser = users.find((item) => item.id === targetUserId);
      if (!targetUser) {
        return { ok: false, message: "Creator not found." };
      }

      try {
        const response = await toggleFirebaseFollow(currentUser, targetUser);
        setUsers((current) => mergeUsersById([response.viewer, response.target], current));
        if (response.following) {
          await publishFirebaseNotification({
            userId: targetUser.id,
            type: "follow",
            title: `${currentUser.name} followed you`,
            body: "You have a new follower on ViraFlow.",
            actor: currentUser,
            dedupeId: `follow-${currentUser.id}-${targetUser.id}`,
          }).catch(() => undefined);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseEngagementErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      const isFollowing = currentUser.following.includes(targetUserId);
      setUsers((current) => applyFollowState(current, currentUser.id, targetUserId, !isFollowing));
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await toggleFollowWithApi(session.token, targetUserId);
      setUsers((current) =>
        applyFollowState(current, currentUser.id, targetUserId, response.result.following, response.targetUser)
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function markAllNotificationsRead() {
    if (!currentUser) {
      return { ok: false, message: "Login required before updating notifications." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const nextNotifications = await markAllFirebaseNotificationsRead(currentUser.id);
        setNotifications(nextNotifications);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseInboxErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.userId === currentUser.id && !notification.readAt
            ? {
                ...notification,
                readAt,
              }
            : notification
        )
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const nextNotifications = await markAllNotificationsReadWithApi(session.token);
      setNotifications(nextNotifications.map(mapApiNotificationToMobile));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function toggleSaveReel(reelId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before saving a reel." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const response = await toggleFirebaseSavedPost(currentUser.id, "reel", reelId);
        setSavedPosts((current) =>
          response.saved && response.savedPost
            ? upsertSavedPost(current, response.savedPost)
            : current.filter((item) => !(item.entityType === "reel" && item.entityId === reelId && item.userId === currentUser.id))
        );
        return { ok: true, saved: response.saved };
      } catch (error) {
        return { ok: false, message: getFirebaseInboxErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      const result = toggleLocalSavedPost(savedPosts, currentUser.id, "reel", reelId);
      setSavedPosts(result.savedPosts);
      return { ok: true, saved: result.saved };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await toggleSaveReelWithApi(session.token, reelId);
      const nextSavedPosts = response.saved
        ? upsertSavedPost(savedPosts, response.savedPost ? mapApiSavedPostToMobile(response.savedPost) : undefined)
        : savedPosts.filter((item) => !(item.entityType === "reel" && item.entityId === reelId && item.userId === currentUser.id));
      setSavedPosts(nextSavedPosts);
      return { ok: true, saved: response.saved };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function toggleSaveProduct(productId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before saving a product." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const response = await toggleFirebaseSavedPost(currentUser.id, "product", productId);
        setSavedPosts((current) =>
          response.saved && response.savedPost
            ? upsertSavedPost(current, response.savedPost)
            : current.filter((item) => !(item.entityType === "product" && item.entityId === productId && item.userId === currentUser.id))
        );
        return { ok: true, saved: response.saved };
      } catch (error) {
        return { ok: false, message: getFirebaseInboxErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      const result = toggleLocalSavedPost(savedPosts, currentUser.id, "product", productId);
      setSavedPosts(result.savedPosts);
      return { ok: true, saved: result.saved };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await toggleSaveProductWithApi(session.token, productId);
      const nextSavedPosts = response.saved
        ? upsertSavedPost(savedPosts, response.savedPost ? mapApiSavedPostToMobile(response.savedPost) : undefined)
        : savedPosts.filter((item) => !(item.entityType === "product" && item.entityId === productId && item.userId === currentUser.id));
      setSavedPosts(nextSavedPosts);
      return { ok: true, saved: response.saved };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function updateProductListingStatus(productId: string, listingStatus: Product["listingStatus"]) {
    if (!currentUser) {
      return { ok: false, message: "Login required before updating a product." };
    }

    const targetProduct = products.find((item) => item.id === productId);
    if (!targetProduct) {
      return { ok: false, message: "Product not found." };
    }

    if (targetProduct.userId !== currentUser.id) {
      return { ok: false, message: "You can only manage your own listing." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const updated = await updateFirebaseProductListingStatus(currentUser.id, productId, listingStatus);
        setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      setProducts((current) =>
        current.map((product) =>
          product.id === productId
            ? {
                ...product,
                listingStatus,
              }
            : product
        )
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const updated = await updateProductListingStatusWithApi(session.token, productId, listingStatus);
      const nextProduct = mapApiProductToMobile(updated, products.find((item) => item.id === updated.id));
      setProducts((current) => current.map((item) => (item.id === nextProduct.id ? nextProduct : item)));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function startDirectChat(targetUserId: string) {
    if (!currentUser || currentUser.id === targetUserId) {
      return { ok: false, message: "You can only start a direct chat with another creator." };
    }

    const targetUser = users.find((item) => item.id === targetUserId);
    if (!targetUser) {
      return { ok: false, message: "Creator not found." };
    }

    if (!canUsersMutuallyDirectMessage(users, currentUser.id, targetUserId)) {
      return { ok: false, message: "Direct chat unlocks only after both of you follow each other." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const response = await startFirebaseDirectChat(currentUser, targetUser);
        setDirectThreads((current) => upsertDirectThread(current, response.thread));
        setDirectMessages((current) => mergeDirectMessages(current, response.messages));
        return { ok: true, threadId: response.thread.id };
      } catch (error) {
        return { ok: false, message: getFirebaseChatErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      const existingThread = directThreads.find(
        (thread) => thread.participantIds.includes(currentUser.id) && thread.participantIds.includes(targetUserId)
      );
      if (existingThread) {
        return { ok: true, threadId: existingThread.id };
      }

      const createdAt = new Date().toISOString();
      const nextThread: DirectChatThread = {
        id: `direct-thread-${Date.now()}`,
        participantIds: [currentUser.id, targetUserId],
        createdAt,
        updatedAt: createdAt,
        lastMessagePreview: "Conversation started",
        lastMessageAt: createdAt,
      };

      setDirectThreads((current) => [nextThread, ...current]);
      return { ok: true, threadId: nextThread.id };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await startDirectChatWithApi(session.token, targetUserId);
      const nextThread = mapApiDirectThreadToMobile(response.thread);
      setDirectThreads((current) => upsertDirectThread(current, nextThread));
      setDirectMessages((current) =>
        mergeDirectMessages(
          current,
          response.messages.map((message) => mapApiDirectMessageToMobile(message, users.find((user) => user.id === message.senderId)))
        )
      );
      return { ok: true, threadId: nextThread.id };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function openDirectThread(threadId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before opening direct chat." };
    }

    const existingThread = directThreads.find((item) => item.id === threadId);
    if (isFirebaseBackedSession(session)) {
      try {
        const response = await fetchFirebaseDirectThread(currentUser.id, threadId);
        if (
          response.thread.participantIds.length !== 2 ||
          !response.thread.participantIds.includes(currentUser.id) ||
          !canUsersMutuallyDirectMessage(users, response.thread.participantIds[0], response.thread.participantIds[1])
        ) {
          return { ok: false, message: "Direct chat is locked until both users follow each other." };
        }

        setDirectThreads((current) => upsertDirectThread(current, response.thread));
        setDirectMessages((current) => mergeDirectMessages(current, response.messages));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseChatErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (!existingThread) {
        return { ok: false, message: "Conversation not found." };
      }

      if (
        existingThread.participantIds.length !== 2 ||
        !existingThread.participantIds.includes(currentUser.id) ||
        !canUsersMutuallyDirectMessage(users, existingThread.participantIds[0], existingThread.participantIds[1])
      ) {
        return { ok: false, message: "Direct chat is locked until both users follow each other." };
      }

      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await fetchDirectThreadWithApi(session.token, threadId);
      const nextThread = mapApiDirectThreadToMobile(response.thread);
      setDirectThreads((current) => upsertDirectThread(current, nextThread));
      setDirectMessages((current) =>
        mergeDirectMessages(
          current,
          response.messages.map((message) => mapApiDirectMessageToMobile(message, users.find((user) => user.id === message.senderId)))
        )
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function sendDirectMessage(threadId: string, text: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before sending a direct message." };
    }

    if (!text.trim()) {
      return { ok: false, message: "Message is empty." };
    }

    const targetThread = directThreads.find((item) => item.id === threadId);
    if (!targetThread) {
      return { ok: false, message: "Conversation not found." };
    }

    const counterpartId = targetThread.participantIds.find((participantId) => participantId !== currentUser.id);
    if (!counterpartId || !canUsersMutuallyDirectMessage(users, currentUser.id, counterpartId)) {
      return { ok: false, message: "Direct chat is locked until both users follow each other." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([text])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      try {
        const response = await sendFirebaseDirectMessage(targetThread, currentUser, text);
        setDirectThreads((current) => upsertDirectThread(current, response.thread));
        setDirectMessages((current) => mergeDirectMessages(current, [response.message]));
        await publishFirebaseNotification({
          userId: counterpartId,
          type: "message",
          title: `${currentUser.name} sent you a message`,
          body: truncateForNotification(text),
          actor: currentUser,
          conversationId: response.thread.id,
          conversationType: "direct",
        }).catch(() => undefined);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseChatErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([text])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const createdAt = new Date().toISOString();
      const nextMessage: DirectChatMessage = {
        id: `direct-message-${Date.now()}`,
        threadId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.profileImage,
        text: text.trim(),
        createdAt,
        deliveredToUserIds: [currentUser.id],
        seenByUserIds: [currentUser.id],
      };

      setDirectMessages((current) => mergeDirectMessages(current, [nextMessage]));
      setDirectThreads((current) =>
        current
          .map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  updatedAt: createdAt,
                  lastMessageAt: createdAt,
                  lastMessagePreview: nextMessage.text,
                }
              : thread
          )
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await sendDirectMessageWithApi(session.token, threadId, text);
      const nextThread = mapApiDirectThreadToMobile(response.thread);
      const nextMessage = mapApiDirectMessageToMobile(
        response.message,
        users.find((user) => user.id === response.message.senderId)
      );
      setDirectThreads((current) => upsertDirectThread(current, nextThread));
      setDirectMessages((current) => mergeDirectMessages(current, [nextMessage]));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function startMarketplaceChat(productId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before messaging a seller." };
    }

    const product = products.find((item) => item.id === productId);
    if (!product) {
      return { ok: false, message: "Product not found." };
    }

    if (product.userId === currentUser.id) {
      return { ok: false, message: "You cannot open a buyer chat for your own listing." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const response = await startFirebaseMarketplaceChat(currentUser, product);
        setMarketplaceThreads((current) => upsertMarketplaceThread(current, response.thread));
        setMarketplaceMessages((current) => mergeMarketplaceMessages(current, response.messages));
        return { ok: true, threadId: response.thread.id };
      } catch (error) {
        return { ok: false, message: getFirebaseChatErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      const existingThread = marketplaceThreads.find(
        (thread) =>
          thread.productId === productId &&
          thread.buyerId === currentUser.id &&
          thread.sellerId === product.userId
      );
      if (existingThread) {
        return { ok: true, threadId: existingThread.id };
      }

      const createdAt = new Date().toISOString();
      const nextThread: MarketplaceChatThread = {
        id: `thread-${Date.now()}`,
        productId,
        buyerId: currentUser.id,
        sellerId: product.userId,
        createdAt,
        updatedAt: createdAt,
        lastMessagePreview: "Conversation started",
        lastMessageAt: createdAt,
      };
      setMarketplaceThreads((current) => [nextThread, ...current]);
      return { ok: true, threadId: nextThread.id };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await startMarketplaceChatWithApi(session.token, productId);
      const nextThread = mapApiMarketplaceThreadToMobile(response.thread);
      setMarketplaceThreads((current) => upsertMarketplaceThread(current, nextThread));
      setMarketplaceMessages((current) =>
        mergeMarketplaceMessages(
          current,
          response.messages.map((message) =>
            mapApiMarketplaceMessageToMobile(message, users.find((user) => user.id === message.senderId))
          )
        )
      );
      return { ok: true, threadId: nextThread.id };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function openMarketplaceThread(threadId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before opening marketplace chat." };
    }

    const existingThread = marketplaceThreads.find((item) => item.id === threadId);
    if (isFirebaseBackedSession(session)) {
      try {
        const response = await fetchFirebaseMarketplaceThread(currentUser.id, threadId);
        setMarketplaceThreads((current) => upsertMarketplaceThread(current, response.thread));
        setMarketplaceMessages((current) => mergeMarketplaceMessages(current, response.messages));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseChatErrorMessage(error) };
      }
    }

    if (!existingThread) {
      return { ok: false, message: "Conversation not found." };
    }

    if (!isAppApiConfigured()) {
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await fetchMarketplaceThreadWithApi(session.token, threadId);
      const nextThread = mapApiMarketplaceThreadToMobile(response.thread);
      setMarketplaceThreads((current) => upsertMarketplaceThread(current, nextThread));
      setMarketplaceMessages((current) =>
        mergeMarketplaceMessages(
          current,
          response.messages.map((message) =>
            mapApiMarketplaceMessageToMobile(message, users.find((user) => user.id === message.senderId))
          )
        )
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function sendMarketplaceMessage(threadId: string, text: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before sending a marketplace message." };
    }

    if (!text.trim()) {
      return { ok: false, message: "Message is empty." };
    }

    const targetThread = marketplaceThreads.find((item) => item.id === threadId);
    if (!targetThread) {
      return { ok: false, message: "Conversation not found." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([text])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      try {
        const response = await sendFirebaseMarketplaceMessage(targetThread, currentUser, text);
        const counterpartId = currentUser.id === targetThread.buyerId ? targetThread.sellerId : targetThread.buyerId;
        setMarketplaceThreads((current) => upsertMarketplaceThread(current, response.thread));
        setMarketplaceMessages((current) => mergeMarketplaceMessages(current, [response.message]));
        await publishFirebaseNotification({
          userId: counterpartId,
          type: "message",
          title: `${currentUser.name} sent a marketplace message`,
          body: truncateForNotification(text),
          actor: currentUser,
          conversationId: response.thread.id,
          conversationType: "marketplace",
        }).catch(() => undefined);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseChatErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([text])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const createdAt = new Date().toISOString();
      const nextMessage: MarketplaceChatMessage = {
        id: `message-${Date.now()}`,
        threadId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.profileImage,
        text: text.trim(),
        createdAt,
        deliveredToUserIds: [currentUser.id],
        seenByUserIds: [currentUser.id],
      };

      setMarketplaceMessages((current) => [...current, nextMessage]);
      setMarketplaceThreads((current) =>
        current
          .map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  updatedAt: createdAt,
                  lastMessageAt: createdAt,
                  lastMessagePreview: nextMessage.text,
                }
              : thread
          )
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await sendMarketplaceMessageWithApi(session.token, threadId, text);
      const nextThread = mapApiMarketplaceThreadToMobile(response.thread);
      const nextMessage = mapApiMarketplaceMessageToMobile(
        response.message,
        users.find((user) => user.id === response.message.senderId)
      );
      setMarketplaceThreads((current) => upsertMarketplaceThread(current, nextThread));
      setMarketplaceMessages((current) => mergeMarketplaceMessages(current, [nextMessage]));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function createMarketplaceOrder(payload: CreateMarketplaceOrderPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before checking out." };
    }

    const product = products.find((item) => item.id === payload.productId);
    if (!product) {
      return { ok: false, message: "Product not found." };
    }

    if (product.userId === currentUser.id) {
      return { ok: false, message: "You cannot buy your own listing." };
    }

    if (product.listingStatus !== "available") {
      return { ok: false, message: "This listing is no longer available for checkout." };
    }

    if (payload.deliveryMethod === "shipping" && !payload.shippingAddress?.trim()) {
      return { ok: false, message: "Shipping address is required for shipping orders." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([payload.buyerNote])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      try {
        const threadResult = await startMarketplaceChat(payload.productId);
        if (!threadResult.ok || !threadResult.threadId) {
          return { ok: false, message: threadResult.message ?? "Could not start marketplace chat." };
        }

        const response = await createFirebaseMarketplaceOrder(currentUser, payload);
        setMarketplaceOrders((current) => upsertMarketplaceOrder(current, response.order));
        setProducts((current) => current.map((item) => (item.id === response.product.id ? response.product : item)));
        await publishFirebaseNotification({
          userId: product.userId,
          type: "order",
          title: `${currentUser.name} placed an order`,
          body: truncateForNotification(product.title),
          actor: currentUser,
          entityType: "product",
          entityId: product.id,
          conversationId: threadResult.threadId,
          conversationType: "marketplace",
        }).catch(() => undefined);
        const orderMessage = payload.buyerNote?.trim()
          ? `I placed an order for this item. Note: ${payload.buyerNote.trim()}`
          : "I placed an order for this item.";
        await sendMarketplaceMessage(threadResult.threadId, orderMessage);
        return { ok: true, threadId: threadResult.threadId };
      } catch (error) {
        return { ok: false, message: getFirebaseCommunityCommerceErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([payload.buyerNote])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const threadResult = await startMarketplaceChat(payload.productId);
      if (!threadResult.ok || !threadResult.threadId) {
        return { ok: false, message: threadResult.message ?? "Could not start marketplace chat." };
      }

      const createdAt = new Date().toISOString();
      const nextOrder: MarketplaceOrder = {
        id: `order-${Date.now()}`,
        productId: payload.productId,
        buyerId: currentUser.id,
        sellerId: product.userId,
        amountUsd: product.price,
        deliveryMethod: payload.deliveryMethod,
        paymentMethod: payload.paymentMethod,
        shippingAddress: payload.shippingAddress?.trim() || undefined,
        buyerNote: payload.buyerNote?.trim() || undefined,
        status: payload.paymentMethod === "card" ? "paid" : "placed",
        createdAt,
      };

      setMarketplaceOrders((current) => [nextOrder, ...current]);
      setProducts((current) =>
        current.map((item) =>
          item.id === payload.productId
            ? {
                ...item,
                listingStatus: "pending",
              }
            : item
        )
      );
      const orderMessage = payload.buyerNote?.trim()
        ? `I placed an order for this item. Note: ${payload.buyerNote.trim()}`
        : "I placed an order for this item.";
      await sendMarketplaceMessage(threadResult.threadId, orderMessage);
      return { ok: true, threadId: threadResult.threadId };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await createMarketplaceOrderWithApi(session.token, payload);
      const nextOrder = mapApiMarketplaceOrderToMobile(response.order);
      const nextThread = mapApiMarketplaceThreadToMobile(response.thread);
      setMarketplaceOrders((current) => upsertMarketplaceOrder(current, nextOrder));
      setMarketplaceThreads((current) => upsertMarketplaceThread(current, nextThread));
      if (response.product) {
        const nextProduct = mapApiProductToMobile(response.product, products.find((item) => item.id === response.product?.id));
        setProducts((current) => current.map((item) => (item.id === nextProduct.id ? nextProduct : item)));
      }
      await openMarketplaceThread(nextThread.id);
      return { ok: true, threadId: nextThread.id };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function createStory(payload: CreateStoryPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before posting a story." };
    }

    if (!payload.imageUrl.trim()) {
      return { ok: false, message: "Pick a story photo first." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([payload.caption])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      if (!session?.token) {
        return { ok: false, message: "Firebase session missing. Please log in again." };
      }

      try {
        const token = (await getCurrentFirebaseIdToken().catch(() => null)) ?? session.token;
        const imageUrl = await uploadImageSourceForFirebaseContent({
          token,
          source: payload.imageUrl,
          folder: "stories",
          publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-story`),
          label: "story image",
        });
        const story = await createFirebaseStory(currentUser.id, {
          ...payload,
          imageUrl,
        });

        setStories((current) => [story, ...filterActiveStories(current.filter((item) => item.id !== story.id))]);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([payload.caption])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const now = new Date();
      const story: Story = {
        id: `story-${Date.now()}`,
        userId: currentUser.id,
        imageUrl: payload.imageUrl.trim(),
        caption: payload.caption?.trim() || undefined,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };

      setStories((current) => [story, ...filterActiveStories(current)]);
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const created = await createStoryWithApi(session.token, payload);
      const nextStory = mapApiStoryToMobile(created);
      setStories((current) => [nextStory, ...filterActiveStories(current.filter((item) => item.id !== nextStory.id))]);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function createReel(payload: CreateReelPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before posting a reel." };
    }

    if (!payload.videoUrl.trim()) {
      return { ok: false, message: "Pick or paste a reel video first." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([payload.caption, payload.videoUrl, payload.thumbnailUrl])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      if (!session?.token) {
        return { ok: false, message: "Firebase session missing. Please log in again." };
      }

      try {
        const token = (await getCurrentFirebaseIdToken().catch(() => null)) ?? session.token;
        const uploadedVideo = await uploadVideoSourceForFirebaseContent({
          token,
          source: payload.videoUrl,
          mimeType: payload.videoMimeType,
          fileName: payload.videoFileName,
          durationSeconds: payload.videoDurationSeconds,
          publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-reel`),
        });
        const thumbnailUrl = payload.thumbnailUrl.trim()
          ? await uploadImageSourceForFirebaseContent({
              token,
              source: payload.thumbnailUrl,
              folder: "reels",
              publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-reel-thumb`),
              label: "reel thumbnail",
              mimeType: payload.thumbnailMimeType,
              fileName: payload.thumbnailFileName,
            })
          : uploadedVideo.thumbnailUrl;
        const newReel = await createFirebaseReel(currentUser.id, {
          ...payload,
          videoUrl: uploadedVideo.videoUrl,
          thumbnailUrl,
        });
        const nextReels = [newReel, ...reels.filter((item) => item.id !== newReel.id)];

        setReels(nextReels);
        setUsers((current) => withOwnedContent(upsertUser(current, currentUser), nextReels, products));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([payload.caption, payload.videoUrl, payload.thumbnailUrl])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const newReel: Reel = {
        id: `reel-${Date.now()}`,
        userId: currentUser.id,
        videoUrl: payload.videoUrl.trim(),
        caption: payload.caption.trim(),
        thumbnailUrl:
          payload.thumbnailUrl.trim() ||
          "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=80",
        createdAt: new Date().toISOString(),
        tags: ["new", "creator"],
        likedBy: [],
        repostCount: 0,
        viewCount: 120,
        reachCount: 520,
      };

      const nextReels = [newReel, ...reels];
      setReels(nextReels);
      setUsers((current) =>
        withOwnedContent(
          current.map((user) =>
            user.id === currentUser.id ? { ...user, reelIds: [newReel.id, ...user.reelIds] } : user
          ),
          nextReels,
          products
        )
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const created = await createReelWithApi(session.token, payload);
      const nextReel = mapApiReelToMobile(created, reels.find((item) => item.id === created.id));
      const nextReels = [nextReel, ...reels.filter((item) => item.id !== nextReel.id)];
      setReels(nextReels);
      setUsers((current) => {
        const creatorSource =
          created.creator ??
          {
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.username,
            email: currentUser.email,
            profileImage: currentUser.profileImage,
            bio: currentUser.bio,
            headline: currentUser.headline,
            language: currentUser.language,
          };
        const nextCreator = mapApiUserToMobile(creatorSource, {
          existing: current.find((item) => item.id === creatorSource.id),
          planType: currentUser.planType,
          followers: currentUser.followers,
          following: currentUser.following,
        });

        return withOwnedContent(upsertUser(current, nextCreator), nextReels, products);
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function subscribeToPlan(planType: PlanType) {
    if (!currentUser) {
      return { ok: false, message: "Login required before activating a subscription." };
    }

    if (planType === "free") {
      return { ok: false, message: "Choose a premium plan to activate subscriber features." };
    }

    if (isAppApiConfigured()) {
      if (!session?.token) {
        return { ok: false, message: "Backend session missing. Please log in again." };
      }

      try {
        const response = await createSubscriptionCheckoutSessionWithApi(session.token, planType);
        await openCheckoutUrl(response.checkoutUrl);
        return {
          ok: true,
          message: `Secure Stripe checkout opened. Your ${planType} plan will activate automatically after payment is confirmed.`,
        };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const response = await activateFirebaseSubscription(currentUser, planType);
        setActiveSubscription(response.subscription);
        setUsers((current) => withOwnedContent(upsertUser(current, response.user), reels, products));
        await persistCurrentFirebaseUser(response.user);
        await publishFirebaseNotification({
          userId: currentUser.id,
          type: "system",
          title: `${response.subscription.planType} plan active`,
          body: response.subscription.endsAt
            ? `Premium access is live until ${new Date(response.subscription.endsAt).toLocaleString()}.`
            : "Premium access is now active on your account.",
          dedupeId: `subscription-${currentUser.id}-${response.subscription.planType}`,
        }).catch(() => undefined);
        return { ok: true, subscription: response.subscription };
      } catch (error) {
        return { ok: false, message: getFirebaseMonetizationErrorMessage(error) };
      }
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + (planType === "weekly" ? 7 : planType === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000);
    const nextSubscription: AppSubscription = {
      id: `subscription-${currentUser.id}`,
      userId: currentUser.id,
      planType,
      status: "active",
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      autoRenew: true,
    };
    const nextUser = {
      ...currentUser,
      planType,
    };

    setActiveSubscription(nextSubscription);
    setUsers((current) => withOwnedContent(upsertUser(current, nextUser), reels, products));
    return { ok: true, subscription: nextSubscription };
  }

  async function boostReel(payload: CreateReelBoostPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before boosting a reel." };
    }

    const targetReel = reels.find((item) => item.id === payload.reelId);
    if (!targetReel) {
      return { ok: false, message: "Reel not found." };
    }

    if (targetReel.userId !== currentUser.id) {
      return { ok: false, message: "You can only boost your own reels." };
    }

    const existingBoost = reelBoosts.find((item) => item.reelId === payload.reelId && item.status === "active");
    if (existingBoost) {
      return { ok: false, message: "This reel already has an active boost running." };
    }

    const selectedPlan = reelBoostPlans.find((item) => item.id === payload.planId);
    if (!selectedPlan) {
      return { ok: false, message: "Boost plan not found." };
    }

    if (isAppApiConfigured()) {
      if (!session?.token) {
        return { ok: false, message: "Backend session missing. Please log in again." };
      }

      try {
        const response = await createBoostCheckoutSessionWithApi(session.token, payload);
        await openCheckoutUrl(response.checkoutUrl);
        return {
          ok: true,
          message: `${selectedPlan.title} checkout opened. Your boost will go live automatically after Stripe confirms payment.`,
        };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const response = await createFirebaseReelBoost(currentUser, targetReel, selectedPlan);
        setReelBoosts((current) => upsertBoost(current, response.boost));
        setReels((current) => upsertReel(current, response.reel));
        await publishFirebaseNotification({
          userId: currentUser.id,
          type: "boost",
          title: `${selectedPlan.title} boost is live`,
          body: `${selectedPlan.estimatedViews.toLocaleString()} extra views and ${selectedPlan.estimatedReach.toLocaleString()} extra reach are now running for this reel.`,
          entityType: "reel",
          entityId: targetReel.id,
          dedupeId: `boost-${response.boost.id}`,
        }).catch(() => undefined);
        return { ok: true, boost: response.boost };
      } catch (error) {
        return { ok: false, message: getFirebaseMonetizationErrorMessage(error) };
      }
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);
    const boost: ReelBoostCampaign = {
      id: `boost-${Date.now()}`,
      reelId: payload.reelId,
      userId: currentUser.id,
      planId: selectedPlan.id,
      planTitle: selectedPlan.title,
      amountUsd: selectedPlan.budgetUsd,
      estimatedViews: selectedPlan.estimatedViews,
      estimatedReach: selectedPlan.estimatedReach,
      status: "active",
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      targetAudience: currentUser.headline || "Short-form viewers who engage with creator-led content.",
      note: "Your ad campaign is live and pushing this reel to more high-fit viewers now.",
    };

    setReelBoosts((current) => [boost, ...current]);
    setReels((current) =>
      current.map((reel) =>
        reel.id === payload.reelId
          ? {
              ...reel,
              viewCount: reel.viewCount + selectedPlan.estimatedViews,
              reachCount: reel.reachCount + selectedPlan.estimatedReach,
            }
          : reel
      )
    );

    return { ok: true, boost };
  }

  async function createProduct(payload: CreateProductPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before posting a product." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([payload.title, payload.description, payload.category, payload.location, ...payload.imageUrls])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      if (!session?.token) {
        return { ok: false, message: "Firebase session missing. Please log in again." };
      }

      try {
        const token = (await getCurrentFirebaseIdToken().catch(() => null)) ?? session.token;
        const imageUrls = await Promise.all(
          payload.imageUrls.map((imageUrl, index) =>
            uploadImageSourceForFirebaseContent({
              token,
              source: imageUrl,
              folder: "products",
              publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-product-${index + 1}`),
              label: `product image ${index + 1}`,
            })
          )
        );
        const newProduct = await createFirebaseProduct(currentUser.id, {
          ...payload,
          imageUrls,
        });
        const nextProducts = [newProduct, ...products.filter((item) => item.id !== newProduct.id)];

        setProducts(nextProducts);
        setUsers((current) => withOwnedContent(upsertUser(current, currentUser), reels, nextProducts));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([payload.title, payload.description, payload.category, payload.location, ...payload.imageUrls])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const newProduct: Product = {
        id: `product-${Date.now()}`,
        userId: currentUser.id,
        title: payload.title.trim(),
        description: payload.description.trim(),
        price: Number(payload.price) || 0,
        imageUrl:
          payload.imageUrls[0]?.trim() ||
          "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
        imageUrls:
          payload.imageUrls.length > 0
            ? payload.imageUrls.map((item) => item.trim()).filter(Boolean)
            : ["https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80"],
        category: payload.category.trim() || "Home Goods",
        condition: payload.condition,
        location: payload.location.trim() || "Kuala Lumpur, Malaysia",
        listingStatus: "available",
        createdAt: new Date().toISOString(),
      };

      const nextProducts = [newProduct, ...products];
      setProducts(nextProducts);
      setUsers((current) =>
        withOwnedContent(
          current.map((user) =>
            user.id === currentUser.id ? { ...user, productIds: [newProduct.id, ...user.productIds] } : user
          ),
          reels,
          nextProducts
        )
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const created = await createProductWithApi(session.token, payload);
      const nextProduct = mapApiProductToMobile(created, products.find((item) => item.id === created.id));
      const nextProducts = [nextProduct, ...products.filter((item) => item.id !== nextProduct.id)];
      setProducts(nextProducts);
      setUsers((current) => {
        const sellerSource =
          created.seller ??
          {
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.username,
            email: currentUser.email,
            profileImage: currentUser.profileImage,
            bio: currentUser.bio,
            headline: currentUser.headline,
            language: currentUser.language,
          };
        const nextSeller = mapApiUserToMobile(sellerSource, {
          existing: current.find((item) => item.id === sellerSource.id),
          planType: currentUser.planType,
          followers: currentUser.followers,
          following: currentUser.following,
        });

        return withOwnedContent(upsertUser(current, nextSeller), reels, nextProducts);
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function createCommunity(payload: CreateCommunityPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before creating a page, group, or channel." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([payload.name, payload.description, payload.category, isDataUrl(payload.coverImage) ? "" : payload.coverImage])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      if (!session?.token) {
        return { ok: false, message: "Firebase session missing. Please log in again." };
      }

      try {
        const token = (await getCurrentFirebaseIdToken().catch(() => null)) ?? session.token;
        const coverImage = await uploadImageSourceForFirebaseContent({
          token,
          source: payload.coverImage,
          folder: "communities",
          publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-${payload.kind}`),
          label: "community cover image",
        });
        const nextCommunity = await createFirebaseCommunity(currentUser.id, {
          ...payload,
          coverImage,
        });
        setCommunities((current) => [nextCommunity, ...current.filter((item) => item.id !== nextCommunity.id)]);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseCommunityCommerceErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([payload.name, payload.description, payload.category, payload.coverImage])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const nextCommunity: CommunitySpace = {
        id: `community-${Date.now()}`,
        ownerId: currentUser.id,
        kind: payload.kind,
        name: payload.name.trim(),
        description: payload.description.trim(),
        category: payload.category.trim(),
        coverImage: payload.coverImage.trim(),
        visibility: payload.visibility,
        memberIds: [currentUser.id],
        createdAt: new Date().toISOString(),
      };

      setCommunities((current) => [nextCommunity, ...current]);
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const created = await createCommunityWithApi(session.token, payload);
      const nextCommunity = mapApiCommunityToMobile(created);
      setCommunities((current) => [nextCommunity, ...current.filter((item) => item.id !== nextCommunity.id)]);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function createCommunityPost(payload: CreateCommunityPostPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before posting inside a community." };
    }

    const community = communities.find((item) => item.id === payload.communityId);
    if (!community) {
      return { ok: false, message: "Community not found." };
    }

    if (!payload.text.trim()) {
      return { ok: false, message: "Post text is empty." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([payload.text, isDataUrl(payload.imageUrl ?? "") ? "" : payload.imageUrl])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      if (!session?.token) {
        return { ok: false, message: "Firebase session missing. Please log in again." };
      }

      try {
        const token = (await getCurrentFirebaseIdToken().catch(() => null)) ?? session.token;
        const imageUrl = payload.imageUrl?.trim()
          ? await uploadImageSourceForFirebaseContent({
              token,
              source: payload.imageUrl,
              folder: "communities",
              publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-community-post`),
              label: "community post image",
            })
          : undefined;
        const response = await createFirebaseCommunityPost(currentUser, {
          ...payload,
          imageUrl,
        });
        setCommunities((current) =>
          [response.community, ...current.filter((item) => item.id !== response.community.id)].sort((left, right) =>
            right.createdAt.localeCompare(left.createdAt)
          )
        );
        setCommunityPosts((current) => mergeCommunityPosts(current, [response.post]));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseCommunityCommerceErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([payload.text, payload.imageUrl])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const nextPost: CommunityPost = {
        id: `community-post-${Date.now()}`,
        communityId: payload.communityId,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.profileImage,
        text: payload.text.trim(),
        imageUrl: payload.imageUrl?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      setCommunityPosts((current) => [nextPost, ...current]);
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await createCommunityPostWithApi(session.token, payload);
      const nextPost = mapApiCommunityPostToMobile(response.post, users.find((user) => user.id === response.post.authorId));
      setCommunityPosts((current) => mergeCommunityPosts(current, [nextPost]));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function sendCommunityChatMessage(communityId: string, text: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before sending a group message." };
    }

    const community = communities.find((item) => item.id === communityId);
    if (!community) {
      return { ok: false, message: "Community not found." };
    }

    if (community.kind !== "group") {
      return { ok: false, message: "Group chat is only available inside groups." };
    }

    if (!text.trim()) {
      return { ok: false, message: "Message is empty." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([text])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      try {
        const nextMessage = await sendFirebaseCommunityChatMessage(community, currentUser, text);
        setCommunityChatMessages((current) => mergeCommunityChatMessages(current, [nextMessage]));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseChatErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([text])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const nextMessage: CommunityChatMessage = {
        id: `community-chat-${Date.now()}`,
        communityId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.profileImage,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        deliveredToUserIds: [currentUser.id],
        seenByUserIds: [currentUser.id],
      };

      setCommunityChatMessages((current) => mergeCommunityChatMessages(current, [nextMessage]));
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const response = await sendCommunityChatMessageWithApi(session.token, communityId, text);
      const nextMessage = mapApiCommunityChatMessageToMobile(
        response.message,
        users.find((user) => user.id === response.message.senderId)
      );
      setCommunityChatMessages((current) => mergeCommunityChatMessages(current, [nextMessage]));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before updating your profile." };
    }

    if (isFirebaseProfilesConfigured() && !isDemoAccessToken(session?.token ?? "")) {
      if (containsSexualContent([payload.name, payload.username, payload.bio, payload.headline, isDataUrl(payload.profileImage) ? "" : payload.profileImage])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      if (!session?.token) {
        return { ok: false, message: "Firebase session missing. Please log in again." };
      }

      try {
        let nextProfileImage = payload.profileImage.trim() || currentUser.profileImage;
        let nextToken = (await getCurrentFirebaseIdToken().catch(() => null)) ?? session.token;

        if (isDataUrl(nextProfileImage)) {
          if (!isMediaApiConfigured()) {
            return {
              ok: false,
              message: "Cloudinary profile upload needs EXPO_PUBLIC_API_BASE_URL in mobile/.env.",
            };
          }

          const uploadedPhoto = await uploadDataUrlToCloudinary({
            token: nextToken,
            dataUrl: nextProfileImage,
            folder: "profile",
            publicIdPrefix: normalizeUploadPrefix(payload.username || currentUser.username),
            resourceType: "image",
          });
          await checkUploadedMediaSafety({
            token: nextToken,
            type: "image",
            url: uploadedPhoto.secureUrl,
            label: "profile photo",
          });
          nextProfileImage = uploadedPhoto.adaptiveUrl || uploadedPhoto.secureUrl;
        }

        const nextUser = await updateFirebaseUserProfile(currentUser.id, {
          ...payload,
          profileImage: nextProfileImage,
        });
        const nextSession = {
          ...session,
          token: nextToken,
        };

        setSession(nextSession);
        setUsers((current) => withOwnedContent(upsertUser(current, nextUser), reels, products));
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.session, JSON.stringify(nextSession)],
          [STORAGE_KEYS.firebaseUser, JSON.stringify(nextUser)],
        ]);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseProfileErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([payload.bio, payload.headline, isDataUrl(payload.profileImage) ? "" : payload.profileImage])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === currentUser.id
            ? {
                ...user,
                name: payload.name.trim(),
                username: payload.username.trim().replace(/\s+/g, "").toLowerCase(),
                bio: payload.bio.trim(),
                headline: payload.headline.trim(),
                profileImage: payload.profileImage.trim() || user.profileImage,
              }
            : user
        )
      );
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const updatedProfile = await updateProfileWithApi(session.token, payload);
      const nextUser = mapApiUserToMobile(updatedProfile, {
        existing: currentUser,
        planType: currentUser.planType,
        followers: currentUser.followers,
        following: currentUser.following,
        reelIds: currentUser.reelIds,
        productIds: currentUser.productIds,
      });

      setUsers((current) => withOwnedContent(upsertUser(current, nextUser), reels, products));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  function getUserById(userId: string) {
    return users.find((item) => item.id === userId);
  }

  function getCommunityById(communityId: string) {
    return communities.find((item) => item.id === communityId);
  }

  function getCommunityPosts(communityId: string) {
    return communityPosts
      .filter((item) => item.communityId === communityId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  function getCommunityChatMessages(communityId: string) {
    return communityChatMessages
      .filter((item) => item.communityId === communityId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function getCommunityTypingUsers(communityId: string) {
    return (communityTypingById[communityId] ?? [])
      .map((userId) => users.find((item) => item.id === userId))
      .filter((user): user is User => Boolean(user));
  }

  function getCommentsForReel(reelId: string) {
    return comments.filter((item) => item.reelId === reelId);
  }

  function getDirectMessagesForThread(threadId: string) {
    return directMessages
      .filter((item) => item.threadId === threadId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function getDirectTypingUsers(threadId: string) {
    return (directTypingByThread[threadId] ?? [])
      .map((userId) => users.find((item) => item.id === userId))
      .filter((user): user is User => Boolean(user));
  }

  function getDirectUnreadCount(threadId: string) {
    if (!currentUser) {
      return 0;
    }

    return countUnreadMessages(getDirectMessagesForThread(threadId), currentUser.id);
  }

  function getTotalDirectUnreadCount() {
    if (!currentUser) {
      return 0;
    }

    return directThreads.reduce((total, thread) => total + countUnreadMessages(getDirectMessagesForThread(thread.id), currentUser.id), 0);
  }

  function getMarketplaceMessagesForThread(threadId: string) {
    return marketplaceMessages
      .filter((item) => item.threadId === threadId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function getMarketplaceTypingUsers(threadId: string) {
    return (marketplaceTypingByThread[threadId] ?? [])
      .map((userId) => users.find((item) => item.id === userId))
      .filter((user): user is User => Boolean(user));
  }

  function getMarketplaceUnreadCount(threadId: string) {
    if (!currentUser) {
      return 0;
    }

    return countUnreadMessages(getMarketplaceMessagesForThread(threadId), currentUser.id);
  }

  function getTotalMarketplaceUnreadCount() {
    if (!currentUser) {
      return 0;
    }

    return marketplaceThreads.reduce(
      (total, thread) => total + countUnreadMessages(getMarketplaceMessagesForThread(thread.id), currentUser.id),
      0
    );
  }

  function getUserPresence(userId: string) {
    return presenceByUserId[userId] ?? {
      userId,
      isOnline: false,
      lastSeenAt: deriveFallbackPresenceTimestamp(userId, directMessages, marketplaceMessages, communityChatMessages),
    };
  }

  function getBoostForReel(reelId: string) {
    return reelBoosts.find((item) => item.reelId === reelId && item.status === "active") ??
      reelBoosts.find((item) => item.reelId === reelId);
  }

  function canDirectMessageUser(targetUserId: string) {
    return Boolean(currentUser && canUsersMutuallyDirectMessage(users, currentUser.id, targetUserId));
  }

  function isReelSaved(reelId: string) {
    return Boolean(currentUser && savedPosts.some((item) => item.userId === currentUser.id && item.entityType === "reel" && item.entityId === reelId));
  }

  function isProductSaved(productId: string) {
    return Boolean(
      currentUser &&
        savedPosts.some((item) => item.userId === currentUser.id && item.entityType === "product" && item.entityId === productId)
    );
  }

  return (
    <AppContext.Provider
      value={{
        isBootstrapping,
        language,
        session,
        currentUser,
        users,
        stories,
        reels,
        products,
        communities,
        communityPosts,
        communityChatMessages,
        directThreads,
        directMessages,
        comments,
        notifications,
        savedPosts,
        marketplaceThreads,
        marketplaceMessages,
        marketplaceOrders,
        activeSubscription,
        pushNotificationsStatus,
        plans: subscriptionPlans,
        boostPlans: reelBoostPlans,
        reelBoosts,
        refreshCatalog,
        refreshNotifications,
        refreshDirectInbox,
        refreshMarketplaceInbox,
        refreshCommunities,
        openCommunityActivity,
        setLanguage,
        login,
        register,
        logout,
        markAllNotificationsRead,
        toggleLike,
        repostReel,
        addComment,
        toggleFollow,
        toggleSaveReel,
        toggleSaveProduct,
        updateProductListingStatus,
        startDirectChat,
        openDirectThread,
        sendDirectMessage,
        startMarketplaceChat,
        openMarketplaceThread,
        sendMarketplaceMessage,
        createMarketplaceOrder,
        createStory,
        createReel,
        subscribeToPlan,
        boostReel,
        createProduct,
        createCommunity,
        createCommunityPost,
        markCommunityChatRead,
        setCommunityTyping,
        sendCommunityChatMessage,
        updateProfile,
        getUserById,
        getCommunityById,
        getCommunityPosts,
        getCommunityChatMessages,
        getCommunityTypingUsers,
        getCommentsForReel,
        getDirectMessagesForThread,
        getDirectTypingUsers,
        getDirectUnreadCount,
        getTotalDirectUnreadCount,
        getMarketplaceMessagesForThread,
        getMarketplaceTypingUsers,
        getMarketplaceUnreadCount,
        getTotalMarketplaceUnreadCount,
        getUserPresence,
        getBoostForReel,
        canDirectMessageUser,
        isReelSaved,
        isProductSaved,
        markDirectThreadRead,
        setDirectTyping,
        markMarketplaceThreadRead,
        setMarketplaceTyping,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }

  return context;
}

function parseStoredUser(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as User;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

function isDemoAccessToken(token: string) {
  return token.startsWith("viraflow-token-");
}

function isFirebaseBackedSession(session: AuthSession | null) {
  return Boolean(
    session?.token &&
      isFirebaseContentConfigured() &&
      isFirebaseCommunityCommerceConfigured() &&
      isFirebaseEngagementConfigured() &&
      isFirebaseChatConfigured() &&
      isFirebaseMonetizationConfigured() &&
      isFirebaseInboxConfigured() &&
      !isDemoAccessToken(session.token)
  );
}

function isDataUrl(value: string) {
  return value.trim().startsWith("data:");
}

function normalizeUploadPrefix(value: string) {
  return (value.trim().replace(/\s+/g, "-").replace(/^@+/, "").toLowerCase() || `upload-${Date.now()}`).slice(0, 60);
}

function truncateForNotification(value: string, maxLength = 92) {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}...` : trimmed;
}

async function uploadImageSourceForFirebaseContent(input: {
  token: string;
  source: string;
  folder: MediaFolder;
  publicIdPrefix: string;
  label: string;
  mimeType?: string;
  fileName?: string;
}) {
  ensureMediaApiConfigured();
  const source = input.source.trim();

  if (!source) {
    throw new Error("Pick an image before publishing.");
  }

  if (isDataUrl(source)) {
    const uploaded = await uploadDataUrlToCloudinary({
      token: input.token,
      dataUrl: source,
      folder: input.folder,
      publicIdPrefix: input.publicIdPrefix,
      resourceType: "image",
    });
    await checkUploadedMediaSafety({
      token: input.token,
      type: "image",
      url: uploaded.secureUrl,
      label: input.label,
    });
    return uploaded.adaptiveUrl || uploaded.secureUrl;
  }

  if (isLocalMediaUri(source)) {
    const uploaded = await uploadMediaToCloudinary({
      token: input.token,
      uri: source,
      mimeType: input.mimeType || inferMimeTypeFromUri(source, "image/jpeg"),
      fileName: input.fileName || inferFileNameFromUri(source, "upload.jpg"),
      folder: input.folder,
      publicIdPrefix: input.publicIdPrefix,
      resourceType: "image",
    });
    await checkUploadedMediaSafety({
      token: input.token,
      type: "image",
      url: uploaded.secureUrl,
      label: input.label,
    });
    return uploaded.adaptiveUrl || uploaded.secureUrl;
  }

  if (isHttpUrl(source)) {
    await checkUploadedMediaSafety({
      token: input.token,
      type: "image",
      url: source,
      label: input.label,
    });
    return source;
  }

  throw new Error("Use a valid image file or image URL.");
}

async function uploadVideoSourceForFirebaseContent(input: {
  token: string;
  source: string;
  publicIdPrefix: string;
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
}) {
  ensureMediaApiConfigured();
  const source = input.source.trim();

  if (!source) {
    throw new Error("Pick or paste a reel video first.");
  }

  if (isLocalMediaUri(source)) {
    const uploaded = await uploadMediaToCloudinary({
      token: input.token,
      uri: source,
      mimeType: input.mimeType || inferMimeTypeFromUri(source, "video/mp4"),
      fileName: input.fileName || inferFileNameFromUri(source, "reel.mp4"),
      folder: "reels",
      publicIdPrefix: input.publicIdPrefix,
      resourceType: "video",
    });
    await checkUploadedMediaSafety({
      token: input.token,
      type: "video",
      url: uploaded.secureUrl,
      label: "reel video",
      seconds: Math.round(input.durationSeconds ?? uploaded.duration ?? 12),
    });

    return {
      videoUrl: uploaded.adaptiveUrl || uploaded.secureUrl,
      thumbnailUrl: buildCloudinaryVideoThumbnailUrl(uploaded.secureUrl),
    };
  }

  if (isHttpUrl(source)) {
    await checkUploadedMediaSafety({
      token: input.token,
      type: "video",
      url: source,
      label: "reel video",
      seconds: input.durationSeconds,
    });

    return {
      videoUrl: source,
      thumbnailUrl: buildCloudinaryVideoThumbnailUrl(source),
    };
  }

  throw new Error("Use a valid video file or video URL.");
}

function ensureMediaApiConfigured() {
  if (!isMediaApiConfigured()) {
    throw new Error("Cloudinary uploads need EXPO_PUBLIC_API_BASE_URL in mobile/.env and the backend running.");
  }
}

function isLocalMediaUri(value: string) {
  return /^(file|content|ph|assets-library):\/\//i.test(value);
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function inferFileNameFromUri(uri: string, fallback: string) {
  const cleanUri = uri.split("?")[0];
  const fileName = cleanUri.split("/").filter(Boolean).pop();
  return fileName?.includes(".") ? fileName : fallback;
}

function inferMimeTypeFromUri(uri: string, fallback: string) {
  const extension = uri.split("?")[0].split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    webm: "video/webm",
  };

  return extension ? mimeTypes[extension] ?? fallback : fallback;
}

function mergeUsersById(primary: User[], fallback: User[]) {
  const byId = new Map<string, User>();
  fallback.forEach((item) => byId.set(item.id, item));
  primary.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}

function mergeStoriesById(primary: Story[], fallback: Story[]) {
  const byId = new Map<string, Story>();
  fallback.forEach((item) => byId.set(item.id, item));
  primary.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mergeReelsById(primary: Reel[], fallback: Reel[]) {
  const byId = new Map<string, Reel>();
  fallback.forEach((item) => byId.set(item.id, item));
  primary.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mergeProductsById(primary: Product[], fallback: Product[]) {
  const byId = new Map<string, Product>();
  fallback.forEach((item) => byId.set(item.id, item));
  primary.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mergeCommentsById(primary: ReelComment[], fallback: ReelComment[]) {
  const byId = new Map<string, ReelComment>();
  fallback.forEach((item) => byId.set(item.id, item));
  primary.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function buildRemoteState(params: {
  existingUsers: User[];
  existingReels: Reel[];
  existingProducts: Product[];
  apiReels: Array<{
    id: string;
    userId: string;
    videoUrl: string;
    caption: string;
    thumbnailUrl: string;
    likedBy?: string[];
    repostCount: number;
    createdAt: string;
    creator?: {
      id: string;
      name: string;
      username: string;
      email: string;
      profileImage: string;
      bio: string;
      headline: string;
      language: string;
    } | null;
  }>;
  apiProducts: Array<{
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
    seller?: {
      id: string;
      name: string;
      username: string;
      email: string;
      profileImage: string;
      bio: string;
      headline: string;
      language: string;
    } | null;
  }>;
  currentProfile?: {
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
  };
  currentPlanType?: PlanType;
}) {
  const nextReels = params.apiReels.map((item) =>
    mapApiReelToMobile(item, params.existingReels.find((existing) => existing.id === item.id))
  );
  const nextProducts = params.apiProducts.map((item) =>
    mapApiProductToMobile(item, params.existingProducts.find((existing) => existing.id === item.id))
  );

  let nextUsers = params.existingUsers;

  params.apiReels.forEach((item) => {
    if (!item.creator) {
      return;
    }

    nextUsers = upsertUser(
      nextUsers,
      mapApiUserToMobile(item.creator, {
        existing: nextUsers.find((existing) => existing.id === item.creator?.id),
      })
    );
  });

  params.apiProducts.forEach((item) => {
    if (!item.seller) {
      return;
    }

    nextUsers = upsertUser(
      nextUsers,
      mapApiUserToMobile(item.seller, {
        existing: nextUsers.find((existing) => existing.id === item.seller?.id),
      })
    );
  });

  if (params.currentProfile) {
    const existingCurrentUser = nextUsers.find((item) => item.id === params.currentProfile?.id);
    nextUsers = upsertUser(
      nextUsers,
      mapApiUserToMobile(params.currentProfile, {
        existing: existingCurrentUser,
        planType: params.currentPlanType ?? existingCurrentUser?.planType ?? "free",
        followers:
          existingCurrentUser?.followers ??
          buildPlaceholderIds(params.currentProfile.followersCount, `${params.currentProfile.id}-follower`),
        following:
          existingCurrentUser?.following ??
          buildPlaceholderIds(params.currentProfile.followingCount, `${params.currentProfile.id}-following`),
      })
    );
  }

  return {
    users: withOwnedContent(nextUsers, nextReels, nextProducts),
    reels: nextReels,
    products: nextProducts,
  };
}

function upsertUser(current: User[], nextUser: User) {
  const exists = current.some((item) => item.id === nextUser.id);
  if (!exists) {
    return [nextUser, ...current];
  }

  return current.map((item) => (item.id === nextUser.id ? { ...item, ...nextUser } : item));
}

function upsertReel(current: Reel[], nextReel: Reel) {
  const exists = current.some((item) => item.id === nextReel.id);
  if (!exists) {
    return [nextReel, ...current];
  }

  return current.map((item) => (item.id === nextReel.id ? { ...item, ...nextReel } : item));
}

function upsertBoost(current: ReelBoostCampaign[], nextBoost: ReelBoostCampaign) {
  const filtered = current.filter((item) => item.id !== nextBoost.id);
  return [nextBoost, ...filtered];
}

function upsertSavedPost(current: SavedPost[], nextSavedPost?: SavedPost) {
  if (!nextSavedPost) {
    return current;
  }

  const filtered = current.filter((item) => item.id !== nextSavedPost.id);
  return [nextSavedPost, ...filtered];
}

function upsertMarketplaceThread(current: MarketplaceChatThread[], nextThread: MarketplaceChatThread) {
  const filtered = current.filter((item) => item.id !== nextThread.id);
  return [nextThread, ...filtered].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function upsertDirectThread(current: DirectChatThread[], nextThread: DirectChatThread) {
  const filtered = current.filter((item) => item.id !== nextThread.id);
  return [nextThread, ...filtered].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function mergeDirectMessages(current: DirectChatMessage[], incoming: DirectChatMessage[]) {
  const nextById = new Map<string, DirectChatMessage>();

  current.forEach((item) => {
    nextById.set(item.id, item);
  });

  incoming.forEach((item) => {
    const existing = nextById.get(item.id);
    nextById.set(item.id, existing ? mergeMessageReceipts(existing, item) : item);
  });

  return [...nextById.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function mergeMarketplaceMessages(current: MarketplaceChatMessage[], incoming: MarketplaceChatMessage[]) {
  const nextById = new Map<string, MarketplaceChatMessage>();

  current.forEach((item) => {
    nextById.set(item.id, item);
  });

  incoming.forEach((item) => {
    const existing = nextById.get(item.id);
    nextById.set(item.id, existing ? mergeMessageReceipts(existing, item) : item);
  });

  return [...nextById.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function upsertMarketplaceOrder(current: MarketplaceOrder[], nextOrder: MarketplaceOrder) {
  const filtered = current.filter((item) => item.id !== nextOrder.id);
  return [nextOrder, ...filtered].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mergeCommunityPosts(current: CommunityPost[], incoming: CommunityPost[]) {
  const nextById = new Map<string, CommunityPost>();

  current.forEach((item) => {
    nextById.set(item.id, item);
  });

  incoming.forEach((item) => {
    nextById.set(item.id, item);
  });

  return [...nextById.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mergeCommunityChatMessages(current: CommunityChatMessage[], incoming: CommunityChatMessage[]) {
  const nextById = new Map<string, CommunityChatMessage>();

  current.forEach((item) => {
    nextById.set(item.id, item);
  });

  incoming.forEach((item) => {
    const existing = nextById.get(item.id);
    nextById.set(item.id, existing ? mergeMessageReceipts(existing, item) : item);
  });

  return [...nextById.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function applyFollowState(
  current: User[],
  currentUserId: string,
  targetUserId: string,
  isFollowing: boolean,
  targetUserSource?: {
    id: string;
    name: string;
    username: string;
    email: string;
    profileImage: string;
    bio: string;
    headline: string;
    language: string;
  }
) {
  let nextUsers = current;

  if (targetUserSource) {
    const existingTarget = current.find((item) => item.id === targetUserSource.id);
    if (existingTarget) {
      nextUsers = upsertUser(
        current,
        mapApiUserToMobile(targetUserSource, {
          existing: existingTarget,
          planType: existingTarget.planType,
          followers: existingTarget.followers,
          following: existingTarget.following,
          reelIds: existingTarget.reelIds,
          productIds: existingTarget.productIds,
        })
      );
    }
  }

  return nextUsers.map((user) => {
    if (user.id === currentUserId) {
      return {
        ...user,
        following: isFollowing ? addUniqueId(user.following, targetUserId) : user.following.filter((item) => item !== targetUserId),
      };
    }

    if (user.id === targetUserId) {
      return {
        ...user,
        followers: isFollowing ? addUniqueId(user.followers, currentUserId) : user.followers.filter((item) => item !== currentUserId),
      };
    }

    return user;
  });
}

function withOwnedContent(users: User[], reels: Reel[], products: Product[]) {
  return users.map((user) => ({
    ...user,
    reelIds: reels.filter((item) => item.userId === user.id).map((item) => item.id),
    productIds: products.filter((item) => item.userId === user.id).map((item) => item.id),
  }));
}

function applyPlanTypeToUsers(users: User[], userId: string, subscription: AppSubscription | null) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return users;
  }

  const nextPlanType = subscription?.status === "active" ? subscription.planType : "free";
  return users.map((user) => (user.id === normalizedUserId ? { ...user, planType: nextPlanType } : user));
}

function buildPlaceholderIds(count: number | undefined, prefix: string) {
  return Array.from({ length: count ?? 0 }, (_item, index) => `${prefix}-${index + 1}`);
}

function filterActiveStories(stories: Story[]) {
  const now = Date.now();
  return stories
    .filter((story) => new Date(story.expiresAt).getTime() > now)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function toggleLocalSavedPost(
  current: SavedPost[],
  userId: string,
  entityType: SavedPost["entityType"],
  entityId: string
) {
  const existing = current.find(
    (item) => item.userId === userId && item.entityType === entityType && item.entityId === entityId
  );

  if (existing) {
    return {
      saved: false,
      savedPosts: current.filter((item) => item.id !== existing.id),
    };
  }

  const nextSavedPost: SavedPost = {
    id: `saved-${Date.now()}`,
    userId,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
  };

  return {
    saved: true,
    savedPosts: [nextSavedPost, ...current],
  };
}

function addUniqueId(list: string[], value: string) {
  return list.includes(value) ? list : [value, ...list];
}

function updateTypingBucket(current: Record<string, string[]>, key: string, userId: string, isTyping: boolean) {
  const nextUsers = isTyping ? addUniqueId(current[key] ?? [], userId) : (current[key] ?? []).filter((item) => item !== userId);
  return {
    ...current,
    [key]: nextUsers,
  };
}

function applySeenStateToMessages<T extends { id: string; seenByUserIds: string[] }>(
  current: T[],
  messageIds: string[],
  userId: string
) {
  const targetIds = new Set(messageIds);
  return current.map((message) =>
    targetIds.has(message.id) && !message.seenByUserIds.includes(userId)
      ? { ...message, seenByUserIds: addUniqueId(message.seenByUserIds, userId) }
      : message
  );
}

function applyDeliveredStateToMessages<T extends { id: string; deliveredToUserIds: string[] }>(
  current: T[],
  messageIds: string[],
  userId: string
) {
  const targetIds = new Set(messageIds);
  return current.map((message) =>
    targetIds.has(message.id) && !message.deliveredToUserIds.includes(userId)
      ? { ...message, deliveredToUserIds: addUniqueId(message.deliveredToUserIds, userId) }
      : message
  );
}

function countUnreadMessages<T extends { senderId: string; seenByUserIds: string[] }>(messages: T[], currentUserId: string) {
  return messages.filter((message) => message.senderId !== currentUserId && !message.seenByUserIds.includes(currentUserId)).length;
}

function mergeMessageReceipts<T extends { deliveredToUserIds: string[]; seenByUserIds: string[] }>(current: T, incoming: T) {
  return {
    ...current,
    ...incoming,
    deliveredToUserIds: mergeUniqueIds(current.deliveredToUserIds, incoming.deliveredToUserIds),
    seenByUserIds: mergeUniqueIds(current.seenByUserIds, incoming.seenByUserIds),
  };
}

function mergeUniqueIds(left: string[], right: string[]) {
  return [...new Set([...left, ...right])];
}

function deriveFallbackPresenceTimestamp(
  userId: string,
  directMessages: DirectChatMessage[],
  marketplaceMessages: MarketplaceChatMessage[],
  communityMessages: CommunityChatMessage[]
) {
  return [
    ...directMessages.filter((message) => message.senderId === userId).map((message) => message.createdAt),
    ...marketplaceMessages.filter((message) => message.senderId === userId).map((message) => message.createdAt),
    ...communityMessages.filter((message) => message.senderId === userId).map((message) => message.createdAt),
  ].sort((left, right) => right.localeCompare(left))[0];
}

function canUsersMutuallyDirectMessage(users: User[], firstUserId: string, secondUserId: string) {
  const firstUser = users.find((item) => item.id === firstUserId);
  const secondUser = users.find((item) => item.id === secondUserId);

  if (!firstUser || !secondUser) {
    return false;
  }

  return firstUser.following.includes(secondUserId) && secondUser.following.includes(firstUserId);
}

function upsertRealtimeUser(current: User[], apiUser?: ApiUserPayload | null) {
  if (!apiUser) {
    return current;
  }

  const existing = current.find((item) => item.id === apiUser.id);
  return upsertUser(
    current,
    mapApiUserToMobile(apiUser, {
      existing,
      planType: existing?.planType,
      followers: existing?.followers,
      following: existing?.following,
      reelIds: existing?.reelIds,
      productIds: existing?.productIds,
    })
  );
}

function getApiErrorMessage(error: unknown) {
  if (error instanceof AppApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "This action could not be completed right now.";
}

async function openCheckoutUrl(checkoutUrl: string) {
  const canOpen = await Linking.canOpenURL(checkoutUrl);
  if (!canOpen) {
    throw new Error("Could not open Stripe checkout on this device.");
  }

  await Linking.openURL(checkoutUrl);
}
