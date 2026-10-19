import { registerRootComponent } from "expo";
import React from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";

// A JavaScript error that escapes everything else normally closes a release app with no message.
// Instead we keep the app open and show the error, so the user can share it and it can be fixed.
let fatalError = null;
const fatalListeners = new Set();

const errorUtils = global.ErrorUtils;
if (errorUtils && typeof errorUtils.setGlobalHandler === "function") {
  const previousHandler = errorUtils.getGlobalHandler ? errorUtils.getGlobalHandler() : null;
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (!isFatal || __DEV__) {
      if (previousHandler) {
        previousHandler(error, isFatal);
      }
      return;
    }
    fatalError = error;
    fatalListeners.forEach((listener) => listener(error));
  });
}

let App = null;
try {
  App = require("./App").default;
} catch (error) {
  fatalError = error;
}

function describeError(error) {
  if (!error) {
    return "Unknown error";
  }
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const stack = error instanceof Error && error.stack ? `\n\n${String(error.stack).slice(0, 3000)}` : "";
  return message + stack;
}

function StartupErrorScreen({ error }) {
  const details = describeError(error);
  return React.createElement(
    View,
    { style: { flex: 1, backgroundColor: "#071018", paddingHorizontal: 20, paddingTop: 64, paddingBottom: 32 } },
    React.createElement(
      Text,
      { style: { color: "#f6f3ee", fontSize: 22, fontWeight: "800", marginBottom: 8 } },
      "Sohba ran into a problem"
    ),
    React.createElement(
      Text,
      { style: { color: "#90a1b4", fontSize: 15, lineHeight: 21, marginBottom: 16 } },
      "Please share this report with the developer so it can be fixed, then close and reopen the app."
    ),
    React.createElement(
      ScrollView,
      { style: { flex: 1, backgroundColor: "#0f1a24", borderRadius: 16, padding: 14, marginBottom: 16 } },
      React.createElement(Text, { selectable: true, style: { color: "#d4d0ca", fontSize: 12, fontFamily: "monospace" } }, details)
    ),
    React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        onPress: () => {
          Share.share({ title: "Sohba error report", message: `Sohba error report\n\n${details}` }).catch(() => undefined);
        },
        style: { backgroundColor: "#36e0a1", borderRadius: 999, paddingVertical: 14, alignItems: "center" },
      },
      React.createElement(Text, { style: { color: "#03070c", fontSize: 16, fontWeight: "800" } }, "Share report")
    )
  );
}

function Root() {
  const [error, setError] = React.useState(fatalError);

  React.useEffect(() => {
    const listener = (nextError) => setError(nextError);
    fatalListeners.add(listener);
    if (fatalError) {
      setError(fatalError);
    }
    return () => {
      fatalListeners.delete(listener);
    };
  }, []);

  if (error || !App) {
    return React.createElement(StartupErrorScreen, { error });
  }
  return React.createElement(App);
}

registerRootComponent(Root);
