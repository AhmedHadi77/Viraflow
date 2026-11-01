import { Ionicons } from "@expo/vector-icons";
import { categoryLabel } from "../utils/labels";
import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { marketplaceCategories } from "../data/catalog";
import { useAppState } from "../providers/AppProvider";
import { Product, ProductListingStatus } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { usePriceTools } from "../utils/priceFormatting";
import { GradientIconButton } from "../components/GradientIcon";
import { getRegion } from "../data/regions";
import { sizedImageUrl } from "../services/mediaUpload";

const listingStatusFilters: Array<"all" | ProductListingStatus> = ["all", "available", "pending", "sold"];
const listingStatusRank: Record<ProductListingStatus, number> = {
  available: 0,
  pending: 1,
  sold: 2,
};

export function MarketplaceScreen({ navigation }: { navigation: any }) {
  const { language, region, products, getTotalMarketplaceUnreadCount, getUserById, refreshCatalog, refreshMarketplaceInbox } = useAppState();
  const copy = getCopy(language);
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [listingStatus, setListingStatus] = useState<"all" | ProductListingStatus>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const totalMarketplaceUnreadCount = getTotalMarketplaceUnreadCount();
  const { getPriceParts, viewerCurrency } = usePriceTools();

  useEffect(() => {
    refreshCatalog().catch(() => undefined);
    refreshMarketplaceInbox().catch(() => undefined);
  }, []);

  const isNearby = (product: Product) =>
    (product.region ?? getUserById(product.userId)?.region ?? "").toUpperCase() === region;

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const query = search.trim().toLowerCase();
        const locationQuery = location.trim().toLowerCase();
        const minimumValue = Number(minimumPrice);
        const maximumValue = Number(maximumPrice);
        const hasMinimumValue = minimumPrice.trim().length > 0 && !Number.isNaN(minimumValue);
        const hasMaximumValue = maximumPrice.trim().length > 0 && !Number.isNaN(maximumValue);
        const matchesCategory = category === "All" || product.category === category;
        const matchesListingStatus = listingStatus === "all" || product.listingStatus === listingStatus;
        const matchesSearch =
          !query ||
          product.title.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.location.toLowerCase().includes(query);
        const matchesLocation = !locationQuery || product.location.toLowerCase().includes(locationQuery);
        // Min/max are typed in the viewer's currency, so compare against the converted price.
        const comparablePrice = getPriceParts(product).viewerAmount;
        const matchesMinimum = !hasMinimumValue || comparablePrice >= minimumValue;
        const matchesMaximum = !hasMaximumValue || comparablePrice <= maximumValue;

        return matchesCategory && matchesListingStatus && matchesSearch && matchesLocation && matchesMinimum && matchesMaximum;
      })
      .sort((left, right) => {
        const statusDifference = listingStatusRank[left.listingStatus] - listingStatusRank[right.listingStatus];
        if (statusDifference !== 0) {
          return statusDifference;
        }

        // Listings from the viewer's own region come first, like local marketplaces do.
        const localDifference = Number(isNearby(right)) - Number(isNearby(left));
        if (localDifference !== 0) {
          return localDifference;
        }

        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [category, listingStatus, location, maximumPrice, minimumPrice, products, search, region, getPriceParts]);

  const nearbyCount = filteredProducts.filter(isNearby).length;

  function resetFilters() {
    setSearch("");
    setCategory("All");
    setLocation("");
    setMinimumPrice("");
    setMaximumPrice("");
    setListingStatus("all");
  }

  function formatListingStatus(value: "all" | ProductListingStatus) {
    if (value === "all") {
      return copy.all;
    }

    if (value === "available") {
      return copy.available;
    }
    if (value === "pending") {
      return copy.pending;
    }
    return copy.sold;
  }

  const resultsLabel = filteredProducts.length === 1 ? `1 ${copy.listing}` : `${filteredProducts.length} ${copy.listings}`;
  const activeFilterCount =
    (location.trim() ? 1 : 0) + (minimumPrice.trim() ? 1 : 0) + (maximumPrice.trim() ? 1 : 0) + (listingStatus !== "all" ? 1 : 0);
  const placeLabel = location.trim() || getRegion(region).name;

  return (
    <View style={styles.root}>
      <Screen scrollable contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{copy.marketplace}</Text>
            <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setFiltersOpen(true)} style={styles.placeButton}>
              <Ionicons color={palette.textSoft} name="location-outline" size={15} />
              <Text numberOfLines={1} style={styles.placeLabel}>
                {placeLabel}
              </Text>
              <Ionicons color={palette.textSoft} name="chevron-down" size={14} />
            </Pressable>
          </View>
          <GradientIconButton
            accessibilityLabel={copy.inbox}
            badge={totalMarketplaceUnreadCount > 0 ? String(totalMarketplaceUnreadCount) : undefined}
            icon="chatbubble-ellipses-outline"
            onPress={() => rootNavigation.navigate("MarketplaceInbox")}
          />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Ionicons color={palette.muted} name="search" size={18} />
            <TextInput
              accessibilityLabel={copy.search}
              onChangeText={setSearch}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor={palette.mutedSoft}
              returnKeyType="search"
              style={styles.searchInput}
              value={search}
            />
            {search ? (
              <Pressable accessibilityLabel={copy.reset} hitSlop={8} onPress={() => setSearch("")}>
                <Ionicons color={palette.muted} name="close-circle" size={18} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel={copy.filters}
            accessibilityRole="button"
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [styles.filterButton, pressed ? styles.pressed : null]}
          >
            <Ionicons color={palette.text} name="options-outline" size={20} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeLabel}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroller}>
          {marketplaceCategories.map((item) => {
            const active = item === category;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{categoryLabel(item, copy)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{nearbyCount > 0 ? copy.nearYou : copy.allListings}</Text>
          <Text style={styles.sectionMeta}>{resultsLabel}</Text>
        </View>

        {filteredProducts.length > 0 ? (
          <View style={styles.grid}>
            {filteredProducts.map((product) => (
              <ProductTile
                key={product.id}
                onPress={() => rootNavigation.navigate("ProductDetails", { productId: product.id })}
                product={product}
                statusLabel={product.listingStatus === "available" ? undefined : formatListingStatus(product.listingStatus)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons color={palette.muted} name="search-outline" size={28} />
            <Text style={styles.emptyTitle}>{copy.noListingsTitle}</Text>
            <Text style={styles.emptyBody}>{copy.noListingsBody}</Text>
            {activeFilterCount > 0 || category !== "All" || search ? (
              <PrimaryButton label={copy.reset} onPress={resetFilters} size="compact" variant="ghost" />
            ) : null}
          </View>
        )}
      </Screen>

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("Create", { initialMode: "product" })}
        style={({ pressed }) => [styles.sellButton, pressed ? styles.pressed : null]}
      >
        <Ionicons color={palette.background} name="add" size={20} />
        <Text style={styles.sellButtonLabel}>{copy.sellItem}</Text>
      </Pressable>

      <Modal animationType="slide" onRequestClose={() => setFiltersOpen(false)} transparent visible={filtersOpen}>
        <Pressable onPress={() => setFiltersOpen(false)} style={styles.sheetBackdrop}>
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{copy.filters}</Text>
              <Pressable hitSlop={8} onPress={resetFilters}>
                <Text style={styles.sheetReset}>{copy.reset}</Text>
              </Pressable>
            </View>
            <InputField label={copy.location} onChangeText={setLocation} placeholder={copy.locationPlaceholder} value={location} />
            <View style={styles.priceFilters}>
              <View style={styles.priceField}>
                <InputField keyboardType="numeric" label={`${copy.min} (${viewerCurrency})`} onChangeText={setMinimumPrice} placeholder="0" value={minimumPrice} />
              </View>
              <View style={styles.priceField}>
                <InputField keyboardType="numeric" label={`${copy.max} (${viewerCurrency})`} onChangeText={setMaximumPrice} placeholder="500" value={maximumPrice} />
              </View>
            </View>
            <Text style={styles.sheetLabel}>{copy.availability}</Text>
            <View style={styles.statusRow}>
              {listingStatusFilters.map((item) => {
                const active = item === listingStatus;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={item}
                    onPress={() => setListingStatus(item)}
                    style={[styles.chip, active ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{formatListingStatus(item)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton label={`${copy.showResults} · ${filteredProducts.length}`} onPress={() => setFiltersOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Compact two-column listing tile: photo, price, title and place. */
function ProductTile({ product, onPress, statusLabel }: { product: Product; onPress: () => void; statusLabel?: string }) {
  const { getPriceParts } = usePriceTools();
  const priceParts = getPriceParts(product);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}>
      <View style={styles.tileImageWrap}>
        <Image source={{ uri: sizedImageUrl(product.imageUrl, 480) }} style={styles.tileImage} />
        {statusLabel ? (
          <View style={styles.tileStatus}>
            <Text style={styles.tileStatusLabel}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.tilePrice}>
        {priceParts.original}
      </Text>
      {priceParts.approx ? (
        <Text numberOfLines={1} style={styles.tileApprox}>
          {priceParts.approx}
        </Text>
      ) : null}
      <Text numberOfLines={1} style={styles.tileTitle}>
        {product.title}
      </Text>
      {product.location ? (
        <Text numberOfLines={1} style={styles.tilePlace}>
          {product.location}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = createThemedStyles({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingBottom: 110,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: palette.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  placeButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    maxWidth: "100%",
    minHeight: 28,
  },
  placeLabel: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  searchField: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    height: 46,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: palette.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    height: 44,
    paddingVertical: 0,
  },
  filterButton: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  filterBadge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderColor: palette.background,
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    position: "absolute",
    right: -2,
    top: -2,
  },
  filterBadgeLabel: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.75,
  },
  chipScroller: {
    flexGrow: 0,
    marginHorizontal: -spacing.lg,
  },
  chipRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  chipActive: {
    backgroundColor: palette.text,
  },
  chipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "600",
  },
  chipLabelActive: {
    color: palette.background,
    fontWeight: "700",
  },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionMeta: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  grid: {
    columnGap: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
  },
  tile: {
    gap: 3,
    width: "47.5%",
  },
  tileImageWrap: {
    aspectRatio: 1,
    backgroundColor: palette.surface,
    borderRadius: 18,
    marginBottom: 5,
    overflow: "hidden",
  },
  tileImage: {
    height: "100%",
    width: "100%",
  },
  tileStatus: {
    backgroundColor: "rgba(13,17,23,0.72)",
    borderRadius: radii.pill,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
    top: 8,
  },
  tileStatusLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  tilePrice: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  tileApprox: {
    color: palette.muted,
    fontSize: 12,
  },
  tileTitle: {
    color: palette.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  tilePlace: {
    color: palette.mutedSoft,
    fontSize: 12,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    gap: spacing.xs,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  sellButton: {
    alignItems: "center",
    backgroundColor: palette.text,
    borderRadius: 26,
    bottom: spacing.md,
    elevation: 6,
    flexDirection: "row",
    gap: 8,
    height: 52,
    paddingLeft: 18,
    paddingRight: 22,
    position: "absolute",
    right: spacing.md,
    shadowColor: "#0d1117",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  sellButtonLabel: {
    color: palette.background,
    fontSize: 15,
    fontWeight: "800",
  },
  sheetBackdrop: {
    backgroundColor: palette.overlay,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: palette.borderStrong,
    borderRadius: 3,
    height: 5,
    width: 40,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
  },
  sheetReset: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  sheetLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  priceFilters: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  priceField: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
