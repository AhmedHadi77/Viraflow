import { Ionicons } from "@expo/vector-icons";
import type { CopyStrings } from "../data/locales/en";
import { categoryLabel, conditionLabel, fill } from "../utils/labels";
import { getRegion } from "../data/regions";
import { useEventListener } from "expo";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AppState,
  Alert,
  Image,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { SafeLinearGradient } from "../components/SafeLinearGradient";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { marketplaceCategories } from "../data/catalog";
import { useAppState } from "../providers/AppProvider";
import {
  MediaEditConfig,
  type MediaOverlayPosition,
  type MediaStickerPlacement,
  ProductCondition,
  StoryMediaType,
} from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

type ExpoVideoModule = typeof import("expo-video");
let cachedExpoVideoModule: ExpoVideoModule | null | undefined;

type CreateMode = "post" | "reel" | "story" | "product";
type StudioMediaType = "image" | "video";
type StudioSpeed = 0.5 | 1 | 1.5 | 2;
type TrimHandle = "start" | "end";

const productConditions: ProductCondition[] = ["New", "Like New", "Good", "Fair"];
const VIDEO_SPEEDS: readonly StudioSpeed[] = [0.5, 1, 1.5, 2];
const STICKER_OPTIONS = ["\u2728", "\u{1F525}", "\u{1F4CD}", "\u{1F60D}", "\u{1F3B5}", "\u{1F4AC}", "\u{1F334}", "\u{1F3AC}"];
const TRIM_SEGMENTS = 18;
const MIN_TRIM_GAP_RATIO = 0.08;
const DEFAULT_TEXT_POSITION: MediaOverlayPosition = { x: 0.14, y: 0.34 };
const DEFAULT_STICKER_POSITIONS: readonly MediaOverlayPosition[] = [
  { x: 0.08, y: 0.14 },
  { x: 0.66, y: 0.14 },
  { x: 0.08, y: 0.56 },
  { x: 0.66, y: 0.56 },
];

interface StudioFilterSettings {
  brightness: -2 | -1 | 0 | 1 | 2;
  contrast: -2 | -1 | 0 | 1 | 2;
  saturation: -2 | -1 | 0 | 1 | 2;
  grayscale: 0 | 25 | 50 | 75 | 100;
}

interface StudioStickerItem extends MediaStickerPlacement {
  id: string;
}

interface StudioMediaItem {
  id: string;
  uri: string;
  type: StudioMediaType;
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
  posterUri?: string;
  overlayText: string;
  overlayTextPosition: MediaOverlayPosition;
  stickers: StudioStickerItem[];
  speed: StudioSpeed;
  trimStartRatio: number;
  trimEndRatio: number;
  filters: StudioFilterSettings;
}

export function CreateScreen({
  navigation,
  route,
}: {
  navigation: any;
  route?: {
    params?: {
      initialMode?: CreateMode;
      prefillAsset?: {
        uri: string;
        type: StudioMediaType;
        mimeType?: string;
        fileName?: string;
        durationSeconds?: number;
      };
    };
  };
}) {
  const { language, region, createPost, createProduct, createReel, createStory } = useAppState();
  const listingCurrency = getRegion(region).currency;
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const copy = getCopy(language);
  const [mode, setMode] = useState<CreateMode>("post");
  const [studioCaption, setStudioCaption] = useState("");
  const [studioHashtags, setStudioHashtags] = useState("");
  const [studioLocation, setStudioLocation] = useState("");
  const [studioMediaItems, setStudioMediaItems] = useState<StudioMediaItem[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [previewSurfaceSize, setPreviewSurfaceSize] = useState({ width: 0, height: 0 });
  const [previewMuted, setPreviewMuted] = useState(false);
  const [trimHandle, setTrimHandle] = useState<TrimHandle>("start");
  const [saveToHighlights, setSaveToHighlights] = useState(false);
  const [highlightLabel, setHighlightLabel] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("Electronics");
  const [productCondition, setProductCondition] = useState<ProductCondition>("Good");
  const [productLocation, setProductLocation] = useState("");
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const activeMedia = useMemo(
    () => studioMediaItems.find((item) => item.id === activeMediaId) ?? studioMediaItems[0],
    [activeMediaId, studioMediaItems]
  );

  const studioHashtagPreview = useMemo(
    () => collectPublishHashtags(studioHashtags, studioCaption).map((tag) => `#${tag}`),
    [studioCaption, studioHashtags]
  );

  const studioSummary = useMemo(() => {
    if (!activeMedia) {
      return mode === "reel"
        ? copy.csPickReelHint
        : mode === "story"
          ? copy.csPickStoryHint
          : copy.csPickPostHint;
    }

    const mediaCount = studioMediaItems.length;
    const mediaLabel =
      mediaCount > 1 ? fill(copy.csMediaSelected, { count: mediaCount }) : activeMedia.type === "video" ? copy.csVideoSelected : copy.csImageSelected;
    const durationLabel = activeMedia.durationSeconds ? ` · ${formatDuration(activeMedia.durationSeconds)}` : "";
    return `${mediaLabel}${durationLabel}`;
  }, [activeMedia, mode, studioMediaItems.length]);

  useEffect(() => {
    if (route?.params?.initialMode) {
      switchMode(route.params.initialMode);
      navigation.setParams?.({ initialMode: undefined });
    }
  }, [navigation, route?.params?.initialMode]);

  useEffect(() => {
    const prefillAsset = route?.params?.prefillAsset;
    if (!prefillAsset) {
      return;
    }

    let cancelled = false;

    async function applyPrefill() {
      const seededAsset = prefillAsset;
      if (!seededAsset) {
        return;
      }

      const seededItem = await createStudioMediaItem(
        {
          uri: seededAsset.uri || "",
          type: seededAsset.type,
          mimeType: seededAsset.mimeType,
          fileName: seededAsset.fileName,
          duration:
            typeof seededAsset.durationSeconds === "number"
              ? seededAsset.durationSeconds * 1000
              : undefined,
        } as ImagePicker.ImagePickerAsset,
        0
      );

      if (cancelled) {
        return;
      }

      const constrained = constrainStudioItems([seededItem], route?.params?.initialMode || mode);
      setStudioMediaItems(constrained);
      setActiveMediaId(constrained[0]?.id ?? null);
      navigation.setParams?.({ prefillAsset: undefined });
    }

    void applyPrefill();

    return () => {
      cancelled = true;
    };
  }, [mode, navigation, route?.params?.initialMode, route?.params?.prefillAsset]);

  useEffect(() => {
    setPreviewMuted(false);
  }, [activeMedia?.id]);

  function switchMode(nextMode: CreateMode) {
    setMode(nextMode);
    if (nextMode === "product") {
      return;
    }

    const constrained = constrainStudioItems(studioMediaItems, nextMode);
    setStudioMediaItems(constrained);
    setActiveMediaId(constrained[0]?.id ?? null);
  }

  async function requestLibraryAccess(message: string) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert(copy.mediaAccessNeededTitle, message);
        return false;
      }

      return true;
    } catch (error) {
      console.warn("Sohba media permission request failed.", error);
      alert(copy.csMediaAccessUnavailable, getMediaPickerErrorMessage(error, copy));
      return false;
    }
  }

  async function handlePickStudioMedia() {
    const allowed = await requestLibraryAccess(copy.csMediaAccessStudio);
    if (!allowed) {
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          mode === "reel" ? ["videos"] : mode === "story" ? ["images", "videos"] : ["images", "videos"],
        allowsMultipleSelection: mode === "post",
        selectionLimit: mode === "post" ? 6 : 1,
        quality: 0.8,
        aspect: mode === "story" ? [9, 16] : undefined,
      });
    } catch (error) {
      console.warn("Sohba studio media picker failed.", error);
      alert(copy.csPickerUnavailable, getMediaPickerErrorMessage(error, copy));
      return;
    }

    if (result.canceled) {
      return;
    }

    const nextItems = await Promise.all(result.assets.map((asset, index) => createStudioMediaItem(asset, index)));
    const filteredItems = constrainStudioItems(nextItems.filter((item) => Boolean(item.uri.trim())), mode);
    if (filteredItems.length === 0) {
      alert(
        copy.csMediaIssue,
        mode === "reel" ? copy.csChooseReelVideo : copy.csMediaIssueBody
      );
      return;
    }

    setStudioMediaItems(filteredItems);
    setActiveMediaId(filteredItems[0]?.id ?? null);
  }

  async function handleCropActiveImage() {
    if (!activeMedia || activeMedia.type !== "image") {
      alert(copy.csCropUnavailable, copy.csCropNeedImage);
      return;
    }

    const allowed = await requestLibraryAccess(copy.csMediaAccessCrop);
    if (!allowed) {
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: mode === "story" ? [9, 16] : [4, 5],
        quality: 0.9,
      });
    } catch (error) {
      console.warn("Sohba crop media picker failed.", error);
      alert(copy.csPickerUnavailable, getMediaPickerErrorMessage(error, copy));
      return;
    }

    if (result.canceled) {
      return;
    }

    const croppedItem = await createStudioMediaItem(result.assets[0], 0, activeMedia);
    setStudioMediaItems((currentItems) =>
      currentItems.map((item) => (item.id === activeMedia.id ? { ...croppedItem, id: activeMedia.id } : item))
    );
  }

  async function handlePickListingPhotos() {
    const allowed = await requestLibraryAccess(copy.csMediaAccessListing);
    if (!allowed) {
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.45,
        base64: true,
      });
    } catch (error) {
      console.warn("Sohba listing media picker failed.", error);
      alert(copy.csPickerUnavailable, getMediaPickerErrorMessage(error, copy));
      return;
    }

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
      alert(copy.imageIssueTitle, copy.csPhotosIssueBody);
      return;
    }

    setProductImageUrls(nextImages.slice(0, 6));
  }

  function updateActiveMedia(update: (item: StudioMediaItem) => StudioMediaItem) {
    if (!activeMedia) {
      return;
    }

    setStudioMediaItems((currentItems) =>
      currentItems.map((item) => (item.id === activeMedia.id ? update(item) : item))
    );
  }

  function updateOverlayTextPosition(position: MediaOverlayPosition) {
    updateActiveMedia((item) => ({
      ...item,
      overlayTextPosition: normalizeOverlayPosition(position, DEFAULT_TEXT_POSITION),
    }));
  }

  function updateStickerPosition(stickerId: string, position: MediaOverlayPosition) {
    updateActiveMedia((item) => ({
      ...item,
      stickers: item.stickers.map((sticker) =>
        sticker.id === stickerId
          ? {
              ...sticker,
              ...normalizeOverlayPosition(position, sticker),
            }
          : sticker
      ),
    }));
  }

  function toggleSticker(sticker: string) {
    updateActiveMedia((item) => {
      const existingSticker = item.stickers.find((entry) => entry.value === sticker);
      if (existingSticker) {
        return {
          ...item,
          stickers: item.stickers.filter((entry) => entry.id !== existingSticker.id),
        };
      }

      const nextPosition = DEFAULT_STICKER_POSITIONS[item.stickers.length] ?? DEFAULT_STICKER_POSITIONS[DEFAULT_STICKER_POSITIONS.length - 1];
      return {
        ...item,
        stickers: [
          ...item.stickers,
          {
            id: `${item.id}-${Date.now()}-${item.stickers.length + 1}`,
            value: sticker,
            ...normalizeOverlayPosition(nextPosition, nextPosition),
          },
        ].slice(0, 4),
      };
    });
  }

  function handleTrimSegmentPress(segmentIndex: number) {
    if (!activeMedia || activeMedia.type !== "video") {
      return;
    }

    const ratio =
      trimHandle === "start"
        ? segmentIndex / TRIM_SEGMENTS
        : Math.min(1, (segmentIndex + 1) / TRIM_SEGMENTS);

    updateActiveMedia((item) => {
      if (trimHandle === "start") {
        return {
          ...item,
          trimStartRatio: Math.min(ratio, item.trimEndRatio - MIN_TRIM_GAP_RATIO),
        };
      }

      return {
        ...item,
        trimEndRatio: Math.max(ratio, item.trimStartRatio + MIN_TRIM_GAP_RATIO),
      };
    });
  }

  function nudgeTrim(secondsDelta: number) {
    if (!activeMedia || activeMedia.type !== "video" || !activeMedia.durationSeconds) {
      return;
    }

    const deltaRatio = secondsDelta / activeMedia.durationSeconds;
    updateActiveMedia((item) => {
      if (trimHandle === "start") {
        return {
          ...item,
          trimStartRatio: clampRatio(item.trimStartRatio + deltaRatio, 0, item.trimEndRatio - MIN_TRIM_GAP_RATIO),
        };
      }

      return {
        ...item,
        trimEndRatio: clampRatio(item.trimEndRatio + deltaRatio, item.trimStartRatio + MIN_TRIM_GAP_RATIO, 1),
      };
    });
  }

  async function submitStudioContent() {
    if (mode === "product") {
      await submitProduct();
      return;
    }

    if (!activeMedia) {
      alert(copy.csAddMedia, copy.csPickAtLeastOne);
      return;
    }

    setIsPublishing(true);
    try {
      if (mode === "post") {
        const result = await createPost({
          caption: composePublishCaption(studioCaption, activeMedia.overlayText, undefined),
          hashtags: collectPublishHashtags(studioHashtags, `${studioCaption} ${activeMedia.overlayText}`),
          location: studioLocation.trim() || undefined,
          mediaItems: studioMediaItems.map((item) => ({
            uri: item.uri,
            type: item.type,
            mimeType: item.mimeType,
            fileName: item.fileName,
            durationSeconds: item.durationSeconds,
            editConfig: buildMediaEditConfig(item),
          })),
        });

        if (!result.ok) {
          alert(copy.csPostUnavailable, result.message ?? copy.csPostFailed);
          return;
        }

        resetStudio();
        alert(copy.csPostPublished, copy.csPostLive);
        navigation.navigate("Home");
        return;
      }

      if (mode === "reel") {
        if (activeMedia.type !== "video") {
          alert(copy.csVideoRequired, copy.csChooseReelVideo);
          return;
        }

        const result = await createReel({
          caption: composePublishCaption(studioCaption, activeMedia.overlayText, studioLocation),
          hashtags: collectPublishHashtags(studioHashtags, `${studioCaption} ${activeMedia.overlayText}`),
          videoUrl: activeMedia.uri,
          thumbnailUrl: activeMedia.posterUri || "",
          videoMimeType: activeMedia.mimeType,
          videoFileName: activeMedia.fileName,
          videoDurationSeconds: activeMedia.durationSeconds,
          editConfig: buildMediaEditConfig(activeMedia),
        });

        if (!result.ok) {
          alert(copy.csReelUnavailable, result.message ?? copy.csReelFailed);
          return;
        }

        resetStudio();
        if (result.reel) {
          rootNavigation.navigate("ReelViewer", { reelId: result.reel.id });
          return;
        }
        alert(copy.reelPublished);
        navigation.navigate("Reels");
        return;
      }

      const storyCaption = composePublishCaption(
        composeCaptionWithHashtags(studioCaption, studioHashtags),
        activeMedia.overlayText,
        studioLocation
      );
      const storyResult = await createStory({
        imageUrl: activeMedia.type === "video" ? activeMedia.posterUri || activeMedia.uri : activeMedia.uri,
        videoUrl: activeMedia.type === "video" ? activeMedia.uri : undefined,
        mediaType: activeMedia.type as StoryMediaType,
        videoMimeType: activeMedia.type === "video" ? activeMedia.mimeType : undefined,
        videoFileName: activeMedia.type === "video" ? activeMedia.fileName : undefined,
        videoDurationSeconds: activeMedia.type === "video" ? activeMedia.durationSeconds : undefined,
        caption: storyCaption,
        saveToHighlights,
        highlightLabel,
        editConfig: buildMediaEditConfig(activeMedia),
      });

      if (!storyResult.ok) {
        alert(copy.storyUnavailableTitle, storyResult.message ?? copy.storyUnavailableBody);
        return;
      }

      resetStudio();
      if (storyResult.story) {
        rootNavigation.navigate("StoryViewer", {
          userId: storyResult.story.userId,
          storyId: storyResult.story.id,
        });
        return;
      }
      alert(copy.storyPostedTitle, copy.storyPostedBody);
      navigation.navigate("Home");
    } finally {
      setIsPublishing(false);
    }
  }

  async function submitProduct() {
    if (!productTitle.trim() || !productDescription.trim() || !productPrice.trim() || !productLocation.trim()) {
      alert(copy.communityMissingDetailsTitle, copy.csMissingListing);
      return;
    }

    if (productImageUrls.length === 0) {
      alert(copy.csAddPhotos, copy.csListingPhotoRequired);
      return;
    }

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
      alert(copy.csContentBlocked, result.message ?? copy.csProductFailed);
      return;
    }

    setProductTitle("");
    setProductDescription("");
    setProductPrice("");
    setProductCategory("Electronics");
    setProductCondition("Good");
    setProductLocation("");
    setProductImageUrls([]);
    alert(copy.productPublished);
    navigation.navigate("Marketplace");
  }

  function resetStudio() {
    setStudioCaption("");
    setStudioHashtags("");
    setStudioLocation("");
    setStudioMediaItems([]);
    setActiveMediaId(null);
    setPreviewMuted(false);
    setTrimHandle("start");
    setSaveToHighlights(false);
    setHighlightLabel("");
  }

  return (
    <Screen contentContainerStyle={styles.screenContent} scrollable>
      <LinearGradient
        colors={["rgba(54,224,161,0.16)", "rgba(255,122,47,0.12)", "rgba(255,255,255,0.02)"]}
        style={styles.hero}
      >
        <SectionTitle title={copy.create} subtitle={copy.csUploadStudio} />
        <Text style={styles.heroBody}>
          {mode === "story"
            ? copy.csIntroStory
            : copy.csIntroPost}
        </Text>
      </LinearGradient>

      <View style={styles.modeSection}>
        <Text style={styles.sectionEyebrow}>{copy.csPostType}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
          <ModeButton active={mode === "post"} icon="images-outline" label={copy.csModePost} onPress={() => switchMode("post")} />
          <ModeButton active={mode === "reel"} icon="play-circle-outline" label={copy.csModeReel} onPress={() => switchMode("reel")} />
          <ModeButton active={mode === "story"} icon="albums-outline" label={copy.csModeStory} onPress={() => switchMode("story")} />
          <ModeButton active={mode === "product"} icon="bag-handle-outline" label={copy.csModeShop} onPress={() => switchMode("product")} />
        </ScrollView>
      </View>

      {mode === "product" ? (
        <View style={styles.formCard}>
          <SectionTitle
            title={copy.csSellItem}
            subtitle={copy.csSellBody}
          />
          <PrimaryButton
            disabled={isPublishing}
            label={productImageUrls.length > 0 ? fill(copy.csListingPhotos, { count: productImageUrls.length }) : copy.csUploadListingPhotos}
            onPress={() => {
              void handlePickListingPhotos();
            }}
            variant="ghost"
          />
          {productImageUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
              {productImageUrls.map((imageUrl, index) => (
                <Image key={`${imageUrl}-${index}`} source={{ uri: imageUrl }} style={styles.productThumb} />
              ))}
            </ScrollView>
          ) : null}
          <InputField label={copy.productTitle} onChangeText={setProductTitle} placeholder={copy.csProductTitlePh} value={productTitle} />
          <InputField
            label={copy.productDescription}
            multiline
            onChangeText={setProductDescription}
            placeholder={copy.csProductDescPh}
            value={productDescription}
          />
          <InputField label={`${copy.productPrice} (${listingCurrency})`} keyboardType="numeric" onChangeText={setProductPrice} placeholder="420" value={productPrice} />
          <InputField label={copy.location} onChangeText={setProductLocation} placeholder={copy.locationPlaceholder} value={productLocation} />
          <Text style={styles.sectionLabel}>{copy.category}</Text>
          <View style={styles.choiceRow}>
            {marketplaceCategories
              .filter((item) => item !== "All")
              .map((item) => (
                <ChoiceChip key={item} active={productCategory === item} label={categoryLabel(item, copy)} onPress={() => setProductCategory(item)} />
              ))}
          </View>
          <Text style={styles.sectionLabel}>{copy.csCondition}</Text>
          <View style={styles.choiceRow}>
            {productConditions.map((item) => (
              <ChoiceChip key={item} active={productCondition === item} label={conditionLabel(item, copy)} onPress={() => setProductCondition(item)} />
            ))}
          </View>
          <PrimaryButton
            disabled={isPublishing}
            label={isPublishing ? copy.csUploadingListing : copy.publishProduct}
            onPress={() => {
              void submitStudioContent();
            }}
          />
        </View>
      ) : (
        <>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderCopy}>
                <Text style={styles.previewTitle}>{copy.csStudioPreview}</Text>
                <Text style={styles.previewSubtitle}>{studioSummary}</Text>
              </View>
              <Pressable
                disabled={isPublishing}
                onPress={() => {
                  void handlePickStudioMedia();
                }}
                style={[styles.mediaPickerButton, isPublishing ? styles.mediaPickerButtonDisabled : null]}
              >
                <Ionicons
                  color={palette.text}
                  name={mode === "reel" ? "play-circle-outline" : "images-outline"}
                  size={16}
                />
                <Text numberOfLines={1} style={styles.mediaPickerButtonLabel}>
                  {studioMediaItems.length > 0
                    ? mode === "post"
                      ? copy.csReplaceMedia
                      : copy.csReplace
                    : mode === "reel"
                      ? copy.csPickVideo
                      : copy.csPickMedia}
                </Text>
              </Pressable>
            </View>

            <View
              onLayout={(event: LayoutChangeEvent) => {
                const { width, height } = event.nativeEvent.layout;
                setPreviewSurfaceSize((currentSize) =>
                  currentSize.width === width && currentSize.height === height ? currentSize : { width, height }
                );
              }}
              style={styles.previewSurface}
            >
              {activeMedia ? (
                <>
                  {activeMedia.type === "video" ? (
                    <StudioVideoPreview
                      item={activeMedia}
                      muted={previewMuted}
                      onSeekRatioChange={handleTrimSegmentPress}
                      onToggleMuted={() => setPreviewMuted((currentValue) => !currentValue)}
                      trimHandle={trimHandle}
                    />
                  ) : (
                    <Image source={{ uri: activeMedia.uri }} style={styles.previewMedia} />
                  )}

                  {renderFilterOverlays(activeMedia.filters)}

                  <SafeLinearGradient
                    colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.64)"]}
                    pointerEvents="none"
                    style={StyleSheet.absoluteFillObject}
                  />

                  <View style={styles.previewTopRail}>
                    <View style={styles.previewBadge}>
                      <Ionicons color={palette.text} name={activeMedia.type === "video" ? "videocam-outline" : "image-outline"} size={14} />
                      <Text style={styles.previewBadgeLabel}>{mode === "reel" ? copy.csModeReel : mode === "story" ? copy.csModeStory : copy.csModePost}</Text>
                    </View>
                    {studioLocation.trim() ? (
                      <View style={styles.previewBadge}>
                        <Ionicons color={palette.text} name="location-outline" size={14} />
                        <Text numberOfLines={1} style={styles.previewBadgeLabel}>
                          {studioLocation.trim()}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {activeMedia.overlayText.trim() ? (
                    <DraggableOverlay
                      onPositionChange={updateOverlayTextPosition}
                      position={activeMedia.overlayTextPosition}
                      previewHeight={previewSurfaceSize.height}
                      previewWidth={previewSurfaceSize.width}
                      style={styles.overlayTextWrap}
                    >
                      <Text style={styles.overlayText}>{activeMedia.overlayText.trim()}</Text>
                    </DraggableOverlay>
                  ) : null}

                  {activeMedia.stickers.map((sticker) => (
                    <DraggableOverlay
                      key={sticker.id}
                      onPositionChange={(position) => updateStickerPosition(sticker.id, position)}
                      position={sticker}
                      previewHeight={previewSurfaceSize.height}
                      previewWidth={previewSurfaceSize.width}
                      style={styles.stickerBadge}
                    >
                      <Text style={styles.stickerLabel}>{sticker.value}</Text>
                    </DraggableOverlay>
                  ))}

                  <View style={styles.previewFooter}>
                    <Text numberOfLines={2} style={styles.previewCaption}>
                      {studioCaption.trim() || copy.csCaptionPreviewPh}
                    </Text>
                    {studioHashtagPreview.length > 0 ? (
                      <Text numberOfLines={2} style={styles.previewTags}>
                        {studioHashtagPreview.join("  ")}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : (
                  <View style={styles.emptyPreviewState}>
                    <Ionicons color={palette.primary} name="sparkles-outline" size={34} />
                    <Text style={styles.emptyPreviewTitle}>{copy.csStudioReady}</Text>
                    <Text style={styles.emptyPreviewBody}>
                      {mode === "story"
                        ? copy.csEmptyStory
                        : copy.csEmptyPost}
                    </Text>
                  </View>
                )}
              </View>

            {studioMediaItems.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
                {studioMediaItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setActiveMediaId(item.id)}
                    style={[styles.mediaThumbWrap, item.id === activeMedia?.id ? styles.mediaThumbWrapActive : null]}
                  >
                    <Image source={{ uri: item.posterUri || item.uri }} style={styles.mediaThumb} />
                    {item.type === "video" ? (
                      <View style={styles.thumbVideoBadge}>
                        <Ionicons color={palette.text} name="play" size={12} />
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <SectionTitle
              title={copy.csEditTools}
              subtitle={
                mode === "story"
                  ? copy.csToolsStoryBody
                  : copy.csToolsPostBody
              }
            />

            <View style={styles.toolCluster}>
              <Text style={styles.sectionLabel}>{mode === "story" ? copy.csStoryTools : copy.csQuickTools}</Text>
              <View style={styles.toolRow}>
                <ToolChip
                  active={false}
                  icon="images-outline"
                  label={studioMediaItems.length > 0 ? copy.csChangeMedia : copy.csSelectMedia}
                  onPress={() => {
                    void handlePickStudioMedia();
                  }}
                />
                <ToolChip
                  active={Boolean(activeMedia && activeMedia.type === "image")}
                  icon="crop-outline"
                  label={copy.csCropImage}
                  onPress={() => {
                    void handleCropActiveImage();
                  }}
                />
                {activeMedia?.type === "video" ? (
                  <ToolChip
                    active={previewMuted}
                    icon={previewMuted ? "volume-mute-outline" : "volume-high-outline"}
                    label={previewMuted ? "Muted" : copy.csSoundOn}
                    onPress={() => setPreviewMuted((currentValue) => !currentValue)}
                  />
                ) : null}
                <ToolChip
                  active={Boolean(activeMedia)}
                  icon="trash-outline"
                  label={copy.csRemove}
                  onPress={() => {
                    if (!activeMedia) {
                      return;
                    }

                    const nextItems = studioMediaItems.filter((item) => item.id !== activeMedia.id);
                    setStudioMediaItems(nextItems);
                    setActiveMediaId(nextItems[0]?.id ?? null);
                  }}
                />
              </View>
            </View>

            <View style={styles.toolCluster}>
              <Text style={styles.sectionLabel}>{copy.csTextOverlay}</Text>
              <Text style={styles.helperCopy}>{copy.csTextOverlayBody}</Text>
              <TextInput
                onChangeText={(value) => {
                  updateActiveMedia((item) => ({ ...item, overlayText: value }));
                }}
                placeholder={copy.csOverlayPh}
                placeholderTextColor={palette.muted}
                style={styles.inlineInput}
                value={activeMedia?.overlayText ?? ""}
              />
            </View>

            <View style={styles.toolCluster}>
              <Text style={styles.sectionLabel}>{copy.csStickers}</Text>
              <Text style={styles.helperCopy}>{copy.csStickersBody}</Text>
              <View style={styles.choiceRow}>
                {STICKER_OPTIONS.map((sticker) => (
                  <ChoiceChip
                    key={sticker}
                    active={Boolean(activeMedia?.stickers.some((entry) => entry.value === sticker))}
                    label={sticker}
                    onPress={() => toggleSticker(sticker)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.toolCluster}>
              <Text style={styles.sectionLabel}>{copy.csFilters}</Text>
              <FilterControl
                label={copy.csBrightness}
                options={[-2, -1, 0, 1, 2]}
                value={activeMedia?.filters.brightness ?? 0}
                onSelect={(value) => updateActiveMedia((item) => ({ ...item, filters: { ...item.filters, brightness: value as StudioFilterSettings["brightness"] } }))}
              />
              <FilterControl
                label={copy.csContrast}
                options={[-2, -1, 0, 1, 2]}
                value={activeMedia?.filters.contrast ?? 0}
                onSelect={(value) => updateActiveMedia((item) => ({ ...item, filters: { ...item.filters, contrast: value as StudioFilterSettings["contrast"] } }))}
              />
              <FilterControl
                label={copy.csSaturation}
                options={[-2, -1, 0, 1, 2]}
                value={activeMedia?.filters.saturation ?? 0}
                onSelect={(value) => updateActiveMedia((item) => ({ ...item, filters: { ...item.filters, saturation: value as StudioFilterSettings["saturation"] } }))}
              />
              <FilterControl
                label={copy.csGrayscale}
                options={[0, 25, 50, 75, 100]}
                value={activeMedia?.filters.grayscale ?? 0}
                onSelect={(value) => updateActiveMedia((item) => ({ ...item, filters: { ...item.filters, grayscale: value as StudioFilterSettings["grayscale"] } }))}
                renderLabel={(value) => `${value}%`}
              />
            </View>

            {activeMedia?.type === "video" ? (
              <View style={styles.toolCluster}>
                <Text style={styles.sectionLabel}>{copy.csTrimSpeed}</Text>
                <Text style={styles.helperCopy}>
                  {copy.csTrimBody}
                </Text>
                <View style={styles.trimToolbar}>
                  <View style={styles.trimHandleRow}>
                    <ChoiceChip active={trimHandle === "start"} label={copy.csSetStart} onPress={() => setTrimHandle("start")} />
                    <ChoiceChip active={trimHandle === "end"} label={copy.csSetEnd} onPress={() => setTrimHandle("end")} />
                  </View>
                  <View style={styles.trimNudgeRow}>
                    <MiniAdjustButton label="-1s" onPress={() => nudgeTrim(-1)} />
                    <MiniAdjustButton label="+1s" onPress={() => nudgeTrim(1)} />
                  </View>
                </View>

                <View style={styles.trimBar}>
                  {Array.from({ length: TRIM_SEGMENTS }).map((_, index) => {
                    const segmentStart = index / TRIM_SEGMENTS;
                    const segmentEnd = (index + 1) / TRIM_SEGMENTS;
                    const isInTrimRange =
                      segmentEnd > (activeMedia?.trimStartRatio ?? 0) &&
                      segmentStart < (activeMedia?.trimEndRatio ?? 1);
                    return (
                      <Pressable
                        key={`trim-${index}`}
                        onPress={() => handleTrimSegmentPress(index)}
                        style={[
                          styles.trimSegment,
                          isInTrimRange ? styles.trimSegmentActive : null,
                          trimHandle === "start" && index === Math.round((activeMedia?.trimStartRatio ?? 0) * TRIM_SEGMENTS)
                            ? styles.trimSegmentHandle
                            : null,
                          trimHandle === "end" && index === Math.round((activeMedia?.trimEndRatio ?? 1) * TRIM_SEGMENTS) - 1
                            ? styles.trimSegmentHandle
                            : null,
                        ]}
                      />
                    );
                  })}
                </View>

                <View style={styles.trimMetaRow}>
                  <Text style={styles.trimMetaLabel}>
                    Start {formatDuration(Math.round((activeMedia.durationSeconds ?? 0) * activeMedia.trimStartRatio))}
                  </Text>
                  <Text style={styles.trimMetaLabel}>
                    End {formatDuration(Math.round((activeMedia.durationSeconds ?? 0) * activeMedia.trimEndRatio))}
                  </Text>
                </View>

                <View style={styles.choiceRow}>
                  {VIDEO_SPEEDS.map((speed) => (
                    <ChoiceChip
                      key={speed}
                      active={activeMedia.speed === speed}
                      label={`${speed}x`}
                      onPress={() => updateActiveMedia((item) => ({ ...item, speed }))}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.toolCluster}>
              <Text style={styles.sectionLabel}>{copy.csDetails}</Text>
              <InputField
                label={copy.captionLabel}
                multiline
                onChangeText={setStudioCaption}
                placeholder={
                  mode === "story"
                    ? copy.csStoryCaptionPh
                    : mode === "reel"
                      ? copy.csReelCaptionPh
                      : copy.csPostCaptionPh
                }
                value={studioCaption}
              />
              <InputField
                label={copy.hashtagsTitle}
                onChangeText={setStudioHashtags}
                placeholder={copy.csHashtagsPh}
                value={studioHashtags}
              />
              {studioHashtagPreview.length > 0 ? (
                <Text style={styles.hashtagPreview}>{studioHashtagPreview.join(" ")}</Text>
              ) : null}
              <InputField
                label={copy.location}
                onChangeText={setStudioLocation}
                placeholder={copy.locationPlaceholder}
                value={studioLocation}
              />
            </View>

            {mode === "story" ? (
              <View style={styles.toolCluster}>
                <Text style={styles.sectionLabel}>{copy.csStoryVisibility}</Text>
                <View style={styles.toolRow}>
                  <ToolChip
                    active={!saveToHighlights}
                    icon="time-outline"
                    label="24h only"
                    onPress={() => setSaveToHighlights(false)}
                  />
                  <ToolChip
                    active={saveToHighlights}
                    icon="star-outline"
                    label={copy.saveHighlight}
                    onPress={() => setSaveToHighlights(true)}
                  />
                </View>
                {saveToHighlights ? (
                  <TextInput
                    onChangeText={setHighlightLabel}
                    placeholder={copy.highlightTitlePlaceholder}
                    placeholderTextColor={palette.muted}
                    style={styles.inlineInput}
                    value={highlightLabel}
                  />
                ) : null}
              </View>
            ) : null}

            <PrimaryButton
              disabled={isPublishing}
              label={
                isPublishing
                  ? mode === "story"
                    ? copy.csPostingStory
                    : mode === "reel"
                      ? copy.csUploadingReel
                      : copy.csPublishingPost
                  : mode === "story"
                    ? copy.postStory
                    : mode === "reel"
                      ? copy.csPublishReel
                      : copy.csPublishPost
              }
              onPress={() => {
                void submitStudioContent();
              }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function ModeButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active ? styles.modeButtonActive : null]}>
      <Ionicons color={active ? "#071118" : palette.text} name={icon} size={18} />
      <Text style={[styles.modeLabel, active ? styles.modeLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function ToolChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.toolChip, active ? styles.toolChipActive : null]}>
      <Ionicons color={active ? "#071118" : palette.text} name={icon} size={16} />
      <Text style={[styles.toolChipLabel, active ? styles.toolChipLabelActive : null]}>{label}</Text>
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

function FilterControl({
  label,
  options,
  value,
  onSelect,
  renderLabel,
}: {
  label: string;
  options: readonly number[];
  value: number;
  onSelect: (value: number) => void;
  renderLabel?: (value: number) => string;
}) {
  return (
    <View style={styles.filterControl}>
      <View style={styles.filterLabelRow}>
        <Text style={styles.filterLabel}>{label}</Text>
        <Text style={styles.filterValue}>{renderLabel ? renderLabel(value) : value > 0 ? `+${value}` : String(value)}</Text>
      </View>
      <View style={styles.choiceRow}>
        {options.map((option) => (
          <ChoiceChip
            key={`${label}-${option}`}
            active={value === option}
            label={renderLabel ? renderLabel(option) : option > 0 ? `+${option}` : String(option)}
            onPress={() => onSelect(option)}
          />
        ))}
      </View>
    </View>
  );
}

function MiniAdjustButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.miniAdjustButton}>
      <Text style={styles.miniAdjustLabel}>{label}</Text>
    </Pressable>
  );
}

function StudioVideoPreview({
  item,
  muted,
  trimHandle,
  onSeekRatioChange,
  onToggleMuted,
}: {
  item: StudioMediaItem;
  muted: boolean;
  trimHandle: TrimHandle;
  onSeekRatioChange: (segmentIndex: number) => void;
  onToggleMuted: () => void;
}) {
  const expoVideo = getExpoVideoModule();
  if (!expoVideo) {
    return (
      <View style={styles.videoFallback}>
        <Image source={{ uri: item.posterUri || item.uri }} style={styles.previewMedia} />
      </View>
    );
  }

  return (
    <RealStudioVideoPreview
      expoVideo={expoVideo}
      item={item}
      muted={muted}
      onSeekRatioChange={onSeekRatioChange}
      onToggleMuted={onToggleMuted}
      trimHandle={trimHandle}
    />
  );
}

function RealStudioVideoPreview({
  expoVideo,
  item,
  muted,
  trimHandle,
  onSeekRatioChange,
  onToggleMuted,
}: {
  expoVideo: ExpoVideoModule;
  item: StudioMediaItem;
  muted: boolean;
  trimHandle: TrimHandle;
  onSeekRatioChange: (segmentIndex: number) => void;
  onToggleMuted: () => void;
}) {
  const { VideoView, useVideoPlayer } = expoVideo;
  const player = useVideoPlayer(item.uri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.audioMixingMode = "duckOthers";
    videoPlayer.muted = muted;
    videoPlayer.volume = muted ? 0 : 1;
    videoPlayer.playbackRate = item.speed;
    videoPlayer.timeUpdateEventInterval = 0.2;
    videoPlayer.play();
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(item.durationSeconds ?? 0);

  const effectiveDuration = durationSeconds || item.durationSeconds || 0;
  const trimStartSeconds = effectiveDuration > 0 ? effectiveDuration * item.trimStartRatio : 0;
  const trimEndSeconds = effectiveDuration > 0 ? effectiveDuration * item.trimEndRatio : effectiveDuration;
  const progressRatio = effectiveDuration > 0 ? Math.min(1, Math.max(0, currentTimeSeconds / effectiveDuration)) : 0;

  useEffect(() => {
    try {
      player.audioMixingMode = "duckOthers";
      player.muted = muted;
      player.volume = muted ? 0 : 1;
      player.playbackRate = item.speed;
    } catch (error) {
      console.warn("Sohba studio could not update the video preview.", error);
    }
  }, [item.speed, muted, player]);

  useEffect(() => {
    try {
      if (effectiveDuration > 0) {
        const nextStart = effectiveDuration * item.trimStartRatio;
        const nextEnd = effectiveDuration * item.trimEndRatio;
        if (player.currentTime < nextStart || player.currentTime > nextEnd) {
          player.currentTime = nextStart;
          setCurrentTimeSeconds(nextStart);
        }
      }
    } catch (error) {
      console.warn("Sohba studio could not sync trim markers.", error);
    }
  }, [effectiveDuration, item.trimEndRatio, item.trimStartRatio, player]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      try {
        if (nextState === "active") {
          if (isPlaying) {
            player.audioMixingMode = "duckOthers";
            player.muted = muted;
            player.volume = muted ? 0 : 1;
            player.play();
          }
        } else {
          player.pause();
        }
      } catch (error) {
        console.warn("Sohba studio video preview could not update app state playback.", error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isPlaying, player]);

  useEventListener(player, "sourceLoad", (event: any) => {
    const nextDuration =
      typeof event?.duration === "number"
        ? event.duration
        : typeof player.duration === "number"
          ? player.duration
          : item.durationSeconds ?? 0;
    if (nextDuration > 0) {
      setDurationSeconds(nextDuration);
    }
  });

  useEventListener(player, "timeUpdate", (event: any) => {
    const nextTime =
      typeof event?.currentTime === "number"
        ? event.currentTime
        : typeof player.currentTime === "number"
          ? player.currentTime
          : 0;
    setCurrentTimeSeconds(nextTime);

    if (effectiveDuration <= 0) {
      return;
    }

    const nextTrimStart = effectiveDuration * item.trimStartRatio;
    const nextTrimEnd = effectiveDuration * item.trimEndRatio;
    if (nextTrimEnd > nextTrimStart && nextTime >= nextTrimEnd) {
      try {
        player.currentTime = nextTrimStart;
      } catch (error) {
        console.warn("Sohba studio preview could not loop within the trim range.", error);
      }
    }
  });

  function togglePlayback() {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        if (effectiveDuration > 0 && currentTimeSeconds >= trimEndSeconds) {
          player.currentTime = trimStartSeconds;
          setCurrentTimeSeconds(trimStartSeconds);
        }
        player.play();
      }
      setIsPlaying((currentValue) => !currentValue);
    } catch (error) {
      console.warn("Sohba studio preview could not toggle playback.", error);
    }
  }

  function seekToRatio(ratio: number) {
    if (effectiveDuration <= 0) {
      return;
    }

    const clampedRatio = clampRatio(ratio, item.trimStartRatio, item.trimEndRatio);
    const nextTime = effectiveDuration * clampedRatio;
    try {
      player.currentTime = nextTime;
      setCurrentTimeSeconds(nextTime);
    } catch (error) {
      console.warn("Sohba studio preview could not seek to that point.", error);
    }
  }

  return (
    <View style={styles.videoPreviewSurface}>
      <Pressable onPress={togglePlayback} style={styles.videoPreviewTouchable}>
        <VideoView
          allowsPictureInPicture={false}
          contentFit="cover"
          fullscreenOptions={{ enable: false }}
          nativeControls={false}
          player={player}
          style={styles.previewMedia}
        />
        {!isPlaying ? (
          <View style={styles.videoPauseBadge}>
            <Ionicons color={palette.text} name="play" size={34} />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.videoControlBar}>
        <View style={styles.videoMetaRow}>
          <Pressable onPress={togglePlayback} style={styles.previewIconButton}>
            <Ionicons color={palette.text} name={isPlaying ? "pause" : "play"} size={18} />
          </Pressable>
          <Text style={styles.videoMetaText}>
            {formatDuration(Math.round(currentTimeSeconds))} / {formatDuration(Math.round(effectiveDuration))}
          </Text>
          <Pressable onPress={onToggleMuted} style={styles.previewIconButton}>
            <Ionicons color={palette.text} name={muted ? "volume-mute" : "volume-high"} size={18} />
          </Pressable>
        </View>

        <View style={styles.videoSeekBar}>
          {Array.from({ length: TRIM_SEGMENTS }).map((_, index) => {
            const segmentStart = index / TRIM_SEGMENTS;
            const segmentEnd = (index + 1) / TRIM_SEGMENTS;
            const isInTrimRange = segmentEnd > item.trimStartRatio && segmentStart < item.trimEndRatio;
            const isPlayed = progressRatio >= segmentEnd;
            const isHandle =
              (trimHandle === "start" && index === Math.round(item.trimStartRatio * TRIM_SEGMENTS)) ||
              (trimHandle === "end" && index === Math.round(item.trimEndRatio * TRIM_SEGMENTS) - 1);
            return (
              <Pressable
                key={`preview-seek-${index}`}
                onLongPress={() => onSeekRatioChange(index)}
                onPress={() => seekToRatio((index + 0.5) / TRIM_SEGMENTS)}
                style={[
                  styles.videoSeekSegment,
                  isInTrimRange ? styles.videoSeekSegmentActive : null,
                  isPlayed ? styles.videoSeekSegmentPlayed : null,
                  isHandle ? styles.videoSeekSegmentHandle : null,
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function renderFilterOverlays(filters: StudioFilterSettings) {
  const layers: React.ReactElement[] = [];

  if (filters.brightness !== 0) {
    layers.push(
      <View
        key="brightness"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor:
              filters.brightness > 0
                ? `rgba(255,255,255,${filters.brightness * 0.06})`
                : `rgba(0,0,0,${Math.abs(filters.brightness) * 0.08})`,
          },
        ]}
      />
    );
  }

  if (filters.contrast !== 0) {
    layers.push(
      <View
        key="contrast"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderColor:
              filters.contrast > 0
                ? `rgba(255,255,255,${filters.contrast * 0.08})`
                : `rgba(0,0,0,${Math.abs(filters.contrast) * 0.12})`,
            borderWidth: Math.abs(filters.contrast) * 4,
          },
        ]}
      />
    );
  }

  if (filters.saturation !== 0) {
    layers.push(
      <View
        key="saturation"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor:
              filters.saturation > 0
                ? `rgba(255,122,47,${filters.saturation * 0.04})`
                : `rgba(92,112,128,${Math.abs(filters.saturation) * 0.05})`,
          },
        ]}
      />
    );
  }

  if (filters.grayscale > 0) {
    layers.push(
      <View
        key="grayscale"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: `rgba(108,116,126,${filters.grayscale / 160})`,
          },
        ]}
      />
    );
  }

  return layers;
}

function parseHashtags(value: string, options?: { allowBareWords?: boolean }) {
  return [
    ...new Set(
      value
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter((item) => Boolean(item) && (options?.allowBareWords || item.startsWith("#")))
        .map((item) => item.replace(/^#+/, "").toLowerCase())
        .filter(Boolean)
    ),
  ].slice(0, 8);
}

function collectPublishHashtags(inputValue: string, fallbackText: string) {
  const explicitTags = parseHashtags(inputValue, { allowBareWords: true });
  return explicitTags.length > 0 ? explicitTags : parseHashtags(fallbackText);
}

async function createStudioMediaItem(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
  previous?: StudioMediaItem
): Promise<StudioMediaItem> {
  const mediaType: StudioMediaType = asset.type === "video" ? "video" : "image";
  let posterUri = previous?.posterUri;

  if (mediaType === "video") {
    try {
      const thumbnail = await VideoThumbnails.getThumbnailAsync(asset.uri, {
        time: 700,
        quality: 0.65,
      });
      posterUri = thumbnail.uri;
    } catch {
      posterUri = previous?.posterUri;
    }
  }

  return {
    id: previous?.id || asset.assetId || `${Date.now()}-${index + 1}`,
    uri: asset.uri,
    type: mediaType,
    mimeType: asset.mimeType || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    fileName: resolveStudioFileName(asset, mediaType, index),
    durationSeconds:
      mediaType === "video" && typeof asset.duration === "number"
        ? Math.max(1, Math.round(asset.duration / 1000))
        : previous?.durationSeconds,
    posterUri,
    overlayText: previous?.overlayText || "",
    overlayTextPosition: normalizeOverlayPosition(previous?.overlayTextPosition, DEFAULT_TEXT_POSITION),
    stickers:
      previous?.stickers.map((sticker, stickerIndex) => ({
        ...sticker,
        ...normalizeOverlayPosition(sticker, DEFAULT_STICKER_POSITIONS[stickerIndex] ?? DEFAULT_STICKER_POSITIONS[DEFAULT_STICKER_POSITIONS.length - 1]),
      })) || [],
    speed: previous?.speed || 1,
    trimStartRatio: previous?.trimStartRatio ?? 0,
    trimEndRatio: previous?.trimEndRatio ?? 1,
    filters: previous?.filters || {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      grayscale: 0,
    },
  };
}

function constrainStudioItems(items: StudioMediaItem[], mode: CreateMode) {
  if (mode === "post" || mode === "product") {
    return items.slice(0, 6);
  }

  if (mode === "reel") {
    const firstVideo = items.find((item) => item.type === "video");
    return firstVideo ? [firstVideo] : [];
  }

  return items.slice(0, 1);
}

function composePublishCaption(caption: string, overlayText: string, location?: string) {
  const normalizedCaption = caption.trim();
  const normalizedOverlay = overlayText.trim();
  const normalizedLocation = location?.trim();
  const lines = [
    normalizedCaption || undefined,
    normalizedOverlay && normalizedOverlay !== normalizedCaption ? normalizedOverlay : undefined,
    normalizedLocation ? `📍 ${normalizedLocation}` : undefined,
  ].filter((item): item is string => Boolean(item));
  return lines.join("\n\n");
}

function composeCaptionWithHashtags(caption: string, hashtags: string) {
  const normalizedCaption = caption.trim();
  const tagLine = parseHashtags(hashtags, { allowBareWords: true })
    .map((tag) => `#${tag}`)
    .join(" ");
  return [normalizedCaption || undefined, tagLine || undefined].filter((item): item is string => Boolean(item)).join("\n\n");
}

function resolveStudioFileName(asset: ImagePicker.ImagePickerAsset, mediaType: StudioMediaType, index: number) {
  const fallbackBase = `pulseora-studio-${index + 1}`;
  const candidate = asset.fileName?.trim() || getLastUriPathPart(asset.uri) || fallbackBase;
  const safeName = sanitizeUploadFileName(candidate) || fallbackBase;

  if (/\.[a-z0-9]{2,5}$/i.test(safeName)) {
    return safeName;
  }

  return `${safeName}.${inferUploadExtension(asset.mimeType, mediaType === "video" ? "mp4" : "jpg")}`;
}

function getLastUriPathPart(uri: string) {
  const rawName = uri.split("?")[0].split("/").filter(Boolean).pop() ?? "";
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function sanitizeUploadFileName(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+|_+$/g, "");
}

function inferUploadExtension(mimeType: string | undefined, fallback: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
    "video/webm": "webm",
  };

  return mimeType ? extensions[mimeType.toLowerCase()] ?? fallback : fallback;
}

function formatDuration(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clampRatio(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeOverlayPosition(
  position: Partial<MediaOverlayPosition> | undefined,
  fallback: MediaOverlayPosition
): MediaOverlayPosition {
  return {
    x: clampRatio(position?.x ?? fallback.x, 0.02, 0.9),
    y: clampRatio(position?.y ?? fallback.y, 0.02, 0.9),
  };
}

function buildMediaEditConfig(item: StudioMediaItem): MediaEditConfig | undefined {
  const overlayText = item.overlayText.trim();
  const stickers = item.stickers
    .map((sticker, index) => {
      const normalizedSticker = sticker.value.trim();
      if (!normalizedSticker) {
        return null;
      }

      const normalizedPosition = normalizeOverlayPosition(
        sticker,
        DEFAULT_STICKER_POSITIONS[index] ?? DEFAULT_STICKER_POSITIONS[DEFAULT_STICKER_POSITIONS.length - 1]
      );
      return {
        value: normalizedSticker,
        x: normalizedPosition.x,
        y: normalizedPosition.y,
      };
    })
    .filter((sticker): sticker is MediaStickerPlacement => Boolean(sticker));
  const filters = {
    brightness: item.filters.brightness,
    contrast: item.filters.contrast,
    saturation: item.filters.saturation,
    grayscale: item.filters.grayscale,
  };

  const hasFilter =
    filters.brightness !== 0 ||
    filters.contrast !== 0 ||
    filters.saturation !== 0 ||
    filters.grayscale !== 0;
  const hasTrim = item.type === "video" && (Math.abs(item.trimStartRatio) > 0.001 || Math.abs(item.trimEndRatio - 1) > 0.001);
  const hasSpeed = item.type === "video" && item.speed !== 1;
  const hasOverlay = Boolean(overlayText) || stickers.length > 0;

  if (!hasFilter && !hasTrim && !hasSpeed && !hasOverlay) {
    return undefined;
  }

  return {
    overlayText: overlayText || undefined,
    overlayTextPosition: overlayText ? normalizeOverlayPosition(item.overlayTextPosition, DEFAULT_TEXT_POSITION) : undefined,
    stickers: stickers.length > 0 ? stickers : undefined,
    filters: hasFilter ? filters : undefined,
    trimStartRatio: hasTrim ? item.trimStartRatio : undefined,
    trimEndRatio: hasTrim ? item.trimEndRatio : undefined,
    playbackRate: hasSpeed ? item.speed : undefined,
  };
}

function alert(title: string, message?: string) {
  return Alert.alert(title, message);
}

function getMediaPickerErrorMessage(error: unknown, copy: CopyStrings) {
  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("permission")) {
    return copy.csMediaAccessUnavailableBody;
  }

  return copy.csPickerUnavailableBody;
}

function DraggableOverlay({
  children,
  onPositionChange,
  position,
  previewHeight,
  previewWidth,
  style,
}: {
  children: ReactNode;
  onPositionChange: (position: MediaOverlayPosition) => void;
  position: MediaOverlayPosition;
  previewHeight: number;
  previewWidth: number;
  style?: any;
}) {
  const [itemSize, setItemSize] = useState({ width: 0, height: 0 });
  const dragOriginRef = useRef({
    left: 0,
    top: 0,
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          dragOriginRef.current = {
            left: position.x * previewWidth,
            top: position.y * previewHeight,
          };
        },
        onPanResponderMove: (_, gestureState) => {
          if (previewWidth <= 0 || previewHeight <= 0) {
            return;
          }

          const maxLeft = Math.max(0, previewWidth - itemSize.width);
          const maxTop = Math.max(0, previewHeight - itemSize.height);
          const nextLeft = Math.min(maxLeft, Math.max(0, dragOriginRef.current.left + gestureState.dx));
          const nextTop = Math.min(maxTop, Math.max(0, dragOriginRef.current.top + gestureState.dy));

          onPositionChange({
            x: previewWidth > 0 ? nextLeft / previewWidth : position.x,
            y: previewHeight > 0 ? nextTop / previewHeight : position.y,
          });
        },
      }),
    [itemSize.height, itemSize.width, onPositionChange, position.x, position.y, previewHeight, previewWidth]
  );

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => {
        const { height, width } = event.nativeEvent.layout;
        setItemSize((currentSize) =>
          currentSize.width === width && currentSize.height === height ? currentSize : { width, height }
        );
      }}
      style={[
        style,
        {
          left: position.x * previewWidth,
          top: position.y * previewHeight,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </View>
  );
}

function getExpoVideoModule() {
  if (cachedExpoVideoModule !== undefined) {
    return cachedExpoVideoModule;
  }

  try {
    cachedExpoVideoModule = require("expo-video") as ExpoVideoModule;
  } catch (error) {
    console.warn("Sohba upload studio video module is unavailable in this build.", error);
    cachedExpoVideoModule = null;
  }

  return cachedExpoVideoModule;
}

const styles = createThemedStyles({
  screenContent: {
    gap: spacing.lg,
  },
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
    lineHeight: 22,
  },
  modeSection: {
    gap: spacing.sm,
  },
  sectionEyebrow: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  modeRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  modeButton: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 112,
    paddingHorizontal: spacing.lg,
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
  previewCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.xl,
  },
  previewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  previewHeaderCopy: {
    flex: 1,
    minWidth: 180,
  },
  previewTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  mediaPickerButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: palette.glass,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  mediaPickerButtonDisabled: {
    opacity: 0.45,
  },
  mediaPickerButtonLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  previewSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 220,
  },
  previewSurface: {
    backgroundColor: palette.backgroundDeep,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    height: 520,
    overflow: "hidden",
    position: "relative",
  },
  previewMedia: {
    height: "100%",
    width: "100%",
  },
  emptyPreviewState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyPreviewTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyPreviewBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  previewTopRail: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
  },
  previewBadge: {
    alignItems: "center",
    backgroundColor: "rgba(7,16,24,0.58)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  previewBadgeLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
  overlayTextWrap: {
    backgroundColor: "rgba(7,16,24,0.22)",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: radii.lg,
    borderWidth: 1,
    maxWidth: "82%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
  },
  overlayText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.3,
    lineHeight: 34,
    textAlign: "left",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  stickerBadge: {
    alignItems: "center",
    backgroundColor: "rgba(7,16,24,0.34)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.lg,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "absolute",
  },
  stickerLabel: {
    fontSize: 22,
  },
  previewFooter: {
    bottom: spacing.lg,
    gap: spacing.sm,
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
  },
  previewCaption: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  previewTags: {
    color: palette.accentSoft,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  thumbnailRow: {
    gap: spacing.sm,
  },
  mediaThumbWrap: {
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  mediaThumbWrapActive: {
    borderColor: palette.primary,
    borderWidth: 2,
  },
  mediaThumb: {
    height: 92,
    width: 72,
  },
  thumbVideoBadge: {
    alignItems: "center",
    backgroundColor: "rgba(7,16,24,0.72)",
    borderRadius: radii.pill,
    bottom: 8,
    height: 24,
    justifyContent: "center",
    left: 8,
    position: "absolute",
    width: 24,
  },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  toolCluster: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  helperCopy: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  toolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  toolChip: {
    alignItems: "center",
    backgroundColor: palette.glass,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  toolChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  toolChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  toolChipLabelActive: {
    color: "#071118",
  },
  inlineInput: {
    backgroundColor: palette.input,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  choiceChip: {
    backgroundColor: palette.backgroundSoft,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.primary,
  },
  choiceLabel: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  choiceLabelActive: {
    color: palette.primary,
  },
  filterControl: {
    gap: spacing.sm,
  },
  filterLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  filterValue: {
    color: palette.accentSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  trimToolbar: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  trimHandleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  trimNudgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  miniAdjustButton: {
    backgroundColor: palette.backgroundSoft,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  miniAdjustLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
  trimBar: {
    flexDirection: "row",
    gap: 4,
  },
  trimSegment: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.pill,
    flex: 1,
    height: 12,
  },
  trimSegmentActive: {
    backgroundColor: "rgba(54,224,161,0.36)",
  },
  trimSegmentHandle: {
    backgroundColor: palette.accent,
  },
  trimMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trimMetaLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  hashtagPreview: {
    color: palette.accentSoft,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  productThumb: {
    borderRadius: radii.lg,
    height: 96,
    width: 96,
  },
  videoFallback: {
    flex: 1,
  },
  videoPreviewSurface: {
    flex: 1,
  },
  videoPreviewTouchable: {
    flex: 1,
  },
  videoPauseBadge: {
    alignItems: "center",
    backgroundColor: "rgba(7,16,24,0.55)",
    borderRadius: radii.pill,
    height: 74,
    justifyContent: "center",
    left: "50%",
    marginLeft: -37,
    marginTop: -37,
    position: "absolute",
    top: "50%",
    width: 74,
  },
  previewIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(7,16,24,0.48)",
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  videoControlBar: {
    bottom: spacing.md,
    gap: spacing.sm,
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
  },
  videoMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  videoMetaText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
  videoSeekBar: {
    flexDirection: "row",
    gap: 3,
  },
  videoSeekSegment: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.pill,
    flex: 1,
    height: 8,
  },
  videoSeekSegmentActive: {
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  videoSeekSegmentPlayed: {
    backgroundColor: palette.primary,
  },
  videoSeekSegmentHandle: {
    backgroundColor: palette.accent,
  },
});
