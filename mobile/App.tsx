import { createNavigationContainerRef, NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppNavigator, RootStackParamList } from "./src/navigation/AppNavigator";
import { AppProvider } from "./src/providers/AppProvider";
import { getNotificationNavigationTarget } from "./src/services/notificationRouting";
import { palette } from "./src/theme";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.background,
    card: palette.card,
    text: palette.text,
    primary: palette.primary,
    border: palette.border,
  },
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  React.useEffect(() => {
    const Notifications = (() => {
      try {
        return require("expo-notifications") as typeof import("expo-notifications");
      } catch (error) {
        console.warn("Pulseora notification module is unavailable in this build.", error);
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
      console.warn("Pulseora notification listeners could not start in this build.", error);
    }

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return (
    <AppErrorBoundary>
      <AppProvider>
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AppProvider>
    </AppErrorBoundary>
  );
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Pulseora caught a render startup error.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>Pulseora is recovering</Text>
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

const styles = StyleSheet.create({
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
