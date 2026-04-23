import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Product, User } from "../types/models";
import { palette, radii, shadows, spacing } from "../theme";

interface ProductCardProps {
  product: Product;
  seller: User;
  onPress: () => void;
  onSellerPress: () => void;
}

function formatListingStatus(status: Product["listingStatus"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function ProductCard({ product, seller, onPress, onSellerPress }: ProductCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: product.imageUrl }} style={styles.image} />
      <View style={styles.imageBadge}>
        <Text style={styles.imageBadgeLabel}>{formatListingStatus(product.listingStatus)}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{product.category}</Text>
          </View>
          <Text style={styles.price}>${product.price}</Text>
        </View>
        <Text style={styles.title}>{product.title}</Text>
        <Text numberOfLines={2} style={styles.description}>
          {product.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{product.condition}</Text>
          <Text style={styles.metaDot}>|</Text>
          <Text numberOfLines={1} style={styles.metaText}>
            {product.location}
          </Text>
        </View>
        <Pressable onPress={onSellerPress} style={styles.sellerRow}>
          <Image source={{ uri: seller.profileImage }} style={styles.avatar} />
          <View>
            <Text style={styles.sellerName}>{seller.name}</Text>
            <Text style={styles.sellerHandle}>@{seller.username}</Text>
          </View>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.floating,
  },
  image: {
    width: "100%",
    height: 220,
  },
  imageBadge: {
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    backgroundColor: "rgba(7,16,24,0.66)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  imageBadgeLabel: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  content: {
    gap: spacing.sm,
    padding: spacing.xl,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badge: {
    backgroundColor: "rgba(54,224,161,0.14)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  badgeLabel: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  price: {
    color: palette.accentSoft,
    fontSize: 24,
    fontWeight: "900",
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  description: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metaText: {
    color: palette.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  metaDot: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  sellerRow: {
    alignItems: "center",
    backgroundColor: palette.glass,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sellerName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  sellerHandle: {
    color: palette.muted,
    fontSize: 12,
  },
});
