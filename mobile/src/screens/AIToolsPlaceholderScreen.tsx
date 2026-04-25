import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import {
  generateAiAvatarCreator,
  generateAiFailureAudit,
  generateAiGrowthCoach,
  fetchAiStatus,
  fetchAiTrends,
  generateAiImage,
  generateAiText,
  generateAiTrendHijack,
  generateAiVideo,
  generateAiViralEngine,
  getAiAssetSource,
  refreshAiVideo,
} from "../services/aiTools";
import {
  AIAvatarCreatorResult,
  AIFailureAuditResult,
  AIGrowthCoachResult,
  AIImageResult,
  AIStatusPayload,
  AITextMode,
  AITextResult,
  AITrendFeedItem,
  AITrendHijackResult,
  AIViralEngineResult,
  AIVideoJob,
  AIVoiceOption,
} from "../types/models";
import { palette, radii, spacing } from "../theme";

type ToolTab = "engine" | "coach" | "audit" | "trends" | "avatars" | "text" | "image" | "video";
type FailureFrame = { id: string; uri: string; label: string };

const textModes: Array<{ value: AITextMode; label: string }> = [
  { value: "captions", label: "Captions" },
  { value: "script", label: "Scripts" },
  { value: "product_copy", label: "Product copy" },
];

const voiceOptions: AIVoiceOption[] = ["coral", "marin", "cedar", "sage", "alloy"];
const aspectRatios: Array<"1:1" | "9:16" | "16:9"> = ["9:16", "1:1", "16:9"];
const videoSizes: Array<"720x1280" | "1280x720" | "1080x1920" | "1920x1080"> = ["720x1280", "1080x1920", "1280x720", "1920x1080"];
const videoSeconds: Array<5 | 8 | 10 | 16 | 20> = [8, 10, 16, 20, 5];

export function AIToolsPlaceholderScreen({ navigation }: { navigation: any }) {
  const { language, session, currentUser } = useAppState();
  const copy = getCopy(language);
  const [toolTab, setToolTab] = useState<ToolTab>("engine");
  const [aiStatus, setAiStatus] = useState<AIStatusPayload | null>(null);
  const isAiDemoMode = aiStatus?.demoMode ?? true;

  const [enginePrompt, setEnginePrompt] = useState("Make viral gym reel");
  const [engineNiche, setEngineNiche] = useState("fitness creator");
  const [engineOffer, setEngineOffer] = useState("online coaching or digital program");
  const [engineAudience, setEngineAudience] = useState("males 18-25 who like physique and motivation content");
  const [engineTone, setEngineTone] = useState("bold, premium, high-retention");
  const [engineVoice, setEngineVoice] = useState<AIVoiceOption>("coral");
  const [engineSize, setEngineSize] = useState<"720x1280" | "1280x720" | "1080x1920" | "1920x1080">("720x1280");
  const [engineDuration, setEngineDuration] = useState<5 | 8 | 10 | 16 | 20>(8);
  const [engineQuality, setEngineQuality] = useState<"speed" | "quality">("quality");
  const [engineResult, setEngineResult] = useState<AIViralEngineResult | null>(null);
  const [engineLoading, setEngineLoading] = useState(false);
  const [trendFeed, setTrendFeed] = useState<AITrendFeedItem[]>([]);
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);
  const [trendGoal, setTrendGoal] = useState("Turn this trend into a creator reel that drives saves and profile clicks");
  const [trendOffer, setTrendOffer] = useState("premium coaching, digital product, or service");
  const [trendAudience, setTrendAudience] = useState("18-30 short-form viewers likely to save and share");
  const [trendResult, setTrendResult] = useState<AITrendHijackResult | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [avatarSourcePreview, setAvatarSourcePreview] = useState<string | null>(null);
  const [avatarSourceDataUrl, setAvatarSourceDataUrl] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState("Hey, I'm your new AI avatar. Follow for creator tips and fresh drops.");
  const [avatarNiche, setAvatarNiche] = useState("creator brand");
  const [avatarSize, setAvatarSize] = useState<"720x1280" | "1280x720" | "1080x1920" | "1920x1080">("720x1280");
  const [avatarDuration, setAvatarDuration] = useState<5 | 8 | 10 | 16 | 20>(8);
  const [avatarQuality, setAvatarQuality] = useState<"speed" | "quality">("quality");
  const [avatarResult, setAvatarResult] = useState<AIAvatarCreatorResult | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [coachTopic, setCoachTopic] = useState("Gym motivation reel with a transformation tip");
  const [coachCaption, setCoachCaption] = useState("This is how I finally made my gym reels hit harder. Save this if you want more reach.");
  const [coachNiche, setCoachNiche] = useState("fitness creator");
  const [coachAudience, setCoachAudience] = useState("males 18-25 who save transformation and motivation content");
  const [coachGoal, setCoachGoal] = useState("more saves, comments, and profile visits");
  const [coachViews, setCoachViews] = useState("1240");
  const [coachLikes, setCoachLikes] = useState("28");
  const [coachComments, setCoachComments] = useState("4");
  const [coachShares, setCoachShares] = useState("2");
  const [coachRetentionNote, setCoachRetentionNote] = useState("Average watch time dropped hard in the first 2 seconds.");
  const [coachPainPoint, setCoachPainPoint] = useState("I need to know why this post failed and what to post next.");
  const [coachResult, setCoachResult] = useState<AIGrowthCoachResult | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [failureVideoUri, setFailureVideoUri] = useState<string | null>(null);
  const [failureVideoName, setFailureVideoName] = useState<string | null>(null);
  const [failureVideoMimeType, setFailureVideoMimeType] = useState<string | undefined>(undefined);
  const [failureVideoDuration, setFailureVideoDuration] = useState<number | undefined>(undefined);
  const [failureFrames, setFailureFrames] = useState<FailureFrame[]>([]);
  const [failureCaption, setFailureCaption] = useState("I tried to make this reel motivational, but people stopped watching fast.");
  const [failureRetentionNote, setFailureRetentionNote] = useState("Big drop in the first 2 seconds and another drop before the CTA.");
  const [failureViews, setFailureViews] = useState("980");
  const [failureNiche, setFailureNiche] = useState("fitness creator");
  const [failureAudience, setFailureAudience] = useState("males 18-25 who like physique, training, and motivation content");
  const [failureResult, setFailureResult] = useState<AIFailureAuditResult | null>(null);
  const [failureLoading, setFailureLoading] = useState(false);

  const [textMode, setTextMode] = useState<AITextMode>("captions");
  const [textPrompt, setTextPrompt] = useState("A creator selling a mini course about growing on Reels");
  const [textTone, setTextTone] = useState("premium, confident, scroll-stopping");
  const [textAudience, setTextAudience] = useState("creators who want reach and sales");
  const [textGoal, setTextGoal] = useState("turn views into saves, clicks, and follows");
  const [textResult, setTextResult] = useState<AITextResult | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  const [imagePrompt, setImagePrompt] = useState("A premium creator ad for a short-form video growth service");
  const [imageStyle, setImageStyle] = useState("cinematic studio lighting, sleek gradients, social ad energy");
  const [imageAspectRatio, setImageAspectRatio] = useState<"1:1" | "9:16" | "16:9">("9:16");
  const [imageResult, setImageResult] = useState<AIImageResult | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const [videoPrompt, setVideoPrompt] = useState("A creator reveals a phone screen, the reel explodes in views, then a product card slides in with a premium offer");
  const [videoStyle, setVideoStyle] = useState("cinematic creator ad, energetic pacing, polished motion graphics");
  const [videoShotType, setVideoShotType] = useState("close-up reveal, fast push-in, premium lifestyle finish");
  const [videoSize, setVideoSize] = useState<"720x1280" | "1280x720" | "1080x1920" | "1920x1080">("720x1280");
  const [videoDuration, setVideoDuration] = useState<5 | 8 | 10 | 16 | 20>(8);
  const [videoQuality, setVideoQuality] = useState<"speed" | "quality">("speed");
  const [videoJob, setVideoJob] = useState<AIVideoJob | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const voiceSource = useMemo(
    () => getAiAssetSource(engineResult?.voice.audioPath, session?.token, engineResult?.conceptTitle),
    [engineResult?.conceptTitle, engineResult?.voice.audioPath, session?.token]
  );
  const voicePlayer = useAudioPlayer(voiceSource);
  const voiceStatus = useAudioPlayerStatus(voicePlayer);
  const isPremiumUnlocked = currentUser?.planType === "monthly" || currentUser?.planType === "yearly";

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers", shouldPlayInBackground: false }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchAiStatus(session?.token).then(setAiStatus);
  }, [session?.token]);

  useEffect(() => {
    fetchAiTrends(session?.token).then((trends) => {
      setTrendFeed(trends);
      setSelectedTrendId((current) => current ?? trends[0]?.id ?? null);
    });
  }, [session?.token]);

  useEffect(() => {
    if (!videoJob || (videoJob.status !== "queued" && videoJob.status !== "in_progress")) {
      return;
    }
    const timer = setInterval(async () => {
      const updated = await refreshAiVideo(session?.token, videoJob.id);
      if (updated) setVideoJob(updated);
    }, 3500);
    return () => clearInterval(timer);
  }, [session?.token, videoJob]);

  useEffect(() => {
    if (!engineResult?.video || (engineResult.video.status !== "queued" && engineResult.video.status !== "in_progress")) {
      return;
    }
    const timer = setInterval(async () => {
      const updated = await refreshAiVideo(session?.token, engineResult.video.id);
      if (updated) {
        setEngineResult((current) => (current && current.video.id === updated.id ? { ...current, video: updated } : current));
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [engineResult?.video, session?.token]);

  useEffect(() => {
    if (!trendResult?.video || (trendResult.video.status !== "queued" && trendResult.video.status !== "in_progress")) {
      return;
    }
    const timer = setInterval(async () => {
      const updated = await refreshAiVideo(session?.token, trendResult.video.id);
      if (updated) {
        setTrendResult((current) => (current && current.video.id === updated.id ? { ...current, video: updated } : current));
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [trendResult?.video, session?.token]);

  useEffect(() => {
    if (!avatarResult?.talkingAvatar || (avatarResult.talkingAvatar.status !== "queued" && avatarResult.talkingAvatar.status !== "in_progress")) {
      return;
    }
    const timer = setInterval(async () => {
      const updated = await refreshAiVideo(session?.token, avatarResult.talkingAvatar.id);
      if (updated) {
        setAvatarResult((current) =>
          current && current.talkingAvatar.id === updated.id ? { ...current, talkingAvatar: updated } : current
        );
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [avatarResult?.talkingAvatar, session?.token]);

  async function handleGenerateViralEngine() {
    if (!enginePrompt.trim()) {
      Alert.alert("Missing prompt", "Tell Pulseora what kind of viral reel you want first.");
      return;
    }
    setEngineLoading(true);
    try {
      const result = await generateAiViralEngine(session?.token, {
        prompt: enginePrompt,
        niche: engineNiche,
        audience: engineAudience,
        offer: engineOffer,
        tone: engineTone,
        language: language ?? "en",
        voice: engineVoice,
        size: engineSize,
        seconds: engineDuration,
        quality: engineQuality,
      });
      setEngineResult(result);
    } catch (error) {
      showAiRequestAlert(error);
    } finally {
      setEngineLoading(false);
    }
  }

  async function handleUseTrend() {
    if (!selectedTrendId) {
      Alert.alert("No trend selected", "Pick a trend first.");
      return;
    }

    if (!isPremiumUnlocked) {
      Alert.alert("Premium only", "Trend Hijacker AI is unlocked on the $10/month premium plan and yearly plan.");
      navigation.navigate("Subscription");
      return;
    }

    setTrendLoading(true);
    try {
      const result = await generateAiTrendHijack(session?.token, {
        trendId: selectedTrendId,
        userGoal: trendGoal,
        audience: trendAudience,
        offer: trendOffer,
        language: language ?? "en",
        size: engineSize,
        seconds: engineDuration,
        quality: engineQuality,
      });
      setTrendResult(result);
    } catch (error) {
      showAiRequestAlert(error);
    } finally {
      setTrendLoading(false);
    }
  }

  async function handleGrowthCoach() {
    if (!coachTopic.trim()) {
      Alert.alert("Missing post topic", "Tell Growth Coach which post you want feedback on.");
      return;
    }

    if (!isPremiumUnlocked) {
      Alert.alert("Premium only", "Growth Coach is unlocked on the $10/month premium plan and yearly plan.");
      navigation.navigate("Subscription");
      return;
    }

    setCoachLoading(true);
    try {
      const result = await generateAiGrowthCoach(session?.token, {
        niche: coachNiche,
        targetAudience: coachAudience,
        recentPostTopic: coachTopic,
        recentCaption: coachCaption,
        postGoal: coachGoal,
        views: parseOptionalNumber(coachViews),
        likes: parseOptionalNumber(coachLikes),
        comments: parseOptionalNumber(coachComments),
        shares: parseOptionalNumber(coachShares),
        retentionNote: coachRetentionNote,
        painPoint: coachPainPoint,
        language: language ?? "en",
      });
      setCoachResult(result);
    } catch (error) {
      showAiRequestAlert(error);
    } finally {
      setCoachLoading(false);
    }
  }

  async function handlePickFailureVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Video access needed", "Allow photo library access so Pulseora can analyze your video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const inferredName = asset.fileName || asset.uri.split("/").pop() || "uploaded-video.mp4";
    const normalizedDuration = normalizePickedDuration(asset.duration);
    setFailureVideoUri(asset.uri);
    setFailureVideoName(inferredName);
    setFailureVideoMimeType(asset.mimeType || "video/mp4");
    setFailureVideoDuration(normalizedDuration);
    try {
      setFailureFrames(await buildFailureFrames(asset.uri, normalizedDuration));
    } catch {
      setFailureFrames([]);
    }
    setFailureResult(null);
  }

  async function handleAnalyzeFailureVideo() {
    if (!failureVideoUri || !failureVideoName) {
      Alert.alert("Upload a video", "Pick the underperforming video first so Pulseora can audit it.");
      return;
    }

    setFailureLoading(true);
    try {
      const result = await generateAiFailureAudit(session?.token, {
        sourceVideoName: failureVideoName,
        durationSeconds: failureVideoDuration,
        caption: failureCaption,
        retentionNote: failureRetentionNote,
        views: parseOptionalNumber(failureViews),
        niche: failureNiche,
        targetAudience: failureAudience,
        language: language ?? "en",
      }, {
        uri: failureVideoUri,
        name: failureVideoName,
        mimeType: failureVideoMimeType || "video/mp4",
      });
      setFailureResult(result);
    } catch (error) {
      showAiRequestAlert(error);
    } finally {
      setFailureLoading(false);
    }
  }

  async function handlePickAvatarPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo library access so Pulseora can create avatar styles from your image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Image issue", "The selected image could not be prepared. Try another photo.");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setAvatarSourcePreview(asset.uri);
    setAvatarSourceDataUrl(`data:${mimeType};base64,${asset.base64}`);
    setAvatarResult(null);
  }

  async function handleCreateAvatar() {
    if (!avatarSourceDataUrl) {
      Alert.alert("Upload a photo", "Pick a photo first so Pulseora can build your avatar package.");
      return;
    }

    setAvatarLoading(true);
    try {
      const result = await generateAiAvatarCreator(session?.token, {
        sourceImageDataUrl: avatarSourceDataUrl,
        avatarMessage,
        niche: avatarNiche,
        language: language ?? "en",
        size: avatarSize,
        seconds: avatarDuration,
        quality: avatarQuality,
      });
      setAvatarResult(result);
    } catch (error) {
      showAiRequestAlert(error);
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleGenerateText() {
    if (!textPrompt.trim()) {
      Alert.alert("Missing prompt", "Add a prompt first so the AI tool knows what to create.");
      return;
    }
    setTextLoading(true);
    try {
      setTextResult(await generateAiText(session?.token, { mode: textMode, prompt: textPrompt, tone: textTone, audience: textAudience, goal: textGoal, language: language ?? "en" }));
    } catch (error) {
      showAiRequestAlert(error);
    } finally {
      setTextLoading(false);
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) {
      Alert.alert("Missing prompt", "Describe the image concept you want to generate.");
      return;
    }
    setImageLoading(true);
    try {
      setImageResult(await generateAiImage(session?.token, { prompt: imagePrompt, style: imageStyle, aspectRatio: imageAspectRatio }));
    } catch (error) {
      showAiRequestAlert(error);
    } finally {
      setImageLoading(false);
    }
  }

  async function handleGenerateVideo() {
    if (!videoPrompt.trim()) {
      Alert.alert("Missing prompt", "Describe the video scene before starting the generation.");
      return;
    }
    setVideoLoading(true);
    try {
      setVideoJob(await generateAiVideo(session?.token, { prompt: videoPrompt, style: videoStyle, shotType: videoShotType, size: videoSize, seconds: videoDuration, quality: videoQuality }));
    } catch (error) {
      showAiRequestAlert(error);
    } finally {
      setVideoLoading(false);
    }
  }

  function toggleVoicePreview() {
    if (!engineResult?.voice.audioPath) {
      Alert.alert("Voice preview unavailable", "Start the backend with OPENAI_API_KEY to hear the AI voice. The script is ready now.");
      return;
    }
    if (voiceStatus.playing) {
      voicePlayer.pause();
      return;
    }
    voicePlayer.play();
  }

  function showAiRequestAlert(error: unknown) {
    const message = error instanceof Error ? error.message : "This AI request was blocked.";
    Alert.alert("Request blocked", message);
  }

  return (
    <Screen scrollable>
      <LinearGradient colors={["rgba(255,122,47,0.18)", "rgba(54,224,161,0.14)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
            <Text style={styles.kicker}>Pulseora AI Studio</Text>
        <SectionTitle
          title="One prompt into viral content"
          subtitle="Generate the script, AI voice, captions, video prompt, and a viral score package for creators who want to move faster and monetize better."
        />
        <View style={styles.statusWrap}>
          <Metric label="Brain" value={aiStatus?.textModel ?? "Loading"} />
          <Metric label="Voice" value={aiStatus?.voiceModel ?? "Loading"} />
          <Metric label="Render" value={aiStatus?.videoModel ?? "Loading"} />
          <Metric label="Mode" value={aiStatus?.demoMode ? "Demo fallback" : "Live backend"} />
        </View>
        {isAiDemoMode ? (
          <DemoModeNotice
            title="Demo Mode Active"
            body="AI image and video tools are showing sample outputs and simulated render jobs right now. Add a real backend OpenAI key later to switch these tools to live generation."
          />
        ) : null}
      </LinearGradient>

      <View style={styles.tabs}>
        <Chip label="Viral Engine" active={toolTab === "engine"} onPress={() => setToolTab("engine")} />
        <Chip label="Growth Coach" active={toolTab === "coach"} onPress={() => setToolTab("coach")} />
        <Chip label="Why Failed?" active={toolTab === "audit"} onPress={() => setToolTab("audit")} />
        <Chip label="Trend Hijacker" active={toolTab === "trends"} onPress={() => setToolTab("trends")} />
        <Chip label="Avatar AI" active={toolTab === "avatars"} onPress={() => setToolTab("avatars")} />
        <Chip label="Text AI" active={toolTab === "text"} onPress={() => setToolTab("text")} />
        <Chip label="Image AI" active={toolTab === "image"} onPress={() => setToolTab("image")} />
        <Chip label="Video AI" active={toolTab === "video"} onPress={() => setToolTab("video")} />
      </View>

      {toolTab === "engine" ? (
        <View style={styles.panel}>
          <SectionTitle
            title="Viral AI content engine"
                subtitle='Type one prompt like "Make viral gym reel" and Pulseora will build the full content package around it.'
          />
          {isAiDemoMode ? (
            <DemoModeNotice
              title="Demo Engine Output"
              body="This package uses demo script, voice, and video preview output so you can test the product flow for free."
            />
          ) : null}
          <View style={styles.pricing}>
            <View style={styles.priceCard}>
              <Text style={styles.priceValue}>$3/week</Text>
              <Text style={styles.priceLabel}>Starter</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceValue}>$10/month</Text>
              <Text style={styles.priceLabel}>Premium</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceValue}>Pay per export</Text>
              <Text style={styles.priceLabel}>Flex</Text>
            </View>
          </View>

          <InputField label="Core prompt" multiline onChangeText={setEnginePrompt} value={enginePrompt} />
          <InputField label="Niche" onChangeText={setEngineNiche} value={engineNiche} />
          <InputField label="Offer" onChangeText={setEngineOffer} value={engineOffer} />
          <InputField label="Target audience" onChangeText={setEngineAudience} value={engineAudience} />
          <InputField label="Tone" onChangeText={setEngineTone} value={engineTone} />

          <Text style={styles.inlineLabel}>AI voice</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {voiceOptions.map((voice) => (
              <Chip key={voice} label={voice} active={engineVoice === voice} onPress={() => setEngineVoice(voice)} />
            ))}
          </ScrollView>

          <Text style={styles.inlineLabel}>Format</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSizes.map((size) => (
              <Chip key={size} label={size} active={engineSize === size} onPress={() => setEngineSize(size)} />
            ))}
          </ScrollView>

          <Text style={styles.inlineLabel}>Duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSeconds.map((seconds) => (
              <Chip key={seconds} label={`${seconds}s`} active={engineDuration === seconds} onPress={() => setEngineDuration(seconds)} />
            ))}
          </ScrollView>

          <View style={styles.row}>
            <Chip label="Speed" active={engineQuality === "speed"} onPress={() => setEngineQuality("speed")} />
            <Chip label="Quality" active={engineQuality === "quality"} onPress={() => setEngineQuality("quality")} />
          </View>

          <PrimaryButton
            label={engineLoading ? "Generating viral package..." : isAiDemoMode ? "Build demo viral package" : "Build viral content package"}
            onPress={handleGenerateViralEngine}
            disabled={engineLoading}
          />

          {engineResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={engineResult.demoMode ? "Demo mix" : "Live AI"} right={`${engineResult.voice.model} | ${new Date(engineResult.createdAt).toLocaleTimeString()}`} />
                <Text style={styles.title}>{engineResult.conceptTitle}</Text>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreValue}>{engineResult.insights.viralScore}%</Text>
                    <Text style={styles.scoreLabel}>Viral score</Text>
                  </View>
                  <View style={styles.scoreBody}>
                    <Text style={styles.bodyStrong}>Built for hooks, replay potential, and audience fit.</Text>
                    <Text style={styles.body}>Best posting time: {engineResult.insights.bestPostingTime}</Text>
                    <Text style={styles.body}>Target audience: {engineResult.insights.targetAudience}</Text>
                  </View>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${engineResult.insights.viralScore}%` }]} />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Script</Text>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Hook</Text>
                  <Text style={styles.body}>{engineResult.script.hook}</Text>
                </View>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Body</Text>
                  <Text style={styles.body}>{engineResult.script.body}</Text>
                </View>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>CTA</Text>
                  <Text style={styles.body}>{engineResult.script.cta}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Captions</Text>
                {engineResult.captions.map((caption) => (
                  <View key={caption} style={styles.block}>
                    <Text style={styles.body}>{caption}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <MetaRow left={`Voice: ${engineResult.voice.voice}`} right={engineResult.voice.audioPath ? "Preview ready" : "Script ready"} />
                <Text style={styles.sectionMini}>AI voice</Text>
                <View style={styles.block}>
                  <Text style={styles.body}>{engineResult.voice.script}</Text>
                </View>
                <Text style={styles.note}>{engineResult.voice.disclosure}</Text>
                <PrimaryButton label={voiceStatus.playing ? "Pause voice preview" : "Play voice preview"} onPress={toggleVoicePreview} variant={engineResult.voice.audioPath ? "solid" : "ghost"} />
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "coach" ? (
        <View style={styles.panel}>
          <SectionTitle
            title="Personal AI Coach"
            subtitle="Growth Coach explains why a post failed, how to improve it, and what you should publish next."
          />
          {isAiDemoMode ? (
            <DemoModeNotice
              title="Demo Coaching Output"
              body="Growth Coach is still presented in demo mode on this build, so the strategy output is sample AI guidance rather than fully live analysis."
            />
          ) : null}

          {!isPremiumUnlocked ? (
            <View style={styles.lockCard}>
              <Text style={styles.lockTitle}>Premium-only feature</Text>
              <Text style={styles.body}>
                Growth Coach is reserved for Premium Creator and Yearly Growth plans. Upgrade to unlock post diagnosis and next-post strategy.
              </Text>
              <PrimaryButton label="Unlock premium" onPress={() => navigation.navigate("Subscription")} />
            </View>
          ) : null}

          <View style={styles.pricing}>
            <View style={styles.priceCard}>
              <Text style={styles.priceValue}>Premium</Text>
              <Text style={styles.priceLabel}>Monthly or yearly</Text>
            </View>
          </View>

          <InputField label="Recent post topic" multiline onChangeText={setCoachTopic} value={coachTopic} />
          <InputField label="Recent caption" multiline onChangeText={setCoachCaption} value={coachCaption} />
          <InputField label="Niche" onChangeText={setCoachNiche} value={coachNiche} />
          <InputField label="Target audience" onChangeText={setCoachAudience} value={coachAudience} />
          <InputField label="Post goal" onChangeText={setCoachGoal} value={coachGoal} />

          <Text style={styles.inlineLabel}>Performance snapshot</Text>
          <InputField label="Views" keyboardType="number-pad" onChangeText={setCoachViews} value={coachViews} />
          <InputField label="Likes" keyboardType="number-pad" onChangeText={setCoachLikes} value={coachLikes} />
          <InputField label="Comments" keyboardType="number-pad" onChangeText={setCoachComments} value={coachComments} />
          <InputField label="Shares" keyboardType="number-pad" onChangeText={setCoachShares} value={coachShares} />

          <InputField label="Retention issue" multiline onChangeText={setCoachRetentionNote} value={coachRetentionNote} />
          <InputField label="What hurts most right now?" multiline onChangeText={setCoachPainPoint} value={coachPainPoint} />

          <PrimaryButton
            label={coachLoading ? "Coaching..." : isAiDemoMode ? "Analyze with demo coach" : "Analyze with Growth Coach"}
            onPress={handleGrowthCoach}
            disabled={coachLoading || !isPremiumUnlocked}
          />

          {coachResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={coachResult.demoMode ? "Demo coach" : "Live coach"} right={new Date(coachResult.createdAt).toLocaleTimeString()} />
                <Text style={styles.title}>Growth Coach</Text>
                <Text style={styles.bodyStrong}>{coachResult.headline}</Text>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Premium access</Text>
                  <Text style={styles.body}>{coachResult.premium.label}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Why the post failed</Text>
                {coachResult.diagnosis.map((reason) => (
                  <View key={reason} style={styles.reasonRow}>
                    <View style={styles.dot} />
                    <Text style={styles.body}>{reason}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>How to improve</Text>
                {coachResult.improvements.map((improvement) => (
                  <View key={improvement} style={styles.block}>
                    <Text style={styles.body}>{improvement}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>What to post next</Text>
                {coachResult.nextPosts.map((idea) => (
                  <View key={`${idea.title}-${idea.hook}`} style={styles.block}>
                    <Text style={styles.bodyStrong}>{idea.title}</Text>
                    <Text style={styles.body}>Hook: {idea.hook}</Text>
                    <Text style={styles.body}>Format: {idea.format}</Text>
                    <Text style={styles.note}>{idea.reason}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Coach summary</Text>
                <Text style={styles.body}>{coachResult.coachSummary}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "audit" ? (
        <View style={styles.panel}>
          <SectionTitle
            title="Why Did This Fail?"
            subtitle="Upload an underperforming video and Pulseora will analyze the hook, retention, and captions."
          />
          {isAiDemoMode ? (
            <DemoModeNotice
              title="Demo Video Audit"
              body="Failure analysis is still in demo mode here. Your upload flow is real, but the returned audit is a demo-style AI breakdown until live AI is connected."
            />
          ) : null}

          <View style={styles.avatarUploadCard}>
            <Text style={styles.sectionMini}>Bad video upload</Text>
            {failureVideoName ? (
              <View style={styles.block}>
                <Text style={styles.bodyStrong}>{failureVideoName}</Text>
                <Text style={styles.body}>{failureVideoDuration ? `${failureVideoDuration}s video ready for analysis.` : "Video selected and ready for analysis."}</Text>
                <Text style={styles.note}>{failureVideoUri ? "Selected from your device library." : "Ready for audit."}</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.body}>Upload the reel that underperformed so the AI can audit why it failed.</Text>
              </View>
            )}
            <PrimaryButton label={failureVideoName ? "Change video" : "Upload bad video"} onPress={handlePickFailureVideo} variant={failureVideoName ? "ghost" : "solid"} />
          </View>

          {failureFrames.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionMini}>Frame thumbnails</Text>
              <Text style={styles.note}>Pulseora samples key frames before running the audit so you can quickly spot slow openings or late payoffs.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frameRow}>
                {failureFrames.map((frame) => (
                  <View key={frame.id} style={styles.frameCard}>
                    <Image resizeMode="cover" source={{ uri: frame.uri }} style={styles.frameImage} />
                    <Text style={styles.frameLabel}>{frame.label}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <InputField label="Caption used on the post" multiline onChangeText={setFailureCaption} value={failureCaption} />
          <InputField label="What happened to retention?" multiline onChangeText={setFailureRetentionNote} value={failureRetentionNote} />
          <InputField label="Views" keyboardType="number-pad" onChangeText={setFailureViews} value={failureViews} />
          <InputField label="Niche" onChangeText={setFailureNiche} value={failureNiche} />
          <InputField label="Target audience" onChangeText={setFailureAudience} value={failureAudience} />

          <PrimaryButton
            label={failureLoading ? "Analyzing..." : isAiDemoMode ? "Analyze demo failure audit" : "Analyze why this failed"}
            onPress={handleAnalyzeFailureVideo}
            disabled={failureLoading || !failureVideoName}
          />

          {failureResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={failureResult.demoMode ? "Demo audit" : "Live audit"} right={new Date(failureResult.createdAt).toLocaleTimeString()} />
                <Text style={styles.title}>Failure audit</Text>
                <Text style={styles.bodyStrong}>{failureResult.headline}</Text>
              </View>

              <View style={styles.auditSectionCard}>
                <View style={styles.metaRow}>
                  <Text style={styles.sectionMini}>Hook</Text>
                  <Text style={styles.auditScore}>{failureResult.hook.score}/100</Text>
                </View>
                <Text style={styles.bodyStrong}>{failureResult.hook.verdict}</Text>
                <Text style={styles.body}>Issue: {failureResult.hook.issue}</Text>
                <Text style={styles.body}>Fix: {failureResult.hook.fix}</Text>
              </View>

              <View style={styles.auditSectionCard}>
                <View style={styles.metaRow}>
                  <Text style={styles.sectionMini}>Retention</Text>
                  <Text style={styles.auditScore}>{failureResult.retention.score}/100</Text>
                </View>
                <Text style={styles.bodyStrong}>{failureResult.retention.verdict}</Text>
                <Text style={styles.body}>Issue: {failureResult.retention.issue}</Text>
                <Text style={styles.body}>Fix: {failureResult.retention.fix}</Text>
              </View>

              <View style={styles.card}>
                <MetaRow
                  left={failureResult.transcript.source === "auto" ? "Auto transcript" : "Demo transcript"}
                  right={`${failureResult.transcript.text.split(/\s+/).filter(Boolean).length} words`}
                />
                <Text style={styles.sectionMini}>Transcript</Text>
                <Text style={styles.body}>{failureResult.transcript.text}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Retention graph</Text>
                <Text style={styles.note}>AI-estimated retention curve built from your uploaded video, transcript, and the performance context you provided.</Text>
                <View style={styles.retentionGraphRow}>
                  {failureResult.retentionGraph.map((point) => (
                    <View key={`${point.label}-${point.second}`} style={styles.retentionPoint}>
                      <View style={styles.retentionTrack}>
                        <View style={[styles.retentionFill, { height: `${point.retention}%` }]} />
                      </View>
                      <Text style={styles.retentionValue}>{point.retention}%</Text>
                      <Text style={styles.metricLabel}>{point.label}</Text>
                      <Text style={styles.note}>{point.second}s</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.row}>
                  {failureResult.retentionGraph.map((point) => (
                    <View key={`${point.label}-${point.second}-note`} style={styles.block}>
                      <Text style={styles.blockLabel}>{point.label} at {point.second}s</Text>
                      <Text style={styles.body}>{point.note}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.auditSectionCard}>
                <View style={styles.metaRow}>
                  <Text style={styles.sectionMini}>Captions</Text>
                  <Text style={styles.auditScore}>{failureResult.captions.score}/100</Text>
                </View>
                <Text style={styles.bodyStrong}>{failureResult.captions.verdict}</Text>
                <Text style={styles.body}>Issue: {failureResult.captions.issue}</Text>
                <Text style={styles.body}>Fix: {failureResult.captions.fix}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Quick wins</Text>
                {failureResult.quickWins.map((item) => (
                  <View key={item} style={styles.reasonRow}>
                    <View style={styles.dot} />
                    <Text style={styles.body}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Next move</Text>
                <Text style={styles.body}>{failureResult.nextMove}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "trends" ? (
        <View style={styles.panel}>
          <SectionTitle
            title="Trend Hijacker AI"
            subtitle="Scan TikTok-style trend formats, tap Use this trend, and get a similar video direction, matching music vibe, and optimized captions."
          />
          {isAiDemoMode ? (
            <DemoModeNotice
              title="Demo Trend Remix"
              body="Trend feed, remix angle, and generated video job are all clearly running in demo mode right now so you can test the premium flow for free."
            />
          ) : null}

          {!isPremiumUnlocked ? (
            <View style={styles.lockCard}>
              <Text style={styles.lockTitle}>Premium-only feature</Text>
              <Text style={styles.body}>
                Trend Hijacker AI is reserved for Premium Creator and Yearly Growth plans. Upgrade to unlock live trend remixes.
              </Text>
              <PrimaryButton label="Unlock premium" onPress={() => navigation.navigate("Subscription")} />
            </View>
          ) : null}

          <Text style={styles.inlineLabel}>Trending now</Text>
          <View style={styles.trendList}>
            {trendFeed.map((trend) => {
              const selected = selectedTrendId === trend.id;
              return (
                <Pressable key={trend.id} onPress={() => setSelectedTrendId(trend.id)} style={[styles.trendCard, selected ? styles.trendCardActive : null]}>
                  <Image resizeMode="cover" source={{ uri: trend.thumbnailUrl }} style={styles.trendThumb} />
                  <View style={styles.trendContent}>
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>{trend.niche}</Text>
                      <Text style={styles.meta}>{trend.momentumScore}% momentum</Text>
                    </View>
                    <Text style={styles.trendTitle}>{trend.title}</Text>
                    <Text style={styles.body}>{trend.trendHook}</Text>
                    <Text style={styles.trendMeta}>Music style: {trend.musicStyle}</Text>
                    <Text style={styles.trendMeta}>Motion style: {trend.motionStyle}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <InputField label="Your goal" multiline onChangeText={setTrendGoal} value={trendGoal} />
          <InputField label="Your offer" onChangeText={setTrendOffer} value={trendOffer} />
          <InputField label="Target audience" onChangeText={setTrendAudience} value={trendAudience} />
          <PrimaryButton
            label={trendLoading ? "Building trend remix..." : isAiDemoMode ? "Use this trend in demo mode" : "Use this trend"}
            onPress={handleUseTrend}
            disabled={trendLoading || !selectedTrendId}
          />

          {trendResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={trendResult.demoMode ? "Demo remix" : "Live remix"} right={`${trendResult.trend.title} | ${new Date(trendResult.createdAt).toLocaleTimeString()}`} />
                <Text style={styles.title}>{trendResult.trend.title}</Text>
                <Text style={styles.bodyStrong}>{trendResult.angle}</Text>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Music vibe</Text>
                  <Text style={styles.body}>{trendResult.musicStyle}</Text>
                </View>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Similar video prompt</Text>
                  <Text style={styles.body}>{trendResult.similarVideoPrompt}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Optimized captions</Text>
                {trendResult.optimizedCaptions.map((caption) => (
                  <View key={caption} style={styles.block}>
                    <Text style={styles.body}>{caption}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <MetaRow left={trendResult.video.demoMode ? "Demo render" : "Live render"} right={`${trendResult.video.model} | ${trendResult.video.seconds}s | ${trendResult.video.size}`} />
                <Text style={styles.sectionMini}>Trend video job</Text>
                <Text style={styles.bodyStrong}>Status: {trendResult.video.status.replace("_", " ")}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${trendResult.video.progress}%` }]} />
                </View>
                <Text style={styles.bodyStrong}>{trendResult.video.progress}% complete</Text>
                {trendResult.video.thumbnailDataUrl ? <Image resizeMode="cover" source={{ uri: trendResult.video.thumbnailDataUrl }} style={styles.image} /> : null}
                <Text style={styles.body}>{trendResult.video.note ?? trendResult.video.prompt}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "avatars" ? (
        <View style={styles.panel}>
          <SectionTitle
            title="AI Avatar Creator"
            subtitle="Upload a photo and generate a talking avatar, anime version, cartoon version, and influencer-style portrait."
          />
          {isAiDemoMode ? (
            <DemoModeNotice
              title="Demo Avatar Creator"
              body="Avatar styles and talking-avatar video are sample/demo outputs in this free setup. The app now makes that explicit before you generate anything."
            />
          ) : null}

          <View style={styles.pricing}>
            <View style={styles.priceCard}>
              <Text style={styles.priceValue}>$2/avatar</Text>
              <Text style={styles.priceLabel}>Pay per avatar</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceValue}>Premium</Text>
              <Text style={styles.priceLabel}>Subscription</Text>
            </View>
          </View>

          <View style={styles.avatarUploadCard}>
            <Text style={styles.sectionMini}>Source photo</Text>
            {avatarSourcePreview ? (
              <Image resizeMode="cover" source={{ uri: avatarSourcePreview }} style={styles.avatarSourceImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.body}>Upload one portrait photo to build all avatar styles.</Text>
              </View>
            )}
            <PrimaryButton label={avatarSourcePreview ? "Change photo" : "Upload photo"} onPress={handlePickAvatarPhoto} variant={avatarSourcePreview ? "ghost" : "solid"} />
          </View>

          <InputField label="Avatar message" multiline onChangeText={setAvatarMessage} value={avatarMessage} />
          <InputField label="Niche" onChangeText={setAvatarNiche} value={avatarNiche} />

          <Text style={styles.inlineLabel}>Talking avatar format</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSizes.map((size) => (
              <Chip key={size} label={size} active={avatarSize === size} onPress={() => setAvatarSize(size)} />
            ))}
          </ScrollView>

          <Text style={styles.inlineLabel}>Talking avatar duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSeconds.map((seconds) => (
              <Chip key={seconds} label={`${seconds}s`} active={avatarDuration === seconds} onPress={() => setAvatarDuration(seconds)} />
            ))}
          </ScrollView>

          <View style={styles.row}>
            <Chip label="Speed" active={avatarQuality === "speed"} onPress={() => setAvatarQuality("speed")} />
            <Chip label="Quality" active={avatarQuality === "quality"} onPress={() => setAvatarQuality("quality")} />
          </View>

          <PrimaryButton
            label={avatarLoading ? "Creating avatar package..." : isAiDemoMode ? "Create demo avatar package" : "Create avatar package"}
            onPress={handleCreateAvatar}
            disabled={avatarLoading || !avatarSourceDataUrl}
          />

          {avatarResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={avatarResult.demoMode ? "Demo avatar" : "Live avatar"} right={new Date(avatarResult.createdAt).toLocaleTimeString()} />
                <Text style={styles.title}>Avatar monetization</Text>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Pay per avatar</Text>
                  <Text style={styles.body}>{avatarResult.monetization.payPerAvatarLabel}</Text>
                </View>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>Premium plan</Text>
                  <Text style={styles.body}>{avatarResult.monetization.premiumLabel}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>Avatar styles</Text>
                {avatarResult.variants.map((variant) => (
                  <View key={variant.id} style={styles.avatarVariantCard}>
                    <Image resizeMode="cover" source={{ uri: variant.imageDataUrl }} style={styles.avatarVariantImage} />
                    <View style={styles.avatarVariantBody}>
                      <Text style={styles.trendTitle}>{variant.title}</Text>
                      <Text style={styles.body}>{variant.prompt}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <MetaRow left={avatarResult.talkingAvatar.demoMode ? "Demo talking avatar" : "Live talking avatar"} right={`${avatarResult.talkingAvatar.model} | ${avatarResult.talkingAvatar.seconds}s | ${avatarResult.talkingAvatar.size}`} />
                <Text style={styles.sectionMini}>Talking avatar video</Text>
                <Text style={styles.bodyStrong}>Status: {avatarResult.talkingAvatar.status.replace("_", " ")}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${avatarResult.talkingAvatar.progress}%` }]} />
                </View>
                <Text style={styles.bodyStrong}>{avatarResult.talkingAvatar.progress}% complete</Text>
                {avatarResult.talkingAvatar.thumbnailDataUrl ? <Image resizeMode="cover" source={{ uri: avatarResult.talkingAvatar.thumbnailDataUrl }} style={styles.image} /> : null}
                <Text style={styles.body}>{avatarResult.talkingAvatar.note ?? avatarResult.talkingAvatar.prompt}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "text" ? (
        <View style={styles.panel}>
          <SectionTitle title="Text generation" subtitle="Create captions, short scripts, or marketplace copy that matches your offer and audience." />
          {isAiDemoMode ? (
            <DemoModeNotice
              title="Demo Text Output"
              body="Text AI is using free fallback content right now, so the app clearly stays in demo mode until live AI is connected."
            />
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {textModes.map((mode) => (
              <Chip key={mode.value} label={mode.label} active={textMode === mode.value} onPress={() => setTextMode(mode.value)} />
            ))}
          </ScrollView>
          <InputField label="Prompt" multiline onChangeText={setTextPrompt} value={textPrompt} />
          <InputField label="Tone" onChangeText={setTextTone} value={textTone} />
          <InputField label="Audience" onChangeText={setTextAudience} value={textAudience} />
          <InputField label="Goal" onChangeText={setTextGoal} value={textGoal} />
          <PrimaryButton
            label={textLoading ? "Generating..." : isAiDemoMode ? "Generate demo text" : "Generate text"}
            onPress={handleGenerateText}
            disabled={textLoading}
          />
          {textResult ? (
            <View style={styles.card}>
              <MetaRow left={textResult.demoMode ? "Demo mode" : "Live AI"} right={`${textResult.model} | ${new Date(textResult.createdAt).toLocaleTimeString()}`} />
              <Text style={styles.title}>{textResult.summary}</Text>
              {textResult.outputs.map((output) => (
                <View key={output} style={styles.block}>
                  <Text style={styles.body}>{output}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {toolTab === "image" ? (
        <View style={styles.panel}>
          <SectionTitle title="Image generation" subtitle="Generate creator ad concepts, thumbnails, or promo visuals using a prompt, style, and aspect ratio." />
          {isAiDemoMode ? (
            <DemoModeNotice
              title="Demo Image Generator"
              body="Generated images are sample/demo visuals right now. They show the app experience, but they are not live AI renders yet."
            />
          ) : null}
          <InputField label="Prompt" multiline onChangeText={setImagePrompt} value={imagePrompt} />
          <InputField label="Style" onChangeText={setImageStyle} value={imageStyle} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {aspectRatios.map((ratio) => (
              <Chip key={ratio} label={ratio} active={imageAspectRatio === ratio} onPress={() => setImageAspectRatio(ratio)} />
            ))}
          </ScrollView>
          <PrimaryButton
            label={imageLoading ? "Generating..." : isAiDemoMode ? "Generate demo image preview" : "Generate image"}
            onPress={handleGenerateImage}
            disabled={imageLoading}
          />
          {imageResult ? (
            <View style={styles.card}>
              <MetaRow left={imageResult.demoMode ? "Demo mode" : "Live AI"} right={`${imageResult.model} | ${new Date(imageResult.createdAt).toLocaleTimeString()}`} />
              <Image resizeMode="cover" source={{ uri: imageResult.imageDataUrl }} style={styles.image} />
              <Text style={styles.body}>{imageResult.revisedPrompt ?? imageResult.prompt}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {toolTab === "video" ? (
        <View style={styles.panel}>
          <SectionTitle title="Video generation" subtitle="Start an async render job, then monitor progress until the clip is ready. Demo mode simulates the same flow." />
          {isAiDemoMode ? (
            <DemoModeNotice
              title="Demo Video Generator"
              body="Video jobs are simulated in the app for free right now. Progress, thumbnails, and completion states are demo previews until live rendering is connected."
            />
          ) : null}
          <InputField label="Scene prompt" multiline onChangeText={setVideoPrompt} value={videoPrompt} />
          <InputField label="Style" onChangeText={setVideoStyle} value={videoStyle} />
          <InputField label="Shot direction" onChangeText={setVideoShotType} value={videoShotType} />
          <Text style={styles.inlineLabel}>Format</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSizes.map((size) => (
              <Chip key={size} label={size} active={videoSize === size} onPress={() => setVideoSize(size)} />
            ))}
          </ScrollView>
          <Text style={styles.inlineLabel}>Duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSeconds.map((seconds) => (
              <Chip key={seconds} label={`${seconds}s`} active={videoDuration === seconds} onPress={() => setVideoDuration(seconds)} />
            ))}
          </ScrollView>
          <View style={styles.row}>
            <Chip label="Speed" active={videoQuality === "speed"} onPress={() => setVideoQuality("speed")} />
            <Chip label="Quality" active={videoQuality === "quality"} onPress={() => setVideoQuality("quality")} />
          </View>
          <PrimaryButton
            label={videoLoading ? "Starting..." : isAiDemoMode ? "Start demo video job" : "Start video job"}
            onPress={handleGenerateVideo}
            disabled={videoLoading}
          />
          {videoJob ? (
            <View style={styles.card}>
              <MetaRow left={videoJob.demoMode ? "Demo mode" : "Live AI"} right={`${videoJob.model} | ${videoJob.seconds}s | ${videoJob.size}`} />
              <Text style={styles.title}>Job status: {videoJob.status.replace("_", " ")}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${videoJob.progress}%` }]} />
              </View>
              <Text style={styles.bodyStrong}>{videoJob.progress}% complete</Text>
              {videoJob.thumbnailDataUrl ? <Image resizeMode="cover" source={{ uri: videoJob.thumbnailDataUrl }} style={styles.image} /> : null}
              <Text style={styles.body}>{videoJob.note ?? videoJob.prompt}</Text>
              {videoJob.error ? <Text style={styles.error}>{videoJob.error}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {toolTab === "engine" && engineResult ? (
        <View style={styles.card}>
          <MetaRow left={engineResult.video.demoMode ? "Demo render" : "Live render"} right={`${engineResult.video.model} | ${engineResult.video.seconds}s | ${engineResult.video.size}`} />
          <Text style={styles.sectionMini}>Video job</Text>
          <Text style={styles.bodyStrong}>Status: {engineResult.video.status.replace("_", " ")}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${engineResult.video.progress}%` }]} />
          </View>
          <Text style={styles.bodyStrong}>{engineResult.video.progress}% complete</Text>
          {engineResult.video.thumbnailDataUrl ? <Image resizeMode="cover" source={{ uri: engineResult.video.thumbnailDataUrl }} style={styles.image} /> : null}
          <Text style={styles.body}>{engineResult.video.note ?? engineResult.video.prompt}</Text>
          <Text style={styles.sectionMini}>Why this can pop</Text>
          {engineResult.insights.reasons.map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <View style={styles.dot} />
              <Text style={styles.body}>{reason}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Production note</Text>
        <Text style={styles.body}>
          {isAiDemoMode
            ? "Pulseora AI is currently in clear demo mode on this device. You can keep testing the full creator flow for free, but image and video outputs are sample previews until live AI is connected."
            : "Live AI is connected. Keep your backend running and the app pointed at the real API base URL so image and video generation stay live on your phone."}
        </Text>
        <PrimaryButton label={copy.subscription} onPress={() => navigation.navigate("Subscription")} variant="ghost" />
      </View>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function MetaRow({ left, right }: { left: string; right: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.meta}>{left}</Text>
      <Text style={styles.meta}>{right}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function DemoModeNotice({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.demoNotice}>
      <Text style={styles.demoNoticeTitle}>{title}</Text>
      <Text style={styles.demoNoticeBody}>{body}</Text>
    </View>
  );
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePickedDuration(duration: number | undefined | null) {
  if (!duration || !Number.isFinite(duration)) {
    return undefined;
  }

  return duration > 300 ? Math.max(1, Math.round(duration / 1000)) : Math.max(1, Math.round(duration));
}

async function buildFailureFrames(uri: string, durationSeconds?: number): Promise<FailureFrame[]> {
  const timestamps = buildFailureFrameTimes(durationSeconds);
  const generated = await Promise.allSettled(
    timestamps.map(async (time) => {
      const thumbnail = await VideoThumbnails.getThumbnailAsync(uri, {
        time,
        quality: 0.75,
      });

      return {
        id: `${time}`,
        uri: thumbnail.uri,
        label: formatFailureFrameLabel(time),
      } satisfies FailureFrame;
    })
  );

  return generated
    .filter((result): result is PromiseFulfilledResult<FailureFrame> => result.status === "fulfilled")
    .map((result) => result.value);
}

function buildFailureFrameTimes(durationSeconds?: number) {
  const durationMs = Math.max(5000, Math.round((durationSeconds ?? 12) * 1000));
  const candidates = [
    400,
    Math.round(durationMs * 0.22),
    Math.round(durationMs * 0.5),
    Math.max(900, Math.round(durationMs * 0.82)),
  ];

  return [...new Set(candidates.map((time) => Math.max(0, Math.min(durationMs - 250, time))))];
}

function formatFailureFrameLabel(timeMs: number) {
  return `${Math.max(0, Math.round(timeMs / 1000))}s`;
}

const styles = StyleSheet.create({
  hero: { borderColor: palette.borderStrong, borderRadius: radii.xl, borderWidth: 1, gap: spacing.lg, padding: spacing.xl },
  kicker: { color: palette.accentSoft, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  statusWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  demoNotice: {
    backgroundColor: "rgba(255,184,77,0.14)",
    borderColor: "rgba(255,184,77,0.34)",
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  demoNoticeTitle: { color: "#FFD27A", fontSize: 16, fontWeight: "900", textTransform: "uppercase" },
  demoNoticeBody: { color: palette.text, fontSize: 14, lineHeight: 22 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  panel: { backgroundColor: palette.surface, borderColor: palette.borderStrong, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  pricing: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  priceCard: { backgroundColor: palette.cardAlt, borderColor: palette.borderStrong, borderRadius: radii.lg, borderWidth: 1, minWidth: 108, padding: spacing.md },
  priceValue: { color: palette.accentSoft, fontSize: 16, fontWeight: "900" },
  priceLabel: { color: palette.textSoft, fontSize: 12, fontWeight: "700", marginTop: 2, textTransform: "uppercase" },
  row: { gap: spacing.sm },
  inlineLabel: { color: palette.textSoft, fontSize: 13, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  lockCard: { backgroundColor: "rgba(255,122,47,0.12)", borderColor: "rgba(255,122,47,0.28)", borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  lockTitle: { color: palette.accentSoft, fontSize: 20, fontWeight: "900" },
  trendList: { gap: spacing.md },
  trendCard: { backgroundColor: palette.cardAlt, borderColor: palette.borderStrong, borderRadius: radii.xl, borderWidth: 1, overflow: "hidden" },
  trendCardActive: { borderColor: palette.primary },
  trendThumb: { height: 148, width: "100%" },
  trendContent: { gap: spacing.sm, padding: spacing.md },
  trendTitle: { color: palette.text, fontSize: 19, fontWeight: "900" },
  trendMeta: { color: palette.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 },
  avatarUploadCard: { backgroundColor: palette.cardAlt, borderColor: palette.borderStrong, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  avatarPlaceholder: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)", borderRadius: radii.lg, borderWidth: 1, justifyContent: "center", minHeight: 220, padding: spacing.lg },
  avatarSourceImage: { borderRadius: radii.lg, height: 280, width: "100%" },
  avatarVariantCard: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)", borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, overflow: "hidden" },
  avatarVariantImage: { height: 220, width: "100%" },
  avatarVariantBody: { gap: spacing.xs, padding: spacing.md },
  frameRow: { gap: spacing.md },
  frameCard: { gap: spacing.sm, width: 150 },
  frameImage: { borderRadius: radii.lg, height: 190, width: "100%" },
  frameLabel: { color: palette.text, fontSize: 12, fontWeight: "800", textAlign: "center", textTransform: "uppercase" },
  auditSectionCard: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)", borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  auditScore: { color: palette.primary, fontSize: 18, fontWeight: "900" },
  retentionGraphRow: { alignItems: "flex-end", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  retentionPoint: { alignItems: "center", flex: 1, gap: spacing.xs },
  retentionTrack: { alignItems: "flex-end", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radii.lg, height: 150, justifyContent: "flex-end", overflow: "hidden", width: "100%" },
  retentionFill: { backgroundColor: palette.primary, borderRadius: radii.lg, minHeight: 8, width: "100%" },
  retentionValue: { color: palette.text, fontSize: 15, fontWeight: "900" },
  card: { backgroundColor: palette.cardAlt, borderColor: palette.borderStrong, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  title: { color: palette.text, fontSize: 22, fontWeight: "900" },
  sectionMini: { color: palette.text, fontSize: 18, fontWeight: "900" },
  scoreRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  scoreBadge: { alignItems: "center", backgroundColor: "rgba(54,224,161,0.14)", borderColor: "rgba(54,224,161,0.24)", borderRadius: radii.xl, borderWidth: 1, justifyContent: "center", minHeight: 108, minWidth: 108, padding: spacing.md },
  scoreValue: { color: palette.primary, fontSize: 28, fontWeight: "900" },
  scoreLabel: { color: palette.textSoft, fontSize: 12, fontWeight: "800", marginTop: 4, textTransform: "uppercase" },
  scoreBody: { flex: 1, gap: spacing.xs },
  block: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)", borderRadius: radii.lg, borderWidth: 1, gap: 8, padding: spacing.md },
  blockLabel: { color: palette.accentSoft, fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  bodyStrong: { color: palette.text, fontSize: 15, fontWeight: "800", lineHeight: 24 },
  body: { color: palette.textSoft, flex: 1, fontSize: 14, lineHeight: 22 },
  note: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  image: { borderRadius: radii.lg, height: 280, width: "100%" },
  track: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radii.pill, height: 12, overflow: "hidden" },
  fill: { backgroundColor: palette.primary, height: "100%" },
  error: { color: palette.danger, fontSize: 13, fontWeight: "700" },
  reasonRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  dot: { backgroundColor: palette.primary, borderRadius: radii.pill, height: 10, marginTop: 6, width: 10 },
  footer: { backgroundColor: palette.cardAlt, borderColor: palette.borderStrong, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  footerTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
  chip: { alignItems: "center", backgroundColor: palette.surface, borderColor: palette.borderStrong, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipLabel: { color: palette.text, fontSize: 13, fontWeight: "800" },
  chipLabelActive: { color: "#071118" },
  metaRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  meta: { color: palette.muted, flex: 1, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  metric: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: palette.borderStrong, borderRadius: radii.lg, borderWidth: 1, flexGrow: 1, gap: 4, minWidth: "47%", padding: spacing.md },
  metricValue: { color: palette.text, fontSize: 16, fontWeight: "900" },
  metricLabel: { color: palette.muted, fontSize: 12, fontWeight: "700" },
});
