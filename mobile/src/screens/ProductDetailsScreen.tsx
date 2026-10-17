import { Alert, Image, ScrollView, Text, View } from "react-native";
import { categoryLabel, conditionLabel } from "../utils/labels";
import { usePriceTools } from "../utils/priceFormatting";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { Product } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

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
    deleteProduct,
    startMarketplaceChat,
  } = useAppState();
  const copy = getCopy(language);
  const { getPriceParts } = usePriceTools();
  const product = products.find((item) => item.id === route.params.productId);

  if (!product) {
    return (
      <Screen contentContainerStyle={styles.missingWrap}>
        <Text style={styles.missingText}>{copy.listingNotFound}</Text>
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
      Alert.alert(copy.saveUnavailableTitle, result.message ?? copy.saveUnavailableBody);
    }
  }

  async function handleListingStatusChange(nextStatus: Product["listingStatus"]) {
    const result = await updateProductListingStatus(activeProduct.id, nextStatus);
    if (!result.ok) {
      Alert.alert(copy.notificationUnavailableTitle, result.message ?? copy.notificationUnavailableBody);
    }
  }

  async function handleDeleteProduct() {
    Alert.alert(copy.pdDeleteListing, copy.pdDeleteListingBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          void (async () => {
            const result = await deleteProduct(activeProduct.id);
            if (!result.ok) {
              Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.deleteUnavailableBody);
              return;
            }

            navigation.goBack();
          })();
        },
      },
    ]);
  }

  async function handleStartChat() {
    const result = await startMarketplaceChat(activeProduct.id);
    if (!result.ok || !result.threadId) {
      Alert.alert(copy.directChatUnavailableTitle, result.message ?? copy.directChatUnavailableBody);
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
        <View style={styles.priceStack}>
          <Text style={styles.price}>{getPriceParts(activeProduct).original}</Text>
          {getPriceParts(activeProduct).approx ? (
            <Text style={styles.priceApprox}>{getPriceParts(activeProduct).approx}</Text>
          ) : null}
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryLabel}>{categoryLabel(activeProduct.category, copy)}</Text>
        </View>
      </View>
      <View style={styles.marketMetaRow}>
        <MarketMeta label={copy.condition} value={conditionLabel(activeProduct.condition, copy)} />
        <MarketMeta label={copy.availability} value={formatListingStatus(activeProduct.listingStatus, copy)} />
      </View>
      <View style={styles.locationCard}>
        <Text style={styles.locationLabel}>{copy.location}</Text>
        <Text style={styles.locationValue}>{activeProduct.location}</Text>
      </View>
      <Text style={styles.description}>{activeProduct.description}</Text>

      {isOwnProduct ? (
        <View style={styles.manageCard}>
          <Text style={styles.manageTitle}>{copy.manageListing}</Text>
          <Text style={styles.manageBody}>{copy.manageListingBody}</Text>
          <View style={styles.manageActions}>
            {listingStatusOptions.map((status) => (
              <PrimaryButton
                key={status}
                label={status === activeProduct.listingStatus ? `${formatListingStatus(status, copy)} ${copy.live.toLowerCase()}` : `${copy.mark} ${formatListingStatus(status, copy)}`}
                onPress={() => {
                  void handleListingStatusChange(status);
                }}
                variant={status === activeProduct.listingStatus ? "solid" : "ghost"}
                disabled={status === activeProduct.listingStatus}
              />
            ))}
          </View>
          <PrimaryButton label={copy.marketplaceInboxTitle} onPress={() => navigation.navigate("MarketplaceInbox")} variant="ghost" />
          <PrimaryButton
            label={copy.pdDeleteListing}
            onPress={() => {
              void handleDeleteProduct();
            }}
            variant="ghost"
          />
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
            label={canBuyNow ? copy.buyNow : activeProduct.listingStatus === "pending" ? copy.currentlyPending : copy.listingSoldLabel}
            onPress={() => navigation.navigate("MarketplaceCheckout", { productId: activeProduct.id })}
            disabled={!canBuyNow}
          />
          <PrimaryButton
            label={copy.contactSeller}
            onPress={() => {
              void handleStartChat();
            }}
            variant="ghost"
          />
          <PrimaryButton
            label={saved ? copy.savedProduct : copy.saveProduct}
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

function formatListingStatus(value: Product["listingStatus"], copy: ReturnType<typeof getCopy>) {
  if (value === "available") {
    return copy.available;
  }

  if (value === "pending") {
    return copy.pending;
  }

  return copy.sold;
}

const styles = createThemedStyles({
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
  priceStack: {
    flexShrink: 1,
    gap: 2,
  },
  priceApprox: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: "600",
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
