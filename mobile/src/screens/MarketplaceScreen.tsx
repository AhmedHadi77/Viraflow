import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProductCard } from "../components/ProductCard";
import { Screen } from "../components/Screen";
import { marketplaceCategories } from "../data/mockData";
import { useAppState } from "../providers/AppProvider";
import { ProductListingStatus } from "../types/models";
import { palette, radii, spacing } from "../theme";

const listingStatusFilters: Array<"all" | ProductListingStatus> = ["all", "available", "pending", "sold"];
const listingStatusRank: Record<ProductListingStatus, number> = {
  available: 0,
  pending: 1,
  sold: 2,
};

export function MarketplaceScreen({ navigation }: { navigation: any }) {
  const { products, getTotalMarketplaceUnreadCount, getUserById, refreshCatalog, refreshMarketplaceInbox } = useAppState();
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [listingStatus, setListingStatus] = useState<"all" | ProductListingStatus>("all");
  const totalMarketplaceUnreadCount = getTotalMarketplaceUnreadCount();

  useEffect(() => {
    refreshCatalog().catch(() => undefined);
    refreshMarketplaceInbox().catch(() => undefined);
  }, []);

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
        const matchesMinimum = !hasMinimumValue || product.price >= minimumValue;
        const matchesMaximum = !hasMaximumValue || product.price <= maximumValue;

        return matchesCategory && matchesListingStatus && matchesSearch && matchesLocation && matchesMinimum && matchesMaximum;
      })
      .sort((left, right) => {
        const statusDifference = listingStatusRank[left.listingStatus] - listingStatusRank[right.listingStatus];
        if (statusDifference !== 0) {
          return statusDifference;
        }

        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [category, listingStatus, location, maximumPrice, minimumPrice, products, search]);

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
      return "All";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  const resultsLabel = filteredProducts.length === 1 ? "1 listing" : `${filteredProducts.length} listings`;

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.kicker}>Marketplace</Text>
            <Text style={styles.title}>Buy and sell like a real social marketplace.</Text>
          </View>
          <Pressable onPress={() => rootNavigation.navigate("MarketplaceInbox")} style={styles.inboxBubble}>
            <Ionicons color={palette.text} name="chatbubble-ellipses-outline" size={20} />
            {totalMarketplaceUnreadCount > 0 ? (
              <View style={styles.inboxBadge}>
                <Text style={styles.inboxBadgeLabel}>{totalMarketplaceUnreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Text style={styles.heroBody}>
          Discover local finds, creator gear, and home setups with Facebook-style filters, but inside Pulseora's cleaner flow.
        </Text>

        <View style={styles.heroStats}>
          <MetricCard label="Available" value={products.filter((item) => item.listingStatus === "available").length} />
          <MetricCard label="Pending" value={products.filter((item) => item.listingStatus === "pending").length} />
          <MetricCard label="Nearby" value={filteredProducts.length} />
        </View>

        <View style={styles.heroActions}>
          <PrimaryButton label="Sell an item" onPress={() => navigation.navigate("Create", { initialMode: "product" })} />
          <PrimaryButton
            label={totalMarketplaceUnreadCount > 0 ? `Inbox (${totalMarketplaceUnreadCount})` : "Inbox"}
            onPress={() => rootNavigation.navigate("MarketplaceInbox")}
            variant="ghost"
          />
        </View>
      </View>

      <View style={styles.searchShell}>
        <InputField label="Search" onChangeText={setSearch} placeholder="camera, desk, chair, stroller..." value={search} />
        <InputField label="Location" onChangeText={setLocation} placeholder="Kuala Lumpur, Petaling Jaya..." value={location} />
        <View style={styles.priceFilters}>
          <View style={styles.priceField}>
            <InputField label="Min" keyboardType="numeric" onChangeText={setMinimumPrice} placeholder="0" value={minimumPrice} />
          </View>
          <View style={styles.priceField}>
            <InputField label="Max" keyboardType="numeric" onChangeText={setMaximumPrice} placeholder="500" value={maximumPrice} />
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Pressable onPress={resetFilters}>
            <Text style={styles.sectionLink}>Reset</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {marketplaceCategories.map((item) => {
            const active = item === category;
            return (
              <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
                <Text style={[styles.filterChipLabel, active ? styles.filterChipLabelActive : null]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Availability</Text>
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
            <Text style={styles.sectionTitle}>Featured picks</Text>
            <Text style={styles.sectionLink}>Swipe</Text>
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
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All listings</Text>
          <Text style={styles.sectionLink}>{resultsLabel}</Text>
        </View>

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
                />
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons color={palette.muted} name="search-outline" size={28} />
              <Text style={styles.emptyTitle}>No listings match these filters yet.</Text>
              <Text style={styles.emptyBody}>Try another location, wider price range, or reset the filters and browse again.</Text>
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

const styles = StyleSheet.create({
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
