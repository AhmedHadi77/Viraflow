import { Ionicons } from "@expo/vector-icons";
import { MaterialTopTabBarProps, createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  ReelViewer: { reelId: string };
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
const Tab = createMaterialTopTabNavigator<AppTabParamList>();

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
            getComponent={loadScreen(() => require("../screens/ReelViewerScreen").ReelViewerScreen)}
            name="ReelViewer"
            options={{ headerShown: false }}
          />
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
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: true,
        lazyPreloadDistance: 1,
      }}
      tabBar={(props) => <PulseoraTabBar {...props} />}
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

function PulseoraTabBar({ descriptors, navigation, state }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]}>
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
              <Ionicons
                color={focused ? (isCreate ? "#04070b" : palette.text) : palette.mutedSoft}
                name={icon}
                size={isCreate ? 28 : 24}
              />
              {focused && !isCreate ? <View style={styles.activePill} /> : null}
              <View accessible={false} style={styles.screenReaderOnly} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    backgroundColor: palette.backgroundDeep,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  tabBarShell: {
    alignItems: "center",
    backgroundColor: "#05080d",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.34,
    shadowRadius: 28,
  },
  tabButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 18,
    gap: 5,
    height: 52,
    justifyContent: "center",
    minWidth: 54,
    paddingHorizontal: 14,
  },
  tabButtonActive: {
    backgroundColor: "#0c1219",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
  },
  createTabButton: {
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    minWidth: 58,
  },
  createTabButtonActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  tabButtonPressed: {
    opacity: 0.84,
  },
  activePill: {
    backgroundColor: palette.text,
    borderRadius: 999,
    height: 4,
    width: 16,
  },
  screenReaderOnly: {
    height: 0,
    opacity: 0,
    position: "absolute",
    width: 0,
  },
});
