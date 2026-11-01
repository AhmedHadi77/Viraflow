import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { EditorMode, EditorResult, openMediaEditor } from "../components/studio/editorSession";
import { FilterPreview } from "../components/studio/FilterPreview";
import { StudioLayersOverlay } from "../components/studio/StudioLayers";
import { buildPublishMedia, mainClipOf, PublishMedia, timelineSeconds } from "../components/studio/studioPlan";
import { marketplaceCategories } from "../data/catalog";
import { getCopy } from "../data/copy";
import type { CopyStrings } from "../data/locales/en";
import { getRegion } from "../data/regions";
import { useAppState } from "../providers/AppProvider";
import { createThemedStyles, palette, radii, spacing } from "../theme";
import { ProductCondition, StoryMediaType } from "../types/models";
import { categoryLabel, conditionLabel, fill } from "../utils/labels";
import { formatRelativeTime } from "../utils/timeFormatting";

type CreateMode = "post" | "reel" | "story" | "product";
type StudioMode = Exclude<CreateMode, "product">;

const productConditions: ProductCondition[] = ["New", "Like New", "Good", "Fair"];
const ITEM_LIMITS: Record<StudioMode, number> = { post: 20, story: 10, reel: 10 };
// Upload limits of the media host: 100 MB per video and 10 MB per photo.
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DRAFT_LIMIT = 20;

/** One photo or video being prepared (its edits come from the editor). */
interface CreateItem {
  id: string;
  uri: string;
  type: "image" | "video";
  mimeType?: string;
  fileName?: string;
  durationSeconds?: number;
  posterUri?: string;
  editor?: EditorResult;
  altText?: string;
}

interface CreateDraft {
  id: string;
  mode: StudioMode;
  savedAt: string;
  caption: string;
  hashtags: string;
  location: string;
  hideLikes: boolean;
  commentsOff: boolean;
  saveToHighlights: boolean;
  highlightLabel: string;
  items: CreateItem[];
}

function draftsKey(userId: string | undefined) {
  return `sohba.createDrafts.v1.${userId ?? "guest"}`;
}

async function readDrafts(userId: string | undefined): Promise<CreateDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(draftsKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed.filter((item) => item && typeof item === "object" && Array.isArray((item as CreateDraft).items)) as CreateDraft[]) : [];
  } catch {
    return [];
  }
}

async function writeDrafts(userId: string | undefined, drafts: CreateDraft[]) {
  try {
    await AsyncStorage.setItem(draftsKey(userId), JSON.stringify(drafts.slice(0, DRAFT_LIMIT)));
  } catch {
    // Storage full or unavailable: drafts are a convenience.
  }
}

// Drafts keep files picked on the phone; in a web browser those links don't survive a reload.
const DRAFTS_SUPPORTED = Platform.OS !== "web";

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
        type: "image" | "video";
        mimeType?: string;
        fileName?: string;
        durationSeconds?: number;
      };
    };
  };
}) {
  const { language, region, currentUser, createPost, createProduct, createReel, createStory, publishProgress } = useAppState();
  const listingCurrency = getRegion(region).currency;
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const copy = getCopy(language);
  const [mode, setMode] = useState<CreateMode>("post");
  const [items, setItems] = useState<CreateItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [location, setLocation] = useState("");
  const [hideLikes, setHideLikes] = useState(false);
  const [commentsOff, setCommentsOff] = useState(false);
  const [saveToHighlights, setSaveToHighlights] = useState(false);
  const [highlightLabel, setHighlightLabel] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [storyProgress, setStoryProgress] = useState<{ done: number; total: number } | null>(null);
  const [drafts, setDrafts] = useState<CreateDraft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("Electronics");
  const [productCondition, setProductCondition] = useState<ProductCondition>("Good");
  const [productLocation, setProductLocation] = useState("");
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);

  const studioMode: StudioMode = mode === "product" ? "post" : mode;
  const activeItem = useMemo(() => items.find((item) => item.id === activeId) ?? items[0], [activeId, items]);
  const hashtagPreview = useMemo(() => collectPublishHashtags(hashtags, caption).map((tag) => `#${tag}`), [caption, hashtags]);

  useEffect(() => {
    let cancelled = false;
    if (!DRAFTS_SUPPORTED) {
      return;
    }
    void readDrafts(currentUser?.id).then((list) => {
      if (!cancelled) {
        setDrafts(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (route?.params?.initialMode) {
      switchMode(route.params.initialMode);
      navigation.setParams?.({ initialMode: undefined });
    }
    // Only when a new starting mode is passed in.
  }, [navigation, route?.params?.initialMode]);

  // Opening Create with a photo or video already chosen (e.g. "Add to story" from Home).
  const prefillHandled = useRef<string | null>(null);
  useEffect(() => {
    const asset = route?.params?.prefillAsset;
    if (!asset?.uri || prefillHandled.current === asset.uri) {
      return;
    }
    prefillHandled.current = asset.uri;
    const targetMode: StudioMode = route?.params?.initialMode && route.params.initialMode !== "product" ? route.params.initialMode : studioMode;
    void (async () => {
      const item = await itemFromAsset({
        uri: asset.uri,
        type: asset.type,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        duration: typeof asset.durationSeconds === "number" ? asset.durationSeconds * 1000 : undefined,
      } as ImagePicker.ImagePickerAsset);
      setItems([item]);
      setActiveId(item.id);
      navigation.setParams?.({ prefillAsset: undefined });
      openEditorFor(item, targetMode);
    })();
  }, [route?.params?.prefillAsset]);

  function switchMode(next: CreateMode) {
    setMode(next);
    if (next === "product") {
      return;
    }
    setItems((current) => {
      const limited = next === "reel" ? current.slice(0, 1) : current.slice(0, ITEM_LIMITS[next]);
      setActiveId(limited[0]?.id ?? null);
      return limited;
    });
  }

  function openEditorFor(item: CreateItem, modeOverride?: StudioMode) {
    const editorMode: EditorMode = modeOverride ?? studioMode;
    openMediaEditor(rootNavigation, {
      mode: editorMode,
      media: {
        uri: item.uri,
        type: item.type,
        durationSeconds: item.durationSeconds,
        posterUri: item.posterUri,
        mimeType: item.mimeType,
        fileName: item.fileName,
      },
      initial: item.editor,
      doneLabel: copy.edDone,
      onDone: (result) => {
        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? { ...entry, editor: result, posterUri: result.posterUri ?? entry.posterUri } : entry))
        );
      },
    });
  }

  async function requestLibraryAccess(message: string) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(copy.mediaAccessNeededTitle, message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn("Sohba media permission request failed.", error);
      Alert.alert(copy.csMediaAccessUnavailable, getMediaPickerErrorMessage(error, copy));
      return false;
    }
  }

  /** Picks photos and videos. Several picked for a reel become clips of one video (joined in the editor). */
  async function pickMedia(append: boolean) {
    const allowed = await requestLibraryAccess(copy.csMediaAccessStudio);
    if (!allowed) {
      return;
    }
    const limit = ITEM_LIMITS[studioMode];
    const room = studioMode === "reel" ? limit : append ? limit - items.length : limit;
    if (room <= 0) {
      setNotice(fill(copy.crItemsLimit, { count: limit }));
      return;
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: room > 1,
        selectionLimit: room,
        quality: 0.85,
      });
    } catch (error) {
      console.warn("Sohba studio media picker failed.", error);
      Alert.alert(copy.csPickerUnavailable, getMediaPickerErrorMessage(error, copy));
      return;
    }
    if (result.canceled) {
      return;
    }
    const fitting = result.assets.filter((asset) => !isAssetTooLarge(asset) && Boolean(asset.uri));
    if (fitting.length < result.assets.length) {
      Alert.alert(copy.csMediaIssue, copy.csFileTooBig);
    }
    if (fitting.length === 0) {
      return;
    }
    const picked = await Promise.all(fitting.map((asset, index) => itemFromAsset(asset, index)));

    if (studioMode === "reel") {
      // One reel: the first pick is the main clip, the rest join it as clips.
      const [first, ...rest] = picked;
      const item: CreateItem =
        rest.length > 0
          ? {
              ...first,
              editor: {
                ...emptyResultFor(first),
                timeline: [
                  mainClipOf(first),
                  ...rest.map((entry, index) => ({
                    ...mainClipOf(entry),
                    id: `clip-${Date.now().toString(36)}-${index}`,
                    imageSeconds: entry.type === "image" ? 3 : undefined,
                  })),
                ],
                canvas: { aspect: "9:16", fit: "fill", background: "blur", rotate: 0, mirror: false },
              },
            }
          : first;
      setItems([item]);
      setActiveId(item.id);
      openEditorFor(item, "reel");
      return;
    }

    const next = append ? [...items, ...picked].slice(0, limit) : picked.slice(0, limit);
    setItems(next);
    setActiveId(picked[0].id);
    // Go straight into the editor, like Instagram.
    openEditorFor(picked[0]);
  }

  function updateItem(id: string, patch: Partial<CreateItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  function moveItem(id: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  // ---- Drafts -------------------------------------------------------------------------------------

  async function saveDraft(silent = false) {
    if (!DRAFTS_SUPPORTED || mode === "product" || items.length === 0) {
      return;
    }
    const draft: CreateDraft = {
      id: draftId ?? `draft-${Date.now().toString(36)}`,
      mode: studioMode,
      savedAt: new Date().toISOString(),
      caption,
      hashtags,
      location,
      hideLikes,
      commentsOff,
      saveToHighlights,
      highlightLabel,
      items,
    };
    const next = [draft, ...drafts.filter((item) => item.id !== draft.id)].slice(0, DRAFT_LIMIT);
    setDrafts(next);
    setDraftId(draft.id);
    await writeDrafts(currentUser?.id, next);
    if (!silent) {
      setNotice(copy.crDraftSaved);
    }
  }

  function openDraft(draft: CreateDraft) {
    setMode(draft.mode);
    setItems(draft.items);
    setActiveId(draft.items[0]?.id ?? null);
    setCaption(draft.caption);
    setHashtags(draft.hashtags);
    setLocation(draft.location);
    setHideLikes(draft.hideLikes);
    setCommentsOff(draft.commentsOff);
    setSaveToHighlights(draft.saveToHighlights);
    setHighlightLabel(draft.highlightLabel);
    setDraftId(draft.id);
  }

  function deleteDraft(draft: CreateDraft) {
    Alert.alert(copy.crDeleteDraft, undefined, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          const next = drafts.filter((item) => item.id !== draft.id);
          setDrafts(next);
          void writeDrafts(currentUser?.id, next);
          if (draftId === draft.id) {
            setDraftId(null);
          }
        },
      },
    ]);
  }

  async function removeCurrentDraft() {
    if (!draftId) {
      return;
    }
    const next = drafts.filter((item) => item.id !== draftId);
    setDrafts(next);
    setDraftId(null);
    await writeDrafts(currentUser?.id, next);
  }

  // ---- Publishing ---------------------------------------------------------------------------------

  function publishMediaFor(item: CreateItem): PublishMedia {
    const media = buildPublishMedia(
      { uri: item.uri, type: item.type, durationSeconds: item.durationSeconds, posterUri: item.posterUri, mimeType: item.mimeType, fileName: item.fileName },
      item.editor,
      studioMode
    );
    // Reels are videos: a photo becomes a short video with a gentle zoom.
    if (studioMode === "reel" && media.type === "image") {
      return {
        ...media,
        type: "video",
        durationSeconds: 5,
        posterUri: media.uri,
        editConfig: { ...(media.editConfig ?? {}), photoVideo: { seconds: 5, motion: true } },
      };
    }
    return media;
  }

  async function submit() {
    if (mode === "product") {
      await submitProduct();
      return;
    }
    if (items.length === 0) {
      Alert.alert(copy.csAddMedia, copy.csPickAtLeastOne);
      return;
    }
    setIsPublishing(true);
    try {
      if (mode === "post") {
        const result = await createPost({
          caption: caption.trim(),
          hashtags: collectPublishHashtags(hashtags, caption),
          location: location.trim() || undefined,
          hideLikes,
          commentsOff,
          mediaItems: items.map((item) => {
            const media = publishMediaFor(item);
            return {
              uri: media.uri,
              type: media.type,
              mimeType: media.mimeType,
              fileName: media.fileName,
              durationSeconds: media.durationSeconds,
              editConfig: media.editConfig,
              altText: media.type === "image" ? item.altText?.trim() || undefined : undefined,
            };
          }),
        });
        if (!result.ok) {
          await saveDraft(true);
          Alert.alert(copy.csPostUnavailable, `${result.message ?? copy.csPostFailed}\n\n${copy.crDraftKept}`);
          return;
        }
        await removeCurrentDraft();
        resetStudio();
        Alert.alert(copy.csPostPublished, copy.csPostLive);
        navigation.navigate("Home");
        return;
      }

      if (mode === "reel") {
        const media = publishMediaFor(items[0]);
        const result = await createReel({
          caption: composeCaption(caption, studioMode === "reel" ? location : undefined),
          hashtags: collectPublishHashtags(hashtags, caption),
          videoUrl: media.uri,
          thumbnailUrl: media.posterUri || "",
          videoMimeType: media.mimeType,
          videoFileName: media.fileName,
          videoDurationSeconds: media.durationSeconds,
          editConfig: media.editConfig,
          hideLikes,
          commentsOff,
        });
        if (!result.ok) {
          await saveDraft(true);
          Alert.alert(copy.csReelUnavailable, `${result.message ?? copy.csReelFailed}\n\n${copy.crDraftKept}`);
          return;
        }
        await removeCurrentDraft();
        resetStudio();
        if (result.reel) {
          rootNavigation.navigate("ReelViewer", { reelId: result.reel.id });
          return;
        }
        Alert.alert(copy.reelPublished);
        navigation.navigate("Reels");
        return;
      }

      // Stories: each photo or video becomes its own story, shared in order.
      const storyCaption = composeCaption(composeCaptionWithHashtags(caption, hashtags), location);
      let lastStory: { userId: string; id: string } | null = null;
      const total = items.length;
      for (let index = 0; index < total; index += 1) {
        setStoryProgress({ done: index, total });
        const item = items[index];
        const media = publishMediaFor(item);
        const result = await createStory({
          imageUrl: media.type === "video" ? media.posterUri || media.uri : media.uri,
          videoUrl: media.type === "video" ? media.uri : undefined,
          mediaType: media.type as StoryMediaType,
          videoMimeType: media.type === "video" ? media.mimeType : undefined,
          videoFileName: media.type === "video" ? media.fileName : undefined,
          videoDurationSeconds: media.type === "video" ? media.durationSeconds : undefined,
          caption: storyCaption,
          saveToHighlights,
          highlightLabel,
          editConfig: media.editConfig,
        });
        if (!result.ok) {
          // Keep what wasn't shared so it can be tried again.
          const remaining = items.slice(index);
          setItems(remaining);
          setActiveId(remaining[0]?.id ?? null);
          Alert.alert(
            copy.storyUnavailableTitle,
            `${result.message ?? copy.storyUnavailableBody}${index > 0 ? `\n\n${fill(copy.crStoriesShared, { count: index })}` : ""}`
          );
          return;
        }
        if (result.story) {
          lastStory = { userId: result.story.userId, id: result.story.id };
        }
      }
      await removeCurrentDraft();
      resetStudio();
      if (lastStory) {
        rootNavigation.navigate("StoryViewer", { userId: lastStory.userId, storyId: lastStory.id });
        return;
      }
      Alert.alert(copy.storyPostedTitle, copy.storyPostedBody);
      navigation.navigate("Home");
    } finally {
      setIsPublishing(false);
      setStoryProgress(null);
    }
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
      Alert.alert(copy.csPickerUnavailable, getMediaPickerErrorMessage(error, copy));
      return;
    }
    if (result.canceled) {
      return;
    }
    const nextImages = result.assets
      .map((asset) => (asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : null))
      .filter((item): item is string => Boolean(item));
    if (nextImages.length === 0) {
      Alert.alert(copy.imageIssueTitle, copy.csPhotosIssueBody);
      return;
    }
    setProductImageUrls(nextImages.slice(0, 6));
  }

  async function submitProduct() {
    if (!productTitle.trim() || !productDescription.trim() || !productPrice.trim() || !productLocation.trim()) {
      Alert.alert(copy.communityMissingDetailsTitle, copy.csMissingListing);
      return;
    }
    if (productImageUrls.length === 0) {
      Alert.alert(copy.csAddPhotos, copy.csListingPhotoRequired);
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
        Alert.alert(copy.csContentBlocked, result.message ?? copy.csProductFailed);
        return;
      }
      setProductTitle("");
      setProductDescription("");
      setProductPrice("");
      setProductCategory("Electronics");
      setProductCondition("Good");
      setProductLocation("");
      setProductImageUrls([]);
      Alert.alert(copy.productPublished);
      navigation.navigate("Marketplace");
    } finally {
      setIsPublishing(false);
    }
  }

  function resetStudio() {
    setCaption("");
    setHashtags("");
    setLocation("");
    setItems([]);
    setActiveId(null);
    setHideLikes(false);
    setCommentsOff(false);
    setSaveToHighlights(false);
    setHighlightLabel("");
    setDraftId(null);
  }

  const publishLabel = isPublishing
    ? storyProgress && storyProgress.total > 1
      ? fill(copy.crStoryCount, { done: storyProgress.done + 1, total: storyProgress.total })
      : mode === "story"
        ? copy.csPostingStory
        : mode === "reel"
          ? copy.csUploadingReel
          : copy.csPublishingPost
    : mode === "story"
      ? items.length > 1
        ? fill(copy.crShareStories, { count: items.length })
        : copy.postStory
      : mode === "reel"
        ? copy.csPublishReel
        : copy.csPublishPost;

  const progressLine = publishProgress
    ? publishProgress.stage === "uploading"
      ? publishProgress.total && publishProgress.total > 1
        ? fill(copy.edPreviewUploadingCount, { done: Math.min(publishProgress.total, (publishProgress.done ?? 0) + 1), total: publishProgress.total })
        : copy.crPublishUploading
      : copy.crPublishRendering
    : null;

  const previewAspect = studioMode === "post" ? 4 / 5 : 9 / 16;

  return (
    <Screen contentContainerStyle={styles.screenContent} scrollable>
      <SectionTitle subtitle={copy.crIntro} title={copy.create} />

      <View accessibilityRole="tablist" style={styles.modeTabs}>
        {(
          [
            ["post", "images-outline", copy.csModePost],
            ["reel", "play-circle-outline", copy.csModeReel],
            ["story", "albums-outline", copy.csModeStory],
            ["product", "bag-handle-outline", copy.csModeShop],
          ] as const
        ).map(([id, icon, label]) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === id }}
            disabled={isPublishing}
            key={id}
            onPress={() => switchMode(id)}
            style={[styles.modeTab, mode === id ? styles.modeTabActive : null]}
          >
            <Ionicons color={mode === id ? palette.text : palette.muted} name={icon} size={16} />
            <Text numberOfLines={1} style={[styles.modeTabLabel, mode === id ? styles.modeTabLabelActive : null]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "product" ? (
        <View style={styles.card}>
          <SectionTitle subtitle={copy.csSellBody} title={copy.csSellItem} />
          <PrimaryButton
            disabled={isPublishing}
            label={productImageUrls.length > 0 ? fill(copy.csListingPhotos, { count: productImageUrls.length }) : copy.csUploadListingPhotos}
            onPress={() => {
              void handlePickListingPhotos();
            }}
            variant="ghost"
          />
          {productImageUrls.length > 0 ? (
            <ScrollView contentContainerStyle={styles.thumbRow} horizontal showsHorizontalScrollIndicator={false}>
              {productImageUrls.map((imageUrl, index) => (
                <Image key={`${imageUrl.slice(0, 40)}-${index}`} source={{ uri: imageUrl }} style={styles.productThumb} />
              ))}
            </ScrollView>
          ) : null}
          <InputField label={copy.productTitle} onChangeText={setProductTitle} placeholder={copy.csProductTitlePh} value={productTitle} />
          <InputField label={copy.productDescription} multiline onChangeText={setProductDescription} placeholder={copy.csProductDescPh} value={productDescription} />
          <InputField keyboardType="numeric" label={`${copy.productPrice} (${listingCurrency})`} onChangeText={setProductPrice} placeholder="420" value={productPrice} />
          <InputField label={copy.location} onChangeText={setProductLocation} placeholder={copy.locationPlaceholder} value={productLocation} />
          <Text style={styles.label}>{copy.category}</Text>
          <View style={styles.chipRow}>
            {marketplaceCategories
              .filter((item) => item !== "All")
              .map((item) => (
                <Chip active={productCategory === item} key={item} label={categoryLabel(item, copy)} onPress={() => setProductCategory(item)} />
              ))}
          </View>
          <Text style={styles.label}>{copy.csCondition}</Text>
          <View style={styles.chipRow}>
            {productConditions.map((item) => (
              <Chip active={productCondition === item} key={item} label={conditionLabel(item, copy)} onPress={() => setProductCondition(item)} />
            ))}
          </View>
          <PrimaryButton
            disabled={isPublishing}
            label={isPublishing ? copy.csUploadingListing : copy.publishProduct}
            onPress={() => {
              void submit();
            }}
          />
        </View>
      ) : items.length === 0 ? (
        <>
          <Pressable accessibilityRole="button" disabled={isPublishing} onPress={() => void pickMedia(false)} style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons color={palette.primary} name={mode === "reel" ? "film-outline" : mode === "story" ? "albums-outline" : "images-outline"} size={30} />
            </View>
            <Text style={styles.emptyTitle}>{copy.crChoose}</Text>
            <Text style={styles.emptyBody}>{mode === "reel" ? copy.crEmptyReel : mode === "story" ? copy.crEmptyStory : copy.crEmptyPost}</Text>
            <View style={styles.featureRow}>
              {[copy.edToolClips, copy.edMusic, copy.edCaptions, copy.edEffects, copy.edVoice, copy.edDraw].map((feature) => (
                <View key={feature} style={styles.featurePill}>
                  <Text style={styles.featureLabel}>{feature}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {DRAFTS_SUPPORTED && drafts.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>
                {copy.crDrafts} · {drafts.length}
              </Text>
              <ScrollView contentContainerStyle={styles.thumbRow} horizontal showsHorizontalScrollIndicator={false}>
                {drafts.map((draft) => {
                  const first = draft.items[0];
                  return (
                    <Pressable
                      accessibilityLabel={`${copy.crDrafts}: ${draft.caption || modeLabel(draft.mode, copy)}`}
                      key={draft.id}
                      onLongPress={() => deleteDraft(draft)}
                      onPress={() => openDraft(draft)}
                      style={styles.draftCard}
                    >
                      {first ? <Image source={{ uri: first.posterUri || first.uri }} style={styles.draftThumb} /> : <View style={styles.draftThumb} />}
                      <Pressable accessibilityLabel={copy.delete} hitSlop={8} onPress={() => deleteDraft(draft)} style={styles.draftDelete}>
                        <Ionicons color="#ffffff" name="close" size={14} />
                      </Pressable>
                      <View style={styles.draftMeta}>
                        <Text numberOfLines={1} style={styles.draftMode}>
                          {modeLabel(draft.mode, copy)}
                          {draft.items.length > 1 ? ` · ${draft.items.length}` : ""}
                        </Text>
                        <Text numberOfLines={1} style={styles.draftDate}>
                          {formatRelativeTime(draft.savedAt, language)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.previewWrap}>
            <Pressable
              accessibilityHint={copy.crTapToEdit}
              accessibilityRole="button"
              disabled={isPublishing || !activeItem}
              onLayout={(event: LayoutChangeEvent) => {
                const { width, height } = event.nativeEvent.layout;
                setPreviewSize((current) => (current.width === width && current.height === height ? current : { width, height }));
              }}
              onPress={() => activeItem && openEditorFor(activeItem)}
              style={[styles.preview, { aspectRatio: previewAspect, width: studioMode === "post" ? "100%" : "72%" }]}
            >
              {activeItem ? (
                <>
                  <Image
                    resizeMode="cover"
                    source={{ uri: activeItem.type === "video" || activeItem.editor?.timeline?.[0]?.type === "video" ? activeItem.posterUri || activeItem.uri : activeItem.uri }}
                    style={StyleSheet.absoluteFill}
                  />
                  {activeItem.editor ? <FilterPreview filters={activeItem.editor.filters} /> : null}
                  {activeItem.editor ? <StudioLayersOverlay height={previewSize.height} studio={activeItem.editor.studio} width={previewSize.width} /> : null}
                  <View style={styles.previewBadges}>
                    {itemBadges(activeItem, copy).map((badge) => (
                      <View key={badge} style={styles.previewBadge}>
                        <Text style={styles.previewBadgeLabel}>{badge}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.editFab}>
                    <Ionicons color="#ffffff" name="color-wand" size={16} />
                    <Text style={styles.editFabLabel}>{copy.edOpenEditor}</Text>
                  </View>
                </>
              ) : null}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.thumbRow} horizontal showsHorizontalScrollIndicator={false}>
            {items.map((item, index) => {
              const selected = item.id === activeItem?.id;
              return (
                <View key={item.id} style={styles.itemWrap}>
                  <Pressable
                    accessibilityLabel={`${index + 1}`}
                    accessibilityState={{ selected }}
                    onPress={() => setActiveId(item.id)}
                    style={[styles.itemThumbWrap, selected ? styles.itemThumbActive : null]}
                  >
                    <Image source={{ uri: item.posterUri || item.uri }} style={styles.itemThumb} />
                    {items.length > 1 ? (
                      <View style={styles.itemNumber}>
                        <Text style={styles.itemNumberLabel}>{index + 1}</Text>
                      </View>
                    ) : null}
                    {item.type === "video" || item.editor?.timeline ? (
                      <View style={styles.itemVideo}>
                        <Ionicons color="#ffffff" name="play" size={10} />
                      </View>
                    ) : null}
                  </Pressable>
                  {selected ? (
                    <View style={styles.itemTools}>
                      {items.length > 1 ? (
                        <Pressable accessibilityLabel={copy.edMoveLeft} disabled={index === 0} hitSlop={6} onPress={() => moveItem(item.id, -1)}>
                          <Ionicons color={index === 0 ? palette.borderStrong : palette.text} name="chevron-back" size={16} />
                        </Pressable>
                      ) : null}
                      <Pressable accessibilityLabel={copy.csRemove} hitSlop={6} onPress={() => removeItem(item.id)}>
                        <Ionicons color={palette.danger} name="trash-outline" size={16} />
                      </Pressable>
                      {items.length > 1 ? (
                        <Pressable accessibilityLabel={copy.edMoveRight} disabled={index === items.length - 1} hitSlop={6} onPress={() => moveItem(item.id, 1)}>
                          <Ionicons color={index === items.length - 1 ? palette.borderStrong : palette.text} name="chevron-forward" size={16} />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
            {mode !== "reel" && items.length < ITEM_LIMITS[studioMode] ? (
              <Pressable accessibilityLabel={copy.crAddMore} disabled={isPublishing} onPress={() => void pickMedia(true)} style={styles.addTile}>
                <Ionicons color={palette.primary} name="add" size={26} />
              </Pressable>
            ) : null}
            {mode === "reel" ? (
              <Pressable accessibilityLabel={copy.csReplace} disabled={isPublishing} onPress={() => void pickMedia(false)} style={styles.addTile}>
                <Ionicons color={palette.primary} name="swap-horizontal" size={22} />
              </Pressable>
            ) : null}
          </ScrollView>

          {mode === "post" && activeItem && activeItem.type === "image" && !activeItem.editor?.timeline ? (
            <View style={styles.section}>
              <Text style={styles.label}>{copy.crAltText}</Text>
              <TextInput
                maxLength={300}
                multiline
                onChangeText={(text) => updateItem(activeItem.id, { altText: text })}
                placeholder={copy.crAltTextPh}
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={activeItem.altText ?? ""}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <InputField
              label={copy.captionLabel}
              multiline
              onChangeText={setCaption}
              placeholder={mode === "story" ? copy.csStoryCaptionPh : mode === "reel" ? copy.csReelCaptionPh : copy.csPostCaptionPh}
              value={caption}
            />
            <InputField label={copy.hashtagsTitle} onChangeText={setHashtags} placeholder={copy.csHashtagsPh} value={hashtags} />
            {hashtagPreview.length > 0 ? <Text style={styles.hashtags}>{hashtagPreview.join(" ")}</Text> : null}
            <InputField label={copy.location} onChangeText={setLocation} placeholder={copy.locationPlaceholder} value={location} />
          </View>

          {mode === "story" ? (
            <View style={styles.settingsCard}>
              <SettingRow
                body={copy.crHighlightBody}
                label={copy.saveHighlight}
                onChange={setSaveToHighlights}
                value={saveToHighlights}
              />
              {saveToHighlights ? (
                <TextInput
                  maxLength={40}
                  onChangeText={setHighlightLabel}
                  placeholder={copy.highlightTitlePlaceholder}
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={highlightLabel}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.settingsCard}>
              <SettingRow body={copy.crHideLikesBody} label={copy.crHideLikes} onChange={setHideLikes} value={hideLikes} />
              <View style={styles.divider} />
              <SettingRow body={copy.crCommentsOffBody} label={copy.crCommentsOff} onChange={setCommentsOff} value={commentsOff} />
            </View>
          )}

          <View style={styles.actions}>
            {DRAFTS_SUPPORTED ? (
              <PrimaryButton disabled={isPublishing} label={copy.crSaveDraft} onPress={() => void saveDraft()} style={styles.draftButton} variant="ghost" />
            ) : null}
            <PrimaryButton
              disabled={isPublishing}
              label={publishLabel}
              loading={isPublishing}
              onPress={() => {
                void submit();
              }}
              style={styles.shareButton}
            />
          </View>
          {progressLine ? <Text style={styles.progress}>{progressLine}</Text> : null}
        </>
      )}

      {notice ? (
        <View pointerEvents="none" style={styles.notice}>
          <Text style={styles.noticeLabel}>{notice}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function SettingRow({ label, body, value, onChange }: { label: string; body: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingBody}>{body}</Text>
      </View>
      <Switch
        onValueChange={onChange}
        thumbColor="#ffffff"
        trackColor={{ false: palette.borderStrong, true: palette.primary }}
        value={value}
      />
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function modeLabel(mode: StudioMode, copy: CopyStrings) {
  return mode === "reel" ? copy.csModeReel : mode === "story" ? copy.csModeStory : copy.csModePost;
}

function formatDuration(value: number) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, "0")}`;
}

/** Short labels on the preview: clips, length, music, captions, voice. */
function itemBadges(item: CreateItem, copy: CopyStrings) {
  const badges: string[] = [];
  const timeline = item.editor?.timeline;
  if (timeline && timeline.length > 1) {
    badges.push(fill(copy.crClips, { count: timeline.length }));
  }
  const seconds = timeline ? timelineSeconds(timeline, item.editor?.speed ?? 1) : item.type === "video" ? item.durationSeconds ?? 0 : 0;
  if (seconds > 0) {
    badges.push(formatDuration(seconds));
  }
  if (item.editor?.studio.music) {
    badges.push(`♪ ${item.editor.studio.music.title}`);
  }
  if (item.editor?.studio.captions?.length) {
    badges.push("CC");
  }
  if (item.editor?.voiceover) {
    badges.push("🎙");
  }
  return badges.slice(0, 4);
}

function emptyResultFor(item: CreateItem): EditorResult {
  return {
    filterId: "normal",
    filters: { brightness: 0, contrast: 0, saturation: 0, grayscale: 0, vignette: 0, grain: 0, sharpen: 0 },
    trimStartRatio: 0,
    trimEndRatio: 1,
    speed: 1,
    studio: {},
    posterUri: item.posterUri,
  };
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

function composeCaption(caption: string, location?: string) {
  const lines = [caption.trim() || undefined, location?.trim() ? `📍 ${location.trim()}` : undefined].filter((item): item is string => Boolean(item));
  return lines.join("\n\n");
}

function composeCaptionWithHashtags(caption: string, hashtags: string) {
  const tagLine = parseHashtags(hashtags, { allowBareWords: true })
    .map((tag) => `#${tag}`)
    .join(" ");
  return [caption.trim() || undefined, tagLine || undefined].filter((item): item is string => Boolean(item)).join("\n\n");
}

function isAssetTooLarge(asset: ImagePicker.ImagePickerAsset) {
  if (typeof asset.fileSize !== "number" || asset.fileSize <= 0) {
    return false;
  }
  return asset.fileSize > (asset.type === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES);
}

async function itemFromAsset(asset: ImagePicker.ImagePickerAsset, index = 0): Promise<CreateItem> {
  const type = asset.type === "video" ? "video" : "image";
  let posterUri: string | undefined;
  if (type === "video") {
    try {
      posterUri = (await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 700, quality: 0.65 })).uri;
    } catch {
      posterUri = undefined;
    }
  }
  return {
    id: `${asset.assetId || "item"}-${Date.now().toString(36)}-${index}`,
    uri: asset.uri,
    type,
    mimeType: asset.mimeType || (type === "video" ? "video/mp4" : "image/jpeg"),
    fileName: resolveFileName(asset, type, index),
    durationSeconds: type === "video" && typeof asset.duration === "number" ? Math.max(1, Math.round(asset.duration / 1000)) : undefined,
    posterUri,
  };
}

function resolveFileName(asset: ImagePicker.ImagePickerAsset, type: "image" | "video", index: number) {
  const fallback = `sohba-studio-${index + 1}`;
  const candidate = asset.fileName?.trim() || asset.uri.split("?")[0].split("/").filter(Boolean).pop() || fallback;
  let decoded = candidate;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    decoded = candidate;
  }
  const safe = decoded.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+|_+$/g, "") || fallback;
  if (/\.[a-z0-9]{2,5}$/i.test(safe)) {
    return safe;
  }
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return `${safe}.${(asset.mimeType && extensions[asset.mimeType.toLowerCase()]) || (type === "video" ? "mp4" : "jpg")}`;
}

function getMediaPickerErrorMessage(error: unknown, copy: CopyStrings) {
  const message = error instanceof Error ? error.message : "";
  return message.toLowerCase().includes("permission") ? copy.csMediaAccessUnavailableBody : copy.csPickerUnavailableBody;
}

const styles = createThemedStyles({
  screenContent: {
    gap: spacing.lg,
  },
  modeTabs: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  modeTab: {
    alignItems: "center",
    borderRadius: radii.md,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 4,
  },
  modeTabActive: {
    backgroundColor: palette.background,
    elevation: 2,
    shadowColor: "#0d1117",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  modeTabLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  modeTabLabelActive: {
    color: palette.text,
    fontWeight: "800",
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderStyle: "dashed",
    borderWidth: 1.5,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: palette.background,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  featurePill: {
    backgroundColor: palette.background,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featureLabel: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "800",
  },
  thumbRow: {
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  draftCard: {
    width: 104,
  },
  draftThumb: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    height: 132,
    width: 104,
  },
  draftDelete: {
    alignItems: "center",
    backgroundColor: "rgba(13,17,23,0.6)",
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 22,
  },
  draftMeta: {
    gap: 1,
    paddingTop: 6,
  },
  draftMode: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  draftDate: {
    color: palette.muted,
    fontSize: 12,
  },
  previewWrap: {
    alignItems: "center",
  },
  preview: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  previewBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    left: 10,
    position: "absolute",
    right: 10,
    top: 10,
  },
  previewBadge: {
    backgroundColor: "rgba(13,17,23,0.6)",
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  previewBadgeLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  editFab: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.pill,
    bottom: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: "absolute",
    right: 12,
  },
  editFabLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  itemWrap: {
    alignItems: "center",
    gap: 6,
  },
  itemThumbWrap: {
    borderColor: "transparent",
    borderRadius: radii.md,
    borderWidth: 2,
    overflow: "hidden",
  },
  itemThumbActive: {
    borderColor: palette.primary,
  },
  itemThumb: {
    height: 84,
    width: 64,
  },
  itemNumber: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    left: 4,
    position: "absolute",
    top: 4,
    width: 18,
  },
  itemNumberLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  itemVideo: {
    alignItems: "center",
    backgroundColor: "rgba(13,17,23,0.6)",
    borderRadius: 9,
    bottom: 4,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    width: 18,
  },
  itemTools: {
    flexDirection: "row",
    gap: 10,
  },
  addTile: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    height: 88,
    justifyContent: "center",
    width: 64,
  },
  input: {
    backgroundColor: palette.input,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hashtags: {
    color: palette.accentSoft,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  settingsCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    gap: spacing.sm,
    padding: spacing.md,
  },
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  settingCopy: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  settingBody: {
    color: palette.muted,
    fontSize: 12.5,
    lineHeight: 17,
  },
  divider: {
    backgroundColor: palette.border,
    height: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  draftButton: {
    flex: 1,
  },
  shareButton: {
    flex: 2,
  },
  progress: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: palette.backgroundSoft,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: palette.cardAlt,
    borderColor: palette.primary,
  },
  chipLabel: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  chipLabelActive: {
    color: palette.primary,
  },
  productThumb: {
    borderRadius: radii.lg,
    height: 96,
    width: 96,
  },
  notice: {
    alignSelf: "center",
    backgroundColor: "rgba(13,17,23,0.86)",
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  noticeLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
