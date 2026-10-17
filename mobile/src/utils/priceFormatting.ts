import { useCallback } from "react";
import { formatPrice, getRegion, LEGACY_LISTING_CURRENCY } from "../data/regions";
import { useAppState } from "../providers/AppProvider";
import { convertAmount, useExchangeRates } from "../services/exchangeRates";
import { Product } from "../types/models";

type PricedItem = Pick<Product, "price" | "currency">;

export interface PriceParts {
  /** The seller's price in the seller's currency, e.g. "US$400". */
  original: string;
  /** An estimate in the viewer's currency, e.g. "≈ RM 1,850", when it differs and a rate is known. */
  approx?: string;
  /** The amount in the viewer's currency (for filters), or the original amount if it can't be converted. */
  viewerAmount: number;
}

function roundForDisplay(value: number) {
  return value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
}

/** Price helpers that show the seller's price and, when the currencies differ, an estimate in the viewer's currency. */
export function usePriceTools() {
  const { localeTag, region } = useAppState();
  const { table, convertPrices } = useExchangeRates();
  const viewerCurrency = getRegion(region).currency;

  const getPriceParts = useCallback(
    (item: PricedItem): PriceParts => {
      const sourceCurrency = (item.currency || LEGACY_LISTING_CURRENCY).toUpperCase();
      const original = formatPrice(item.price, sourceCurrency, localeTag);
      const converted = convertAmount(item.price, sourceCurrency, viewerCurrency, table);
      if (!convertPrices || sourceCurrency === viewerCurrency || converted === null) {
        return { original, viewerAmount: converted ?? item.price };
      }
      return {
        original,
        approx: `≈ ${formatPrice(roundForDisplay(converted), viewerCurrency, localeTag)}`,
        viewerAmount: converted,
      };
    },
    [convertPrices, localeTag, table, viewerCurrency]
  );

  const formatProductPrice = useCallback(
    (item: PricedItem) => {
      const parts = getPriceParts(item);
      return parts.approx ? `${parts.original} (${parts.approx})` : parts.original;
    },
    [getPriceParts]
  );

  return { getPriceParts, formatProductPrice, viewerCurrency };
}

/** Returns a formatter for a listing price: "US$400 (≈ RM 1,850)" when converted, otherwise "RM 420". */
export function useProductPriceFormatter() {
  return usePriceTools().formatProductPrice;
}
