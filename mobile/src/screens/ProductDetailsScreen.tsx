import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { Product } from "../types/models";
import { palette, radii, spacing } from "../theme";

const listingStatusOptions: Product["listingStatus"][] = ["available", "pending", "sold"];

export function ProductDetailsScreen({ navigation, route }: { navigation: any; route: { params: { productId: string } } }) {
  const {
    language,
    currentUser,
    products,
    getUserById,
    isProductSaved,
    toggleSaveProduct,
    updateProductListingStatus,
    startMarketplaceChat,
  } = useAppState();
  const copy = getCopy(language);
  const product = products.find((item) => item.id === route.params.productId);

  if (!product) {
    return (
      <Screen contentContainerStyle={styles.missingWrap}>
        <Text style={styles.missingText}>Product not found.</Text>
      </Screen>
    );
  }

  const activeProduct = product;
  const seller = getUserById(activeProduct.userId);
  const saved = isProductSaved(activeProduct.id);
  const isOwnProduct = activeProduct.userId === currentUser?.id;
  const canBuyNow = activeProduct.listingStatus === "available";

  if (!seller) {
    return null;
  }

  async function handleSave() {
    const result = await toggleSaveProduct(activeProduct.id);
    if (!result.ok) {
      Alert.alert("Save unavailable", result.message ?? "This product could not be saved right now.");
    }
  }

  async function handleListingStatusChange(nextStatus: Product["listingStatus"]) {
    const result = await updateProductListingStatus(activeProduct.id, nextStatus);
    if (!result.ok) {
      Alert.alert("Listing update unavailable", result.message ?? "This listing could not be updated right now.");
    }
  }

  async function handleStartChat() {
    const result = await startMarketplaceChat(activeProduct.id);
    if (!result.ok || !result.threadId) {
      Alert.alert("Chat unavailable", result.message ?? "This chat could not be opened right now.");
      return;
    }

    navigation.navigate("MarketplaceChat", { threadId: result.threadId });
  }

  return (
    <Screen scrollable>
      <Image source={{ uri: activeProduct.imageUrl }} style={styles.heroImage} />
      {activeProduct.imageUrls.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
          {activeProduct.imageUrls.map((imageUrl, index) => (
            <Image key={`${imageUrl}-${index}`} source={{ uri: imageUrl }} style={styles.galleryThumb} />
          ))}
        </ScrollView>
      ) : null}
      <SectionTitle title={activeProduct.title} subtitle={copy.productDetails} />
      <View style={styles.priceRow}>
        <Text style={styles.price}>${activeProduct.price}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryLabel}>{activeProduct.category}</Text>
        </View>
      </View>
      <View style={styles.marketMetaRow}>
        <MarketMeta label="Condition" value={activeProduct.condition} />
        <MarketMeta label="Availability" value={formatListingStatus(activeProduct.listingStatus)} />
      </View>
      <View style={styles.locationCard}>
        <Text style={styles.locationLabel}>Location</Text>
        <Text style={styles.locationValue}>{activeProduct.location}</Text>
      </View>
      <Text style={styles.description}>{activeProduct.description}</Text>

      {isOwnProduct ? (
        <View style={styles.manageCard}>
          <Text style={styles.manageTitle}>Manage listing</Text>
          <Text style={styles.manageBody}>Update the listing status the same way sellers do in Facebook-style marketplace flows.</Text>
          <View style={styles.manageActions}>
            {listingStatusOptions.map((status) => (
              <PrimaryButton
                key={status}
                label={status === activeProduct.listingStatus ? `${formatListingStatus(status)} now` : `Mark ${formatListingStatus(status)}`}
                onPress={() => {
                  void handleListingStatusChange(status);
                }}
                variant={status === activeProduct.listingStatus ? "solid" : "ghost"}
                disabled={status === activeProduct.listingStatus}
              />
            ))}
          </View>
          <PrimaryButton label="Open marketplace inbox" onPress={() => navigation.navigate("MarketplaceInbox")} variant="ghost" />
        </View>
      ) : null}

      <View style={styles.sellerCard}>
        <Text style={styles.sellerTitle}>{copy.sellerProfile}</Text>
        <Text style={styles.sellerName}>{seller.name}</Text>
        <Text style={styles.sellerHandle}>@{seller.username}</Text>
        <Text style={styles.sellerBio}>{seller.bio}</Text>
      </View>

      <PrimaryButton label={copy.sellerProfile} onPress={() => navigation.navigate("PublicProfile", { userId: seller.id })} />
      {!isOwnProduct ? (
        <>
          <PrimaryButton
            label={canBuyNow ? "Buy now" : activeProduct.listingStatus === "pending" ? "Currently pending" : "Listing sold"}
            onPress={() => navigation.navigate("MarketplaceCheckout", { productId: activeProduct.id })}
            disabled={!canBuyNow}
          />
          <PrimaryButton
            label="Chat seller"
            onPress={() => {
              void handleStartChat();
            }}
            variant="ghost"
          />
          <PrimaryButton
            label={saved ? "Saved product" : "Save product"}
            onPress={() => {
              void handleSave();
            }}
            variant="ghost"
          />
        </>
      ) : null}
    </Screen>
  );
}

function MarketMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.marketMetaCard}>
      <Text style={styles.marketMetaLabel}>{label}</Text>
      <Text style={styles.marketMetaValue}>{value}</Text>
    </View>
  );
}

function formatListingStatus(value: Product["listingStatus"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  missingWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  missingText: {
    color: palette.muted,
    fontSize: 15,
  },
  heroImage: {
    width: "100%",
    height: 260,
    borderRadius: radii.lg,
  },
  galleryRow: {
    gap: spacing.sm,
  },
  galleryThumb: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
  },
  priceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  price: {
    color: palette.text,
    fontSize: 30,
    fontWeight: "900",
  },
  categoryBadge: {
    backgroundColor: "rgba(32,201,151,0.16)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  categoryLabel: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  marketMetaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  marketMetaCard: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  marketMetaLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  marketMetaValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  locationCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 4,
    padding: spacing.lg,
  },
  locationLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  locationValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  description: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 24,
  },
  manageCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  manageTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  manageBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  manageActions: {
    gap: spacing.sm,
  },
  sellerCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 6,
    padding: spacing.lg,
  },
  sellerTitle: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  sellerName: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sellerHandle: {
    color: palette.muted,
    fontSize: 13,
  },
  sellerBio: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 22,
  },
});
