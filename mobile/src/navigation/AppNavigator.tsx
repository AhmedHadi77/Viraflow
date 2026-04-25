import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette } from "../theme";
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
  Subscription: undefined;
  AITools: undefined;
  Notifications: undefined;
  PublicProfile: { userId: string };
};

export type AppTabParamList = {
  Home: undefined;
  Reels: undefined;
  Create: { initialMode?: "reel" | "product" } | undefined;
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
            getComponent={loadScreen(() => require("../screens/ReelDetailsScreen").ReelDetailsScreen)}
            name="ReelDetails"
            options={{ title: copy.reelDetails }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/BoostReelScreen").BoostReelScreen)}
            name="BoostReel"
            options={{ title: "Boost reel" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/ProductDetailsScreen").ProductDetailsScreen)}
            name="ProductDetails"
            options={{ title: copy.productDetails }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/CommunitiesScreen").CommunitiesScreen)}
            name="Communities"
            options={{ title: "Pages, groups, channels" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/CreateCommunityScreen").CreateCommunityScreen)}
            name="CreateCommunity"
            options={{ title: "Create community" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/CommunityDetailsScreen").CommunityDetailsScreen)}
            name="CommunityDetails"
            options={{ title: "Community" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/DirectInboxScreen").DirectInboxScreen)}
            name="DirectInbox"
            options={{ title: "Direct messages" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/DirectChatScreen").DirectChatScreen)}
            name="DirectChat"
            options={{ title: "Direct chat" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/MarketplaceInboxScreen").MarketplaceInboxScreen)}
            name="MarketplaceInbox"
            options={{ title: "Marketplace inbox" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/MarketplaceChatScreen").MarketplaceChatScreen)}
            name="MarketplaceChat"
            options={{ title: "Marketplace chat" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/MarketplaceCheckoutScreen").MarketplaceCheckoutScreen)}
            name="MarketplaceCheckout"
            options={{ title: "Checkout" }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/EditProfileScreen").EditProfileScreen)}
            name="EditProfile"
            options={{ title: copy.editProfile }}
          />
          <Stack.Screen
            getComponent={loadScreen(() => require("../screens/SubscriptionScreen").SubscriptionScreen)}
            name="Subscription"
            options={{ title: copy.subscription }}
          />
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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: "transparent",
          borderRadius: 28,
          bottom: 30,
          height: 74,
          left: 16,
          paddingBottom: 12,
          paddingTop: 8,
          position: "absolute",
          right: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
        },
        tabBarIcon: ({ color, size }) => {
          const iconByRoute: Record<keyof AppTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: "home-outline",
            Reels: "play-circle-outline",
            Create: "add-circle-outline",
            Marketplace: "bag-handle-outline",
            Profile: "person-outline",
          };

          return <Ionicons color={color} name={iconByRoute[route.name as keyof AppTabParamList]} size={size} />;
        },
      })}
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
