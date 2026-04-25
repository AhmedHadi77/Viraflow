import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { marketplaceCategories } from "../data/mockData";
import { useAppState } from "../providers/AppProvider";
import { ProductCondition } from "../types/models";
import { palette, radii, spacing } from "../theme";

type CreateMode = "reel" | "product";
const productConditions: ProductCondition[] = ["New", "Like New", "Good", "Fair"];

export function CreateScreen({
  navigation,
  route,
}: {
  navigation: any;
  route?: { params?: { initialMode?: CreateMode } };
}) {
  const { language, createReel, createProduct } = useAppState();
  const copy = getCopy(language);
  const [mode, setMode] = useState<CreateMode>("reel");
  const [reelCaption, setReelCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoMimeType, setVideoMimeType] = useState("");
  const [videoFileName, setVideoFileName] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | undefined>();
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("Electronics");
  const [productCondition, setProductCondition] = useState<ProductCondition>("Good");
  const [productLocation, setProductLocation] = useState("Kuala Lumpur, Malaysia");
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (route?.params?.initialMode === "product") {
      setMode("product");
      navigation.setParams?.({ initialMode: undefined });
    }
  }, [navigation, route?.params?.initialMode]);

  async function handlePickListingPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo library access so you can upload listing photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.45,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const nextImages = result.assets
      .map((asset) => {
        if (!asset.base64) {
          return null;
        }

        const mimeType = asset.mimeType || "image/jpeg";
        return `data:${mimeType};base64,${asset.base64}`;
      })
      .filter((item): item is string => Boolean(item));

    if (nextImages.length === 0) {
      Alert.alert("Image issue", "The selected photos could not be prepared. Try again.");
      return;
    }

    setProductImageUrls(nextImages.slice(0, 6));
  }

  async function handlePickReelVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Video access needed", "Allow photo library access so you can upload a reel from your phone.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const durationSeconds = typeof asset.duration === "number" ? Math.max(1, Math.round(asset.duration / 1000)) : undefined;
    setVideoUrl(asset.uri);
    setVideoMimeType(asset.mimeType || "video/mp4");
        setVideoFileName(asset.fileName || `pulseora-reel-${Date.now()}.mp4`);
    setVideoDurationSeconds(durationSeconds);
    setThumbnailUrl("");
  }

  async function submitReel() {
    if (!reelCaption.trim() || !videoUrl.trim()) {
      Alert.alert("Missing details", "Add a caption and pick a video first.");
      return;
    }

    setIsPublishing(true);
    try {
      const result = await createReel({
        caption: reelCaption,
        videoUrl,
        thumbnailUrl,
        videoMimeType,
        videoFileName,
        videoDurationSeconds,
      });
      if (!result.ok) {
        Alert.alert("Content blocked", result.message ?? "This reel could not be published.");
        return;
      }

      setReelCaption("");
      setVideoUrl("");
      setVideoMimeType("");
      setVideoFileName("");
      setVideoDurationSeconds(undefined);
      setThumbnailUrl("");
      Alert.alert(copy.reelPublished);
      navigation.navigate("Reels");
    } finally {
      setIsPublishing(false);
    }
  }

  async function submitProduct() {
    if (!productTitle.trim() || !productDescription.trim() || !productPrice.trim() || !productLocation.trim()) {
      Alert.alert("Missing details", "Add a title, description, price, and location first.");
      return;
    }

    if (productImageUrls.length === 0) {
      Alert.alert("Add photos", "Upload at least one listing photo first.");
      return;
    }

    setIsPublishing(true);
    try {
      const result = await createProduct({
        title: productTitle,
        description: productDescription,
        price: productPrice,
        imageUrls: productImageUrls,
        category: productCategory,
        condition: productCondition,
        location: productLocation,
      });
      if (!result.ok) {
        Alert.alert("Content blocked", result.message ?? "This product could not be published.");
        return;
      }

      setProductTitle("");
      setProductDescription("");
      setProductPrice("");
      setProductCategory("Electronics");
      setProductCondition("Good");
      setProductLocation("Kuala Lumpur, Malaysia");
      setProductImageUrls([]);
      Alert.alert(copy.productPublished);
      navigation.navigate("Marketplace");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <Screen scrollable>
      <LinearGradient colors={["rgba(54,224,161,0.12)", "rgba(255,122,47,0.10)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
        <SectionTitle title={copy.create} subtitle={copy.tagline} />
        <Text style={styles.heroBody}>Publish a reel, list a product, and keep your creator brand moving in one workflow.</Text>
      </LinearGradient>

      <View style={styles.toggleRow}>
        <ModeButton active={mode === "reel"} label={copy.uploadReel} onPress={() => setMode("reel")} />
        <ModeButton active={mode === "product"} label={copy.uploadProduct} onPress={() => setMode("product")} />
      </View>

      {mode === "reel" ? (
        <View style={styles.form}>
          <InputField label={copy.reelCaption} onChangeText={setReelCaption} placeholder="Tell the story behind the reel" value={reelCaption} multiline />
          <PrimaryButton
            disabled={isPublishing}
            label={videoFileName ? `Selected: ${videoFileName}` : "Pick reel video from phone"}
            onPress={() => {
              void handlePickReelVideo();
            }}
            variant="ghost"
          />
          <InputField label={copy.reelUrl} onChangeText={setVideoUrl} placeholder="Or paste a video URL" value={videoUrl} />
          <InputField label={copy.thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional image URL" value={thumbnailUrl} />
          <PrimaryButton disabled={isPublishing} label={isPublishing ? "Uploading reel..." : copy.publishReel} onPress={submitReel} />
        </View>
      ) : (
        <View style={styles.form}>
          <SectionTitle
            title="Sell an item"
            subtitle="Create a Facebook-style listing with photos, category, condition, location, and price."
          />
          <PrimaryButton
            disabled={isPublishing}
            label={productImageUrls.length > 0 ? `Listing photos (${productImageUrls.length})` : "Upload listing photos"}
            onPress={() => {
              void handlePickListingPhotos();
            }}
            variant="ghost"
          />
          {productImageUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {productImageUrls.map((imageUrl, index) => (
                <Image key={`${imageUrl}-${index}`} source={{ uri: imageUrl }} style={styles.photoPreview} />
              ))}
            </ScrollView>
          ) : null}
          <InputField label={copy.productTitle} onChangeText={setProductTitle} placeholder="Vintage mirrorless camera" value={productTitle} />
          <InputField
            label={copy.productDescription}
            onChangeText={setProductDescription}
            placeholder="Describe condition, included accessories, and pickup details"
            value={productDescription}
            multiline
          />
          <InputField label={copy.productPrice} keyboardType="numeric" onChangeText={setProductPrice} placeholder="420" value={productPrice} />
          <InputField
            label="Location"
            onChangeText={setProductLocation}
            placeholder="Kuala Lumpur, Malaysia"
            value={productLocation}
          />
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.choiceRow}>
            {marketplaceCategories.filter((item) => item !== "All").map((item) => (
              <ChoiceChip key={item} active={productCategory === item} label={item} onPress={() => setProductCategory(item)} />
            ))}
          </View>
          <Text style={styles.sectionLabel}>Condition</Text>
          <View style={styles.choiceRow}>
            {productConditions.map((item) => (
              <ChoiceChip key={item} active={productCondition === item} label={item} onPress={() => setProductCondition(item)} />
            ))}
          </View>
          <PrimaryButton disabled={isPublishing} label={isPublishing ? "Uploading listing..." : copy.publishProduct} onPress={submitProduct} />
        </View>
      )}
    </Screen>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active ? styles.modeButtonActive : null]}>
      <Text style={[styles.modeLabel, active ? styles.modeLabelActive : null]}>{label}</Text>
    </Pressable>
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
  toggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modeButton: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.md,
  },
  modeButtonActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  modeLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  modeLabelActive: {
    color: "#071118",
  },
  form: {
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
  photoRow: {
    gap: spacing.sm,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
  },
});
