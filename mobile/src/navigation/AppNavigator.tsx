import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientIconFill } from "../components/GradientIcon";
import { PAYMENTS_ENABLED } from "../data/catalog";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, createThemedStyles } from "../theme";
import { LanguageScreen } from "../screens/LanguageScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { SplashScreen } from "../screens/SplashScreen";

export type RootStackParamList = {
  Splash: undefined;
  Language: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Admin: undefined;
  Explore: { initialQuery?: string } | undefined;
  HashtagFeed: { tag: string };
  StoryComposer: {
    mediaUri: string;
    mediaType: "image" | "video";
    mimeType?: string;
    fileName?: string;
    durationSeconds?: number;
  };
  StoryViewer: { userId: string; storyId?: string };
  ReelViewer: { reelId: string; openComments?: boolean };
  ReelDetails: { reelId: string };
  BoostReel: { reelId: string };
  ProductDetails: { productId: string };
  Communities: undefined;
  CreateCommunity: undefined;
  CommunityDetails: { communityId: string };
  DirectInbox: undefined;
  DirectChat: { threadId: string };
  MarketplaceInbox: undefined;
  MarketplaceChat: { threadId: string };
  MarketplaceCheckout: { productId: string };
  EditProfile: undefined;
  Settings: undefined;
  MyContent: undefined;
  MediaEditor: { sessionId: string };
  Subscription: undefined;
  AITools: undefined;
  Notifications: undefined;
  PublicProfile: { userId: string };
  FollowList: { userId: string; mode: "followers" | "following" };
  Call: { callId: string };
  PostDetails: { postId: string; openComments?: boolean };
};

export type AppTabParamList = {
  Home: undefined;
  Reels: undefined;
  Create:
    | {
        initialMode?: "post" | "reel" | "story" | "product";
        prefillAsset?: {
          uri: string;
          type: "image" | "video";
          mimeType?: string;
          fileName?: string;
          durationSeconds?: number;
        };
      }
    | undefined;
  Marketplace: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

const loadScreen = <T,>(loader: () => T): (() => T) => loader;

export function AppNavigator() {
  const { isBootstrapping, language, session } = useAppState();
  const copy = getCopy(language);

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: palette.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: palette.backgroundSoft },
        headerTintColor: palette.text,
        headerTitleStyle: {
          fontWeight: "800",
        },
      }}
    >
      {isBootstrapping ? (
        <Stack.Screen component={SplashScreen} name="Splash" options={{ headerShown: false }} />
      ) : !language ? (
        <Stack.Screen component={LanguageScreen} name="Language" options={{ headerShown: false }} />
      ) : !session ? (
        <>
        <Stack.Screen component={LoginScreen} name="Login" options={{ headerShown: false }} />
        <Stack.Screen component={RegisterScreen} name="Register" options={{ title: copy.register }} />
      </>
    ) : (
      <>
          <Stack.Screen component={MainTabs} name="MainTabs" options={{ headerShown: false }} />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/AdminDashboardScreen").AdminDashboardScreen)}
            name="Admin"
            options={{ title: copy.adminTitle }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/ExploreScreen").ExploreScreen)}
            name="Explore"
            options={{ title: copy.explore }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/HashtagFeedScreen").HashtagFeedScreen)}
            name="HashtagFeed"
            options={({ route }) => ({ title: `#${route.params.tag}` })}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/StoryComposerScreen").StoryComposerScreen)}
            name="StoryComposer"
            options={{ title: copy.storyEditor }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/StoryViewerScreen").StoryViewerScreen)}
            name="StoryViewer"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/ReelViewerScreen").ReelViewerScreen)}
            name="ReelViewer"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/ReelDetailsScreen").ReelDetailsScreen)}
            name="ReelDetails"
            options={{ title: copy.reelDetails }}
          />
          {PAYMENTS_ENABLED ? (
            <Stack.Screen
              getComponent={loadScreen(() => require("../screens/BoostReelScreen").BoostReelScreen)}
              name="BoostReel"
              options={{ title: copy.boostReel }}
            />
          ) : null}
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/ProductDetailsScreen").ProductDetailsScreen)}
            name="ProductDetails"
            options={{ title: copy.productDetails }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/CommunitiesScreen").CommunitiesScreen)}
            name="Communities"
            options={{ title: copy.communitiesTitle }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/CreateCommunityScreen").CreateCommunityScreen)}
            name="CreateCommunity"
            options={{ title: copy.createCommunity }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/CommunityDetailsScreen").CommunityDetailsScreen)}
            name="CommunityDetails"
            options={{ title: copy.community }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/DirectInboxScreen").DirectInboxScreen)}
            name="DirectInbox"
            options={{ title: copy.directMessages }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/DirectChatScreen").DirectChatScreen)}
            name="DirectChat"
            options={{ title: copy.directChat }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/MarketplaceInboxScreen").MarketplaceInboxScreen)}
            name="MarketplaceInbox"
            options={{ title: copy.marketplaceInbox }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/MarketplaceChatScreen").MarketplaceChatScreen)}
            name="MarketplaceChat"
            options={{ title: copy.marketplaceChat }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/MarketplaceCheckoutScreen").MarketplaceCheckoutScreen)}
            name="MarketplaceCheckout"
            options={{ title: copy.checkout }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/EditProfileScreen").EditProfileScreen)}
            name="EditProfile"
            options={{ title: copy.editProfile }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/FollowListScreen").FollowListScreen)}
            name="FollowList"
            options={{ title: "" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/CallScreen").CallScreen)}
            name="Call"
            options={{ animation: "fade", gestureEnabled: false, headerShown: false, presentation: "fullScreenModal" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/SettingsScreen").SettingsScreen)}
            name="Settings"
            options={{ title: copy.settingsTitle }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/MediaEditorScreen").MediaEditorScreen)}
            name="MediaEditor"
            options={{ animation: "fade", gestureEnabled: false, headerShown: false, presentation: "fullScreenModal" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/MyContentScreen").MyContentScreen)}
            name="MyContent"
            options={{ title: "" }}
          />
          {PAYMENTS_ENABLED ? (
            <Stack.Screen
              getComponent={loadScreen(() => require("../screens/SubscriptionScreen").SubscriptionScreen)}
              name="Subscription"
              options={{ title: copy.subscription }}
            />
          ) : null}
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/AIToolsPlaceholderScreen").AIToolsPlaceholderScreen)}
            name="AITools"
            options={{ title: copy.aiTools }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/NotificationsPlaceholderScreen").NotificationsPlaceholderScreen)}
            name="Notifications"
            options={{ title: copy.notifications }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/PostDetailsScreen").PostDetailsScreen)}
            name="PostDetails"
            options={{ title: copy.post }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/ProfileScreen").ProfileScreen)}
            name="PublicProfile"
            options={{ title: copy.profile }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { language } = useAppState();
  const copy = getCopy(language);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
      tabBar={(props) => <SohbaTabBar {...props} />}
    >
      <Tab.Screen
        getComponent={loadScreen(() => require("../screens/HomeScreen").HomeScreen)}
        name="Home"
        options={{ title: copy.home }}
      />
      <Tab.Screen
        getComponent={loadScreen(() => require("../screens/ReelsScreen").ReelsScreen)}
        name="Reels"
        options={{ title: copy.reels }}
      />
      <Tab.Screen
        getComponent={loadScreen(() => require("../screens/CreateScreen").CreateScreen)}
        name="Create"
        options={{ title: copy.create }}
      />
      <Tab.Screen
        getComponent={loadScreen(() => require("../screens/MarketplaceScreen").MarketplaceScreen)}
        name="Marketplace"
        options={{ title: copy.marketplace }}
      />
      <Tab.Screen
        getComponent={loadScreen(() => require("../screens/ProfileScreen").ProfileScreen)}
        name="Profile"
        options={{ title: copy.profile }}
      />
    </Tab.Navigator>
  );
}

function SohbaTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Reels is a full-screen video feed, so the bar stays dark there in both themes.
  const onReels = state.routes[state.index]?.name === "Reels";
  // Tabs use the brand green; the open tab becomes a filled green-to-orange gradient circle.
  const idleTint = onReels ? "#36e0a1" : palette.primary;

  return (
    <View
      style={[
        styles.tabBarOuter,
        onReels ? { backgroundColor: "#000000", borderTopColor: "rgba(255,255,255,0.08)" } : null,
        { paddingBottom: Math.max(insets.bottom, 6) },
      ]}
    >
      <View style={styles.tabBarShell}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const iconByRoute: Record<
            keyof AppTabParamList,
            { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }
          > = {
            Home: { active: "home", idle: "home-outline" },
            Reels: { active: "play-circle", idle: "play-circle-outline" },
            Create: { active: "add-circle", idle: "add-circle-outline" },
            Marketplace: { active: "storefront", idle: "storefront-outline" },
            Profile: { active: "person", idle: "person-outline" },
          };
          const icon = focused
            ? iconByRoute[route.name as keyof AppTabParamList].active
            : iconByRoute[route.name as keyof AppTabParamList].idle;
          const isCreate = route.name === "Create";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <Pressable
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              key={route.key}
              onLongPress={onLongPress}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabButton,
                isCreate ? styles.createTabButton : null,
                focused ? styles.tabButtonActive : null,
                focused && isCreate ? styles.createTabButtonActive : null,
                pressed && !focused ? styles.tabButtonPressed : null,
              ]}
              testID={options?.tabBarButtonTestID}
            >
              {focused || isCreate ? (
                <GradientIconFill icon={isCreate ? "add" : icon} iconSize={isCreate ? 26 : 21} size={isCreate ? 42 : 38} />
              ) : (
                <Ionicons color={idleTint} name={icon} size={25} />
              )}
              <View accessible={false} style={styles.screenReaderOnly} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = createThemedStyles({
  tabBarOuter: {
    backgroundColor: palette.backgroundDeep,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    paddingTop: 2,
  },
  tabBarShell: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    height: 54,
    justifyContent: "center",
  },
  tabButtonActive: {},
  createTabButton: {},
  createTabButtonActive: {},
  tabButtonPressed: {
    opacity: 0.6,
  },
  screenReaderOnly: {
    height: 0,
    opacity: 0,
    position: "absolute",
    width: 0,
  },
});
