import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { MarketplaceDeliveryMethod, MarketplacePaymentMethod } from "../types/models";
import { palette, radii, spacing } from "../theme";

const deliveryOptions: MarketplaceDeliveryMethod[] = ["pickup", "shipping"];
const paymentOptions: MarketplacePaymentMethod[] = ["card", "cash"];

export function MarketplaceCheckoutScreen({ navigation, route }: { navigation: any; route: { params: { productId: string } } }) {
  const { currentUser, products, createMarketplaceOrder } = useAppState();
  const product = products.find((item) => item.id === route.params.productId);
  const [deliveryMethod, setDeliveryMethod] = useState<MarketplaceDeliveryMethod>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<MarketplacePaymentMethod>("card");
  const [shippingAddress, setShippingAddress] = useState("");
  const [buyerNote, setBuyerNote] = useState("");

  if (!product || !currentUser) {
    return (
      <Screen contentContainerStyle={styles.emptyWrap}>
        <Text style={styles.emptyText}>Listing not found.</Text>
      </Screen>
    );
  }

  const activeProduct = product;

  async function handleCheckout() {
    const result = await createMarketplaceOrder({
      productId: activeProduct.id,
      deliveryMethod,
      paymentMethod,
      shippingAddress,
      buyerNote,
    });

    if (!result.ok) {
      Alert.alert("Checkout unavailable", result.message ?? "This order could not be placed right now.");
      return;
    }

    Alert.alert("Order placed", "Your marketplace checkout is complete.");
    if (result.threadId) {
      navigation.replace?.("MarketplaceChat", { threadId: result.threadId });
      return;
    }

    navigation.goBack();
  }

  const unavailable = activeProduct.listingStatus !== "available";

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <SectionTitle title="Checkout" subtitle="Review the item, choose delivery, and place your marketplace order." />
        <View style={styles.summaryCard}>
          <Image source={{ uri: activeProduct.imageUrl }} style={styles.productImage} />
          <View style={styles.summaryCopy}>
            <Text style={styles.productTitle}>{activeProduct.title}</Text>
            <Text style={styles.productMeta}>
              ${activeProduct.price} | {activeProduct.location}
            </Text>
            <Text style={styles.productStatus}>{activeProduct.listingStatus}</Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>Delivery method</Text>
        <View style={styles.choiceRow}>
          {deliveryOptions.map((option) => (
            <ChoiceChip
              key={option}
              active={deliveryMethod === option}
              label={option === "pickup" ? "Local pickup" : "Shipping"}
              onPress={() => setDeliveryMethod(option)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Payment</Text>
        <View style={styles.choiceRow}>
          {paymentOptions.map((option) => (
            <ChoiceChip
              key={option}
              active={paymentMethod === option}
              label={option === "card" ? "Card" : "Cash"}
              onPress={() => setPaymentMethod(option)}
            />
          ))}
        </View>

        {deliveryMethod === "shipping" ? (
          <InputField
            label="Shipping address"
            onChangeText={setShippingAddress}
            placeholder="Street, city, postcode"
            value={shippingAddress}
            multiline
          />
        ) : null}

        <InputField
          label="Note to seller"
          onChangeText={setBuyerNote}
          placeholder="Ask for pickup time, box condition, accessories..."
          value={buyerNote}
          multiline
        />

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Order total</Text>
          <Text style={styles.totalValue}>${activeProduct.price}</Text>
        </View>

        <PrimaryButton
          label={unavailable ? `Listing ${activeProduct.listingStatus}` : "Place order"}
          onPress={() => {
            void handleCheckout();
          }}
          disabled={unavailable}
        />
      </View>
    </Screen>
  );
}

function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceChip, active ? styles.choiceChipActive : null]}>
      <Text style={[styles.choiceLabel, active ? styles.choiceLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
  },
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  productImage: {
    width: 92,
    height: 92,
    borderRadius: radii.lg,
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  productMeta: {
    color: palette.textSoft,
    fontSize: 13,
  },
  productStatus: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  sectionLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  choiceChip: {
    backgroundColor: palette.glass,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  choiceLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  choiceLabelActive: {
    color: "#071118",
  },
  totalCard: {
    alignItems: "center",
    backgroundColor: palette.cardAlt,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  totalLabel: {
    color: palette.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  totalValue: {
    color: palette.text,
    fontSize: 26,
    fontWeight: "900",
  },
});
