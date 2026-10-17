import {
  NavigationContainer,
  DefaultTheme,
  LinkingOptions,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Text, View } from "react-native";
import { AppNavigator, RootStackParamList } from "./src/navigation/AppNavigator";
import { AppProvider } from "./src/providers/AppProvider";
import { CallCoordinator } from "./src/components/CallCoordinator";
import { ReportSheetHost } from "./src/components/ReportSheet";
import { navigationRef } from "./src/navigation/navigationRef";
import { getNotificationNavigationTarget } from "./src/services/notificationRouting";
import { palette, createThemedStyles, ThemeMode } from "./src/theme";
import { ThemeProvider, useThemeMode } from "./src/theme/ThemeProvider";

function buildNavigationTheme(mode: ThemeMode) {
  return {
    ...DefaultTheme,
    dark: mode === "dark",
    colors: {
      ...DefaultTheme.colors,
      background: palette.background,
      card: palette.card,
      text: palette.text,
      primary: palette.primary,
      border: palette.border,
    },
  };
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["pulseora://", "https://pulseora.app", "https://www.pulseora.app"],
  config: {
    screens: {
      Admin: "admin",
    },
  },
};

export default function App() {
  React.useEffect(() => {
    const Notifications = (() => {
      try {
        return require("expo-notifications") as typeof import("expo-notifications");
      } catch (error) {
        console.warn("Sohba notification module is unavailable in this build.", error);
        return null;
      }
    })();

    if (!Notifications) {
      return;
    }

    const openNotificationTarget = (data: unknown, attempt = 0) => {
      const target = getNotificationNavigationTarget(typeof data === "object" && data ? (data as Record<string, unknown>) : {});
      if (!target) {
        return;
      }

      if (navigationRef.isReady()) {
        (navigationRef as any).navigate(target.name, target.params);
        return;
      }

      if (attempt >= 12) {
        return;
      }

      setTimeout(() => openNotificationTarget(data, attempt + 1), 250);
    };

    let isMounted = true;
    let subscription: { remove: () => void } | undefined;

    try {
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (isMounted && response) {
            openNotificationTarget(response.notification.request.content.data);
          }
        })
        .catch(() => undefined);

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        openNotificationTarget(response.notification.request.content.data);
      });
    } catch (error) {
      console.warn("Sohba notification listeners could not start in this build.", error);
    }

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <ThemeProvider>
          <AppProvider>
            <ThemedNavigation />
          </AppProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

// Switching theme remounts the navigation tree (so every screen picks up the new colours) and
// restores the exact screen stack the user was on.
function ThemedNavigation() {
  const { mode, ready } = useThemeMode();
  const navigationStateRef = React.useRef<any>(undefined);
  const navigationTheme = React.useMemo(() => buildNavigationTheme(mode), [mode]);

  if (!ready) {
    return <View style={styles.themeLoading} />;
  }

  return (
    <NavigationContainer
      initialState={navigationStateRef.current}
      key={mode}
      linking={navigationStateRef.current ? undefined : linking}
      onStateChange={(state) => {
        navigationStateRef.current = state;
      }}
      ref={navigationRef}
      theme={navigationTheme}
    >
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <AppNavigator />
      <CallCoordinator />
      <ReportSheetHost />
    </NavigationContainer>
  );
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Sohba caught a render startup error.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>Sohba is recovering</Text>
          <Text style={styles.errorBody}>
            The app hit a startup problem and switched to safe mode. Please close and reopen it after installing the latest
            build.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = createThemedStyles({
  themeLoading: {
    backgroundColor: "#071018",
    flex: 1,
  },
  errorScreen: {
    alignItems: "center",
    backgroundColor: palette.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  errorBody: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
});
