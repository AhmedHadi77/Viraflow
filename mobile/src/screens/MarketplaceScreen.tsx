import { Ionicons } from "@expo/vector-icons";
import { categoryLabel } from "../utils/labels";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProductCard } from "../components/ProductCard";
import { Screen } from "../components/Screen";
import { getCopy } from "../data/copy";
import { marketplaceCategories } from "../data/catalog";
import { useAppState } from "../providers/AppProvider";
import { Product, ProductListingStatus } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { usePriceTools } from "../utils/priceFormatting";
import { GradientIconButton } from "../components/GradientIcon";

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

  const featuredProducts = filteredProducts.slice(0, 4);

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

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.kicker}>{copy.marketplace}</Text>
            <Text style={styles.title}>{copy.marketplaceTitle}</Text>
          </View>
          <GradientIconButton
            accessibilityLabel={copy.marketplace}
            badge={totalMarketplaceUnreadCount > 0 ? String(totalMarketplaceUnreadCount) : undefined}
            icon="chatbubble-ellipses-outline"
            onPress={() => rootNavigation.navigate("MarketplaceInbox")}
            size={44}
            tint="cyan"
          />
        </View>

        <Text style={styles.heroBody}>
          {copy.marketplaceBody}
        </Text>

        <View style={styles.heroStats}>
          <MetricCard label={copy.available} value={products.filter((item) => item.listingStatus === "available").length} />
          <MetricCard label={copy.pending} value={products.filter((item) => item.listingStatus === "pending").length} />
          <MetricCard label={copy.nearby} value={filteredProducts.length} />
        </View>

        <View style={styles.heroActions}>
          <PrimaryButton label={copy.sellItem} onPress={() => navigation.navigate("Create", { initialMode: "product" })} />
          <PrimaryButton
            label={totalMarketplaceUnreadCount > 0 ? `${copy.inbox} (${totalMarketplaceUnreadCount})` : copy.inbox}
            onPress={() => rootNavigation.navigate("MarketplaceInbox")}
            variant="ghost"
          />
        </View>
      </View>

      <View style={styles.searchShell}>
        <InputField label={copy.search} onChangeText={setSearch} placeholder={copy.searchPlaceholder} value={search} />
        <InputField label={copy.location} onChangeText={setLocation} placeholder={copy.locationPlaceholder} value={location} />
        <View style={styles.priceFilters}>
          <View style={styles.priceField}>
            <InputField label={`${copy.min} (${viewerCurrency})`} keyboardType="numeric" onChangeText={setMinimumPrice} placeholder="0" value={minimumPrice} />
          </View>
          <View style={styles.priceField}>
            <InputField label={`${copy.max} (${viewerCurrency})`} keyboardType="numeric" onChangeText={setMaximumPrice} placeholder="500" value={maximumPrice} />
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy.categories}</Text>
          <Pressable onPress={resetFilters}>
            <Text style={styles.sectionLink}>{copy.reset}</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {marketplaceCategories.map((item) => {
            const active = item === category;
            return (
              <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
                <Text style={[styles.filterChipLabel, active ? styles.filterChipLabelActive : null]}>{categoryLabel(item, copy)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy.availability}</Text>
          <Text style={styles.sectionLink}>{resultsLabel}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {listingStatusFilters.map((item) => {
            const active = item === listingStatus;
            return (
              <Pressable
                key={item}
                onPress={() => setListingStatus(item)}
                style={[styles.statusChip, active ? styles.statusChipActive : null]}
              >
                <Text style={[styles.statusChipLabel, active ? styles.statusChipLabelActive : null]}>{formatListingStatus(item)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {featuredProducts.length > 0 ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.featuredPicks}</Text>
            <Text style={styles.sectionLink}>{copy.swipe}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {featuredProducts.map((product) => {
              const seller = getUserById(product.userId);
              if (!seller) {
                return null;
              }

              return (
                <View key={product.id} style={styles.featuredCardWrap}>
                  <ProductCard
                    onPress={() => rootNavigation.navigate("ProductDetails", { productId: product.id })}
                    onSellerPress={() => rootNavigation.navigate("PublicProfile", { userId: seller.id })}
                    product={product}
                    seller={seller}
                    nearbyLabel={isNearby(product) ? copy.nearYou : undefined}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy.allListings}</Text>
          <Text style={styles.sectionLink}>{resultsLabel}</Text>
        </View>
        {nearbyCount > 0 ? <Text style={styles.localHint}>{copy.localFirstHint}</Text> : null}

        <View style={styles.list}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const seller = getUserById(product.userId);
              if (!seller) {
                return null;
              }

              return (
                <ProductCard
                  key={product.id}
                  onPress={() => rootNavigation.navigate("ProductDetails", { productId: product.id })}
                  onSellerPress={() => rootNavigation.navigate("PublicProfile", { userId: seller.id })}
                  product={product}
                  seller={seller}
                  nearbyLabel={isNearby(product) ? copy.nearYou : undefined}
                />
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons color={palette.muted} name="search-outline" size={28} />
              <Text style={styles.emptyTitle}>{copy.noListingsTitle}</Text>
              <Text style={styles.emptyBody}>{copy.noListingsBody}</Text>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = createThemedStyles({
  content: {
    paddingBottom: 96,
  },
  hero: {
    backgroundColor: "#081018",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  heroHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  kicker: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginTop: 4,
  },
  inboxBubble: {
    alignItems: "center",
    backgroundColor: "#101820",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "relative",
    width: 40,
  },
  inboxBadge: {
    alignItems: "center",
    backgroundColor: "#ff4d67",
    borderColor: "#081018",
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
    position: "absolute",
    right: -5,
    top: -5,
  },
  inboxBadgeLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  heroBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  metricValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  searchShell: {
    backgroundColor: "#09131b",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  localHint: {
    color: palette.muted,
    fontSize: 13,
    marginTop: -6,
  },
  priceFilters: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  priceField: {
    flex: 1,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionLink: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  filterChip: {
    backgroundColor: "#0c151d",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  filterChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  filterChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  filterChipLabelActive: {
    color: "#04070b",
  },
  statusChip: {
    backgroundColor: "#0f1a24",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  statusChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  statusChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  statusChipLabelActive: {
    color: "#04070b",
  },
  featuredRow: {
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  featuredCardWrap: {
    width: 286,
  },
  list: {
    gap: spacing.lg,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#09131b",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
