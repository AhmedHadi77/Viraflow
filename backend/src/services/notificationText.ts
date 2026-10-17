// Push notification text in the recipient's language. The in-app list is translated on the phone;
// this covers the banner shown on the lock screen, which the server sends.

type Templates = Record<string, string>;

const TEMPLATES: Record<string, Templates> = {
  "en": {
    "fsLikedPost": "{name} liked your post",
    "fsLikedReel": "{name} liked your reel",
    "fsLiked": "{name} liked your content",
    "fsCommentedPost": "{name} commented on your post",
    "fsCommentedReel": "{name} commented on your reel",
    "fsViewedStory": "{name} viewed your story",
    "fsMentioned": "{name} mentioned you",
    "fsFollowed": "{name} started following you",
    "fsMessaged": "{name} sent you a message",
    "fsMarketMessage": "{name} sent you a marketplace message",
    "fsOrder": "{name} placed an order",
    "fsReposted": "{name} shared your reel",
    "fsSaved": "{name} saved your post",
    "fsCalling": "{name} is calling you",
    "fsVideoCalling": "{name} is video calling you",
    "fsCalled": "{name} called you",
    "fsTapToAnswer": "Tap to answer"
  },
  "ar": {
    "fsLikedPost": "أعجب {name} بمنشورك",
    "fsLikedReel": "أعجب {name} بالريل الخاص بك",
    "fsLiked": "أعجب {name} بمحتواك",
    "fsCommentedPost": "علّق {name} على منشورك",
    "fsCommentedReel": "علّق {name} على الريل الخاص بك",
    "fsViewedStory": "شاهد {name} قصتك",
    "fsMentioned": "أشار إليك {name}",
    "fsFollowed": "بدأ {name} بمتابعتك",
    "fsMessaged": "أرسل إليك {name} رسالة",
    "fsMarketMessage": "أرسل إليك {name} رسالة في السوق",
    "fsOrder": "قدّم {name} طلباً",
    "fsReposted": "شارك {name} الريل الخاص بك",
    "fsSaved": "حفظ {name} منشورك",
    "fsCalling": "{name} يتصل بك",
    "fsVideoCalling": "{name} يتصل بك بالفيديو",
    "fsCalled": "اتصل بك {name}",
    "fsTapToAnswer": "اضغط للرد"
  },
  "fr": {
    "fsLikedPost": "{name} a aimé votre publication",
    "fsLikedReel": "{name} a aimé votre reel",
    "fsLiked": "{name} a aimé votre contenu",
    "fsCommentedPost": "{name} a commenté votre publication",
    "fsCommentedReel": "{name} a commenté votre reel",
    "fsViewedStory": "{name} a vu votre story",
    "fsMentioned": "{name} vous a mentionné",
    "fsFollowed": "{name} a commencé à vous suivre",
    "fsMessaged": "{name} vous a envoyé un message",
    "fsMarketMessage": "{name} vous a écrit au sujet d'une annonce",
    "fsOrder": "{name} a passé une commande",
    "fsReposted": "{name} a partagé votre reel",
    "fsSaved": "{name} a enregistré votre publication",
    "fsCalling": "{name} vous appelle",
    "fsVideoCalling": "{name} vous appelle en vidéo",
    "fsCalled": "{name} vous a appelé",
    "fsTapToAnswer": "Touchez pour répondre"
  },
  "es": {
    "fsLikedPost": "A {name} le gustó tu publicación",
    "fsLikedReel": "A {name} le gustó tu reel",
    "fsLiked": "A {name} le gustó tu contenido",
    "fsCommentedPost": "{name} comentó tu publicación",
    "fsCommentedReel": "{name} comentó tu reel",
    "fsViewedStory": "{name} vio tu historia",
    "fsMentioned": "{name} te mencionó",
    "fsFollowed": "{name} empezó a seguirte",
    "fsMessaged": "{name} te envió un mensaje",
    "fsMarketMessage": "{name} te escribió sobre un anuncio",
    "fsOrder": "{name} hizo un pedido",
    "fsReposted": "{name} compartió tu reel",
    "fsSaved": "{name} guardó tu publicación",
    "fsCalling": "{name} te está llamando",
    "fsVideoCalling": "{name} te está haciendo una videollamada",
    "fsCalled": "{name} te llamó",
    "fsTapToAnswer": "Toca para responder"
  },
  "pt": {
    "fsLikedPost": "{name} curtiu seu post",
    "fsLikedReel": "{name} curtiu seu reel",
    "fsLiked": "{name} curtiu seu conteúdo",
    "fsCommentedPost": "{name} comentou no seu post",
    "fsCommentedReel": "{name} comentou no seu reel",
    "fsViewedStory": "{name} viu seu story",
    "fsMentioned": "{name} mencionou você",
    "fsFollowed": "{name} começou a seguir você",
    "fsMessaged": "{name} enviou uma mensagem",
    "fsMarketMessage": "{name} enviou uma mensagem sobre um anúncio",
    "fsOrder": "{name} fez um pedido",
    "fsReposted": "{name} compartilhou seu reel",
    "fsSaved": "{name} salvou seu post",
    "fsCalling": "{name} está ligando para você",
    "fsVideoCalling": "{name} está fazendo uma chamada de vídeo",
    "fsCalled": "{name} ligou para você",
    "fsTapToAnswer": "Toque para atender"
  },
  "de": {
    "fsLikedPost": "{name} gefällt dein Beitrag",
    "fsLikedReel": "{name} gefällt dein Reel",
    "fsLiked": "{name} gefällt dein Inhalt",
    "fsCommentedPost": "{name} hat deinen Beitrag kommentiert",
    "fsCommentedReel": "{name} hat dein Reel kommentiert",
    "fsViewedStory": "{name} hat deine Story angesehen",
    "fsMentioned": "{name} hat dich erwähnt",
    "fsFollowed": "{name} folgt dir jetzt",
    "fsMessaged": "{name} hat dir eine Nachricht gesendet",
    "fsMarketMessage": "{name} hat dir zu einer Anzeige geschrieben",
    "fsOrder": "{name} hat eine Bestellung aufgegeben",
    "fsReposted": "{name} hat dein Reel geteilt",
    "fsSaved": "{name} hat deinen Beitrag gespeichert",
    "fsCalling": "{name} ruft dich an",
    "fsVideoCalling": "{name} ruft dich per Video an",
    "fsCalled": "{name} hat dich angerufen",
    "fsTapToAnswer": "Tippen zum Annehmen"
  },
  "tr": {
    "fsLikedPost": "{name} gönderini beğendi",
    "fsLikedReel": "{name} reelini beğendi",
    "fsLiked": "{name} içeriğini beğendi",
    "fsCommentedPost": "{name} gönderine yorum yaptı",
    "fsCommentedReel": "{name} reeline yorum yaptı",
    "fsViewedStory": "{name} hikâyeni gördü",
    "fsMentioned": "{name} senden bahsetti",
    "fsFollowed": "{name} seni takip etmeye başladı",
    "fsMessaged": "{name} sana mesaj gönderdi",
    "fsMarketMessage": "{name} bir ilan hakkında sana yazdı",
    "fsOrder": "{name} sipariş verdi",
    "fsReposted": "{name} reelini paylaştı",
    "fsSaved": "{name} gönderini kaydetti",
    "fsCalling": "{name} seni arıyor",
    "fsVideoCalling": "{name} seni görüntülü arıyor",
    "fsCalled": "{name} seni aradı",
    "fsTapToAnswer": "Yanıtlamak için dokun"
  },
  "ru": {
    "fsLikedPost": "{name} нравится ваш пост",
    "fsLikedReel": "{name} нравится ваш рилс",
    "fsLiked": "{name} нравится ваш контент",
    "fsCommentedPost": "{name} прокомментировал(а) ваш пост",
    "fsCommentedReel": "{name} прокомментировал(а) ваш рилс",
    "fsViewedStory": "{name} посмотрел(а) вашу историю",
    "fsMentioned": "{name} упомянул(а) вас",
    "fsFollowed": "{name} подписался(-ась) на вас",
    "fsMessaged": "{name} отправил(а) вам сообщение",
    "fsMarketMessage": "{name} написал(а) вам по объявлению",
    "fsOrder": "{name} оформил(а) заказ",
    "fsReposted": "{name} поделился(-ась) вашим рилсом",
    "fsSaved": "{name} сохранил(а) ваш пост",
    "fsCalling": "{name} звонит вам",
    "fsVideoCalling": "{name} звонит вам по видео",
    "fsCalled": "{name} звонил(а) вам",
    "fsTapToAnswer": "Нажмите, чтобы ответить"
  },
  "hi": {
    "fsLikedPost": "{name} ने आपकी पोस्ट लाइक की",
    "fsLikedReel": "{name} ने आपकी रील लाइक की",
    "fsLiked": "{name} ने आपका कंटेंट लाइक किया",
    "fsCommentedPost": "{name} ने आपकी पोस्ट पर कमेंट किया",
    "fsCommentedReel": "{name} ने आपकी रील पर कमेंट किया",
    "fsViewedStory": "{name} ने आपकी स्टोरी देखी",
    "fsMentioned": "{name} ने आपको मेंशन किया",
    "fsFollowed": "{name} ने आपको फ़ॉलो करना शुरू किया",
    "fsMessaged": "{name} ने आपको मैसेज भेजा",
    "fsMarketMessage": "{name} ने लिस्टिंग के बारे में मैसेज भेजा",
    "fsOrder": "{name} ने ऑर्डर दिया",
    "fsReposted": "{name} ने आपकी रील शेयर की",
    "fsSaved": "{name} ने आपकी पोस्ट सेव की",
    "fsCalling": "{name} आपको कॉल कर रहे हैं",
    "fsVideoCalling": "{name} आपको वीडियो कॉल कर रहे हैं",
    "fsCalled": "{name} ने आपको कॉल किया",
    "fsTapToAnswer": "जवाब देने के लिए टैप करें"
  },
  "ur": {
    "fsLikedPost": "{name} نے آپ کی پوسٹ پسند کی",
    "fsLikedReel": "{name} نے آپ کی ریل پسند کی",
    "fsLiked": "{name} نے آپ کا مواد پسند کیا",
    "fsCommentedPost": "{name} نے آپ کی پوسٹ پر تبصرہ کیا",
    "fsCommentedReel": "{name} نے آپ کی ریل پر تبصرہ کیا",
    "fsViewedStory": "{name} نے آپ کی اسٹوری دیکھی",
    "fsMentioned": "{name} نے آپ کا ذکر کیا",
    "fsFollowed": "{name} نے آپ کو فالو کرنا شروع کیا",
    "fsMessaged": "{name} نے آپ کو پیغام بھیجا",
    "fsMarketMessage": "{name} نے لسٹنگ کے بارے میں پیغام بھیجا",
    "fsOrder": "{name} نے آرڈر دیا",
    "fsReposted": "{name} نے آپ کی ریل شیئر کی",
    "fsSaved": "{name} نے آپ کی پوسٹ محفوظ کی",
    "fsCalling": "{name} آپ کو کال کر رہے ہیں",
    "fsVideoCalling": "{name} آپ کو ویڈیو کال کر رہے ہیں",
    "fsCalled": "{name} نے آپ کو کال کی",
    "fsTapToAnswer": "جواب دینے کے لیے ٹیپ کریں"
  },
  "ms": {
    "fsLikedPost": "{name} menyukai hantaran anda",
    "fsLikedReel": "{name} menyukai reel anda",
    "fsLiked": "{name} menyukai kandungan anda",
    "fsCommentedPost": "{name} mengulas hantaran anda",
    "fsCommentedReel": "{name} mengulas reel anda",
    "fsViewedStory": "{name} melihat cerita anda",
    "fsMentioned": "{name} menyebut anda",
    "fsFollowed": "{name} mula mengikuti anda",
    "fsMessaged": "{name} menghantar mesej kepada anda",
    "fsMarketMessage": "{name} menghantar mesej tentang senarai jualan",
    "fsOrder": "{name} membuat pesanan",
    "fsReposted": "{name} berkongsi reel anda",
    "fsSaved": "{name} menyimpan hantaran anda",
    "fsCalling": "{name} sedang memanggil anda",
    "fsVideoCalling": "{name} membuat panggilan video kepada anda",
    "fsCalled": "{name} telah memanggil anda",
    "fsTapToAnswer": "Ketik untuk menjawab"
  },
  "id": {
    "fsLikedPost": "{name} menyukai postingan kamu",
    "fsLikedReel": "{name} menyukai reel kamu",
    "fsLiked": "{name} menyukai konten kamu",
    "fsCommentedPost": "{name} mengomentari postingan kamu",
    "fsCommentedReel": "{name} mengomentari reel kamu",
    "fsViewedStory": "{name} melihat cerita kamu",
    "fsMentioned": "{name} menyebut kamu",
    "fsFollowed": "{name} mulai mengikuti kamu",
    "fsMessaged": "{name} mengirimi kamu pesan",
    "fsMarketMessage": "{name} mengirim pesan tentang iklan",
    "fsOrder": "{name} membuat pesanan",
    "fsReposted": "{name} membagikan reel kamu",
    "fsSaved": "{name} menyimpan postingan kamu",
    "fsCalling": "{name} sedang menelepon kamu",
    "fsVideoCalling": "{name} melakukan panggilan video",
    "fsCalled": "{name} menelepon kamu",
    "fsTapToAnswer": "Ketuk untuk menjawab"
  },
  "zh": {
    "fsLikedPost": "{name} 赞了你的帖子",
    "fsLikedReel": "{name} 赞了你的短视频",
    "fsLiked": "{name} 赞了你的内容",
    "fsCommentedPost": "{name} 评论了你的帖子",
    "fsCommentedReel": "{name} 评论了你的短视频",
    "fsViewedStory": "{name} 看了你的快拍",
    "fsMentioned": "{name} 提到了你",
    "fsFollowed": "{name} 关注了你",
    "fsMessaged": "{name} 给你发了消息",
    "fsMarketMessage": "{name} 就商品给你发了消息",
    "fsOrder": "{name} 下了订单",
    "fsReposted": "{name} 分享了你的短视频",
    "fsSaved": "{name} 收藏了你的帖子",
    "fsCalling": "{name} 正在呼叫你",
    "fsVideoCalling": "{name} 邀请你视频通话",
    "fsCalled": "{name} 给你打过电话",
    "fsTapToAnswer": "点按接听"
  },
  "ja": {
    "fsLikedPost": "{name}さんがあなたの投稿にいいねしました",
    "fsLikedReel": "{name}さんがあなたのリールにいいねしました",
    "fsLiked": "{name}さんがあなたのコンテンツにいいねしました",
    "fsCommentedPost": "{name}さんがあなたの投稿にコメントしました",
    "fsCommentedReel": "{name}さんがあなたのリールにコメントしました",
    "fsViewedStory": "{name}さんがあなたのストーリーを見ました",
    "fsMentioned": "{name}さんがあなたをメンションしました",
    "fsFollowed": "{name}さんがあなたをフォローしました",
    "fsMessaged": "{name}さんからメッセージが届きました",
    "fsMarketMessage": "{name}さんから出品についてメッセージが届きました",
    "fsOrder": "{name}さんが注文しました",
    "fsReposted": "{name}さんがあなたのリールをシェアしました",
    "fsSaved": "{name}さんがあなたの投稿を保存しました",
    "fsCalling": "{name}さんから着信",
    "fsVideoCalling": "{name}さんからビデオ通話の着信",
    "fsCalled": "{name}さんから着信がありました",
    "fsTapToAnswer": "タップして応答"
  }
};

function fill(template: string, name: string) {
  return template.replace("{name}", name);
}

export interface PushTextInput {
  type: string;
  actorName?: string;
  entityType?: string;
  conversationType?: string;
  title: string;
  body: string;
}

/** Returns the push title/body for this notification in the given app language (falls back to what was sent). */
export function localizePushText(input: PushTextInput, language: string | undefined) {
  const t = TEMPLATES[language ?? "en"] ?? TEMPLATES.en;
  const name = input.actorName?.trim() || "Sohba";
  const isReel = input.entityType === "reel";
  const keyByType: Record<string, string | undefined> = {
    post_like: "fsLikedPost",
    reel_like: "fsLikedReel",
    like: isReel ? "fsLikedReel" : "fsLikedPost",
    post_comment: "fsCommentedPost",
    reel_comment: "fsCommentedReel",
    comment: isReel ? "fsCommentedReel" : "fsCommentedPost",
    story_view: "fsViewedStory",
    mention: "fsMentioned",
    follow: "fsFollowed",
    message: input.conversationType === "marketplace" ? "fsMarketMessage" : "fsMessaged",
    order: "fsOrder",
    repost: "fsReposted",
    save: "fsSaved",
    call: "fsCalling",
  };
  const key = keyByType[input.type];
  if (!key || !t[key]) {
    return { title: input.title, body: input.body };
  }
  const title = fill(t[key], name);
  // Comments, messages, mentions and orders keep the text the person wrote; fixed English filler is dropped.
  const keepsBody = ["post_comment", "reel_comment", "comment", "message", "mention", "order"].includes(input.type);
  const body = input.type === "call" ? t.fsTapToAnswer : keepsBody ? input.body : "";
  return { title, body };
}
