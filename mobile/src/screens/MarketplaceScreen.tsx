import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProductCard } from "../components/ProductCard";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
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
  const { language, products, getTotalMarketplaceUnreadCount, getUserById, refreshCatalog, refreshMarketplaceInbox } = useAppState();
  const copy = getCopy(language);
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

  const filteredProducts = products
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
    <Screen scrollable>
      <LinearGradient colors={["rgba(255,122,47,0.18)", "rgba(54,224,161,0.10)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
        <SectionTitle title={copy.marketplace} subtitle="Buy and sell nearby" />
        <Text style={styles.heroBody}>
          Browse local items, filter by category, price, location, and availability, or jump in and list something for sale.
        </Text>
        <View style={styles.heroActions}>
          <PrimaryButton label="Sell an item" onPress={() => navigation.navigate("Create", { initialMode: "product" })} />
          <PrimaryButton
            label={totalMarketplaceUnreadCount > 0 ? `Marketplace inbox (${totalMarketplaceUnreadCount})` : "Marketplace inbox"}
            onPress={() => rootNavigation.navigate("MarketplaceInbox")}
            variant="ghost"
          />
          <PrimaryButton label="Reset filters" onPress={resetFilters} variant="ghost" />
        </View>
      </LinearGradient>

      <InputField label={copy.searchMarketplace} onChangeText={setSearch} placeholder="camera, desk, lamp, stroller..." value={search} />
      <InputField label="Location" onChangeText={setLocation} placeholder="Kuala Lumpur, Petaling Jaya..." value={location} />

      <View style={styles.priceFilters}>
        <View style={styles.priceField}>
          <InputField label="Min price" keyboardType="numeric" onChangeText={setMinimumPrice} placeholder="0" value={minimumPrice} />
        </View>
        <View style={styles.priceField}>
          <InputField label="Max price" keyboardType="numeric" onChangeText={setMaximumPrice} placeholder="500" value={maximumPrice} />
        </View>
      </View>

      <Text style={styles.filterLabel}>Categories</Text>
      <View style={styles.chips}>
        {marketplaceCategories.map((item) => {
          const active = item === category;
          return (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, active ? styles.chipActive : null]}>
              <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.filterLabel}>Availability</Text>
      <View style={styles.statusRow}>
        {listingStatusFilters.map((item) => {
          const active = item === listingStatus;
          return (
            <Pressable
              key={item}
              onPress={() => setListingStatus(item)}
              style={[styles.statusChip, active ? styles.statusChipActive : null]}
            >
              <Text style={[styles.statusChipLabel, active ? styles.statusChipLabelActive : null]}>
                {formatListingStatus(item)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.resultSummary}>
        <Text style={styles.resultSummaryText}>{resultsLabel}</Text>
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
            <Text style={styles.emptyTitle}>No listings match these filters yet.</Text>
            <Text style={styles.emptyBody}>Try another location or wider price range, or clear the filters and browse all items.</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  heroBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  priceFilters: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  priceField: {
    flex: 1,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: palette.glass,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  chipLabelActive: {
    color: "#071118",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statusChip: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  statusChipActive: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentSoft,
  },
  statusChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  statusChipLabelActive: {
    color: "#071118",
  },
  resultSummary: {
    alignItems: "flex-start",
  },
  resultSummaryText: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    gap: spacing.lg,
  },
  emptyCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
});
