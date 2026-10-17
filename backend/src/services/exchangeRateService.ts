// Daily exchange rates used by the app to show marketplace prices in the viewer's currency.
// Source: open.er-api.com (free, no key, ~160 currencies, refreshed daily). Rates are cached in memory.

const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

export interface ExchangeRateTable {
  base: "USD";
  rates: Record<string, number>;
  /** When the provider last updated the rates (ISO). */
  updatedAt: string;
  source: string;
}

let cache: { expiresAt: number; table: ExchangeRateTable } | null = null;
let inFlight: Promise<ExchangeRateTable> | null = null;

async function fetchRates(): Promise<ExchangeRateTable> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(RATES_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Exchange rate provider returned ${response.status}.`);
    }
    const body = (await response.json()) as {
      result?: string;
      rates?: Record<string, unknown>;
      time_last_update_unix?: number;
    };
    if (body.result !== "success" || !body.rates) {
      throw new Error("Exchange rate provider returned no rates.");
    }

    const rates: Record<string, number> = {};
    Object.entries(body.rates).forEach(([code, value]) => {
      const rate = Number(value);
      if (/^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0) {
        rates[code] = rate;
      }
    });
    rates.USD = 1;

    return {
      base: "USD",
      rates,
      updatedAt: body.time_last_update_unix
        ? new Date(body.time_last_update_unix * 1000).toISOString()
        : new Date().toISOString(),
      source: "open.er-api.com",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getExchangeRates(): Promise<ExchangeRateTable> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.table;
  }

  if (!inFlight) {
    inFlight = fetchRates()
      .then((table) => {
        cache = { expiresAt: Date.now() + CACHE_MS, table };
        return table;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  try {
    return await inFlight;
  } catch (error) {
    // Serve slightly old rates rather than nothing if the provider is briefly down.
    if (cache) {
      return cache.table;
    }
    throw error;
  }
}
