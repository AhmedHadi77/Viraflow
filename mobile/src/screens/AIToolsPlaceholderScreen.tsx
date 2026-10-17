import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { getRegion } from "../data/regions";
import { withAiStudioTranslation, withAiToolsUiTranslation } from "../data/locales/aiStudio";
import { formatTime } from "../utils/timeFormatting";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
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
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { PAYMENTS_ENABLED } from "../data/catalog";

type ToolTab = "engine" | "coach" | "audit" | "trends" | "avatars" | "text" | "image" | "video";
type FailureFrame = { id: string; uri: string; label: string };

const voiceOptions: AIVoiceOption[] = ["coral", "marin", "cedar", "sage", "alloy"];
const aspectRatios: Array<"1:1" | "9:16" | "16:9"> = ["9:16", "1:1", "16:9"];
const videoSizes: Array<"720x1280" | "1280x720" | "1080x1920" | "1920x1080"> = ["720x1280", "1080x1920", "1280x720", "1920x1080"];
const videoSeconds: Array<5 | 8 | 10 | 16 | 20> = [8, 10, 16, 20, 5];

function getAiStudioCopy(language: ReturnType<typeof useAppState>["language"]) {
  if (language === "ar") {
    return {
      heroKicker: "استوديو الذكاء",
      heroTitle: "حول فكرة واحدة إلى محتوى أسرع",
      heroSubtitle: "أنشئ النص والصوت والشرح والفكرة المرئية من مكان واحد.",
      brain: "النص",
      voice: "الصوت",
      render: "الفيديو",
      mode: "الوضع",
      loading: "جارٍ التحميل",
      aiOffline: "غير متاح",
      liveBackend: "خادم مباشر",
      aiOfflineTitle: "الذكاء الاصطناعي غير متصل",
      aiOfflineBody: "خدمة الذكاء الاصطناعي غير متاحة على الخادم حاليا. لن يتم إنشاء أي نتائج حتى تعود للعمل.",
      tabs: {
        engine: "المحرك",
        coach: "المدرب",
        audit: "لماذا فشل؟",
        trends: "اختطاف الترند",
        avatars: "أفاتار",
        text: "نص",
        image: "صورة",
        video: "فيديو",
      },
      missingPromptTitle: "الوصف مطلوب",
      missingPromptBody: "اكتب ما الذي تريد من الأداة أن تنشئه أولاً.",
      noTrendTitle: "لا يوجد ترند محدد",
      noTrendBody: "اختر ترنداً أولاً.",
      premiumOnlyTitle: "ميزة بريميوم",
      premiumOnlyBody: "هذه الأداة متاحة في الخطة الشهرية أو السنوية.",
      missingPostTopicTitle: "موضوع المنشور مطلوب",
      missingPostTopicBody: "أخبر المدرب بالمحتوى الذي تريد مراجعته.",
      videoAccessNeededTitle: "نحتاج الوصول للفيديو",
      videoAccessNeededBody: "اسمح بالوصول للمكتبة حتى يتمكن Sohba من تحليل الفيديو.",
      uploadVideoTitle: "ارفع فيديو",
      uploadVideoBody: "اختر الفيديو أولاً قبل تشغيل التدقيق.",
      photoAccessNeededTitle: "نحتاج الوصول للصور",
      photoAccessNeededBody: "اسمح بالوصول للصور حتى يتمكن Sohba من إنشاء حزمة الأفاتار.",
      uploadPhotoTitle: "ارفع صورة",
      uploadPhotoBody: "اختر صورة أولاً لإنشاء حزمة الأفاتار.",
      voicePreviewUnavailableTitle: "معاينة الصوت غير متاحة",
      voicePreviewUnavailableBody: "معاينة صوت الذكاء الاصطناعي غير متاحة الآن.",
      requestBlockedTitle: "تم حظر الطلب",
      textGeneration: "توليد النص",
      imageGeneration: "توليد الصور",
      videoGeneration: "توليد الفيديو",
    };
  }

  if (language === "fr") {
    return {
      heroKicker: "Studio IA",
      heroTitle: "Transformez une idee en contenu plus vite",
      heroSubtitle: "Generez texte, voix, accroches et direction visuelle depuis un seul ecran.",
      brain: "Texte",
      voice: "Voix",
      render: "Rendu",
      mode: "Mode",
      loading: "Chargement",
      aiOffline: "Indisponible",
      liveBackend: "Backend live",
      aiOfflineTitle: "IA hors ligne",
      aiOfflineBody: "La generation IA n'est pas disponible sur le serveur pour le moment. Rien ne sera genere tant qu'elle n'est pas de retour.",
      tabs: {
        engine: "Moteur viral",
        coach: "Coach croissance",
        audit: "Pourquoi ca a rate ?",
        trends: "Trend Hijacker",
        avatars: "Avatar IA",
        text: "Texte IA",
        image: "Image IA",
        video: "Video IA",
      },
      missingPromptTitle: "Prompt requis",
      missingPromptBody: "Decrivez d'abord ce que vous voulez creer.",
      noTrendTitle: "Aucune tendance selectionnee",
      noTrendBody: "Choisissez une tendance d'abord.",
      premiumOnlyTitle: "Fonction premium",
      premiumOnlyBody: "Cet outil est reserve aux plans mensuel ou annuel.",
      missingPostTopicTitle: "Sujet requis",
      missingPostTopicBody: "Indiquez au coach quel post doit etre analyse.",
      videoAccessNeededTitle: "Acces video requis",
      videoAccessNeededBody: "Autorisez la bibliotheque pour analyser la video.",
      uploadVideoTitle: "Importez une video",
      uploadVideoBody: "Choisissez d'abord la video a auditer.",
      photoAccessNeededTitle: "Acces photo requis",
      photoAccessNeededBody: "Autorisez la bibliotheque pour creer les styles avatar.",
      uploadPhotoTitle: "Importez une photo",
      uploadPhotoBody: "Choisissez d'abord une photo pour creer le pack avatar.",
      voicePreviewUnavailableTitle: "Apercu vocal indisponible",
      voicePreviewUnavailableBody: "L'aperçu de la voix IA n'est pas disponible pour le moment.",
      requestBlockedTitle: "Requete bloquee",
      textGeneration: "Generation de texte",
      imageGeneration: "Generation d'image",
      videoGeneration: "Generation video",
    };
  }

  if (language === "es") {
    return {
      heroKicker: "Estudio IA",
      heroTitle: "Convierte una idea en contenido mas rapido",
      heroSubtitle: "Genera texto, voz, captions y direccion visual desde un solo lugar.",
      brain: "Texto",
      voice: "Voz",
      render: "Render",
      mode: "Modo",
      loading: "Cargando",
      aiOffline: "No disponible",
      liveBackend: "Backend en vivo",
      aiOfflineTitle: "IA sin conexion",
      aiOfflineBody: "La generacion con IA no esta disponible en el servidor ahora mismo. No se generara nada hasta que vuelva a estar activa.",
      tabs: {
        engine: "Motor viral",
        coach: "Coach de crecimiento",
        audit: "Por que fallo",
        trends: "Trend Hijacker",
        avatars: "Avatar IA",
        text: "Texto IA",
        image: "Imagen IA",
        video: "Video IA",
      },
      missingPromptTitle: "Falta el prompt",
      missingPromptBody: "Describe primero lo que quieres crear.",
      noTrendTitle: "No hay tendencia elegida",
      noTrendBody: "Elige una tendencia primero.",
      premiumOnlyTitle: "Funcion premium",
      premiumOnlyBody: "Esta herramienta esta disponible en el plan mensual o anual.",
      missingPostTopicTitle: "Falta el tema",
      missingPostTopicBody: "Dile al coach que publicacion quieres analizar.",
      videoAccessNeededTitle: "Se necesita acceso al video",
      videoAccessNeededBody: "Permite el acceso a la galeria para analizar el video.",
      uploadVideoTitle: "Sube un video",
      uploadVideoBody: "Elige primero el video para auditar.",
      photoAccessNeededTitle: "Se necesita acceso a fotos",
      photoAccessNeededBody: "Permite el acceso a la galeria para crear los estilos del avatar.",
      uploadPhotoTitle: "Sube una foto",
      uploadPhotoBody: "Elige primero una foto para crear el paquete de avatar.",
      voicePreviewUnavailableTitle: "Vista previa de voz no disponible",
      voicePreviewUnavailableBody: "La vista previa de la voz IA no está disponible ahora.",
      requestBlockedTitle: "Solicitud bloqueada",
      textGeneration: "Generacion de texto",
      imageGeneration: "Generacion de imagen",
      videoGeneration: "Generacion de video",
    };
  }

  return {
    heroKicker: "Sohba AI Studio",
    heroTitle: "One prompt into viral content",
    heroSubtitle: "Generate the script, AI voice, captions, video prompt, and a viral score package for creators who want to move faster and monetize better.",
    brain: "Brain",
    voice: "Voice",
    render: "Render",
    mode: "Mode",
    loading: "Loading",
    aiOffline: "Unavailable",
    liveBackend: "Live backend",
    aiOfflineTitle: "AI is offline",
    aiOfflineBody: "AI generation is not available on the server right now. Nothing will be generated until it is back online.",
    tabs: {
      engine: "Viral Engine",
      coach: "Growth Coach",
      audit: "Why Failed?",
      trends: "Trend Hijacker",
      avatars: "Avatar AI",
      text: "Text AI",
      image: "Image AI",
      video: "Video AI",
    },
    missingPromptTitle: "Missing prompt",
    missingPromptBody: "Describe what you want the tool to create first.",
    noTrendTitle: "No trend selected",
    noTrendBody: "Pick a trend first.",
    premiumOnlyTitle: "Premium only",
    premiumOnlyBody: "This tool is unlocked on the monthly or yearly plan.",
    missingPostTopicTitle: "Missing post topic",
    missingPostTopicBody: "Tell Growth Coach which post you want feedback on.",
    videoAccessNeededTitle: "Video access needed",
    videoAccessNeededBody: "Allow photo library access so Sohba can analyze your video.",
    uploadVideoTitle: "Upload a video",
    uploadVideoBody: "Pick the underperforming video first so Sohba can audit it.",
    photoAccessNeededTitle: "Photo access needed",
    photoAccessNeededBody: "Allow photo library access so Sohba can create avatar styles from your image.",
    uploadPhotoTitle: "Upload a photo",
    uploadPhotoBody: "Pick a photo first so Sohba can build your avatar package.",
    voicePreviewUnavailableTitle: "Voice preview unavailable",
    voicePreviewUnavailableBody: "AI voice preview is not available right now.",
    requestBlockedTitle: "Request blocked",
    textGeneration: "Text generation",
    imageGeneration: "Image generation",
    videoGeneration: "Video generation",
  };
}

function getAiToolsUiCopy(language: ReturnType<typeof useAppState>["language"]) {
  const base = {
    captionsMode: "Captions",
    scriptsMode: "Scripts",
    productCopyMode: "Product copy",
    engineTitle: "Viral AI content engine",
    engineSubtitle: 'Type one prompt like "Make viral gym reel" and Sohba will build the full content package around it.',
    starterPlan: "Starter",
    premiumPlan: "Premium",
    flexPlan: "Flex",
    corePrompt: "Core prompt",
    niche: "Niche",
    offer: "Offer",
    targetAudience: "Target audience",
    tone: "Tone",
    aiVoiceLabel: "AI voice",
    formatLabel: "Format",
    durationLabel: "Duration",
    speed: "Speed",
    quality: "Quality",
    generatingViralPackage: "Generating viral package...",
    buildViralPackage: "Build viral content package",
    liveAi: "Live AI",
    viralScore: "Viral score",
    builtForHooks: "Built for hooks, replay potential, and audience fit.",
    bestPostingTime: "Best posting time",
    script: "Script",
    hook: "Hook",
    body: "Body",
    cta: "CTA",
    captions: "Captions",
    retention: "Retention",
    previewReady: "Preview ready",
    scriptReady: "Script ready",
    aiVoiceSection: "AI voice",
    pauseVoicePreview: "Pause voice preview",
    playVoicePreview: "Play voice preview",
    coachTitle: "Personal AI Coach",
    coachSubtitle: "Growth Coach explains why a post failed, how to improve it, and what you should publish next.",
    premiumFeatureTitle: "Premium-only feature",
    premiumFeatureBody: "This tool is reserved for Premium Creator and Yearly Growth plans.",
    unlockPremium: "Unlock premium",
    monthlyOrYearly: "Monthly or yearly",
    recentPostTopic: "Recent post topic",
    recentCaption: "Recent caption",
    postGoal: "Post goal",
    performanceSnapshot: "Performance snapshot",
    views: "Views",
    likes: "Likes",
    comments: "Comments",
    shares: "Shares",
    retentionIssue: "Retention issue",
    biggestPain: "What hurts most right now?",
    coaching: "Coaching...",
    analyzeWithCoach: "Analyze with Growth Coach",
    liveCoach: "Live coach",
    growthCoach: "Growth Coach",
    premiumAccess: "Premium access",
    whyPostFailed: "Why the post failed",
    howToImprove: "How to improve",
    whatToPostNext: "What to post next",
    coachSummary: "Coach summary",
    formatField: "Format",
    reason: "Reason",
    auditTitle: "Why Did This Fail?",
    auditSubtitle: "Upload an underperforming video and Sohba will analyze the hook, retention, and captions.",
    badVideoUpload: "Bad video upload",
    videoReadyForAnalysis: "Video selected and ready for analysis.",
    selectedFromLibrary: "Selected from your device library.",
    readyForAudit: "Ready for audit.",
    uploadBadVideo: "Upload bad video",
    changeVideo: "Change video",
    uploadBadVideoBody: "Upload the reel that underperformed so the AI can audit why it failed.",
    frameThumbnails: "Frame thumbnails",
    frameThumbnailsBody: "Sohba samples key frames before running the audit so you can quickly spot slow openings or late payoffs.",
    captionUsedOnPost: "Caption used on the post",
    whatHappenedToRetention: "What happened to retention?",
    analyzing: "Analyzing...",
    analyzeWhyFailed: "Analyze why this failed",
    liveAudit: "Live audit",
    failureAudit: "Failure audit",
    issue: "Issue",
    fix: "Fix",
    transcript: "Transcript",
    autoTranscript: "Auto transcript",
    captionTranscript: "No speech detected - using your caption",
    words: "words",
    retentionGraph: "Retention graph",
    retentionGraphBody: "AI-estimated retention curve built from your uploaded video, transcript, and performance context.",
    atSecond: "at",
    quickWins: "Quick wins",
    nextMove: "Next move",
    trendsTitle: "Trend Hijacker AI",
    trendsSubtitle: "Scan trend formats, remix the angle, and generate matching captions plus a video direction.",
    trendingNow: "Trending now",
    momentum: "momentum",
    musicStyle: "Music style",
    motionStyle: "Motion style",
    yourGoal: "Your goal",
    yourOffer: "Your offer",
    buildingTrendRemix: "Building trend remix...",
    useThisTrend: "Use this trend",
    liveRemix: "Live remix",
    musicVibe: "Music vibe",
    similarVideoPrompt: "Similar video prompt",
    optimizedCaptions: "Optimized captions",
    trendVideoJob: "Trend video job",
    avatarTitle: "AI Avatar Creator",
    avatarSubtitle: "Upload a photo and generate a talking avatar, anime version, cartoon version, and influencer-style portrait.",
    payPerAvatar: "Pay per avatar",
    subscriptionPlan: "Subscription",
    sourcePhoto: "Source photo",
    sourcePhotoBody: "Upload one portrait photo to build all avatar styles.",
    uploadPhoto: "Upload photo",
    changePhoto: "Change photo",
    avatarMessage: "Avatar message",
    talkingAvatarFormat: "Talking avatar format",
    talkingAvatarDuration: "Talking avatar duration",
    creatingAvatarPackage: "Creating avatar package...",
    createAvatarPackage: "Create avatar package",
    liveAvatar: "Live avatar",
    avatarMonetization: "Avatar monetization",
    premiumPlanLabel: "Premium plan",
    avatarStyles: "Avatar styles",
    talkingAvatarVideo: "Talking avatar video",
    textTitle: "Text generation",
    textSubtitle: "Create captions, short scripts, or marketplace copy that matches your offer and audience.",
    prompt: "Prompt",
    audience: "Audience",
    goal: "Goal",
    generating: "Generating...",
    generateText: "Generate text",
    imageTitle: "Image generation",
    imageSubtitle: "Generate creator ad concepts, thumbnails, or promo visuals using a prompt, style, and aspect ratio.",
    style: "Style",
    generateImage: "Generate image",
    videoTitle: "Video generation",
    videoSubtitle: "Start an async render job, then monitor progress until the clip is ready.",
    scenePrompt: "Scene prompt",
    shotDirection: "Shot direction",
    starting: "Starting...",
    startVideoJob: "Start video job",
    jobStatus: "Job status",
    statusLabel: "Status",
    complete: "complete",
    liveRender: "Live render",
    videoJob: "Video job",
    whyThisCanPop: "Why this can pop",
    productionNote: "Production note",
    productionOfflineBody: "Sohba AI is offline right now. Generation buttons will report an error instead of returning sample content.",
    productionLiveBody: "Live AI is connected. Every result on this screen is generated by the Sohba AI service.",
  } as const;

  if (language === "fr") {
    return {
      ...base,
      starterPlan: "Starter",
      corePrompt: "Prompt principal",
      targetAudience: "Audience cible",
      aiVoiceLabel: "Voix IA",
      durationLabel: "Duree",
      buildViralPackage: "Creer le pack viral",
      coachTitle: "Coach IA personnel",
      unlockPremium: "Debloquer premium",
      recentPostTopic: "Sujet du post recent",
      recentCaption: "Legende recente",
      performanceSnapshot: "Apercu des performances",
      retentionIssue: "Probleme de retention",
      analyzeWithCoach: "Analyser avec Growth Coach",
      auditTitle: "Pourquoi cela a rate ?",
      changeVideo: "Changer la video",
      trendingNow: "Tendances du moment",
      yourGoal: "Votre objectif",
      yourOffer: "Votre offre",
      useThisTrend: "Utiliser cette tendance",
      sourcePhoto: "Photo source",
      changePhoto: "Changer la photo",
      textTitle: "Generation de texte",
      imageTitle: "Generation d'image",
      videoTitle: "Generation video",
      productionNote: "Note de production",
    };
  }

  if (language === "es") {
    return {
      ...base,
      corePrompt: "Prompt principal",
      targetAudience: "Publico objetivo",
      aiVoiceLabel: "Voz IA",
      durationLabel: "Duracion",
      buildViralPackage: "Crear paquete viral",
      coachTitle: "Coach IA personal",
      unlockPremium: "Desbloquear premium",
      recentPostTopic: "Tema del post reciente",
      recentCaption: "Caption reciente",
      performanceSnapshot: "Resumen de rendimiento",
      retentionIssue: "Problema de retencion",
      analyzeWithCoach: "Analizar con Growth Coach",
      auditTitle: "Por que fallo?",
      changeVideo: "Cambiar video",
      trendingNow: "Tendencias ahora",
      yourGoal: "Tu objetivo",
      yourOffer: "Tu oferta",
      useThisTrend: "Usar esta tendencia",
      sourcePhoto: "Foto base",
      changePhoto: "Cambiar foto",
      textTitle: "Generacion de texto",
      imageTitle: "Generacion de imagen",
      videoTitle: "Generacion de video",
      productionNote: "Nota de produccion",
    };
  }

  if (language === "ar") {
    return {
      ...base,
      corePrompt: "الوصف الأساسي",
      targetAudience: "الجمهور المستهدف",
      aiVoiceLabel: "الصوت الذكي",
      durationLabel: "المدة",
      buildViralPackage: "إنشاء الحزمة الفيروسية",
      coachTitle: "المدرب الذكي",
      unlockPremium: "افتح بريميوم",
      recentPostTopic: "موضوع المنشور الأخير",
      recentCaption: "الكابشن الأخير",
      performanceSnapshot: "ملخص الأداء",
      retentionIssue: "مشكلة الاحتفاظ",
      analyzeWithCoach: "حلل مع المدرب",
      auditTitle: "لماذا فشل؟",
      changeVideo: "تغيير الفيديو",
      trendingNow: "الترند الآن",
      yourGoal: "هدفك",
      yourOffer: "عرضك",
      useThisTrend: "استخدم هذا الترند",
      sourcePhoto: "الصورة الأصلية",
      changePhoto: "تغيير الصورة",
      textTitle: "توليد النص",
      imageTitle: "توليد الصورة",
      videoTitle: "توليد الفيديو",
      productionNote: "ملاحظة الإنتاج",
    };
  }

  return base;
}

export function AIToolsPlaceholderScreen({ navigation }: { navigation: any }) {
  const { language, region, session, currentUser } = useAppState();
  const regionInfo = getRegion(region);
  const copy = getCopy(language);
  const aiCopy = withAiStudioTranslation(getAiStudioCopy(language), language);
  const aiUi = withAiToolsUiTranslation(getAiToolsUiCopy(language), language);
  const [toolTab, setToolTab] = useState<ToolTab>("engine");
  const [aiStatus, setAiStatus] = useState<AIStatusPayload | null>(null);
  const isAiOffline = aiStatus?.demoMode ?? false;
  const localizedTextModes = useMemo(
    () => [
      { value: "captions" as const, label: aiUi.captionsMode },
      { value: "script" as const, label: aiUi.scriptsMode },
      { value: "product_copy" as const, label: aiUi.productCopyMode },
    ],
    [aiUi]
  );

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
  const [coachViews, setCoachViews] = useState("");
  const [coachLikes, setCoachLikes] = useState("");
  const [coachComments, setCoachComments] = useState("");
  const [coachShares, setCoachShares] = useState("");
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
  const [failureViews, setFailureViews] = useState("");
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
  const isPremiumUnlocked = !PAYMENTS_ENABLED || currentUser?.planType === "monthly" || currentUser?.planType === "yearly";

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers", shouldPlayInBackground: false }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchAiStatus(session?.token).then(setAiStatus);
  }, [session?.token]);

  useEffect(() => {
    fetchAiTrends(session?.token, region)
      .then((trends) => {
        setTrendFeed(trends);
        setSelectedTrendId((current) => (current && trends.some((item) => item.id === current) ? current : trends[0]?.id ?? null));
      })
      .catch(() => setTrendFeed([]));
  }, [session?.token, region]);

  useEffect(() => {
    if (!videoJob || (videoJob.status !== "queued" && videoJob.status !== "in_progress")) {
      return;
    }
    const timer = setInterval(async () => {
      const updated = await refreshAiVideo(session?.token, videoJob.id).catch(() => undefined);
      if (updated) setVideoJob(updated);
    }, 3500);
    return () => clearInterval(timer);
  }, [session?.token, videoJob]);

  useEffect(() => {
    if (!engineResult?.video || (engineResult.video.status !== "queued" && engineResult.video.status !== "in_progress")) {
      return;
    }
    const timer = setInterval(async () => {
      const updated = await refreshAiVideo(session?.token, engineResult.video.id).catch(() => undefined);
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
      const updated = await refreshAiVideo(session?.token, trendResult.video.id).catch(() => undefined);
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
      const updated = await refreshAiVideo(session?.token, avatarResult.talkingAvatar.id).catch(() => undefined);
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
      Alert.alert(aiCopy.missingPromptTitle, aiCopy.missingPromptBody);
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
      Alert.alert(aiCopy.noTrendTitle, aiCopy.noTrendBody);
      return;
    }

    if (!isPremiumUnlocked) {
      Alert.alert(aiCopy.premiumOnlyTitle, aiCopy.premiumOnlyBody);
      navigation.navigate("Subscription");
      return;
    }

    setTrendLoading(true);
    try {
      const result = await generateAiTrendHijack(session?.token, {
        trendId: selectedTrendId,
        region,
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
      Alert.alert(aiCopy.missingPostTopicTitle, aiCopy.missingPostTopicBody);
      return;
    }

    if (!isPremiumUnlocked) {
      Alert.alert(aiCopy.premiumOnlyTitle, aiCopy.premiumOnlyBody);
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
      Alert.alert(aiCopy.videoAccessNeededTitle, aiCopy.videoAccessNeededBody);
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
      Alert.alert(aiCopy.uploadVideoTitle, aiCopy.uploadVideoBody);
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
      Alert.alert(aiCopy.photoAccessNeededTitle, aiCopy.photoAccessNeededBody);
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
      Alert.alert(copy.imageIssueTitle, copy.imageIssueBody);
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setAvatarSourcePreview(asset.uri);
    setAvatarSourceDataUrl(`data:${mimeType};base64,${asset.base64}`);
    setAvatarResult(null);
  }

  async function handleCreateAvatar() {
    if (!avatarSourceDataUrl) {
      Alert.alert(aiCopy.uploadPhotoTitle, aiCopy.uploadPhotoBody);
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
      Alert.alert(aiCopy.missingPromptTitle, aiCopy.missingPromptBody);
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
      Alert.alert(aiCopy.missingPromptTitle, aiCopy.missingPromptBody);
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
      Alert.alert(aiCopy.missingPromptTitle, aiCopy.missingPromptBody);
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
      Alert.alert(aiCopy.voicePreviewUnavailableTitle, aiCopy.voicePreviewUnavailableBody);
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
    Alert.alert(aiCopy.requestBlockedTitle, message);
  }

  return (
    <Screen scrollable>
      <LinearGradient colors={["rgba(255,122,47,0.18)", "rgba(54,224,161,0.14)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
            <Text style={styles.kicker}>{aiCopy.heroKicker}</Text>
        <SectionTitle
          title={aiCopy.heroTitle}
          subtitle={aiCopy.heroSubtitle}
        />
        <View style={styles.statusWrap}>
          <Metric label={aiCopy.brain} value={aiStatus ? aiStatus.textModel || "—" : aiCopy.loading} />
          <Metric label={aiCopy.voice} value={aiStatus ? aiStatus.voiceModel || "—" : aiCopy.loading} />
          <Metric label={aiCopy.render} value={aiStatus ? aiStatus.videoModel || "—" : aiCopy.loading} />
          <Metric label={aiCopy.mode} value={aiStatus ? (aiStatus.demoMode ? aiCopy.aiOffline : aiCopy.liveBackend) : aiCopy.loading} />
        </View>
        {isAiOffline ? (
          <OfflineNotice
            title={aiCopy.aiOfflineTitle}
            body={aiCopy.aiOfflineBody}
          />
        ) : null}
      </LinearGradient>

      <View style={styles.tabs}>
        <Chip label={aiCopy.tabs.engine} active={toolTab === "engine"} onPress={() => setToolTab("engine")} />
        <Chip label={aiCopy.tabs.coach} active={toolTab === "coach"} onPress={() => setToolTab("coach")} />
        <Chip label={aiCopy.tabs.audit} active={toolTab === "audit"} onPress={() => setToolTab("audit")} />
        <Chip label={aiCopy.tabs.trends} active={toolTab === "trends"} onPress={() => setToolTab("trends")} />
        <Chip label={aiCopy.tabs.avatars} active={toolTab === "avatars"} onPress={() => setToolTab("avatars")} />
        <Chip label={aiCopy.tabs.text} active={toolTab === "text"} onPress={() => setToolTab("text")} />
        <Chip label={aiCopy.tabs.image} active={toolTab === "image"} onPress={() => setToolTab("image")} />
        <Chip label={aiCopy.tabs.video} active={toolTab === "video"} onPress={() => setToolTab("video")} />
      </View>

      {toolTab === "engine" ? (
        <View style={styles.panel}>
          <SectionTitle
            title={aiUi.engineTitle}
                subtitle={aiUi.engineSubtitle}
          />
          {PAYMENTS_ENABLED ? (
            <View style={styles.pricing}>
              <View style={styles.priceCard}>
                <Text style={styles.priceValue}>$3/week</Text>
                <Text style={styles.priceLabel}>{aiUi.starterPlan}</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceValue}>$10/month</Text>
                <Text style={styles.priceLabel}>{aiUi.premiumPlan}</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceValue}>{copy.payPerExport}</Text>
                <Text style={styles.priceLabel}>{aiUi.flexPlan}</Text>
              </View>
            </View>
          ) : null}

          <InputField label={aiUi.corePrompt} multiline onChangeText={setEnginePrompt} value={enginePrompt} />
          <InputField label={aiUi.niche} onChangeText={setEngineNiche} value={engineNiche} />
          <InputField label={aiUi.offer} onChangeText={setEngineOffer} value={engineOffer} />
          <InputField label={aiUi.targetAudience} onChangeText={setEngineAudience} value={engineAudience} />
          <InputField label={aiUi.tone} onChangeText={setEngineTone} value={engineTone} />

          <Text style={styles.inlineLabel}>{aiUi.aiVoiceLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {voiceOptions.map((voice) => (
              <Chip key={voice} label={voice} active={engineVoice === voice} onPress={() => setEngineVoice(voice)} />
            ))}
          </ScrollView>

          <Text style={styles.inlineLabel}>{aiUi.formatLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSizes.map((size) => (
              <Chip key={size} label={size} active={engineSize === size} onPress={() => setEngineSize(size)} />
            ))}
          </ScrollView>

          <Text style={styles.inlineLabel}>{aiUi.durationLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSeconds.map((seconds) => (
              <Chip key={seconds} label={`${seconds}s`} active={engineDuration === seconds} onPress={() => setEngineDuration(seconds)} />
            ))}
          </ScrollView>

          <View style={styles.row}>
            <Chip label={aiUi.speed} active={engineQuality === "speed"} onPress={() => setEngineQuality("speed")} />
            <Chip label={aiUi.quality} active={engineQuality === "quality"} onPress={() => setEngineQuality("quality")} />
          </View>

          <PrimaryButton
            label={engineLoading ? aiUi.generatingViralPackage : aiUi.buildViralPackage}
            onPress={handleGenerateViralEngine}
            disabled={engineLoading}
          />

          {engineResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={aiUi.liveAi} right={`${engineResult.voice.model} | ${formatTime(engineResult.createdAt)}`} />
                <Text style={styles.title}>{engineResult.conceptTitle}</Text>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreValue}>{engineResult.insights.viralScore}%</Text>
                    <Text style={styles.scoreLabel}>{aiUi.viralScore}</Text>
                  </View>
                  <View style={styles.scoreBody}>
                    <Text style={styles.bodyStrong}>{aiUi.builtForHooks}</Text>
                    <Text style={styles.body}>{aiUi.bestPostingTime}: {engineResult.insights.bestPostingTime}</Text>
                    <Text style={styles.body}>{aiUi.targetAudience}: {engineResult.insights.targetAudience}</Text>
                  </View>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${engineResult.insights.viralScore}%` }]} />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.script}</Text>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>{aiUi.hook}</Text>
                  <Text style={styles.body}>{engineResult.script.hook}</Text>
                </View>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>{aiUi.body}</Text>
                  <Text style={styles.body}>{engineResult.script.body}</Text>
                </View>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>{aiUi.cta}</Text>
                  <Text style={styles.body}>{engineResult.script.cta}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.captions}</Text>
                {engineResult.captions.map((caption) => (
                  <View key={caption} style={styles.block}>
                    <Text style={styles.body}>{caption}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <MetaRow left={`${aiUi.aiVoiceLabel}: ${engineResult.voice.voice}`} right={engineResult.voice.audioPath ? aiUi.previewReady : aiUi.scriptReady} />
                <Text style={styles.sectionMini}>{aiUi.aiVoiceSection}</Text>
                <View style={styles.block}>
                  <Text style={styles.body}>{engineResult.voice.script}</Text>
                </View>
                <Text style={styles.note}>{engineResult.voice.disclosure}</Text>
                <PrimaryButton label={voiceStatus.playing ? aiUi.pauseVoicePreview : aiUi.playVoicePreview} onPress={toggleVoicePreview} variant={engineResult.voice.audioPath ? "solid" : "ghost"} />
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "coach" ? (
        <View style={styles.panel}>
          <SectionTitle
            title={aiUi.coachTitle}
            subtitle={aiUi.coachSubtitle}
          />

          {!isPremiumUnlocked ? (
            <View style={styles.lockCard}>
              <Text style={styles.lockTitle}>{aiUi.premiumFeatureTitle}</Text>
              <Text style={styles.body}>{aiUi.premiumFeatureBody}</Text>
              <PrimaryButton label={aiUi.unlockPremium} onPress={() => navigation.navigate("Subscription")} />
            </View>
          ) : null}

          {PAYMENTS_ENABLED ? (
            <View style={styles.pricing}>
              <View style={styles.priceCard}>
                <Text style={styles.priceValue}>{aiUi.premiumPlan}</Text>
                <Text style={styles.priceLabel}>{aiUi.monthlyOrYearly}</Text>
              </View>
            </View>
          ) : null}

          <InputField label={aiUi.recentPostTopic} multiline onChangeText={setCoachTopic} value={coachTopic} />
          <InputField label={aiUi.recentCaption} multiline onChangeText={setCoachCaption} value={coachCaption} />
          <InputField label={aiUi.niche} onChangeText={setCoachNiche} value={coachNiche} />
          <InputField label={aiUi.targetAudience} onChangeText={setCoachAudience} value={coachAudience} />
          <InputField label={aiUi.postGoal} onChangeText={setCoachGoal} value={coachGoal} />

          <Text style={styles.inlineLabel}>{aiUi.performanceSnapshot}</Text>
          <InputField label={aiUi.views} keyboardType="number-pad" onChangeText={setCoachViews} value={coachViews} />
          <InputField label={aiUi.likes} keyboardType="number-pad" onChangeText={setCoachLikes} value={coachLikes} />
          <InputField label={aiUi.comments} keyboardType="number-pad" onChangeText={setCoachComments} value={coachComments} />
          <InputField label={aiUi.shares} keyboardType="number-pad" onChangeText={setCoachShares} value={coachShares} />

          <InputField label={aiUi.retentionIssue} multiline onChangeText={setCoachRetentionNote} value={coachRetentionNote} />
          <InputField label={aiUi.biggestPain} multiline onChangeText={setCoachPainPoint} value={coachPainPoint} />

          <PrimaryButton
            label={coachLoading ? aiUi.coaching : aiUi.analyzeWithCoach}
            onPress={handleGrowthCoach}
            disabled={coachLoading || !isPremiumUnlocked}
          />

          {coachResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={aiUi.liveCoach} right={formatTime(coachResult.createdAt)} />
                <Text style={styles.title}>{aiUi.growthCoach}</Text>
                <Text style={styles.bodyStrong}>{coachResult.headline}</Text>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>{aiUi.premiumAccess}</Text>
                  <Text style={styles.body}>{coachResult.premium.label}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.whyPostFailed}</Text>
                {coachResult.diagnosis.map((reason) => (
                  <View key={reason} style={styles.reasonRow}>
                    <View style={styles.dot} />
                    <Text style={styles.body}>{reason}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.howToImprove}</Text>
                {coachResult.improvements.map((improvement) => (
                  <View key={improvement} style={styles.block}>
                    <Text style={styles.body}>{improvement}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.whatToPostNext}</Text>
                {coachResult.nextPosts.map((idea) => (
                  <View key={`${idea.title}-${idea.hook}`} style={styles.block}>
                    <Text style={styles.bodyStrong}>{idea.title}</Text>
                    <Text style={styles.body}>{aiUi.hook}: {idea.hook}</Text>
                    <Text style={styles.body}>{aiUi.formatField}: {idea.format}</Text>
                    <Text style={styles.note}>{aiUi.reason}: {idea.reason}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.coachSummary}</Text>
                <Text style={styles.body}>{coachResult.coachSummary}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "audit" ? (
        <View style={styles.panel}>
          <SectionTitle
            title={aiUi.auditTitle}
            subtitle={aiUi.auditSubtitle}
          />

          <View style={styles.avatarUploadCard}>
            <Text style={styles.sectionMini}>{aiUi.badVideoUpload}</Text>
            {failureVideoName ? (
              <View style={styles.block}>
                <Text style={styles.bodyStrong}>{failureVideoName}</Text>
                <Text style={styles.body}>{failureVideoDuration ? `${failureVideoDuration}s ${aiUi.videoReadyForAnalysis.toLowerCase()}` : aiUi.videoReadyForAnalysis}</Text>
                <Text style={styles.note}>{failureVideoUri ? aiUi.selectedFromLibrary : aiUi.readyForAudit}</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.body}>{aiUi.uploadBadVideoBody}</Text>
              </View>
            )}
            <PrimaryButton label={failureVideoName ? aiUi.changeVideo : aiUi.uploadBadVideo} onPress={handlePickFailureVideo} variant={failureVideoName ? "ghost" : "solid"} />
          </View>

          {failureFrames.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionMini}>{aiUi.frameThumbnails}</Text>
              <Text style={styles.note}>{aiUi.frameThumbnailsBody}</Text>
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

          <InputField label={aiUi.captionUsedOnPost} multiline onChangeText={setFailureCaption} value={failureCaption} />
          <InputField label={aiUi.whatHappenedToRetention} multiline onChangeText={setFailureRetentionNote} value={failureRetentionNote} />
          <InputField label={aiUi.views} keyboardType="number-pad" onChangeText={setFailureViews} value={failureViews} />
          <InputField label={aiUi.niche} onChangeText={setFailureNiche} value={failureNiche} />
          <InputField label={aiUi.targetAudience} onChangeText={setFailureAudience} value={failureAudience} />

          <PrimaryButton
            label={failureLoading ? aiUi.analyzing : aiUi.analyzeWhyFailed}
            onPress={handleAnalyzeFailureVideo}
            disabled={failureLoading || !failureVideoName}
          />

          {failureResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={aiUi.liveAudit} right={formatTime(failureResult.createdAt)} />
                <Text style={styles.title}>{aiUi.failureAudit}</Text>
                <Text style={styles.bodyStrong}>{failureResult.headline}</Text>
              </View>

              <View style={styles.auditSectionCard}>
                <View style={styles.metaRow}>
                  <Text style={styles.sectionMini}>{aiUi.hook}</Text>
                  <Text style={styles.auditScore}>{failureResult.hook.score}/100</Text>
                </View>
                <Text style={styles.bodyStrong}>{failureResult.hook.verdict}</Text>
                <Text style={styles.body}>{aiUi.issue}: {failureResult.hook.issue}</Text>
                <Text style={styles.body}>{aiUi.fix}: {failureResult.hook.fix}</Text>
              </View>

              <View style={styles.auditSectionCard}>
                <View style={styles.metaRow}>
                  <Text style={styles.sectionMini}>{aiUi.retention}</Text>
                  <Text style={styles.auditScore}>{failureResult.retention.score}/100</Text>
                </View>
                <Text style={styles.bodyStrong}>{failureResult.retention.verdict}</Text>
                <Text style={styles.body}>{aiUi.issue}: {failureResult.retention.issue}</Text>
                <Text style={styles.body}>{aiUi.fix}: {failureResult.retention.fix}</Text>
              </View>

              <View style={styles.card}>
                <MetaRow
                  left={failureResult.transcript.source === "auto" ? aiUi.autoTranscript : aiUi.captionTranscript}
                  right={`${failureResult.transcript.text.split(/\s+/).filter(Boolean).length} ${aiUi.words}`}
                />
                <Text style={styles.sectionMini}>{aiUi.transcript}</Text>
                <Text style={styles.body}>{failureResult.transcript.text}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.retentionGraph}</Text>
                <Text style={styles.note}>{aiUi.retentionGraphBody}</Text>
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
                      <Text style={styles.blockLabel}>{point.label} {aiUi.atSecond} {point.second}s</Text>
                      <Text style={styles.body}>{point.note}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.auditSectionCard}>
                <View style={styles.metaRow}>
                <Text style={styles.sectionMini}>{aiUi.captions}</Text>
                  <Text style={styles.auditScore}>{failureResult.captions.score}/100</Text>
                </View>
                <Text style={styles.bodyStrong}>{failureResult.captions.verdict}</Text>
                <Text style={styles.body}>Issue: {failureResult.captions.issue}</Text>
                <Text style={styles.body}>Fix: {failureResult.captions.fix}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.quickWins}</Text>
                {failureResult.quickWins.map((item) => (
                  <View key={item} style={styles.reasonRow}>
                    <View style={styles.dot} />
                    <Text style={styles.body}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.nextMove}</Text>
                <Text style={styles.body}>{failureResult.nextMove}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "trends" ? (
        <View style={styles.panel}>
          <SectionTitle
            title={aiUi.trendsTitle}
            subtitle={aiUi.trendsSubtitle}
          />

          {!isPremiumUnlocked ? (
            <View style={styles.lockCard}>
              <Text style={styles.lockTitle}>{aiUi.premiumFeatureTitle}</Text>
              <Text style={styles.body}>{aiUi.premiumFeatureBody}</Text>
              <PrimaryButton label={aiUi.unlockPremium} onPress={() => navigation.navigate("Subscription")} />
            </View>
          ) : null}

          <Text style={styles.inlineLabel}>{aiUi.trendingNow}</Text>
          <View style={styles.trendList}>
            {trendFeed.map((trend) => {
              const selected = selectedTrendId === trend.id;
              return (
                <Pressable key={trend.id} onPress={() => setSelectedTrendId(trend.id)} style={[styles.trendCard, selected ? styles.trendCardActive : null]}>
                  <Image resizeMode="cover" source={{ uri: trend.thumbnailUrl }} style={styles.trendThumb} />
                  <View style={styles.trendContent}>
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>{trend.niche}</Text>
                      <Text style={styles.meta}>{trend.momentumScore}% {aiUi.momentum}</Text>
                    </View>
                    <View style={[styles.trendScopeBadge, trend.scope === "local" ? styles.trendScopeBadgeLocal : null]}>
                      <Text style={[styles.trendScopeLabel, trend.scope === "local" ? styles.trendScopeLabelLocal : null]}>
                        {trend.scope === "local" ? `${regionInfo.flag} ${copy.trendLocal} · ${regionInfo.name}` : `🌍 ${copy.trendGlobal}`}
                      </Text>
                    </View>
                    <Text style={styles.trendTitle}>{trend.title}</Text>
                    <Text style={styles.body}>
                      {trend.reelCount !== undefined
                        ? copy.trendStats
                            .replace("{reels}", String(trend.reelCount))
                            .replace("{posts}", String(trend.postCount ?? 0))
                            .replace("{creators}", String(trend.creatorCount ?? 0))
                            .replace("{days}", String(trend.windowDays ?? 14))
                        : trend.trendHook}
                    </Text>
                    <Text style={styles.trendMeta}>{aiUi.musicStyle}: {trend.musicStyle}</Text>
                    <Text style={styles.trendMeta}>{aiUi.motionStyle}: {trend.motionStyle}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <InputField label={aiUi.yourGoal} multiline onChangeText={setTrendGoal} value={trendGoal} />
          <InputField label={aiUi.yourOffer} onChangeText={setTrendOffer} value={trendOffer} />
          <InputField label={aiUi.targetAudience} onChangeText={setTrendAudience} value={trendAudience} />
          <PrimaryButton
            label={trendLoading ? aiUi.buildingTrendRemix : aiUi.useThisTrend}
            onPress={handleUseTrend}
            disabled={trendLoading || !selectedTrendId}
          />

          {trendResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={aiUi.liveRemix} right={`${trendResult.trend.title} | ${formatTime(trendResult.createdAt)}`} />
                <Text style={styles.title}>{trendResult.trend.title}</Text>
                <Text style={styles.bodyStrong}>{trendResult.angle}</Text>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>{aiUi.musicVibe}</Text>
                  <Text style={styles.body}>{trendResult.musicStyle}</Text>
                </View>
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>{aiUi.similarVideoPrompt}</Text>
                  <Text style={styles.body}>{trendResult.similarVideoPrompt}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.optimizedCaptions}</Text>
                {trendResult.optimizedCaptions.map((caption) => (
                  <View key={caption} style={styles.block}>
                    <Text style={styles.body}>{caption}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <MetaRow left={aiUi.liveRender} right={`${trendResult.video.model} | ${trendResult.video.seconds}s | ${trendResult.video.size}`} />
                <Text style={styles.sectionMini}>{aiUi.trendVideoJob}</Text>
                <Text style={styles.bodyStrong}>{aiUi.statusLabel}: {trendResult.video.status.replace("_", " ")}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${trendResult.video.progress}%` }]} />
                </View>
                <Text style={styles.bodyStrong}>{trendResult.video.progress}% {aiUi.complete}</Text>
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
            title={aiUi.avatarTitle}
            subtitle={aiUi.avatarSubtitle}
          />

          {PAYMENTS_ENABLED ? (
            <View style={styles.pricing}>
              <View style={styles.priceCard}>
                <Text style={styles.priceValue}>$2/avatar</Text>
                <Text style={styles.priceLabel}>{aiUi.payPerAvatar}</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceValue}>{aiUi.premiumPlan}</Text>
                <Text style={styles.priceLabel}>{aiUi.subscriptionPlan}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.avatarUploadCard}>
            <Text style={styles.sectionMini}>{aiUi.sourcePhoto}</Text>
            {avatarSourcePreview ? (
              <Image resizeMode="cover" source={{ uri: avatarSourcePreview }} style={styles.avatarSourceImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.body}>{aiUi.sourcePhotoBody}</Text>
              </View>
            )}
            <PrimaryButton label={avatarSourcePreview ? aiUi.changePhoto : aiUi.uploadPhoto} onPress={handlePickAvatarPhoto} variant={avatarSourcePreview ? "ghost" : "solid"} />
          </View>

          <InputField label={aiUi.avatarMessage} multiline onChangeText={setAvatarMessage} value={avatarMessage} />
          <InputField label={aiUi.niche} onChangeText={setAvatarNiche} value={avatarNiche} />

          <Text style={styles.inlineLabel}>{aiUi.talkingAvatarFormat}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSizes.map((size) => (
              <Chip key={size} label={size} active={avatarSize === size} onPress={() => setAvatarSize(size)} />
            ))}
          </ScrollView>

          <Text style={styles.inlineLabel}>{aiUi.talkingAvatarDuration}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSeconds.map((seconds) => (
              <Chip key={seconds} label={`${seconds}s`} active={avatarDuration === seconds} onPress={() => setAvatarDuration(seconds)} />
            ))}
          </ScrollView>

          <View style={styles.row}>
            <Chip label={aiUi.speed} active={avatarQuality === "speed"} onPress={() => setAvatarQuality("speed")} />
            <Chip label={aiUi.quality} active={avatarQuality === "quality"} onPress={() => setAvatarQuality("quality")} />
          </View>

          <PrimaryButton
            label={avatarLoading ? aiUi.creatingAvatarPackage : aiUi.createAvatarPackage}
            onPress={handleCreateAvatar}
            disabled={avatarLoading || !avatarSourceDataUrl}
          />

          {avatarResult ? (
            <>
              <View style={styles.card}>
                <MetaRow left={aiUi.liveAvatar} right={formatTime(avatarResult.createdAt)} />
                <Text style={styles.title}>{aiUi.avatarMonetization}</Text>
                {avatarResult.monetization.payPerAvatarLabel ? (
                  <View style={styles.block}>
                    <Text style={styles.blockLabel}>{aiUi.payPerAvatar}</Text>
                    <Text style={styles.body}>{avatarResult.monetization.payPerAvatarLabel}</Text>
                  </View>
                ) : null}
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>{aiUi.premiumPlanLabel}</Text>
                  <Text style={styles.body}>{avatarResult.monetization.premiumLabel}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionMini}>{aiUi.avatarStyles}</Text>
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
                <MetaRow left={aiUi.liveAvatar} right={`${avatarResult.talkingAvatar.model} | ${avatarResult.talkingAvatar.seconds}s | ${avatarResult.talkingAvatar.size}`} />
                <Text style={styles.sectionMini}>{aiUi.talkingAvatarVideo}</Text>
                <Text style={styles.bodyStrong}>{aiUi.statusLabel}: {avatarResult.talkingAvatar.status.replace("_", " ")}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${avatarResult.talkingAvatar.progress}%` }]} />
                </View>
                <Text style={styles.bodyStrong}>{avatarResult.talkingAvatar.progress}% {aiUi.complete}</Text>
                {avatarResult.talkingAvatar.thumbnailDataUrl ? <Image resizeMode="cover" source={{ uri: avatarResult.talkingAvatar.thumbnailDataUrl }} style={styles.image} /> : null}
                <Text style={styles.body}>{avatarResult.talkingAvatar.note ?? avatarResult.talkingAvatar.prompt}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {toolTab === "text" ? (
        <View style={styles.panel}>
          <SectionTitle title={aiUi.textTitle} subtitle={aiUi.textSubtitle} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {localizedTextModes.map((mode) => (
              <Chip key={mode.value} label={mode.label} active={textMode === mode.value} onPress={() => setTextMode(mode.value)} />
            ))}
          </ScrollView>
          <InputField label={aiUi.prompt} multiline onChangeText={setTextPrompt} value={textPrompt} />
          <InputField label={aiUi.tone} onChangeText={setTextTone} value={textTone} />
          <InputField label={aiUi.audience} onChangeText={setTextAudience} value={textAudience} />
          <InputField label={aiUi.goal} onChangeText={setTextGoal} value={textGoal} />
          <PrimaryButton
            label={textLoading ? aiUi.generating : aiUi.generateText}
            onPress={handleGenerateText}
            disabled={textLoading}
          />
          {textResult ? (
            <View style={styles.card}>
              <MetaRow left={aiUi.liveAi} right={`${textResult.model} | ${formatTime(textResult.createdAt)}`} />
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
          <SectionTitle title={aiUi.imageTitle} subtitle={aiUi.imageSubtitle} />
          <InputField label={aiUi.prompt} multiline onChangeText={setImagePrompt} value={imagePrompt} />
          <InputField label={aiUi.style} onChangeText={setImageStyle} value={imageStyle} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {aspectRatios.map((ratio) => (
              <Chip key={ratio} label={ratio} active={imageAspectRatio === ratio} onPress={() => setImageAspectRatio(ratio)} />
            ))}
          </ScrollView>
          <PrimaryButton
            label={imageLoading ? aiUi.generating : aiUi.generateImage}
            onPress={handleGenerateImage}
            disabled={imageLoading}
          />
          {imageResult ? (
            <View style={styles.card}>
              <MetaRow left={aiUi.liveAi} right={`${imageResult.model} | ${formatTime(imageResult.createdAt)}`} />
              <Image resizeMode="cover" source={{ uri: imageResult.imageDataUrl }} style={styles.image} />
              <Text style={styles.body}>{imageResult.revisedPrompt ?? imageResult.prompt}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {toolTab === "video" ? (
        <View style={styles.panel}>
          <SectionTitle title={aiUi.videoTitle} subtitle={aiUi.videoSubtitle} />
          <InputField label={aiUi.scenePrompt} multiline onChangeText={setVideoPrompt} value={videoPrompt} />
          <InputField label={aiUi.style} onChangeText={setVideoStyle} value={videoStyle} />
          <InputField label={aiUi.shotDirection} onChangeText={setVideoShotType} value={videoShotType} />
          <Text style={styles.inlineLabel}>{aiUi.formatLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSizes.map((size) => (
              <Chip key={size} label={size} active={videoSize === size} onPress={() => setVideoSize(size)} />
            ))}
          </ScrollView>
          <Text style={styles.inlineLabel}>{aiUi.durationLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {videoSeconds.map((seconds) => (
              <Chip key={seconds} label={`${seconds}s`} active={videoDuration === seconds} onPress={() => setVideoDuration(seconds)} />
            ))}
          </ScrollView>
          <View style={styles.row}>
            <Chip label={aiUi.speed} active={videoQuality === "speed"} onPress={() => setVideoQuality("speed")} />
            <Chip label={aiUi.quality} active={videoQuality === "quality"} onPress={() => setVideoQuality("quality")} />
          </View>
          <PrimaryButton
            label={videoLoading ? aiUi.starting : aiUi.startVideoJob}
            onPress={handleGenerateVideo}
            disabled={videoLoading}
          />
          {videoJob ? (
            <View style={styles.card}>
              <MetaRow left={aiUi.liveAi} right={`${videoJob.model} | ${videoJob.seconds}s | ${videoJob.size}`} />
              <Text style={styles.title}>{aiUi.jobStatus}: {videoJob.status.replace("_", " ")}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${videoJob.progress}%` }]} />
              </View>
              <Text style={styles.bodyStrong}>{videoJob.progress}% {aiUi.complete}</Text>
              {videoJob.thumbnailDataUrl ? <Image resizeMode="cover" source={{ uri: videoJob.thumbnailDataUrl }} style={styles.image} /> : null}
              <Text style={styles.body}>{videoJob.note ?? videoJob.prompt}</Text>
              {videoJob.error ? <Text style={styles.error}>{videoJob.error}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {toolTab === "engine" && engineResult ? (
        <View style={styles.card}>
          <MetaRow left={aiUi.liveRender} right={`${engineResult.video.model} | ${engineResult.video.seconds}s | ${engineResult.video.size}`} />
          <Text style={styles.sectionMini}>{aiUi.videoJob}</Text>
          <Text style={styles.bodyStrong}>{aiUi.statusLabel}: {engineResult.video.status.replace("_", " ")}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${engineResult.video.progress}%` }]} />
          </View>
          <Text style={styles.bodyStrong}>{engineResult.video.progress}% {aiUi.complete}</Text>
          {engineResult.video.thumbnailDataUrl ? <Image resizeMode="cover" source={{ uri: engineResult.video.thumbnailDataUrl }} style={styles.image} /> : null}
          <Text style={styles.body}>{engineResult.video.note ?? engineResult.video.prompt}</Text>
          <Text style={styles.sectionMini}>{aiUi.whyThisCanPop}</Text>
          {engineResult.insights.reasons.map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <View style={styles.dot} />
              <Text style={styles.body}>{reason}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>{aiUi.productionNote}</Text>
        <Text style={styles.body}>
          {isAiOffline
            ? aiUi.productionOfflineBody
            : aiUi.productionLiveBody}
        </Text>
        {PAYMENTS_ENABLED ? (
          <PrimaryButton label={copy.subscription} onPress={() => navigation.navigate("Subscription")} variant="ghost" />
        ) : null}
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

function OfflineNotice({ title, body }: { title: string; body: string }) {
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

const styles = createThemedStyles({
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
  trendScopeBadge: {
    alignSelf: "flex-start",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  trendScopeBadgeLocal: { backgroundColor: palette.primary },
  trendScopeLabel: { color: palette.muted, fontSize: 11, fontWeight: "800" },
  trendScopeLabelLocal: { color: "#04110b" },
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
