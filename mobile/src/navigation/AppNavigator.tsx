import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette } from "../theme";
import { AIToolsPlaceholderScreen } from "../screens/AIToolsPlaceholderScreen";
import { BoostReelScreen } from "../screens/BoostReelScreen";
import { CommunitiesScreen } from "../screens/CommunitiesScreen";
import { CommunityDetailsScreen } from "../screens/CommunityDetailsScreen";
import { CreateScreen } from "../screens/CreateScreen";
import { CreateCommunityScreen } from "../screens/CreateCommunityScreen";
import { DirectChatScreen } from "../screens/DirectChatScreen";
import { DirectInboxScreen } from "../screens/DirectInboxScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LanguageScreen } from "../screens/LanguageScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { MarketplaceChatScreen } from "../screens/MarketplaceChatScreen";
import { MarketplaceCheckoutScreen } from "../screens/MarketplaceCheckoutScreen";
import { MarketplaceInboxScreen } from "../screens/MarketplaceInboxScreen";
import { MarketplaceScreen } from "../screens/MarketplaceScreen";
import { NotificationsPlaceholderScreen } from "../screens/NotificationsPlaceholderScreen";
import { ProductDetailsScreen } from "../screens/ProductDetailsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ReelDetailsScreen } from "../screens/ReelDetailsScreen";
import { ReelsScreen } from "../screens/ReelsScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { SubscriptionScreen } from "../screens/SubscriptionScreen";

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
          <Stack.Screen component={ReelDetailsScreen} name="ReelDetails" options={{ title: copy.reelDetails }} />
          <Stack.Screen component={BoostReelScreen} name="BoostReel" options={{ title: "Boost reel" }} />
          <Stack.Screen component={ProductDetailsScreen} name="ProductDetails" options={{ title: copy.productDetails }} />
          <Stack.Screen component={CommunitiesScreen} name="Communities" options={{ title: "Pages, groups, channels" }} />
          <Stack.Screen component={CreateCommunityScreen} name="CreateCommunity" options={{ title: "Create community" }} />
          <Stack.Screen component={CommunityDetailsScreen} name="CommunityDetails" options={{ title: "Community" }} />
          <Stack.Screen component={DirectInboxScreen} name="DirectInbox" options={{ title: "Direct messages" }} />
          <Stack.Screen component={DirectChatScreen} name="DirectChat" options={{ title: "Direct chat" }} />
          <Stack.Screen component={MarketplaceInboxScreen} name="MarketplaceInbox" options={{ title: "Marketplace inbox" }} />
          <Stack.Screen component={MarketplaceChatScreen} name="MarketplaceChat" options={{ title: "Marketplace chat" }} />
          <Stack.Screen component={MarketplaceCheckoutScreen} name="MarketplaceCheckout" options={{ title: "Checkout" }} />
          <Stack.Screen component={EditProfileScreen} name="EditProfile" options={{ title: copy.editProfile }} />
          <Stack.Screen component={SubscriptionScreen} name="Subscription" options={{ title: copy.subscription }} />
          <Stack.Screen component={AIToolsPlaceholderScreen} name="AITools" options={{ title: copy.aiTools }} />
          <Stack.Screen
            component={NotificationsPlaceholderScreen}
            name="Notifications"
            options={{ title: copy.notifications }}
          />
          <Stack.Screen component={ProfileScreen} name="PublicProfile" options={{ title: copy.profile }} />
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
      <Tab.Screen component={HomeScreen} name="Home" options={{ title: copy.home }} />
      <Tab.Screen component={ReelsScreen} name="Reels" options={{ title: copy.reels }} />
      <Tab.Screen component={CreateScreen} name="Create" options={{ title: copy.create }} />
      <Tab.Screen component={MarketplaceScreen} name="Marketplace" options={{ title: copy.marketplace }} />
      <Tab.Screen component={ProfileScreen} name="Profile" options={{ title: copy.profile }} />
    </Tab.Navigator>
  );
}
