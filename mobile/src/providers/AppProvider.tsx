import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { I18nManager, Linking } from "react-native";
import { applyLayoutDirection, isRtlLanguage } from "../utils/layoutDirection";
import { getCopy } from "../data/copy";
import { isCallConnection } from "../utils/callConnection";
import { reelBoostPlans, subscriptionPlans } from "../data/catalog";
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
  deleteCommunityPostWithApi,
  deleteProductWithApi,
  deleteStoryWithApi,
  deleteReelWithApi,
  derivePlanType,
  fetchApiMe,
  deliverNotificationWithApi,
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
  markStoryViewedWithApi,
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
  markNotificationReadWithApi,
  markAllNotificationsReadWithApi,
  repostReelWithApi,
  registerWithApi,
  sendCommunityChatMessageWithApi,
  sendDirectMessageWithApi,
  sendMarketplaceMessageWithApi,
  setUserBanStatusWithApi,
  startDirectChatWithApi,
  startMarketplaceChatWithApi,
  toggleFollowWithApi,
  toggleLikeWithApi,
  toggleSaveProductWithApi,
  toggleSaveReelWithApi,
  updateStoryHighlightWithApi,
  updateProductListingStatusWithApi,
  updateProfileWithApi,
} from "../services/appApi";
import {
  fetchFirebaseChatSnapshot,
  fetchFirebaseCommunityChatForUser,
  fetchFirebaseDirectThread,
  fetchFirebaseMarketplaceThread,
  getFirebaseChatErrorMessage,
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
  deleteFirebaseCommunityPost,
  createFirebaseMarketplaceOrder,
  fetchFirebaseCommunityActivity,
  fetchFirebaseCommunityCommerceSnapshot,
  getFirebaseCommunityCommerceErrorMessage,
  subscribeToFirebaseCommunityCommerce,
} from "../services/firebaseCommunityCommerce";
import {
  createFirebaseProduct,
  createFirebaseReel,
  createFirebaseStory,
  deleteFirebaseStory,
  deleteFirebaseStoryAsAdmin,
  deleteFirebaseReel,
  deleteFirebaseReelAsAdmin,
  deleteFirebaseProduct,
  fetchFirebaseCatalogFromFirestore,
  getFirebaseContentErrorMessage,
  isFirebaseContentConfigured,
  markFirebaseStoryViewed,
  updateFirebaseStoryHighlight,
  updateFirebaseProductListingStatus,
} from "../services/firebaseContent";
import {
  addFirebaseReelComment,
  fetchFirebaseEngagementSnapshot,
  getFirebaseEngagementErrorMessage,
  recordFirebaseReelView,
  repostFirebaseReel,
  subscribeToFirebaseEngagement,
  toggleFirebaseFollow,
  toggleFirebaseReelLike,
} from "../services/firebaseEngagement";
import {
  addFirebasePostComment,
  createFirebasePost,
  deleteFirebasePost,
  deleteFirebasePostAsAdmin,
  fetchFirebasePostsSnapshot,
  getFirebasePostsErrorMessage,
  subscribeToFirebasePosts,
  toggleFirebasePostLike,
} from "../services/firebasePosts";
import {
  createFirebaseNotification,
  fetchFirebaseInboxSnapshot,
  getFirebaseInboxErrorMessage,
  markFirebaseNotificationRead,
  markAllFirebaseNotificationsRead,
  subscribeToFirebaseInbox,
  toggleFirebaseSavedPost,
} from "../services/firebaseInbox";
import {
  fetchFirebaseMonetizationSnapshot,
  subscribeToFirebaseMonetization,
} from "../services/firebaseMonetization";
import {
  continueWithFirebaseGoogleProfile,
  getCurrentFirebaseIdToken,
  getFirebaseProfileById,
  getFirebaseProfileErrorMessage,
  getGoogleSignInUnavailableMessage,
  isGoogleSignInConfigured,
  isFirebaseProfilesConfigured,
  loginWithFirebaseProfile,
  logoutFromFirebaseProfile,
  registerWithFirebaseProfile,
  setFirebaseUserBanStatus,
  updateFirebaseUserPreferences,
  updateFirebaseUserProfile,
} from "../services/firebaseProfiles";
import {
  getSupabaseProfileErrorMessage,
  isSupabaseAuthConfigured,
  loginWithSupabaseProfile,
  logoutFromSupabaseProfile,
  refreshSupabaseProfileSession,
  registerWithSupabaseProfile,
} from "../services/supabaseAuth";
import {
  buildCloudinaryEditedImageUrl,
  buildCloudinaryEditedVideoUrl,
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
  NotificationRealtimeEvent,
  NotificationsReadAllRealtimeEvent,
  PresenceRealtimeEvent,
  ReadRealtimeEvent,
  TypingRealtimeEvent,
} from "../services/realtime";
import {
  AppSubscription,
  PushNotificationsStatus,
  AppNotification,
  ContentReport,
  CommunityChatMessage,
  CommunityPost,
  CommunitySpace,
  CreateCommunityPayload,
  CreateCommunityPostPayload,
  CreateDirectMessagePayload,
  AuthSession,
  DirectChatMessage,
  DirectChatThread,
  CreateMarketplaceOrderPayload,
  CreatePostPayload,
  CreateProductPayload,
  CreateReelBoostPayload,
  CreateReelPayload,
  CreateStoryPayload,
  isLanguageOption,
  LanguageOption,
  MarketplaceChatMessage,
  MarketplaceChatThread,
  MarketplaceOrder,
  PlanType,
  Post,
  PostComment,
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
import {
  getUsernameValidationMessage,
  getWebsiteValidationMessage,
  normalizeUsernameInput,
  normalizeWebsiteInput,
} from "../utils/profileValidation";
import { MEDIA_UNAVAILABLE_IMAGE } from "../data/defaultMedia";
import { buildLocaleTag, detectDeviceRegion, getRegion, isKnownRegion } from "../data/regions";
import { setActiveFormattingLocale } from "../utils/timeFormatting";
import { CallType, startCall } from "../services/calls";
import { adminApi } from "../services/adminApi";
import { createFirebaseReport, NewReportInput, normalizeReport } from "../services/reports";

const STORAGE_KEYS = {
  language: "viraflow.language",
  region: "pulseora.region",
  session: "viraflow.session",
  firebaseUser: "viraflow.firebaseUser",
  bootVersion: "viraflow.bootVersion",
} as const;

const APP_BOOT_VERSION = "2026-05-01-startup-recovery-2";
const SESSION_REFRESH_MESSAGE = "Your session expired. Please log in again.";
const PAYMENTS_UNAVAILABLE_MESSAGE = "Secure checkout is unavailable right now. Please check your connection and try again.";
const AUTH_UNAVAILABLE_MESSAGE = "Sign-in is unavailable right now. Please check your connection and try again.";
const POST_UPLOAD_FOLDER: MediaFolder = "posts";
const POST_UPLOAD_FALLBACK_FOLDER: MediaFolder = "reels";

interface AppContextValue {
  isBootstrapping: boolean;
  language: LanguageOption | null;
  /** ISO country code of the user's region (picked in Settings, or guessed from the phone). */
  region: string;
  /** BCP-47 tag built from language + region, used for dates, numbers and prices. */
  localeTag: string;
  session: AuthSession | null;
  currentUser: User | null;
  users: User[];
  stories: Story[];
  posts: Post[];
  postComments: PostComment[];
  reels: Reel[];
  products: Product[];
  communities: CommunitySpace[];
  communityPosts: CommunityPost[];
  communityChatMessages: CommunityChatMessage[];
  directThreads: DirectChatThread[];
  directMessages: DirectChatMessage[];
  comments: ReelComment[];
  notifications: AppNotification[];
  reports: ContentReport[];
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
  setRegion: (region: string) => Promise<void>;
  /** Starts a free voice/video call and rings the other person (push notification if their app is closed). */
  placeCall: (calleeId: string, type: CallType) => Promise<{ ok: boolean; callId?: string; message?: string }>;
  /** True for the app owner (OWNER_EMAILS on the server), who can choose admins. */
  isOwner: boolean;
  submitReport: (input: Omit<NewReportInput, "reporterId">) => Promise<{ ok: boolean; message?: string }>;
  refreshReports: () => Promise<void>;
  adminSetUserRole: (userId: string, role: "admin" | "user") => Promise<{ ok: boolean; message?: string }>;
  adminDeleteUserAccount: (userId: string) => Promise<{ ok: boolean; message?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  continueWithGoogle: () => Promise<{ ok: boolean; message?: string }>;
  register: (payload: RegisterPayload) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  googleSignInEnabled: boolean;
  googleSignInMessage: string | null;
  isAdmin: boolean;
  markAllNotificationsRead: () => Promise<{ ok: boolean; message?: string }>;
  markNotificationRead: (notificationId: string) => Promise<{ ok: boolean; message?: string }>;
  toggleLike: (reelId: string) => Promise<{ ok: boolean; message?: string }>;
  repostReel: (reelId: string) => Promise<{ ok: boolean; message?: string }>;
  recordReelView: (reelId: string) => void;
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
  sendDirectMessage: (threadId: string, payload: CreateDirectMessagePayload) => Promise<{ ok: boolean; message?: string }>;
  startMarketplaceChat: (productId: string) => Promise<{ ok: boolean; message?: string; threadId?: string }>;
  openMarketplaceThread: (threadId: string) => Promise<{ ok: boolean; message?: string }>;
  markMarketplaceThreadRead: (threadId: string) => void;
  setMarketplaceTyping: (threadId: string, isTyping: boolean) => void;
  sendMarketplaceMessage: (threadId: string, text: string) => Promise<{ ok: boolean; message?: string }>;
  createMarketplaceOrder: (
    payload: CreateMarketplaceOrderPayload
  ) => Promise<{ ok: boolean; message?: string; threadId?: string }>;
  createStory: (payload: CreateStoryPayload) => Promise<{ ok: boolean; message?: string; story?: Story }>;
  markStoryViewed: (storyId: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<{ ok: boolean; message?: string }>;
  adminDeleteStory: (storyId: string) => Promise<{ ok: boolean; message?: string }>;
  deleteReel: (reelId: string) => Promise<{ ok: boolean; message?: string }>;
  toggleStoryHighlight: (
    storyId: string,
    payload?: { highlighted?: boolean; highlightLabel?: string }
  ) => Promise<{ ok: boolean; message?: string }>;
  createPost: (payload: CreatePostPayload) => Promise<{ ok: boolean; message?: string }>;
  createReel: (payload: CreateReelPayload) => Promise<{ ok: boolean; message?: string; reel?: Reel }>;
  subscribeToPlan: (planType: PlanType) => Promise<{ ok: boolean; message?: string; subscription?: AppSubscription }>;
  boostReel: (payload: CreateReelBoostPayload) => Promise<{ ok: boolean; message?: string; boost?: ReelBoostCampaign }>;
  createProduct: (payload: CreateProductPayload) => Promise<{ ok: boolean; message?: string }>;
  deleteProduct: (productId: string) => Promise<{ ok: boolean; message?: string }>;
  createCommunity: (payload: CreateCommunityPayload) => Promise<{ ok: boolean; message?: string }>;
  createCommunityPost: (payload: CreateCommunityPostPayload) => Promise<{ ok: boolean; message?: string }>;
  deleteCommunityPost: (communityId: string, postId: string) => Promise<{ ok: boolean; message?: string }>;
  markCommunityChatRead: (communityId: string) => void;
  setCommunityTyping: (communityId: string, isTyping: boolean) => void;
  sendCommunityChatMessage: (communityId: string, text: string) => Promise<{ ok: boolean; message?: string }>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<{ ok: boolean; message?: string }>;
  togglePostLike: (postId: string) => Promise<{ ok: boolean; message?: string }>;
  addPostComment: (postId: string, text: string) => Promise<{ ok: boolean; message?: string }>;
  deletePost: (postId: string) => Promise<{ ok: boolean; message?: string }>;
  adminDeletePost: (postId: string) => Promise<{ ok: boolean; message?: string }>;
  adminDeleteReel: (reelId: string) => Promise<{ ok: boolean; message?: string }>;
  setUserBanStatus: (userId: string, banned: boolean) => Promise<{ ok: boolean; message?: string }>;
  updateReportStatus: (reportId: string, status: ContentReport["status"]) => Promise<{ ok: boolean; message?: string }>;
  toggleSavePost: (postId: string) => Promise<{ ok: boolean; message?: string; saved?: boolean }>;
  getUserById: (userId: string) => User | undefined;
  getPostById: (postId: string) => Post | undefined;
  getCommentsForPost: (postId: string) => PostComment[];
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
  isPostSaved: (postId: string) => boolean;
  isReelSaved: (reelId: string) => boolean;
  isProductSaved: (productId: string) => boolean;
  startupDiagnostics: string[];
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [language, setLanguageState] = useState<LanguageOption | null>(null);
  const [region, setRegionState] = useState<string>(() => detectDeviceRegion());
  const localeTag = useMemo(() => {
    setActiveFormattingLocale(language, region);
    return buildLocaleTag(language, region);
  }, [language, region]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postComments, setPostComments] = useState<PostComment[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [communities, setCommunities] = useState<CommunitySpace[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityChatMessages, setCommunityChatMessages] = useState<CommunityChatMessage[]>([]);
  const [communityTypingById, setCommunityTypingById] = useState<Record<string, string[]>>({});
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, UserPresence>>({});
  const [directThreads, setDirectThreads] = useState<DirectChatThread[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectChatMessage[]>([]);
  const [directTypingByThread, setDirectTypingByThread] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [marketplaceThreads, setMarketplaceThreads] = useState<MarketplaceChatThread[]>([]);
  const [marketplaceMessages, setMarketplaceMessages] = useState<MarketplaceChatMessage[]>([]);
  const [marketplaceTypingByThread, setMarketplaceTypingByThread] = useState<Record<string, string[]>>({});
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<AppSubscription | null>(null);
  const [pushNotificationsStatus, setPushNotificationsStatus] = useState<PushNotificationsStatus>(
    DEFAULT_PUSH_NOTIFICATIONS_STATUS
  );
  const [reelBoosts, setReelBoosts] = useState<ReelBoostCampaign[]>([]);
  const [startupDiagnostics, setStartupDiagnostics] = useState<string[]>(["Initializing Sohba..."]);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasPrimedNotificationFeedRef = useRef(false);
  const reachedReelIdsRef = useRef<Set<string>>(new Set());

  const addDiagnostic = (message: string) => {
    setStartupDiagnostics((current) => [...current.slice(-14), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const startupSafetyTimer = setTimeout(() => {
      addDiagnostic("Startup safety timeout reached. Opening app shell.");
      setIsBootstrapping(false);
    }, 3500);

    let openedFromCache = false;

    async function bootstrap() {
      addDiagnostic("Starting bootstrap...");
      try {
        const [storedLanguage, storedSession, storedFirebaseUser, storedBootVersion, storedRegion] = await AsyncStorage.multiGet([
          STORAGE_KEYS.language,
          STORAGE_KEYS.session,
          STORAGE_KEYS.firebaseUser,
          STORAGE_KEYS.bootVersion,
          STORAGE_KEYS.region,
        ]);
        if (isKnownRegion(storedRegion[1])) {
          setRegionState(storedRegion[1].toUpperCase());
        }
        addDiagnostic("Storage keys read.");

        if (storedBootVersion[1] && storedBootVersion[1] !== APP_BOOT_VERSION) {
          addDiagnostic(`Version mismatch: ${storedBootVersion[1]} vs ${APP_BOOT_VERSION}. Clearing old session.`);
          await AsyncStorage.multiRemove([STORAGE_KEYS.session, STORAGE_KEYS.firebaseUser]);
          await AsyncStorage.setItem(STORAGE_KEYS.bootVersion, APP_BOOT_VERSION);
          storedSession[1] = null;
          storedFirebaseUser[1] = null;
        } else if (!storedBootVersion[1]) {
          addDiagnostic("First boot or version unset. Tagging version.");
          await AsyncStorage.setItem(STORAGE_KEYS.bootVersion, APP_BOOT_VERSION);
        }

        const languageValue = isLanguageOption(storedLanguage[1]) ? storedLanguage[1] : null;
        if (languageValue) {
          addDiagnostic(`Language restored: ${languageValue}`);
          setLanguageState(languageValue);
        }
        // Keep the native layout direction in step with the saved language (e.g. after an app update).
        if (languageValue) {
          void applyLayoutDirection(languageValue);
        }

        const parsedSession = parseStoredSession(storedSession[1]);
        const parsedFirebaseUser = parseStoredUser(storedFirebaseUser[1]);
        const shouldUseFirebaseSession = Boolean(
          parsedSession && isFirebaseProfilesConfigured() && !isLegacyLocalAccessToken(parsedSession.token)
        );

        // Fast start: when this phone already has a signed-in profile saved, open the app straight away
        // from that copy and check the sign-in and load fresh content in the background.
        if (parsedSession && shouldUseFirebaseSession && parsedFirebaseUser?.id === parsedSession.userId) {
          setSession(parsedSession);
          setUsers((current) => withOwnedContent(upsertUser(current, parsedFirebaseUser), reels, products));
          openedFromCache = true;
          clearTimeout(startupSafetyTimer);
          setIsBootstrapping(false);
          addDiagnostic("Opened from the saved session; refreshing in the background.");
        }

        if (parsedSession && shouldUseFirebaseSession) {
          addDiagnostic("Verifying Firebase session...");
          const refreshedToken = await resolveAccessToken(parsedSession).catch((err) => {
            addDiagnostic(`Token resolve failed: ${err instanceof Error ? err.message : "Unknown error"}`);
            return null;
          });

          if (!refreshedToken) {
            addDiagnostic("No refreshed token. Clearing session.");
            await AsyncStorage.multiRemove([STORAGE_KEYS.session, STORAGE_KEYS.firebaseUser]);
          } else {
            if (isAppApiConfigured()) {
              addDiagnostic("Checking API health...");
              // Only a definite "not signed in" answer logs the user out. A slow or sleeping server
              // (common right after the backend wakes up) must not throw people out of the app.
              const verified = await fetchApiMe(refreshedToken)
                .then(() => true)
                .catch((err) => {
                  addDiagnostic(`API check failed: ${err instanceof Error ? err.message : "Unknown error"}`);
                  const status = (err as { status?: number } | null)?.status;
                  return !(status === 401 || status === 403);
                });

              if (!verified) {
                addDiagnostic("API identity verification failed. Logging out.");
                await AsyncStorage.multiRemove([STORAGE_KEYS.session, STORAGE_KEYS.firebaseUser]);
                await logoutFromFirebaseProfile().catch(() => undefined);
                setSession(null);
                setUsers([]);
                return;
              }
            }

            const nextSession = {
              ...parsedSession,
              token: refreshedToken,
            };

            setSession(nextSession);
            await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(nextSession));
            addDiagnostic("Session restored and updated.");

            if (parsedFirebaseUser?.id === parsedSession.userId) {
              setUsers((current) => withOwnedContent(upsertUser(current, parsedFirebaseUser), reels, products));
            } else {
              try {
                addDiagnostic("Restoring user profile...");
                const firebaseProfile = await getFirebaseProfileById(parsedSession.userId);
                if (firebaseProfile) {
                  setUsers((current) => withOwnedContent(upsertUser(current, firebaseProfile), reels, products));
                  await AsyncStorage.setItem(STORAGE_KEYS.firebaseUser, JSON.stringify(firebaseProfile));
                }
              } catch (err) {
                addDiagnostic("Profile restore skipped. Using local cache.");
              }
            }

            addDiagnostic("Hydrating Firebase catalog...");
            await hydrateCatalogFromFirebase(parsedFirebaseUser ?? undefined).catch((err) => {
              addDiagnostic(`Catalog hydration failed: ${err instanceof Error ? err.message : "Unknown error"}`);
            });
          }
        } else if (parsedSession && (isAppApiConfigured() || Boolean(parsedFirebaseUser))) {
          addDiagnostic("Restoring local session.");
          setSession(parsedSession);
        }

        if (isAppApiConfigured() && !shouldUseFirebaseSession) {
          addDiagnostic("Hydrating API catalog...");
          await hydrateCatalogFromApi().catch(() => undefined);

          if (parsedSession && !shouldUseFirebaseSession) {
            addDiagnostic("Syncing session from API...");
            const synced = await hydrateSessionFromApi(parsedSession).catch(() => false);
            if (!synced) {
              addDiagnostic("API session sync failed. Resetting.");
              setSession(null);
              setStories([]);
              setPosts([]);
              setPostComments([]);
              setSavedPosts([]);
              setNotifications([]);
              setCommunities([]);
              setCommunityPosts([]);
              setCommunityChatMessages([]);
              setCommunityTypingById({});
              setDirectThreads([]);
              setDirectMessages([]);
              setDirectTypingByThread({});
              setMarketplaceThreads([]);
              setMarketplaceMessages([]);
              setMarketplaceTypingByThread({});
              setMarketplaceOrders([]);
              await AsyncStorage.removeItem(STORAGE_KEYS.session);
              await AsyncStorage.removeItem(STORAGE_KEYS.firebaseUser);
            }
          }
        }

        addDiagnostic("Bootstrap complete.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown fatal error";
        addDiagnostic(`Bootstrap failed: ${message}`);
        if (openedFromCache) {
          // The app is already open from the saved session; keep the user signed in and let the
          // live listeners catch up instead of wiping everything.
          return;
        }
        console.error("Sohba bootstrap failed. Falling back to clean local state.", error);
        setSession(null);
        setUsers([]);
        setStories([]);
        setPosts([]);
        setPostComments([]);
        setReels([]);
        setProducts([]);
        setCommunities([]);
        setCommunityPosts([]);
        setCommunityChatMessages([]);
        setCommunityTypingById({});
        setPresenceByUserId({});
        setDirectThreads([]);
        setDirectMessages([]);
        setDirectTypingByThread({});
        setComments([]);
        setNotifications([]);
        setSavedPosts([]);
        setMarketplaceThreads([]);
        setMarketplaceMessages([]);
        setMarketplaceTypingByThread({});
        setMarketplaceOrders([]);
        setActiveSubscription(null);
        setPushNotificationsStatus(DEFAULT_PUSH_NOTIFICATIONS_STATUS);
        setReelBoosts([]);
        await AsyncStorage.multiRemove([STORAGE_KEYS.session, STORAGE_KEYS.firebaseUser]);
      } finally {
        clearTimeout(startupSafetyTimer);
        setIsBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      clearTimeout(startupSafetyTimer);
    };
  }, []);

  const currentUser = users.find((item) => item.id === session?.userId) ?? null;
  const isAdmin = currentUser?.role === "admin";
  const googleSignInEnabled = isGoogleSignInConfigured();
  const googleSignInMessage = getGoogleSignInUnavailableMessage();

  async function completeFirebaseAuth(response: { token: string; user: User }) {
    const nextSession: AuthSession = {
      token: response.token,
      userId: response.user.id,
      provider: "firebase",
    };

    if (isAppApiConfigured()) {
      await fetchApiMe(nextSession.token);
    }

    setSession(nextSession);
    setUsers((current) => withOwnedContent(upsertUser(current, response.user), reels, products));
    setStories([]);
    setPosts([]);
    setPostComments([]);
    setSavedPosts([]);
    setNotifications([]);
    setCommunities([]);
    setCommunityPosts([]);
    setCommunityChatMessages([]);
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
  }

  async function completeSupabaseAuth(response: {
    token: string;
    refreshToken?: string;
    expiresAt?: number;
    user: User;
  }) {
    const nextSession: AuthSession = {
      token: response.token,
      userId: response.user.id,
      provider: "supabase",
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt,
    };

    if (isAppApiConfigured()) {
      await fetchApiMe(nextSession.token);
    }

    setSession(nextSession);
    setUsers((current) => withOwnedContent(upsertUser(current, response.user), reels, products));
    setStories([]);
    setPosts([]);
    setPostComments([]);
    setSavedPosts([]);
    setNotifications([]);
    setCommunities([]);
    setCommunityPosts([]);
    setCommunityChatMessages([]);
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
  }

  async function persistSessionSnapshot(nextSession: AuthSession) {
    setSession((current) =>
      current?.userId === nextSession.userId && current.token === nextSession.token ? current : nextSession
    );
    await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(nextSession));
  }

  async function resolveAccessToken(
    currentSession: AuthSession | null,
    options?: { allowStoredFallback?: boolean }
  ) {
    if (!currentSession?.token) {
      return null;
    }

    if (isSupabaseBackedSession(currentSession)) {
      const shouldRefresh = Boolean(
        currentSession.expiresAt && currentSession.expiresAt <= Math.floor(Date.now() / 1000) + 60
      );

      if (!shouldRefresh) {
        return currentSession.token;
      }

      const refreshedSession = currentSession.refreshToken
        ? await refreshSupabaseProfileSession(currentSession.refreshToken).catch(() => null)
        : null;

      if (refreshedSession?.token) {
        await persistSessionSnapshot({
          ...currentSession,
          token: refreshedSession.token,
          refreshToken: refreshedSession.refreshToken ?? currentSession.refreshToken,
          expiresAt: refreshedSession.expiresAt ?? currentSession.expiresAt,
        });
        return refreshedSession.token;
      }

      return options?.allowStoredFallback ? currentSession.token : null;
    }

    if (isFirebaseBackedSession(currentSession)) {
      const refreshedToken = await getCurrentFirebaseIdToken(true).catch(() => null);

      if (refreshedToken) {
        if (refreshedToken !== currentSession.token) {
          await persistSessionSnapshot({
            token: refreshedToken,
            userId: currentSession.userId,
          });
        }

        return refreshedToken;
      }

      return options?.allowStoredFallback ? currentSession.token : null;
    }

    return currentSession.token;
  }

  async function requireApiAccessToken(
    currentSession: AuthSession | null,
    missingMessage = "Backend session missing. Please log in again."
  ) {
    if (!currentSession?.token) {
      return {
        token: null,
        message: missingMessage,
      };
    }

    const token = await resolveAccessToken(currentSession);
    if (!token) {
      return {
        token: null,
        message: SESSION_REFRESH_MESSAGE,
      };
    }

    return {
      token,
      message: null,
    };
  }

  async function ensureFirebaseWriteSessionReady(
    currentSession: AuthSession | null,
    missingMessage = "Your Firebase session is still loading. Please log in again."
  ) {
    if (!currentSession?.token || !isFirebaseBackedSession(currentSession)) {
      return {
        token: null,
        message: missingMessage,
      };
    }

    const token = await resolveAccessToken(currentSession, { allowStoredFallback: true });
    if (!token) {
      return {
        token: null,
        message: "Your login session is still waking up. Please wait a moment and try again.",
      };
    }

    return {
      token,
      message: null,
    };
  }

  useEffect(() => {
    if (!session?.token || !isAppApiConfigured() || !isRealtimeConfigured()) {
      setPresenceByUserId({});
      disconnectRealtime();
      return;
    }

    let isCancelled = false;
    let cleanupSocket = () => {
      disconnectRealtime();
    };

    void (async () => {
      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (isCancelled || !accessTokenResult.token) {
          return;
        }

        const socket = connectRealtime(accessTokenResult.token);
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
          setMarketplaceMessages((current) =>
            mergeMarketplaceMessages(current, [mapApiMarketplaceMessageToMobile(payload.message)])
          );
          if (payload.message.senderId !== session.userId) {
            markMarketplaceThreadDelivered(payload.thread.id);
          }
        };

        const handleCommunityMessage = (payload: CommunityMessageRealtimeEvent) => {
          setUsers((current) => upsertRealtimeUser(current, payload.message.sender));
          setCommunityChatMessages((current) =>
            mergeCommunityChatMessages(current, [mapApiCommunityChatMessageToMobile(payload.message)])
          );
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
            setMarketplaceTypingByThread((current) =>
              updateTypingBucket(current, payload.threadId, payload.userId, payload.isTyping)
            );
            return;
          }

          setCommunityTypingById((current) => updateTypingBucket(current, payload.communityId, payload.userId, payload.isTyping));
        };

        const handleRead = (payload: ReadRealtimeEvent) => {
          if (payload.userId === session.userId) {
            return;
          }

          if (payload.conversationType === "direct") {
            setDirectMessages((current) =>
              applySeenStateToMessages(
                applyDeliveredStateToMessages(current, payload.messageIds, payload.userId),
                payload.messageIds,
                payload.userId
              )
            );
            return;
          }

          if (payload.conversationType === "marketplace") {
            setMarketplaceMessages((current) =>
              applySeenStateToMessages(
                applyDeliveredStateToMessages(current, payload.messageIds, payload.userId),
                payload.messageIds,
                payload.userId
              )
            );
            return;
          }

          setCommunityChatMessages((current) =>
            applySeenStateToMessages(
              applyDeliveredStateToMessages(current, payload.messageIds, payload.userId),
              payload.messageIds,
              payload.userId
            )
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

        const handleNotification = (payload: NotificationRealtimeEvent) => {
          if (!payload.notification) {
            return;
          }

          const nextNotification = mapApiNotificationToMobile(payload.notification);
          if (nextNotification.userId !== session.userId) {
            return;
          }

          setNotifications((current) => mergeNotificationsById([nextNotification], current));
        };

        const handleNotificationsReadAll = (payload: NotificationsReadAllRealtimeEvent) => {
          if (!Array.isArray(payload.notifications)) {
            return;
          }

          const nextNotifications = payload.notifications
            .map(mapApiNotificationToMobile)
            .filter((notification) => notification.userId === session.userId);
          if (nextNotifications.length === 0) {
            return;
          }

          setNotifications((current) => mergeNotificationsById(nextNotifications, current));
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
        socket.on("notification:new", handleNotification);
        socket.on("notification:read", handleNotification);
        socket.on("notifications:read-all", handleNotificationsReadAll);
        socket.on("presence:snapshot", handlePresenceSnapshot);
        socket.on("presence:update", handlePresenceUpdate);

        cleanupSocket = () => {
          socket.off("chat:direct-message", handleDirectMessage);
          socket.off("chat:marketplace-message", handleMarketplaceMessage);
          socket.off("chat:community-message", handleCommunityMessage);
          socket.off("chat:delivered", handleDelivered);
          socket.off("chat:typing", handleTyping);
          socket.off("chat:read", handleRead);
          socket.off("notification:new", handleNotification);
          socket.off("notification:read", handleNotification);
          socket.off("notifications:read-all", handleNotificationsReadAll);
          socket.off("presence:snapshot", handlePresenceSnapshot);
          socket.off("presence:update", handlePresenceUpdate);
          disconnectRealtime();
        };
      } catch (error) {
        console.warn("Sohba realtime startup was skipped for safety.", error);
        disconnectRealtime();
      }
    })();

    return () => {
      isCancelled = true;
      cleanupSocket();
    };
  }, [session?.token, session?.userId]);

  useEffect(() => {
    if (!isFirebaseBackedSession(session)) {
      return;
    }

    try {
      return subscribeToFirebaseEngagement({
        onUsers: (nextUsers) => {
          setUsers((current) => mergeUsersById(nextUsers, current));
        },
        onReels: (nextReels) => {
          setReels(mergeReelsById(nextReels, []));
        },
        onComments: (nextComments) => {
          setComments(mergeCommentsById(nextComments, []));
        },
      });
    } catch (error) {
      console.warn("Sohba engagement sync was skipped for safety.", error);
      return;
    }
  }, [session?.token]);

  useEffect(() => {
    if (!isFirebaseBackedSession(session)) {
      return;
    }

    try {
      return subscribeToFirebasePosts({
        onPosts: (nextPosts) => {
          setPosts(mergePostsById(nextPosts, []));
        },
        onComments: (nextComments) => {
          setPostComments(mergePostCommentsById(nextComments, []));
        },
      });
    } catch (error) {
      console.warn("Sohba post sync was skipped for safety.", error);
      return;
    }
  }, [session?.token]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      return;
    }

    try {
      return subscribeToFirebaseInbox(firebaseUserId, {
        onSavedPosts: setSavedPosts,
        onNotifications: setNotifications,
      });
    } catch (error) {
      console.warn("Sohba inbox sync was skipped for safety.", error);
      return;
    }
  }, [session?.token, session?.userId]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      return;
    }

    try {
      return subscribeToFirebaseChat(firebaseUserId, {
        onDirectThreads: setDirectThreads,
        onDirectMessages: setDirectMessages,
        onMarketplaceThreads: setMarketplaceThreads,
        onMarketplaceMessages: setMarketplaceMessages,
        onCommunityMessages: setCommunityChatMessages,
      });
    } catch (error) {
      console.warn("Sohba chat sync was skipped for safety.", error);
      return;
    }
  }, [session?.token, session?.userId]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      return;
    }

    try {
      return subscribeToFirebaseCommunityCommerce(firebaseUserId, {
        onCommunities: setCommunities,
        onCommunityPosts: setCommunityPosts,
        onMarketplaceOrders: setMarketplaceOrders,
      });
    } catch (error) {
      console.warn("Sohba community sync was skipped for safety.", error);
      return;
    }
  }, [session?.token, session?.userId]);

  useEffect(() => {
    const firebaseUserId = session?.userId;
    if (!firebaseUserId || !isFirebaseBackedSession(session)) {
      setActiveSubscription(null);
      return;
    }

    try {
      return subscribeToFirebaseMonetization(firebaseUserId, {
        onSubscription: (nextSubscription) => {
          setActiveSubscription(nextSubscription);
          setUsers((current) => applyPlanTypeToUsers(current, firebaseUserId, nextSubscription));
        },
        onBoosts: setReelBoosts,
      });
    } catch (error) {
      console.warn("Sohba monetization sync was skipped for safety.", error);
      return;
    }
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
      const [catalog, engagement, postsSnapshot, inbox, chat, communityCommerce, monetization] = await Promise.all([
        fetchFirebaseCatalogFromFirestore(),
        fetchFirebaseEngagementSnapshot(),
        fetchFirebasePostsSnapshot(),
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
      const nextStories = pruneStoriesForState(mergeStoriesById(catalog.stories, []));
      const nextPosts = mergePostsById(postsSnapshot.posts, []);
      const nextReels = mergeReelsById(catalog.reels, []);
      const nextProducts = mergeProductsById(catalog.products, []);

      setStories(nextStories);
      setPosts(nextPosts);
      setPostComments(mergePostCommentsById(postsSnapshot.comments, []));
      setReels(nextReels);
      setProducts(nextProducts);
      setComments(mergeCommentsById(engagement.comments, []));
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
    let profileWrite: Promise<unknown> = Promise.resolve();
    if (currentUser && currentUser.language !== languageValue) {
      setUsers((current) => current.map((user) => (user.id === currentUser.id ? { ...user, language: languageValue } : user)));
      if (isFirebaseBackedSession(session)) {
        profileWrite = updateFirebaseUserPreferences(currentUser.id, { language: languageValue }).catch(() => undefined);
      }
    }
    // Arabic and Urdu mirror the whole layout; switching direction needs one quick app reload.
    if (isRtlLanguage(languageValue) !== I18nManager.isRTL) {
      await Promise.race([profileWrite, new Promise((resolve) => setTimeout(resolve, 3000))]);
      await applyLayoutDirection(languageValue);
    }
  }

  async function submitReport(input: Omit<NewReportInput, "reporterId">) {
    if (!currentUser) {
      return { ok: false, message: "Log in to report content." };
    }
    try {
      const report = await createFirebaseReport({ ...input, reporterId: currentUser.id });
      setReports((current) => [report, ...current]);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "The report could not be sent." };
    }
  }

  async function refreshReports() {
    if (currentUser?.role !== "admin") {
      return;
    }
    try {
      const rows = await adminApi.reports();
      setReports(rows.map((row) => normalizeReport(row)).filter((row): row is ContentReport => Boolean(row)));
    } catch {
      // Keep what we have; the dashboard shows the error when it loads its own data.
    }
  }

  async function adminSetUserRole(userId: string, role: "admin" | "user") {
    try {
      await adminApi.setRole(userId, role);
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "The role could not be changed." };
    }
  }

  async function adminDeleteUserAccount(userId: string) {
    try {
      await adminApi.deleteUser(userId);
      setUsers((current) =>
        current
          .filter((user) => user.id !== userId)
          .map((user) => ({
            ...user,
            followers: user.followers.filter((id) => id !== userId),
            following: user.following.filter((id) => id !== userId),
          }))
      );
      setPosts((current) => current.filter((item) => item.userId !== userId));
      setReels((current) => current.filter((item) => item.userId !== userId));
      setStories((current) => current.filter((item) => item.userId !== userId));
      setProducts((current) => current.filter((item) => item.userId !== userId));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "The account could not be deleted." };
    }
  }

  // Ask the server whether this account is the owner/admin. The owner is promoted automatically.
  useEffect(() => {
    if (!currentUser?.id || !isFirebaseBackedSession(session)) {
      setIsOwner(false);
      return;
    }
    let active = true;
    const userId = currentUser.id;
    adminApi
      .me()
      .then((result) => {
        if (!active) {
          return;
        }
        setIsOwner(result.isOwner || Boolean(result.canManageRoles));
        if (result.isAdmin) {
          setUsers((current) => current.map((user) => (user.id === userId && user.role !== "admin" ? { ...user, role: "admin" } : user)));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentUser?.id, session?.token]);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      void refreshReports();
    }
  }, [currentUser?.role]);

  async function placeCall(calleeId: string, type: CallType) {
    const callCopy = getCopy(language);
    if (!currentUser) {
      return { ok: false, message: callCopy.callLoginRequired };
    }
    if (calleeId === currentUser.id) {
      return { ok: false, message: callCopy.callStartFailed };
    }
    const callee = users.find((user) => user.id === calleeId);
    if (callee?.isBanned) {
      return { ok: false, message: callCopy.callAccountUnavailable };
    }
    if (!isCallConnection(currentUser, calleeId, callee)) {
      return { ok: false, message: callCopy.callOnlyConnections };
    }
    try {
      const callId = await startCall({ callerId: currentUser.id, calleeId, type });
      void publishFirebaseNotification({
        userId: calleeId,
        type: "call",
        title: type === "video" ? `${currentUser.name} is video calling you` : `${currentUser.name} is calling you`,
        body: "Tap to answer on Sohba.",
        actor: currentUser,
        entityId: callId,
        dedupeId: `call-${callId}`,
      }).catch(() => undefined);
      return { ok: true, callId };
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      return { ok: false, message: code === "permission-denied" ? callCopy.callOnlyConnections : callCopy.callStartFailed };
    }
  }

  async function setRegion(regionValue: string) {
    if (!isKnownRegion(regionValue)) {
      return;
    }
    const nextRegion = regionValue.toUpperCase();
    setRegionState(nextRegion);
    await AsyncStorage.setItem(STORAGE_KEYS.region, nextRegion);
    if (currentUser && currentUser.region !== nextRegion) {
      setUsers((current) => current.map((user) => (user.id === currentUser.id ? { ...user, region: nextRegion } : user)));
      if (isFirebaseBackedSession(session)) {
        void updateFirebaseUserPreferences(currentUser.id, { region: nextRegion }).catch(() => undefined);
      }
    }
  }

  async function publishFirebaseNotification(input: Parameters<typeof createFirebaseNotification>[0]) {
    const accessToken = await resolveAccessToken(session);

    if (accessToken && isAppApiConfigured()) {
      const response = await deliverNotificationWithApi(accessToken, input);
      return response.notification ? mapApiNotificationToMobile(response.notification) : null;
    }

    if (!isAppApiConfigured()) {
      return createFirebaseNotification(input);
    }

    return null;
  }

  async function publishMentionNotifications(input: {
    text: string;
    entityType: "reel" | "post";
    entityId: string;
    dedupeSourceId: string;
  }) {
    if (!currentUser) {
      return;
    }

    const mentionedUsers = findMentionTargetsByUsername(input.text, users, [currentUser.id]);
    if (mentionedUsers.length === 0) {
      return;
    }

    await Promise.allSettled(
      mentionedUsers.map((mentionedUser) =>
        publishFirebaseNotification({
          userId: mentionedUser.id,
          type: "mention",
          title: `${currentUser.name} mentioned you in a comment`,
          body: truncateForNotification(input.text),
          actor: currentUser,
          entityType: input.entityType,
          entityId: input.entityId,
          dedupeId: `mention-${input.dedupeSourceId}-${mentionedUser.id}`,
        })
      )
    );
  }

  async function publishStoryViewNotification(story: Story) {
    if (!currentUser || story.userId === currentUser.id) {
      return;
    }

    await publishFirebaseNotification({
      userId: story.userId,
      type: "story_view",
      title: `${currentUser.name} viewed your story`,
      body: "Your story reached another viewer.",
      actor: currentUser,
      entityId: story.id,
      dedupeId: `story-view-${story.id}-${currentUser.id}`,
    }).catch(() => undefined);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await fetchCommunityActivityWithApi(accessTokenResult.token, communityId);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return;
      }
      const nextNotifications = await fetchNotificationsWithApi(accessTokenResult.token);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return;
      }
      const inbox = await fetchDirectInboxWithApi(accessTokenResult.token);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return;
      }
      const inbox = await fetchMarketplaceInboxWithApi(accessTokenResult.token);
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
        await completeFirebaseAuth(response);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseProfileErrorMessage(error, getCopy(language)) };
      }
    }

    if (isSupabaseAuthConfigured()) {
      try {
        const response = await loginWithSupabaseProfile(email, password);
        await completeSupabaseAuth(response);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getSupabaseProfileErrorMessage(error) };
      }
    }

    if (isAppApiConfigured()) {
      try {
        const response = await loginWithApi(email.trim(), password);
        const nextSession: AuthSession = {
          token: response.token,
          userId: response.user.id,
          provider: "api",
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

    return { ok: false, message: AUTH_UNAVAILABLE_MESSAGE };
  }

  async function continueWithGoogle() {
    if (!isFirebaseProfilesConfigured()) {
      return { ok: false, message: "Firebase Auth is not configured in this app yet." };
    }

    if (!googleSignInEnabled) {
      return { ok: false, message: googleSignInMessage ?? "Google sign-in is not available right now." };
    }

    try {
      const response = await continueWithFirebaseGoogleProfile(language ?? "en");
      await completeFirebaseAuth(response);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getFirebaseProfileErrorMessage(error, getCopy(language)) };
    }
  }

  async function register(payload: RegisterPayload) {
    if (isFirebaseProfilesConfigured()) {
      try {
        const response = await registerWithFirebaseProfile(payload, language ?? "en");
        await completeFirebaseAuth(response);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseProfileErrorMessage(error, getCopy(language)) };
      }
    }

    if (isSupabaseAuthConfigured()) {
      try {
        const response = await registerWithSupabaseProfile(payload, language ?? "en");
        await completeSupabaseAuth(response);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getSupabaseProfileErrorMessage(error) };
      }
    }

    if (isAppApiConfigured()) {
      try {
        const response = await registerWithApi({
          ...payload,
          language: language ?? "en",
        });
        const nextSession: AuthSession = {
          token: response.token,
          userId: response.user.id,
          provider: "api",
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

    return { ok: false, message: AUTH_UNAVAILABLE_MESSAGE };
  }

  async function logout() {
    const activeSession = session;
    if (isFirebaseProfilesConfigured()) {
      await logoutFromFirebaseProfile().catch(() => {
        // Local app state still needs to clear even if Firebase is already signed out.
      });
    }
    if (activeSession?.provider === "supabase") {
      await logoutFromSupabaseProfile(activeSession.token).catch(() => undefined);
    }

    setSession(null);
    setStories([]);
    setPosts([]);
    setPostComments([]);
    setSavedPosts([]);
    setNotifications([]);
    setCommunities([]);
    setCommunityPosts([]);
    setCommunityChatMessages([]);
    setCommunityTypingById({});
    setDirectThreads([]);
    setDirectMessages([]);
    setDirectTypingByThread({});
    setMarketplaceThreads([]);
    setMarketplaceMessages([]);
    setMarketplaceTypingByThread({});
    setMarketplaceOrders([]);
    await AsyncStorage.multiRemove([STORAGE_KEYS.session, STORAGE_KEYS.firebaseUser]);
  }

  function recordReelView(reelId: string) {
    if (!currentUser || !isFirebaseBackedSession(session)) {
      return;
    }

    const reel = reels.find((item) => item.id === reelId);
    if (!reel || reel.userId === currentUser.id) {
      return;
    }

    const countReach = !reachedReelIdsRef.current.has(reelId);
    reachedReelIdsRef.current.add(reelId);
    setReels((current) =>
      current.map((item) =>
        item.id === reelId
          ? { ...item, viewCount: item.viewCount + 1, reachCount: item.reachCount + (countReach ? 1 : 0) }
          : item
      )
    );
    void recordFirebaseReelView(reelId, { countReach }).catch(() => undefined);
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
            type: "reel_like",
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const updatedReel = await toggleLikeWithApi(accessTokenResult.token, reelId);
      const nextReel = mapApiReelToMobile(updatedReel, reels.find((item) => item.id === updatedReel.id));
      setReels((current) => upsertReel(current, nextReel));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function togglePostLike(postId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before liking a post." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const updatedPost = await toggleFirebasePostLike(currentUser.id, postId, posts.find((item) => item.id === postId));
        setPosts((current) => upsertPost(current, updatedPost));
        if (updatedPost.likedBy.includes(currentUser.id)) {
          await publishFirebaseNotification({
            userId: updatedPost.userId,
            type: "post_like",
            title: `${currentUser.name} liked your post`,
            body: truncateForNotification(updatedPost.caption || updatedPost.hashtags.map((tag) => `#${tag}`).join(" ")),
            actor: currentUser,
            entityType: "post",
            entityId: updatedPost.id,
            dedupeId: `post-like-${currentUser.id}-${updatedPost.id}`,
          }).catch(() => undefined);
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebasePostsErrorMessage(error) };
      }
    }

    setPosts((current) =>
      current.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const hasLiked = post.likedBy.includes(currentUser.id);
        return {
          ...post,
          likedBy: hasLiked ? post.likedBy.filter((item) => item !== currentUser.id) : [currentUser.id, ...post.likedBy],
        };
      })
    );
    return { ok: true };
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const updatedReel = await repostReelWithApi(accessTokenResult.token, reelId);
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

    const nextText = text.trim();

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([nextText])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const firebaseSessionResult = await ensureFirebaseWriteSessionReady(session);
      if (!firebaseSessionResult.token) {
        return { ok: false, message: firebaseSessionResult.message ?? SESSION_REFRESH_MESSAGE };
      }

      const createFirebaseComment = async () => {
        const newComment = await addFirebaseReelComment(reelId, currentUser, nextText);
        setComments((current) => mergeCommentsById([newComment], current));
        const targetReel = reels.find((item) => item.id === reelId);
        const mentionedUsers = findMentionTargetsByUsername(nextText, users, [currentUser.id]);
        if (targetReel) {
          if (targetReel.userId !== currentUser.id && !mentionedUsers.some((user) => user.id === targetReel.userId)) {
            await publishFirebaseNotification({
              userId: targetReel.userId,
              type: "reel_comment",
              title: `${currentUser.name} commented on your reel`,
              body: truncateForNotification(nextText),
              actor: currentUser,
              entityType: "reel",
              entityId: reelId,
            }).catch(() => undefined);
          }
        }
        await publishMentionNotifications({
          text: nextText,
          entityType: "reel",
          entityId: reelId,
          dedupeSourceId: newComment.id,
        });

        return newComment;
      };

      try {
        await createFirebaseComment();
        return { ok: true };
      } catch (error) {
        const nextMessage = getFirebaseEngagementErrorMessage(error);
        const looksLikeSessionProblem = /permission|auth|credential|login|session|unauth/i.test(nextMessage);

        if (looksLikeSessionProblem) {
          const retrySessionResult = await ensureFirebaseWriteSessionReady(session);
          if (!retrySessionResult.token) {
            return { ok: false, message: retrySessionResult.message ?? nextMessage };
          }

          try {
            await createFirebaseComment();
            return { ok: true };
          } catch (retryError) {
            return { ok: false, message: getFirebaseEngagementErrorMessage(retryError) };
          }
        }

        return { ok: false, message: getFirebaseEngagementErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([nextText])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const newComment: ReelComment = {
        id: `comment-${Date.now()}`,
        reelId,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.profileImage,
        text: nextText,
        createdAt: new Date().toISOString(),
      };

      setComments((current) => [newComment, ...current]);
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const created = await createCommentWithApi(accessTokenResult.token, reelId, nextText);
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
      await publishMentionNotifications({
        text: nextText,
        entityType: "reel",
        entityId: reelId,
        dedupeSourceId: newComment.id,
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function addPostComment(postId: string, text: string) {
    if (!currentUser || !text.trim()) {
      return { ok: false, message: "Comment is empty." };
    }

    const nextText = text.trim();
    if (containsSexualContent([nextText])) {
      return { ok: false, message: blockedUserContentMessage };
    }

    if (isFirebaseBackedSession(session)) {
      const firebaseSessionResult = await ensureFirebaseWriteSessionReady(session);
      if (!firebaseSessionResult.token) {
        return { ok: false, message: firebaseSessionResult.message ?? SESSION_REFRESH_MESSAGE };
      }

      try {
        const response = await addFirebasePostComment(postId, currentUser, nextText, posts.find((item) => item.id === postId));
        setPostComments((current) => mergePostCommentsById([response.comment], current));
        setPosts((current) => upsertPost(current, response.post));
        const mentionedUsers = findMentionTargetsByUsername(nextText, users, [currentUser.id]);
        if (response.post.userId !== currentUser.id && !mentionedUsers.some((user) => user.id === response.post.userId)) {
          await publishFirebaseNotification({
            userId: response.post.userId,
            type: "post_comment",
            title: `${currentUser.name} commented on your post`,
            body: truncateForNotification(nextText),
            actor: currentUser,
            entityType: "post",
            entityId: postId,
          }).catch(() => undefined);
        }
        await publishMentionNotifications({
          text: nextText,
          entityType: "post",
          entityId: postId,
          dedupeSourceId: response.comment.id,
        });
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebasePostsErrorMessage(error) };
      }
    }

    const nextComment: PostComment = {
      id: `post-comment-${Date.now()}`,
      postId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.profileImage,
      text: nextText,
      createdAt: new Date().toISOString(),
    };

    setPostComments((current) => [nextComment, ...current]);
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, commentCount: post.commentCount + 1 } : post))
    );
    await publishMentionNotifications({
      text: nextText,
      entityType: "post",
      entityId: postId,
      dedupeSourceId: nextComment.id,
    });
    return { ok: true };
  }

  async function deletePost(postId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before deleting a post." };
    }

    const targetPost = posts.find((item) => item.id === postId);
    if (!targetPost) {
      return { ok: false, message: "Post not found." };
    }

    if (targetPost.userId !== currentUser.id) {
      return { ok: false, message: "You can only delete your own post." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const response = await deleteFirebasePost(currentUser.id, postId);
        setPosts((current) => current.filter((item) => item.id !== response.deletedPostId));
        setPostComments((current) => current.filter((item) => !response.deletedCommentIds.includes(item.id)));
        setSavedPosts((current) => current.filter((item) => !(item.entityType === "post" && item.entityId === postId)));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebasePostsErrorMessage(error) };
      }
    }

    setPosts((current) => current.filter((item) => item.id !== postId));
    setPostComments((current) => current.filter((item) => item.postId !== postId));
    setSavedPosts((current) => current.filter((item) => !(item.entityType === "post" && item.entityId === postId)));
    return { ok: true };
  }

  async function deleteReel(reelId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before deleting a reel." };
    }

    const targetReel = reels.find((item) => item.id === reelId);
    if (!targetReel) {
      return { ok: false, message: "Reel not found." };
    }

    if (targetReel.userId !== currentUser.id) {
      return { ok: false, message: "You can only delete your own reel." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        await deleteFirebaseReel(currentUser.id, reelId, targetReel);
        removeReelLocally(reelId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      removeReelLocally(reelId);
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      await deleteReelWithApi(accessTokenResult.token, reelId);
      removeReelLocally(reelId);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  function updateRelatedReportStatus(entityType: ContentReport["entityType"], entityId: string, status: ContentReport["status"]) {
    reports
      .filter((report) => report.entityType === entityType && report.entityId === entityId && report.status !== status)
      .forEach((report) => void adminApi.setReportStatus(report.id, status).catch(() => undefined));
    setReports((current) =>
      current.map((report) =>
        report.entityType === entityType && report.entityId === entityId
          ? { ...report, status }
          : report
      )
    );
  }

  function removePostLocally(postId: string) {
    setPosts((current) => current.filter((item) => item.id !== postId));
    setPostComments((current) => current.filter((item) => item.postId !== postId));
    setSavedPosts((current) => current.filter((item) => !(item.entityType === "post" && item.entityId === postId)));
    setNotifications((current) => current.filter((item) => !(item.entityType === "post" && item.entityId === postId)));
    updateRelatedReportStatus("post", postId, "resolved");
  }

  function removeProductLocally(productId: string) {
    setProducts((current) => current.filter((item) => item.id !== productId));
    setSavedPosts((current) => current.filter((item) => !(item.entityType === "product" && item.entityId === productId)));
    setNotifications((current) => current.filter((item) => !(item.entityType === "product" && item.entityId === productId)));
    setMarketplaceThreads((current) => current.filter((item) => item.productId !== productId));
    setMarketplaceMessages((current) =>
      current.filter((message) => {
        const thread = marketplaceThreads.find((item) => item.id === message.threadId);
        return thread?.productId !== productId;
      })
    );
    setMarketplaceOrders((current) => current.filter((item) => item.productId !== productId));
    setUsers((current) =>
      current.map((user) => ({
        ...user,
        productIds: user.productIds.filter((id) => id !== productId),
      }))
    );
  }

  function removeReelLocally(reelId: string) {
    setReels((current) => current.filter((item) => item.id !== reelId));
    setComments((current) => current.filter((item) => item.reelId !== reelId));
    setSavedPosts((current) => current.filter((item) => !(item.entityType === "reel" && item.entityId === reelId)));
    setNotifications((current) => current.filter((item) => !(item.entityType === "reel" && item.entityId === reelId)));
    setReelBoosts((current) => current.filter((item) => item.reelId !== reelId));
    setUsers((current) =>
      current.map((user) => ({
        ...user,
        reelIds: user.reelIds.filter((id) => id !== reelId),
      }))
    );
    updateRelatedReportStatus("reel", reelId, "resolved");
  }

  function removeStoryLocally(storyId: string) {
    setStories((current) => current.filter((item) => item.id !== storyId));
    setNotifications((current) => current.filter((item) => item.entityId !== storyId));
    updateRelatedReportStatus("story", storyId, "resolved");
  }

  function requireAdminAccess() {
    if (!currentUser) {
      return { ok: false, message: "Login required before using admin controls." } as const;
    }

    if (currentUser.role !== "admin") {
      return { ok: false, message: "Only admin users can access this area." } as const;
    }

    return { ok: true } as const;
  }

  async function adminDeletePost(postId: string) {
    const access = requireAdminAccess();
    if (!access.ok) {
      return access;
    }

    const targetPost = posts.find((item) => item.id === postId);
    if (!targetPost) {
      return { ok: false, message: "Post not found." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        await deleteFirebasePostAsAdmin(postId);
        removePostLocally(postId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebasePostsErrorMessage(error) };
      }
    }

    removePostLocally(postId);
    return { ok: true };
  }

  async function adminDeleteReel(reelId: string) {
    const access = requireAdminAccess();
    if (!access.ok) {
      return access;
    }

    const targetReel = reels.find((item) => item.id === reelId);
    if (!targetReel) {
      return { ok: false, message: "Reel not found." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        await deleteFirebaseReelAsAdmin(reelId, targetReel);
        removeReelLocally(reelId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (session?.token && isAppApiConfigured()) {
      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }

        await deleteReelWithApi(accessTokenResult.token, reelId);
        removeReelLocally(reelId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    removeReelLocally(reelId);
    return { ok: true };
  }

  async function setUserBanStatus(userId: string, banned: boolean) {
    const access = requireAdminAccess();
    if (!access.ok) {
      return access;
    }

    if (currentUser?.id === userId && banned) {
      return { ok: false, message: "You cannot ban your own admin account." };
    }

    const targetUser = users.find((item) => item.id === userId);
    if (!targetUser) {
      return { ok: false, message: "User not found." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const updatedUser = await setFirebaseUserBanStatus(userId, banned);
        setUsers((current) => mergeUsersById([updatedUser], current));
        updateRelatedReportStatus("user", userId, banned ? "resolved" : "reviewed");
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseProfileErrorMessage(error, getCopy(language)) };
      }
    }

    if (session?.token && isAppApiConfigured()) {
      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }

        const updatedUser = mapApiUserToMobile(await setUserBanStatusWithApi(accessTokenResult.token, userId, banned), {
          existing: targetUser,
        });
        setUsers((current) => mergeUsersById([updatedUser], current));
        updateRelatedReportStatus("user", userId, banned ? "resolved" : "reviewed");
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              isBanned: banned,
              bannedAt: banned ? new Date().toISOString() : undefined,
            }
          : user
      )
    );
    updateRelatedReportStatus("user", userId, banned ? "resolved" : "reviewed");
    return { ok: true };
  }

  async function updateReportStatus(reportId: string, status: ContentReport["status"]) {
    const access = requireAdminAccess();
    if (!access.ok) {
      return access;
    }

    const targetReport = reports.find((item) => item.id === reportId);
    if (!targetReport) {
      return { ok: false, message: "Report not found." };
    }
    try {
      await adminApi.setReportStatus(reportId, status);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "The report could not be updated." };
    }

    setReports((current) =>
      current.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status,
            }
          : report
      )
    );
    return { ok: true };
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
      body: "You have a new follower on Sohba.",
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await toggleFollowWithApi(accessTokenResult.token, targetUserId);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const nextNotifications = await markAllNotificationsReadWithApi(accessTokenResult.token);
      setNotifications(nextNotifications.map(mapApiNotificationToMobile));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function markNotificationRead(notificationId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before updating notifications." };
    }

    const targetNotification = notifications.find((item) => item.id === notificationId && item.userId === currentUser.id);
    if (!targetNotification || targetNotification.readAt) {
      return { ok: true };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const nextNotification = await markFirebaseNotificationRead(currentUser.id, notificationId);
        setNotifications((current) =>
          current.map((notification) => (notification.id === notificationId ? nextNotification : notification))
        );
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseInboxErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const nextNotification = await markNotificationReadWithApi(accessTokenResult.token, notificationId);
      const mappedNotification = mapApiNotificationToMobile(nextNotification);
      setNotifications((current) =>
        current.map((notification) => (notification.id === notificationId ? mappedNotification : notification))
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function toggleSavePost(postId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before saving a post." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        const response = await toggleFirebaseSavedPost(currentUser.id, "post", postId);
        setSavedPosts((current) =>
          response.saved && response.savedPost
            ? upsertSavedPost(current, response.savedPost)
            : current.filter((item) => !(item.entityType === "post" && item.entityId === postId && item.userId === currentUser.id))
        );
        return { ok: true, saved: response.saved };
      } catch (error) {
        return { ok: false, message: getFirebaseInboxErrorMessage(error) };
      }
    }

    const result = toggleLocalSavedPost(savedPosts, currentUser.id, "post", postId);
    setSavedPosts(result.savedPosts);
    return { ok: true, saved: result.saved };
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await toggleSaveReelWithApi(accessTokenResult.token, reelId);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await toggleSaveProductWithApi(accessTokenResult.token, productId);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const updated = await updateProductListingStatusWithApi(accessTokenResult.token, productId, listingStatus);
      const nextProduct = mapApiProductToMobile(updated, products.find((item) => item.id === updated.id));
      setProducts((current) => current.map((item) => (item.id === nextProduct.id ? nextProduct : item)));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function deleteProduct(productId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before deleting a product." };
    }

    const targetProduct = products.find((item) => item.id === productId);
    if (!targetProduct) {
      return { ok: false, message: "Product not found." };
    }

    if (targetProduct.userId !== currentUser.id) {
      return { ok: false, message: "You can only delete your own listing." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        await deleteFirebaseProduct(currentUser.id, productId, targetProduct);
        removeProductLocally(productId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      removeProductLocally(productId);
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }

      await deleteProductWithApi(accessTokenResult.token, productId);
      removeProductLocally(productId);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await startDirectChatWithApi(accessTokenResult.token, targetUserId);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await fetchDirectThreadWithApi(accessTokenResult.token, threadId);
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

  async function sendDirectMessage(threadId: string, payload: CreateDirectMessagePayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before sending a direct message." };
    }

    const normalizedText = payload.text?.trim() ?? "";
    const hasMedia = Boolean(payload.mediaUri?.trim());
    if (!normalizedText && !hasMedia) {
      return { ok: false, message: "Add a message, photo, or video first." };
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
      if (containsSexualContent(normalizedText ? [normalizedText] : [])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      try {
        const firebaseSessionResult = await ensureFirebaseWriteSessionReady(
          session,
          "Login required before sending a direct message."
        );
        if (!firebaseSessionResult.token) {
          return { ok: false, message: firebaseSessionResult.message ?? SESSION_REFRESH_MESSAGE };
        }

        const preparedPayload = await prepareDirectMessagePayloadForSend({
          token: firebaseSessionResult.token,
          currentUser,
          payload,
        });
        const response = await sendFirebaseDirectMessage(targetThread, currentUser, {
          ...payload,
          ...preparedPayload,
          text: normalizedText,
        });
        setDirectThreads((current) => upsertDirectThread(current, response.thread));
        setDirectMessages((current) => mergeDirectMessages(current, [response.message]));
        await publishFirebaseNotification({
          userId: counterpartId,
          type: "message",
          title: `${currentUser.name} sent you a message`,
          body: buildDirectMessageNotificationBody(normalizedText, response.message.mediaType),
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
      if (containsSexualContent(normalizedText ? [normalizedText] : [])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const createdAt = new Date().toISOString();
      const nextMessage: DirectChatMessage = {
        id: `direct-message-${Date.now()}`,
        threadId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.profileImage,
        text: normalizedText,
        mediaType: payload.mediaType,
        mediaUrl: payload.mediaUri?.trim() || undefined,
        thumbnailUrl: payload.mediaThumbnailUri?.trim() || undefined,
        durationSeconds: payload.mediaDurationSeconds,
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
                  lastMessagePreview: buildDirectMessagePreview(nextMessage),
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const preparedPayload = await prepareDirectMessagePayloadForSend({
        token: accessTokenResult.token,
        currentUser,
        payload,
      });
      const response = await sendDirectMessageWithApi(accessTokenResult.token, threadId, {
        ...payload,
        ...preparedPayload,
        text: normalizedText,
      });
      const nextThread = mapApiDirectThreadToMobile(response.thread);
      const nextMessage = mapApiDirectMessageToMobile(
        response.message,
        users.find((user) => user.id === response.message.senderId)
      );
      setDirectThreads((current) => upsertDirectThread(current, nextThread));
      setDirectMessages((current) => mergeDirectMessages(current, [nextMessage]));
      await deliverNotificationWithApi(accessTokenResult.token, {
        userId: counterpartId,
        type: "message",
        title: `${currentUser.name} sent you a message`,
        body: buildDirectMessageNotificationBody(normalizedText, nextMessage.mediaType),
        conversationId: response.thread.id,
        conversationType: "direct",
      }).catch(() => undefined);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await startMarketplaceChatWithApi(accessTokenResult.token, productId);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await fetchMarketplaceThreadWithApi(accessTokenResult.token, threadId);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await sendMarketplaceMessageWithApi(accessTokenResult.token, threadId, text);
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await createMarketplaceOrderWithApi(accessTokenResult.token, payload);
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
      return { ok: false, message: "Pick a story photo or video first." };
    }

    const normalizedMediaType = payload.mediaType ?? (payload.videoUrl?.trim() ? "video" : "image");

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([payload.caption])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const firebaseSessionResult = await ensureFirebaseWriteSessionReady(
        session,
        "Login required before posting a story."
      );
      if (!firebaseSessionResult.token) {
        return { ok: false, message: firebaseSessionResult.message ?? SESSION_REFRESH_MESSAGE };
      }

      try {
        const publicIdPrefix = normalizeUploadPrefix(`${currentUser.username}-story`);
        const uploadedVideo =
          normalizedMediaType === "video" && payload.videoUrl?.trim()
            ? await uploadVideoSourceForFirebaseContent({
                token: firebaseSessionResult.token,
                source: payload.videoUrl,
                mimeType: payload.videoMimeType,
                fileName: payload.videoFileName,
                durationSeconds: payload.videoDurationSeconds,
                publicIdPrefix,
                editConfig: payload.editConfig,
              })
            : null;
        const imageUrl =
          normalizedMediaType === "video" && uploadedVideo
            ? payload.imageUrl.trim()
              ? await uploadImageSourceForFirebaseContent({
                  token: firebaseSessionResult.token,
                  source: payload.imageUrl,
                  folder: "stories",
                  publicIdPrefix: `${publicIdPrefix}-cover`,
                  label: "story cover",
                  editConfig: payload.editConfig,
                })
              : uploadedVideo.thumbnailUrl
            : await uploadImageSourceForFirebaseContent({
                token: firebaseSessionResult.token,
                source: payload.imageUrl,
                folder: "stories",
                publicIdPrefix,
                label: "story image",
                editConfig: payload.editConfig,
              });
        const story = await createFirebaseStory(currentUser.id, {
          ...payload,
          mediaType: normalizedMediaType,
          imageUrl,
          videoUrl: uploadedVideo?.videoUrl ?? undefined,
        });

        setStories((current) => [story, ...pruneStoriesForState(current.filter((item) => item.id !== story.id))]);
        return { ok: true, story };
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
        mediaType: normalizedMediaType,
        videoUrl: normalizedMediaType === "video" ? payload.videoUrl?.trim() || undefined : undefined,
        videoDurationSeconds: normalizedMediaType === "video" ? payload.videoDurationSeconds : undefined,
        caption: payload.caption?.trim() || undefined,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        viewerIds: [],
        highlightedAt: payload.saveToHighlights ? now.toISOString() : undefined,
        highlightLabel: payload.saveToHighlights
          ? payload.highlightLabel?.trim() || payload.caption?.trim() || "Highlight"
          : undefined,
      };

      setStories((current) => [story, ...pruneStoriesForState(current)]);
      return { ok: true, story };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }
        const publicIdPrefix = normalizeUploadPrefix(`${currentUser.username}-story`);
        const uploadedVideo =
          normalizedMediaType === "video" && payload.videoUrl?.trim()
            ? await uploadVideoSourceForFirebaseContent({
                token: accessTokenResult.token,
                source: payload.videoUrl,
                mimeType: payload.videoMimeType,
                fileName: payload.videoFileName,
                durationSeconds: payload.videoDurationSeconds,
                publicIdPrefix,
                editConfig: payload.editConfig,
              })
            : null;
        const imageUrl =
          normalizedMediaType === "video" && uploadedVideo
            ? payload.imageUrl.trim()
              ? await uploadImageSourceForFirebaseContent({
                  token: accessTokenResult.token,
                  source: payload.imageUrl,
                  folder: "stories",
                  publicIdPrefix: `${publicIdPrefix}-cover`,
                  label: "story cover",
                  editConfig: payload.editConfig,
                })
              : uploadedVideo.thumbnailUrl
            : await uploadImageSourceForFirebaseContent({
                token: accessTokenResult.token,
                source: payload.imageUrl,
                folder: "stories",
                publicIdPrefix,
                label: "story image",
                editConfig: payload.editConfig,
              });
        const created = await createStoryWithApi(accessTokenResult.token, {
          ...payload,
          mediaType: normalizedMediaType,
          imageUrl,
          videoUrl: uploadedVideo?.videoUrl ?? payload.videoUrl,
        });
        const nextStory = mapApiStoryToMobile(created);
        setStories((current) => [nextStory, ...pruneStoriesForState(current.filter((item) => item.id !== nextStory.id))]);
        return { ok: true, story: nextStory };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function markStoryViewed(storyId: string) {
    if (!currentUser) {
      return;
    }

    const targetStory = stories.find((item) => item.id === storyId);
    if (!targetStory || targetStory.userId === currentUser.id || targetStory.viewerIds.includes(currentUser.id)) {
      return;
    }

    const applyViewedState = (nextStory: Story) => {
      setStories((current) => current.map((item) => (item.id === nextStory.id ? nextStory : item)));
    };

    if (isFirebaseBackedSession(session)) {
      try {
        const nextStory = await markFirebaseStoryViewed(currentUser.id, storyId, targetStory);
        applyViewedState(nextStory);
        await publishStoryViewNotification(nextStory);
      } catch {
        applyViewedState({
          ...targetStory,
          viewerIds: [...targetStory.viewerIds, currentUser.id],
        });
      }
      return;
    }

    if (session?.token && isAppApiConfigured()) {
      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return;
        }

        const nextStory = mapApiStoryToMobile(await markStoryViewedWithApi(accessTokenResult.token, storyId));
        applyViewedState(nextStory);
        await publishStoryViewNotification(nextStory);
        return;
      } catch {
        // Fall back to local optimistic state below.
      }
    }

    applyViewedState({
      ...targetStory,
      viewerIds: [...targetStory.viewerIds, currentUser.id],
    });
  }

  async function deleteStory(storyId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before deleting a story." };
    }

    const targetStory = stories.find((item) => item.id === storyId);
    if (!targetStory) {
      return { ok: false, message: "Story not found." };
    }

    if (targetStory.userId !== currentUser.id) {
      return { ok: false, message: "You can only delete your own story." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        await deleteFirebaseStory(currentUser.id, storyId, targetStory);
        removeStoryLocally(storyId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (session?.token && isAppApiConfigured()) {
      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }

        await deleteStoryWithApi(accessTokenResult.token, storyId);
        removeStoryLocally(storyId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    removeStoryLocally(storyId);
    return { ok: true };
  }

  async function adminDeleteStory(storyId: string) {
    const access = requireAdminAccess();
    if (!access.ok) {
      return access;
    }

    const targetStory = stories.find((item) => item.id === storyId);
    if (!targetStory) {
      return { ok: false, message: "Story not found." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        await deleteFirebaseStoryAsAdmin(storyId, targetStory);
        removeStoryLocally(storyId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (session?.token && isAppApiConfigured()) {
      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }

        await deleteStoryWithApi(accessTokenResult.token, storyId);
        removeStoryLocally(storyId);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    removeStoryLocally(storyId);
    return { ok: true };
  }

  async function toggleStoryHighlight(
    storyId: string,
    payload?: { highlighted?: boolean; highlightLabel?: string }
  ) {
    if (!currentUser) {
      return { ok: false, message: "Login required before managing highlights." };
    }

    const targetStory = stories.find((item) => item.id === storyId);
    if (!targetStory) {
      return { ok: false, message: "Story not found." };
    }

    if (targetStory.userId !== currentUser.id) {
      return { ok: false, message: "You can only manage your own highlights." };
    }

    const highlighted = payload?.highlighted ?? !targetStory.highlightedAt;
    const highlightLabel = highlighted
      ? payload?.highlightLabel?.trim() || targetStory.highlightLabel || targetStory.caption || "Highlight"
      : undefined;

    const applyHighlight = (nextStory: Story) => {
      setStories((current) =>
        pruneStoriesForState(current.map((item) => (item.id === nextStory.id ? nextStory : item)))
      );
    };

    if (isFirebaseBackedSession(session)) {
      try {
        const nextStory = await updateFirebaseStoryHighlight(
          currentUser.id,
          storyId,
          { highlighted, highlightLabel },
          targetStory
        );
        applyHighlight(nextStory);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (session?.token && isAppApiConfigured()) {
      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }

        const nextStory = mapApiStoryToMobile(
          await updateStoryHighlightWithApi(accessTokenResult.token, storyId, { highlighted, highlightLabel })
        );
        applyHighlight(nextStory);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    applyHighlight({
      ...targetStory,
      highlightedAt: highlighted ? new Date().toISOString() : undefined,
      highlightLabel,
    });
    return { ok: true };
  }

  async function createPost(payload: CreatePostPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before publishing a post." };
    }

    if (payload.mediaItems.length === 0) {
      return { ok: false, message: "Add at least one photo or video first." };
    }

    const normalizedCaption = payload.caption.trim();
    const normalizedLocation = payload.location?.trim() || undefined;
    const normalizedHashtags = normalizePostHashtags(payload.hashtags, normalizedCaption);
    const moderationInputs = [
      normalizedCaption,
      normalizedLocation,
      ...normalizedHashtags.map((tag) => `#${tag}`),
      ...payload.mediaItems.map((item) => item.uri),
    ];

    if (containsSexualContent(moderationInputs)) {
      return { ok: false, message: blockedUserContentMessage };
    }

    const createLocalPost = () => {
      const createdAt = new Date().toISOString();
      const nextPost: Post = {
        id: `post-${Date.now()}`,
        userId: currentUser.id,
        caption: normalizedCaption,
        hashtags: normalizedHashtags,
        location: normalizedLocation,
        media: payload.mediaItems.map((item, index) => ({
          id: `post-media-${Date.now()}-${index + 1}`,
          type: item.type,
          url: item.uri.trim(),
          mimeType: item.mimeType,
          durationSeconds: item.durationSeconds,
        })),
        likedBy: [],
        commentCount: 0,
        createdAt,
      };

      setPosts((current) => upsertPost(current, nextPost));
      return { ok: true as const };
    };

    if (!isFirebaseBackedSession(session)) {
      return createLocalPost();
    }

    const firebaseSessionResult = await ensureFirebaseWriteSessionReady(
      session,
      "Login required before publishing a post."
    );
    if (!firebaseSessionResult.token) {
      return { ok: false, message: firebaseSessionResult.message ?? SESSION_REFRESH_MESSAGE };
    }

    try {
      const prefixBase = normalizeUploadPrefix(`${currentUser.username}-post-${Date.now()}`);
      const uploadedMedia: Post["media"] = [];

      for (let index = 0; index < payload.mediaItems.length; index += 1) {
        const item = payload.mediaItems[index];

        try {
          if (item.type === "video") {
            const uploadedVideo = await uploadPostVideoSourceForFirebaseContent({
              token: firebaseSessionResult.token,
              source: item.uri,
              label: `post video ${index + 1}`,
              mimeType: item.mimeType,
              fileName: item.fileName,
              durationSeconds: item.durationSeconds,
              publicIdPrefix: buildUploadPublicIdPrefix(prefixBase, `video-${index + 1}`),
              editConfig: item.editConfig,
            });

            uploadedMedia.push({
              id: `${prefixBase}-media-${index + 1}`,
              type: "video",
              url: uploadedVideo.videoUrl,
              thumbnailUrl: uploadedVideo.thumbnailUrl,
              mimeType: item.mimeType || "video/mp4",
              durationSeconds: item.durationSeconds,
            });
            continue;
          }

          const imageUrl = await uploadPostImageSourceForFirebaseContent({
            token: firebaseSessionResult.token,
            source: item.uri,
            publicIdPrefix: buildUploadPublicIdPrefix(prefixBase, `image-${index + 1}`),
            label: `post image ${index + 1}`,
            mimeType: item.mimeType,
            fileName: item.fileName,
            editConfig: item.editConfig,
          });

          uploadedMedia.push({
            id: `${prefixBase}-media-${index + 1}`,
            type: "image",
            url: imageUrl,
            mimeType: item.mimeType || "image/jpeg",
          });
        } catch (mediaError) {
          throw new Error(`Media ${index + 1} could not be uploaded. ${readUploadErrorMessage(mediaError)}`);
        }
      }

      const createdPost = await createFirebasePost(currentUser.id, {
        caption: normalizedCaption,
        hashtags: normalizedHashtags,
        location: normalizedLocation,
        media: uploadedMedia,
      });

      setPosts((current) => upsertPost(current, createdPost));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getFirebasePostsErrorMessage(error) };
    }
  }

  async function createReel(payload: CreateReelPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before posting a reel." };
    }

    const normalizedCaption = payload.caption.trim();
    const normalizedTags = normalizeReelHashtags(payload.hashtags, normalizedCaption);

    if (!payload.videoUrl.trim()) {
      return { ok: false, message: "Pick or paste a reel video first." };
    }

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([normalizedCaption, payload.videoUrl, payload.thumbnailUrl, ...normalizedTags.map((tag) => `#${tag}`)])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      if (!session?.token) {
        return { ok: false, message: "Firebase session missing. Please log in again." };
      }

      try {
        const token = await resolveAccessToken(session);
        if (!token) {
          return { ok: false, message: SESSION_REFRESH_MESSAGE };
        }
        const uploadedVideo = await uploadVideoSourceForFirebaseContent({
          token,
          source: payload.videoUrl,
          mimeType: payload.videoMimeType,
          fileName: payload.videoFileName,
          durationSeconds: payload.videoDurationSeconds,
          publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-reel`),
          editConfig: payload.editConfig,
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
              editConfig: payload.editConfig,
            })
          : uploadedVideo.thumbnailUrl;
        const newReel = await createFirebaseReel(currentUser.id, {
          ...payload,
          caption: normalizedCaption,
          hashtags: normalizedTags,
          videoUrl: uploadedVideo.videoUrl,
          thumbnailUrl,
        });
        const nextReels = [newReel, ...reels.filter((item) => item.id !== newReel.id)];

        setReels(nextReels);
        setUsers((current) => withOwnedContent(upsertUser(current, currentUser), nextReels, products));
        return { ok: true, reel: newReel };
      } catch (error) {
        return { ok: false, message: getFirebaseContentErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      if (containsSexualContent([normalizedCaption, payload.videoUrl, payload.thumbnailUrl, ...normalizedTags.map((tag) => `#${tag}`)])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const newReel: Reel = {
        id: `reel-${Date.now()}`,
        userId: currentUser.id,
        videoUrl: payload.videoUrl.trim(),
        caption: normalizedCaption,
        thumbnailUrl:
          payload.thumbnailUrl.trim() ||
          MEDIA_UNAVAILABLE_IMAGE,
        createdAt: new Date().toISOString(),
        tags: normalizedTags.length > 0 ? normalizedTags : ["new", "creator"],
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
      return { ok: true, reel: newReel };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

      try {
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }
        const uploadedVideo = await uploadVideoSourceForFirebaseContent({
          token: accessTokenResult.token,
          source: payload.videoUrl,
          mimeType: payload.videoMimeType,
          fileName: payload.videoFileName,
          durationSeconds: payload.videoDurationSeconds,
          publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-reel`),
          editConfig: payload.editConfig,
        });
        const thumbnailUrl = payload.thumbnailUrl.trim()
          ? await uploadImageSourceForFirebaseContent({
              token: accessTokenResult.token,
              source: payload.thumbnailUrl,
              folder: "reels",
              publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-reel-thumb`),
              label: "reel thumbnail",
              mimeType: payload.thumbnailMimeType,
              fileName: payload.thumbnailFileName,
              editConfig: payload.editConfig,
            })
          : uploadedVideo.thumbnailUrl;
        const created = await createReelWithApi(accessTokenResult.token, {
          ...payload,
          caption: normalizedCaption,
          hashtags: normalizedTags,
          videoUrl: uploadedVideo.videoUrl,
          thumbnailUrl,
        });
        const mappedReel = mapApiReelToMobile(created, reels.find((item) => item.id === created.id));
        const nextReel = {
          ...mappedReel,
          tags: normalizedTags.length > 0 ? normalizedTags : mappedReel.tags,
        };
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
            website: currentUser.website,
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
      return { ok: true, reel: nextReel };
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
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }
        const response = await createSubscriptionCheckoutSessionWithApi(accessTokenResult.token, planType);
        await openCheckoutUrl(response.checkoutUrl);
        return {
          ok: true,
          message: `Secure Stripe checkout opened. Your ${planType} plan will activate automatically after payment is confirmed.`,
        };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    return { ok: false, message: PAYMENTS_UNAVAILABLE_MESSAGE };
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
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }
        const response = await createBoostCheckoutSessionWithApi(accessTokenResult.token, payload);
        await openCheckoutUrl(response.checkoutUrl);
        return {
          ok: true,
          message: `${selectedPlan.title} checkout opened. Your boost will go live automatically after Stripe confirms payment.`,
        };
      } catch (error) {
        return { ok: false, message: getApiErrorMessage(error) };
      }
    }

    return { ok: false, message: PAYMENTS_UNAVAILABLE_MESSAGE };
  }

  async function createProduct(inputPayload: CreateProductPayload) {
    if (!currentUser) {
      return { ok: false, message: "Login required before posting a product." };
    }
    const payload: CreateProductPayload = {
      ...inputPayload,
      currency: inputPayload.currency ?? getRegion(region).currency,
      region: inputPayload.region ?? region,
    };

    if (isFirebaseBackedSession(session)) {
      if (containsSexualContent([payload.title, payload.description, payload.category, payload.location, ...payload.imageUrls])) {
        return { ok: false, message: blockedUserContentMessage };
      }

      if (!session?.token) {
        return { ok: false, message: "Firebase session missing. Please log in again." };
      }

      try {
        const token = await resolveAccessToken(session);
        if (!token) {
          return { ok: false, message: SESSION_REFRESH_MESSAGE };
        }
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
          MEDIA_UNAVAILABLE_IMAGE,
        imageUrls:
          payload.imageUrls.length > 0
            ? payload.imageUrls.map((item) => item.trim()).filter(Boolean)
            : [MEDIA_UNAVAILABLE_IMAGE],
        category: payload.category.trim() || "Home Goods",
        condition: payload.condition,
        location: payload.location.trim(),
        listingStatus: "available",
        currency: payload.currency,
        region: payload.region,
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
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }
        const imageUrls = await Promise.all(
          payload.imageUrls.map((imageUrl, index) =>
            uploadImageSourceForFirebaseContent({
              token: accessTokenResult.token,
              source: imageUrl,
              folder: "products",
              publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-product-${index + 1}`),
              label: `product image ${index + 1}`,
            })
          )
        );
        const created = await createProductWithApi(accessTokenResult.token, {
          ...payload,
          imageUrls,
        });
        const nextProduct: Product = {
          ...mapApiProductToMobile(created, products.find((item) => item.id === created.id)),
          currency: payload.currency,
          region: payload.region,
        };
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
            website: currentUser.website,
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
        const token = await resolveAccessToken(session);
        if (!token) {
          return { ok: false, message: SESSION_REFRESH_MESSAGE };
        }
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
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }
        const coverImage = await uploadImageSourceForFirebaseContent({
          token: accessTokenResult.token,
          source: payload.coverImage,
          folder: "communities",
          publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-${payload.kind}`),
          label: "community cover image",
        });
        const created = await createCommunityWithApi(accessTokenResult.token, {
          ...payload,
          coverImage,
        });
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
        const token = await resolveAccessToken(session);
        if (!token) {
          return { ok: false, message: SESSION_REFRESH_MESSAGE };
        }
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
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }
        const imageUrl = payload.imageUrl?.trim()
          ? await uploadImageSourceForFirebaseContent({
              token: accessTokenResult.token,
              source: payload.imageUrl,
              folder: "communities",
              publicIdPrefix: normalizeUploadPrefix(`${currentUser.username}-community-post`),
              label: "community post image",
            })
          : undefined;
        const response = await createCommunityPostWithApi(accessTokenResult.token, {
          ...payload,
          imageUrl,
        });
        const nextPost = mapApiCommunityPostToMobile(response.post, users.find((user) => user.id === response.post.authorId));
        setCommunityPosts((current) => mergeCommunityPosts(current, [nextPost]));
        return { ok: true };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }

  async function deleteCommunityPost(communityId: string, postId: string) {
    if (!currentUser) {
      return { ok: false, message: "Login required before deleting a community post." };
    }

    const targetPost = communityPosts.find((item) => item.id === postId && item.communityId === communityId);
    if (!targetPost) {
      return { ok: false, message: "Community post not found." };
    }

    if (targetPost.authorId !== currentUser.id) {
      return { ok: false, message: "You can only delete your own community post." };
    }

    if (isFirebaseBackedSession(session)) {
      try {
        await deleteFirebaseCommunityPost(currentUser.id, postId, targetPost);
        setCommunityPosts((current) => current.filter((item) => item.id !== postId));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseCommunityCommerceErrorMessage(error) };
      }
    }

    if (!isAppApiConfigured()) {
      setCommunityPosts((current) => current.filter((item) => item.id !== postId));
      return { ok: true };
    }

    if (!session?.token) {
      return { ok: false, message: "Backend session missing. Please log in again." };
    }

    try {
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }

      await deleteCommunityPostWithApi(accessTokenResult.token, communityId, postId);
      setCommunityPosts((current) => current.filter((item) => item.id !== postId));
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
      const accessTokenResult = await requireApiAccessToken(session);
      if (!accessTokenResult.token) {
        return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
      }
      const response = await sendCommunityChatMessageWithApi(accessTokenResult.token, communityId, text);
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

    const normalizedUsername = normalizeUsernameInput(payload.username);
    const usernameValidationMessage = getUsernameValidationMessage(normalizedUsername);
    if (usernameValidationMessage) {
      return { ok: false, message: usernameValidationMessage };
    }

    const normalizedWebsite = normalizeWebsiteInput(payload.website);
    const websiteValidationMessage = getWebsiteValidationMessage(normalizedWebsite);
    if (websiteValidationMessage) {
      return { ok: false, message: websiteValidationMessage };
    }

    if (isFirebaseProfilesConfigured() && !isLegacyLocalAccessToken(session?.token ?? "")) {
      if (
        containsSexualContent([
          payload.name,
          normalizedUsername,
          payload.bio,
          payload.headline,
          normalizedWebsite,
          isDataUrl(payload.profileImage) ? "" : payload.profileImage,
        ])
      ) {
        return { ok: false, message: blockedUserContentMessage };
      }

      const firebaseSessionResult = await ensureFirebaseWriteSessionReady(
        session,
        "Login required before updating your profile."
      );
      if (!firebaseSessionResult.token) {
        return { ok: false, message: firebaseSessionResult.message ?? SESSION_REFRESH_MESSAGE };
      }

      try {
        let nextProfileImage = payload.profileImage.trim() || currentUser.profileImage;
        let nextToken = firebaseSessionResult.token;

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
          nextProfileImage = appendCacheBust(uploadedPhoto.adaptiveUrl || uploadedPhoto.secureUrl);
        }

        const nextUser = await updateFirebaseUserProfile(currentUser.id, {
          ...payload,
          username: normalizedUsername,
          website: normalizedWebsite,
          profileImage: nextProfileImage,
        });
        const nextSession: AuthSession = {
          token: nextToken,
          userId: session?.userId ?? currentUser.id,
        };

        setSession(nextSession);
        setUsers((current) => withOwnedContent(upsertUser(current, nextUser), reels, products));
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.session, JSON.stringify(nextSession)],
          [STORAGE_KEYS.firebaseUser, JSON.stringify(nextUser)],
        ]);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getFirebaseProfileErrorMessage(error, getCopy(language)) };
      }
    }

    if (!isAppApiConfigured()) {
      if (
        containsSexualContent([
          normalizedUsername,
          payload.bio,
          payload.headline,
          normalizedWebsite,
          isDataUrl(payload.profileImage) ? "" : payload.profileImage,
        ])
      ) {
        return { ok: false, message: blockedUserContentMessage };
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === currentUser.id
            ? {
                ...user,
                name: payload.name.trim(),
                username: normalizedUsername,
                bio: payload.bio.trim(),
                headline: payload.headline.trim(),
                website: normalizedWebsite,
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
        const accessTokenResult = await requireApiAccessToken(session);
        if (!accessTokenResult.token) {
          return { ok: false, message: accessTokenResult.message ?? SESSION_REFRESH_MESSAGE };
        }
        const profileImage = payload.profileImage.trim()
          ? await uploadImageSourceForFirebaseContent({
              token: accessTokenResult.token,
              source: payload.profileImage,
              folder: "profile",
              publicIdPrefix: normalizeUploadPrefix(payload.username || currentUser.username),
              label: "profile photo",
            })
          : "";
        const updatedProfile = await updateProfileWithApi(accessTokenResult.token, {
          ...payload,
          username: normalizedUsername,
          website: normalizedWebsite,
          profileImage: profileImage ? appendCacheBust(profileImage) : profileImage,
        });
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

  function getPostById(postId: string) {
    return posts.find((item) => item.id === postId);
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

  function getCommentsForPost(postId: string) {
    return postComments
      .filter((item) => item.postId === postId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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

  function isPostSaved(postId: string) {
    return Boolean(currentUser && savedPosts.some((item) => item.userId === currentUser.id && item.entityType === "post" && item.entityId === postId));
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
        region,
        localeTag,
        session,
        currentUser,
        users,
        stories,
        posts,
        postComments,
        reels,
        products,
        communities,
        communityPosts,
        communityChatMessages,
        directThreads,
        directMessages,
        comments,
        notifications,
        reports,
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
          setRegion,
          placeCall,
          isOwner,
          submitReport,
          refreshReports,
          adminSetUserRole,
          adminDeleteUserAccount,
          login,
          continueWithGoogle,
          register,
          logout,
          googleSignInEnabled,
          googleSignInMessage,
          isAdmin,
          markAllNotificationsRead,
          markNotificationRead,
        toggleLike,
        repostReel,
        recordReelView,
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
        markStoryViewed,
        deleteStory,
        deleteReel,
        adminDeleteStory,
        toggleStoryHighlight,
        createPost,
        createReel,
        subscribeToPlan,
        boostReel,
        createProduct,
        deleteProduct,
        createCommunity,
        createCommunityPost,
        deleteCommunityPost,
        markCommunityChatRead,
        setCommunityTyping,
        sendCommunityChatMessage,
        updateProfile,
        togglePostLike,
        addPostComment,
        deletePost,
        adminDeletePost,
        adminDeleteReel,
        setUserBanStatus,
        updateReportStatus,
        toggleSavePost,
        getUserById,
        getPostById,
        getCommentsForPost,
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
        isPostSaved,
        isReelSaved,
        isProductSaved,
        markDirectThreadRead,
        setDirectTyping,
        markMarketplaceThreadRead,
        setMarketplaceTyping,
        startupDiagnostics,
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

function parseStoredSession(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as AuthSession;
    return parsed?.token && parsed?.userId ? parsed : null;
  } catch {
    return null;
  }
}

function isLegacyLocalAccessToken(token: string) {
  return token.startsWith("viraflow-token-");
}

function isFirebaseBackedSession(session: AuthSession | null) {
  if (session?.provider) {
    return session.provider === "firebase";
  }

  return Boolean(
    session?.token && isFirebaseProfilesConfigured() && !isLegacyLocalAccessToken(session.token)
  );
}

function isSupabaseBackedSession(session: AuthSession | null) {
  return session?.provider === "supabase";
}

function isDataUrl(value: string) {
  return value.trim().startsWith("data:");
}

function normalizeUploadPrefix(value: string) {
  return (value.trim().replace(/\s+/g, "-").replace(/^@+/, "").toLowerCase() || `upload-${Date.now()}`).slice(0, 60);
}

function buildUploadPublicIdPrefix(base: string, suffix: string) {
  const normalizedSuffix = normalizeUploadPrefix(suffix);
  const normalizedBase = normalizeUploadPrefix(base);
  const maxLength = 60;
  const baseLength = Math.max(0, maxLength - normalizedSuffix.length - 1);
  const trimmedBase = normalizedBase.slice(0, baseLength).replace(/-+$/g, "");

  return (trimmedBase ? `${trimmedBase}-${normalizedSuffix}` : normalizedSuffix).slice(0, maxLength);
}

function truncateForNotification(value: string, maxLength = 92) {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}...` : trimmed;
}

function findMentionTargetsByUsername(text: string, users: User[], excludedIds: string[] = []) {
  const usernames = text.match(/@([a-zA-Z0-9_.]+)/g)?.map((match) => match.slice(1).toLowerCase()) ?? [];
  if (usernames.length === 0) {
    return [];
  }

  const excluded = new Set(excludedIds);
  const seen = new Set<string>();

  return users.filter((user) => {
    const normalizedUsername = user.username.trim().toLowerCase();
    if (!normalizedUsername || excluded.has(user.id) || seen.has(user.id) || !usernames.includes(normalizedUsername)) {
      return false;
    }

    seen.add(user.id);
    return true;
  });
}

function normalizePostHashtags(values: string[], caption: string) {
  const fromCaption = caption.match(/#[a-zA-Z0-9_]+/g)?.map((tag) => tag.replace("#", "").toLowerCase()) ?? [];
  return [...new Set([...values, ...fromCaption].map((item) => item.trim().replace(/^#+/, "").toLowerCase()).filter(Boolean))].slice(0, 8);
}

function normalizeReelHashtags(values: string[] | undefined, caption: string) {
  const provided = values ?? [];
  const fromCaption = caption.match(/#[a-zA-Z0-9_]+/g)?.map((tag) => tag.replace("#", "").toLowerCase()) ?? [];
  return [...new Set([...provided, ...fromCaption].map((item) => item.trim().replace(/^#+/, "").toLowerCase()).filter(Boolean))].slice(0, 6);
}

async function uploadImageSourceForFirebaseContent(input: {
  token: string;
  source: string;
  folder: MediaFolder;
  publicIdPrefix: string;
  label: string;
  mimeType?: string;
  fileName?: string;
  editConfig?: CreatePostPayload["mediaItems"][number]["editConfig"];
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
    return buildCloudinaryEditedImageUrl(uploaded.secureUrl, input.editConfig);
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
    return buildCloudinaryEditedImageUrl(uploaded.secureUrl, input.editConfig);
  }

  if (isHttpUrl(source)) {
    await checkUploadedMediaSafety({
      token: input.token,
      type: "image",
      url: source,
      label: input.label,
    });
    return source.includes("/image/upload/") ? buildCloudinaryEditedImageUrl(source, input.editConfig) : source;
  }

  throw new Error("Use a valid image file or image URL.");
}

async function uploadPostImageSourceForFirebaseContent(input: Omit<Parameters<typeof uploadImageSourceForFirebaseContent>[0], "folder">) {
  try {
    return await uploadImageSourceForFirebaseContent({
      ...input,
      folder: POST_UPLOAD_FOLDER,
    });
  } catch (error) {
    if (!isCloudinarySignatureError(error)) {
      throw error;
    }

    return uploadImageSourceForFirebaseContent({
      ...input,
      folder: POST_UPLOAD_FALLBACK_FOLDER,
    });
  }
}

async function uploadVideoSourceForFirebaseContent(input: {
  token: string;
  source: string;
  folder?: MediaFolder;
  label?: string;
  publicIdPrefix: string;
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
  editConfig?: CreateReelPayload["editConfig"];
}) {
  ensureMediaApiConfigured();
  const source = input.source.trim();
  const mediaLabel = input.label?.trim() || "reel video";

  if (!source) {
    throw new Error(`Pick or paste a ${mediaLabel} first.`);
  }

  if (isLocalMediaUri(source)) {
    const uploaded = await uploadMediaToCloudinary({
      token: input.token,
      uri: source,
      mimeType: input.mimeType || inferMimeTypeFromUri(source, "video/mp4"),
      fileName: input.fileName || inferFileNameFromUri(source, "reel.mp4"),
      folder: input.folder ?? "reels",
      publicIdPrefix: input.publicIdPrefix,
      resourceType: "video",
    });
    await checkUploadedMediaSafety({
      token: input.token,
      type: "video",
      url: uploaded.secureUrl,
      label: mediaLabel,
      seconds: normalizeMediaModerationSeconds(input.durationSeconds ?? uploaded.duration ?? 12),
    });

    const videoDuration = input.durationSeconds ?? uploaded.duration;

    return {
      videoUrl: buildCloudinaryEditedVideoUrl(uploaded.secureUrl, input.editConfig, {
        durationSeconds: videoDuration,
      }),
      thumbnailUrl: buildCloudinaryVideoThumbnailUrl(uploaded.secureUrl, {
        editConfig: input.editConfig,
        durationSeconds: videoDuration,
      }),
    };
  }

  if (isHttpUrl(source)) {
    await checkUploadedMediaSafety({
      token: input.token,
      type: "video",
      url: source,
      label: mediaLabel,
      seconds: normalizeMediaModerationSeconds(input.durationSeconds),
    });

    return {
      videoUrl: source.includes("/video/upload/")
        ? buildCloudinaryEditedVideoUrl(source, input.editConfig, { durationSeconds: input.durationSeconds })
        : source,
      thumbnailUrl: buildCloudinaryVideoThumbnailUrl(source, {
        editConfig: input.editConfig,
        durationSeconds: input.durationSeconds,
      }),
    };
  }

  throw new Error("Use a valid video file or video URL.");
}

async function uploadPostVideoSourceForFirebaseContent(input: Omit<Parameters<typeof uploadVideoSourceForFirebaseContent>[0], "folder">) {
  try {
    return await uploadVideoSourceForFirebaseContent({
      ...input,
      folder: POST_UPLOAD_FOLDER,
    });
  } catch (error) {
    if (!isCloudinarySignatureError(error)) {
      throw error;
    }

    return uploadVideoSourceForFirebaseContent({
      ...input,
      folder: POST_UPLOAD_FALLBACK_FOLDER,
    });
  }
}

async function prepareDirectMessagePayloadForSend(input: {
  token: string;
  currentUser: User;
  payload: CreateDirectMessagePayload;
}) {
  const mediaUri = input.payload.mediaUri?.trim();
  if (!mediaUri) {
    return {
      mediaUri: undefined,
      mediaThumbnailUri: undefined,
      mediaType: undefined,
      mediaDurationSeconds: undefined,
    };
  }

  const mediaType = resolveDirectMessageMediaType(input.payload);
  if (mediaType === "video") {
    const uploadedVideo = await uploadVideoSourceForFirebaseContent({
      token: input.token,
      source: mediaUri,
      folder: "messages",
      label: "direct message video",
      publicIdPrefix: normalizeUploadPrefix(`${input.currentUser.username}-direct-video`),
      mimeType: input.payload.mediaMimeType,
      fileName: input.payload.mediaFileName,
      durationSeconds: input.payload.mediaDurationSeconds,
    });

    return {
      mediaUri: uploadedVideo.videoUrl,
      mediaThumbnailUri: uploadedVideo.thumbnailUrl,
      mediaType,
      mediaDurationSeconds: input.payload.mediaDurationSeconds,
    };
  }

  const uploadedImage = await uploadImageSourceForFirebaseContent({
    token: input.token,
    source: mediaUri,
    folder: "messages",
    publicIdPrefix: normalizeUploadPrefix(`${input.currentUser.username}-direct-image`),
    label: "direct message image",
    mimeType: input.payload.mediaMimeType,
    fileName: input.payload.mediaFileName,
  });

  return {
    mediaUri: uploadedImage,
    mediaThumbnailUri: undefined,
    mediaType: "image" as const,
    mediaDurationSeconds: undefined,
  };
}

function resolveDirectMessageMediaType(payload: CreateDirectMessagePayload) {
  if (payload.mediaType) {
    return payload.mediaType;
  }

  if (payload.mediaMimeType?.startsWith("video/")) {
    return "video" as const;
  }

  if (payload.mediaUri && /\.(mp4|mov|m4v|webm)(\?|$)/i.test(payload.mediaUri)) {
    return "video" as const;
  }

  return "image" as const;
}

function buildDirectMessagePreview(message: Pick<DirectChatMessage, "text" | "mediaType">) {
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

function buildDirectMessageNotificationBody(text: string, mediaType?: DirectChatMessage["mediaType"]) {
  if (text.trim()) {
    return truncateForNotification(text);
  }

  return mediaType === "video" ? "Sent you a video." : "Sent you a photo.";
}

function ensureMediaApiConfigured() {
  if (!isMediaApiConfigured()) {
    throw new Error("Cloudinary uploads need EXPO_PUBLIC_API_BASE_URL in mobile/.env and the backend running.");
  }
}

function appendCacheBust(url: string) {
  if (!url.trim()) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
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

function normalizeMediaModerationSeconds(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(300, Math.max(1, Math.round(value)));
}

function readUploadErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again with another file.";
}

function isCloudinarySignatureError(error: unknown) {
  const message = readUploadErrorMessage(error).toLowerCase();
  return message.includes("cloudinary upload signing failed") || message.includes("upload signing");
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

function mergePostsById(primary: Post[], fallback: Post[]) {
  const byId = new Map<string, Post>();
  fallback.forEach((item) => byId.set(item.id, item));
  primary.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mergePostCommentsById(primary: PostComment[], fallback: PostComment[]) {
  const byId = new Map<string, PostComment>();
  fallback.forEach((item) => byId.set(item.id, item));
  primary.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mergeNotificationsById(primary: AppNotification[], fallback: AppNotification[]) {
  const byId = new Map<string, AppNotification>();
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

function upsertPost(current: Post[], nextPost: Post) {
  const exists = current.some((item) => item.id === nextPost.id);
  if (!exists) {
    return [nextPost, ...current];
  }

  return current.map((item) => (item.id === nextPost.id ? { ...item, ...nextPost } : item));
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

function isStoryActive(story: Story) {
  return new Date(story.expiresAt).getTime() > Date.now();
}

function pruneStoriesForState(stories: Story[]) {
  return stories
    .filter((story) => isStoryActive(story) || Boolean(story.highlightedAt))
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
