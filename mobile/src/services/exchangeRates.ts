import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { getPublicApiBaseUrl } from "./publicEnv";

// Daily USD-based exchange rates for showing marketplace prices in the viewer's currency.
// Fetched from the Sohba API (which caches open.er-api.com); falls back to the provider directly.

const RATES_STORAGE_KEY = "pulseora.fxRates";
const CONVERT_STORAGE_KEY = "pulseora.convertPrices";
const FRESH_MS = 12 * 60 * 60 * 1000;
const PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";

export interface ExchangeRateTable {
  base: "USD";
  rates: Record<string, number>;
  updatedAt: string;
  fetchedAt: number;
}

interface ExchangeState {
  table: ExchangeRateTable | null;
  convertPrices: boolean;
}

let state: ExchangeState = { table: null, convertPrices: true };
const listeners = new Set<() => void>();
let started = false;

function setState(next: Partial<ExchangeState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  startExchangeRates();
  return () => {
    listeners.delete(listener);
  };
}

function cleanRates(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const rates: Record<string, number> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([code, value]) => {
    const rate = Number(value);
    if (/^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  });
  rates.USD = 1;
  return Object.keys(rates).length > 1 ? rates : null;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadRates(): Promise<ExchangeRateTable | null> {
  const apiBase = getPublicApiBaseUrl();
  if (apiBase) {
    try {
      const body = await fetchJson(`${apiBase}/meta/exchange-rates`);
      const rates = cleanRates(body.rates);
      if (rates) {
        return { base: "USD", rates, updatedAt: String(body.updatedAt ?? new Date().toISOString()), fetchedAt: Date.now() };
      }
    } catch {
      // Older API without the endpoint, or offline: try the provider directly.
    }
  }

  try {
    const body = await fetchJson(PROVIDER_URL);
    const rates = cleanRates(body.rates);
    if (rates) {
      const unix = Number(body.time_last_update_unix);
      return {
        base: "USD",
        rates,
        updatedAt: Number.isFinite(unix) && unix > 0 ? new Date(unix * 1000).toISOString() : new Date().toISOString(),
        fetchedAt: Date.now(),
      };
    }
  } catch {
    // Offline: keep whatever is cached.
  }
  return null;
}

/** Loads cached rates and the conversion setting, then refreshes the rates if they are older than 12 hours. */
export function startExchangeRates() {
  if (started) {
    return;
  }
  started = true;

  void (async () => {
    try {
      const [[, storedRates], [, storedConvert]] = await AsyncStorage.multiGet([RATES_STORAGE_KEY, CONVERT_STORAGE_KEY]);
      const next: Partial<ExchangeState> = {};
      if (storedConvert === "false") {
        next.convertPrices = false;
      }
      if (storedRates) {
        const parsed = JSON.parse(storedRates) as ExchangeRateTable;
        const rates = cleanRates(parsed?.rates);
        if (rates) {
          next.table = { ...parsed, rates };
        }
      }
      setState(next);
    } catch {
      // Ignore broken cache.
    }

    if (!state.table || Date.now() - state.table.fetchedAt > FRESH_MS) {
      const table = await downloadRates();
      if (table) {
        setState({ table });
        await AsyncStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(table)).catch(() => undefined);
      }
    }
  })();
}

export function setConvertPrices(value: boolean) {
  setState({ convertPrices: value });
  void AsyncStorage.setItem(CONVERT_STORAGE_KEY, value ? "true" : "false").catch(() => undefined);
}

export function useExchangeRates() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Converts an amount between ISO currencies using USD-based rates. Returns null when a rate is missing. */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  table: ExchangeRateTable | null
): number | null {
  const source = from.toUpperCase();
  const target = to.toUpperCase();
  if (source === target) {
    return amount;
  }
  const fromRate = table?.rates[source];
  const toRate = table?.rates[target];
  if (!fromRate || !toRate || !Number.isFinite(amount)) {
    return null;
  }
  return (amount / fromRate) * toRate;
}
