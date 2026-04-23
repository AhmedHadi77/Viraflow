import "expo-dev-client";
import { createNavigationContainerRef, NavigationContainer, DefaultTheme } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
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
  useEffect(() => {
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
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (isMounted && response) {
        openNotificationTarget(response.notification.request.content.data);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotificationTarget(response.notification.request.content.data);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <AppProvider>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}
