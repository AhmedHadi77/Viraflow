import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./AppNavigator";

/** Lets code outside screens (incoming calls, notification taps) navigate. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
