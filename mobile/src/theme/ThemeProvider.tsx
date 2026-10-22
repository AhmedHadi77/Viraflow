import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyThemeMode, ThemeMode } from "./index";

// New key for the Daylight redesign so everyone starts on the light look once.
const THEME_STORAGE_KEY = "sohba.themeMode.daylight";

interface ThemeContextValue {
  mode: ThemeMode;
  ready: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  ready: true,
  setMode: () => undefined,
  toggleMode: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .catch(() => null)
      .then((stored) => {
        if (!active) {
          return;
        }
        const nextMode: ThemeMode = stored === "dark" ? "dark" : "light";
        applyThemeMode(nextMode);
        setModeState(nextMode);
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    applyThemeMode(nextMode);
    setModeState(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      ready,
      setMode,
      toggleMode: () => setMode(mode === "dark" ? "light" : "dark"),
    }),
    [mode, ready, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
