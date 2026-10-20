import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "../components/Screen";
import { AdminBroadcastPanel, AdminCallsPanel, AdminOverviewPanel } from "./admin/AdminPanels";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { formatLocaleDate, formatRelativeTime } from "../utils/timeFormatting";
import { ContentReport, LanguageOption, Post, Reel, Story, User } from "../types/models";
import { palette, radii, shadows, spacing, createThemedStyles } from "../theme";

type AdminSection = "overview" | "users" | "posts" | "reels" | "reports" | "calls" | "broadcast";

function getAdminDashboardCopy(language: LanguageOption | null | undefined) {
  const base = {
    reportsTitle: "Reports",
    storiesTitle: "Stories",
    activeUsers: "Active users",
    reportedContent: "Reported content",
    userStatusFailed: "This user status could not be updated right now.",
    bannedTitle: "User banned",
    bannedBody: "This account can no longer use moderated areas of the app.",
    unbannedTitle: "User unbanned",
    unbannedBody: "This account can use the app again.",
    deleteReportedPostTitle: "Delete reported post",
    deleteReportedPostBody: "Remove this harmful post from the app?",
    deleteReportedReelTitle: "Delete reported reel",
    deleteReportedReelBody: "Remove this harmful reel from the app?",
    deleteReportedStoryTitle: "Delete reported story",
    deleteReportedStoryBody: "Remove this harmful story from the app?",
    adminRole: "Admin",
    memberRole: "Member",
    bannedRole: "Banned",
    followersLabel: "followers",
    viewProfile: "View profile",
    ban: "Ban",
    unban: "Unban",
    untitledPost: "Untitled post",
    untitledReel: "Untitled reel",
    unknownAuthor: "Unknown author",
    unknownCreator: "Unknown creator",
    unknownUser: "Unknown user",
    noHashtags: "No hashtags",
    likesLabel: "likes",
    commentsLabel: "comments",
    openPost: "Open post",
    openReel: "Open reel",
    deleteHarmful: "Delete harmful",
    deletePostTitle: "Delete post",
    deletePostBody: "Remove this post from the platform?",
    deleteReelTitle: "Delete reel",
    deleteReelBody: "Remove this reel from the platform?",
    reportedBy: "Reported by",
    targetOwner: "Target owner",
    viewTarget: "View target",
    markReviewed: "Mark reviewed",
    resolve: "Resolve",
    banOwner: "Ban owner",
    unbanOwner: "Unban owner",
    banUser: "Ban user",
    unbanUser: "Unban user",
    reportedPost: "Reported post",
    reportedReel: "Reported reel",
    reportedStory: "Reported story",
    reportedUser: "Reported user",
    userProfileReport: "User profile report for",
    noRecentActivity: "No recent activity",
    activeWithinHour: "Active in the last hour",
    activeAgoHours: "Active {count}h ago",
    activeAgoDays: "Active {count}d ago",
    openStatus: "Open",
    reviewedStatus: "Reviewed",
    resolvedStatus: "Resolved",
    postEntity: "Post",
    reelEntity: "Reel",
    storyEntity: "Story",
    userEntity: "User",
  } as const;

  if (language === "ar") {
    return {
      ...base,
      reportsTitle: "البلاغات",
      storiesTitle: "القصص",
      activeUsers: "المستخدمون النشطون",
      reportedContent: "المحتوى المبلغ عنه",
      userStatusFailed: "تعذر تحديث حالة هذا المستخدم الآن.",
      bannedTitle: "تم حظر المستخدم",
      bannedBody: "لا يمكن لهذا الحساب استخدام المناطق الخاضعة للإشراف الآن.",
      unbannedTitle: "تم إلغاء الحظر",
      unbannedBody: "يمكن لهذا الحساب استخدام التطبيق مرة أخرى.",
      deleteReportedPostTitle: "حذف المنشور المبلغ عنه",
      deleteReportedPostBody: "إزالة هذا المنشور الضار من التطبيق؟",
      deleteReportedReelTitle: "حذف الريل المبلغ عنه",
      deleteReportedReelBody: "إزالة هذا الريل الضار من التطبيق؟",
      deleteReportedStoryTitle: "حذف القصة المبلغ عنها",
      deleteReportedStoryBody: "إزالة هذه القصة الضارة من التطبيق؟",
      adminRole: "مشرف",
      memberRole: "عضو",
      bannedRole: "محظور",
      followersLabel: "متابع",
      viewProfile: "عرض الملف",
      ban: "حظر",
      unban: "إلغاء الحظر",
      untitledPost: "منشور بدون عنوان",
      untitledReel: "ريل بدون عنوان",
      unknownAuthor: "كاتب غير معروف",
      unknownCreator: "منشئ غير معروف",
      unknownUser: "مستخدم غير معروف",
      noHashtags: "لا توجد وسوم",
      likesLabel: "إعجاب",
      commentsLabel: "تعليق",
      openPost: "فتح المنشور",
      openReel: "فتح الريل",
      deleteHarmful: "حذف المحتوى الضار",
      deletePostTitle: "حذف المنشور",
      deletePostBody: "إزالة هذا المنشور من المنصة؟",
      deleteReelTitle: "حذف الريل",
      deleteReelBody: "إزالة هذا الريل من المنصة؟",
      reportedBy: "تم التبليغ بواسطة",
      targetOwner: "صاحب المحتوى",
      viewTarget: "عرض الهدف",
      markReviewed: "تمت المراجعة",
      resolve: "حل البلاغ",
      banOwner: "حظر المالك",
      unbanOwner: "إلغاء حظر المالك",
      banUser: "حظر المستخدم",
      unbanUser: "إلغاء حظر المستخدم",
      reportedPost: "منشور مبلغ عنه",
      reportedReel: "ريل مبلغ عنه",
      reportedStory: "قصة مبلغ عنها",
      reportedUser: "مستخدم مبلغ عنه",
      userProfileReport: "بلاغ ملف المستخدم",
      noRecentActivity: "لا يوجد نشاط حديث",
      activeWithinHour: "نشط خلال الساعة الماضية",
      activeAgoHours: "نشط قبل {count} س",
      activeAgoDays: "نشط قبل {count} ي",
      openStatus: "مفتوح",
      reviewedStatus: "تمت مراجعته",
      resolvedStatus: "تم حله",
      postEntity: "منشور",
      reelEntity: "ريل",
      storyEntity: "قصة",
      userEntity: "مستخدم",
    };
  }

  if (language === "fr") {
    return {
      ...base,
      reportsTitle: "Signalements",
      storiesTitle: "Stories",
      activeUsers: "Utilisateurs actifs",
      reportedContent: "Contenu signale",
      userStatusFailed: "Le statut de cet utilisateur n'a pas pu etre mis a jour.",
      bannedTitle: "Utilisateur bloque",
      bannedBody: "Ce compte ne peut plus utiliser les zones moderees.",
      unbannedTitle: "Utilisateur debloque",
      unbannedBody: "Ce compte peut de nouveau utiliser l'application.",
      deleteReportedPostTitle: "Supprimer le post signale",
      deleteReportedPostBody: "Retirer ce post nuisible de l'application ?",
      deleteReportedReelTitle: "Supprimer le reel signale",
      deleteReportedReelBody: "Retirer ce reel nuisible de l'application ?",
      deleteReportedStoryTitle: "Supprimer la story signalee",
      deleteReportedStoryBody: "Retirer cette story nuisible de l'application ?",
      adminRole: "Admin",
      memberRole: "Membre",
      bannedRole: "Banni",
      followersLabel: "abonnes",
      viewProfile: "Voir le profil",
      ban: "Bannir",
      unban: "Debannir",
      untitledPost: "Post sans titre",
      untitledReel: "Reel sans titre",
      unknownAuthor: "Auteur inconnu",
      unknownCreator: "Createur inconnu",
      unknownUser: "Utilisateur inconnu",
      noHashtags: "Aucun hashtag",
      likesLabel: "likes",
      commentsLabel: "commentaires",
      openPost: "Ouvrir le post",
      openReel: "Ouvrir le reel",
      deleteHarmful: "Supprimer le contenu nuisible",
      deletePostTitle: "Supprimer le post",
      deletePostBody: "Retirer ce post de la plateforme ?",
      deleteReelTitle: "Supprimer le reel",
      deleteReelBody: "Retirer ce reel de la plateforme ?",
      reportedBy: "Signale par",
      targetOwner: "Proprietaire cible",
      viewTarget: "Voir la cible",
      markReviewed: "Marquer comme relu",
      resolve: "Resoudre",
      banOwner: "Bannir le proprietaire",
      unbanOwner: "Debannir le proprietaire",
      banUser: "Bannir l'utilisateur",
      unbanUser: "Debannir l'utilisateur",
      reportedPost: "Post signale",
      reportedReel: "Reel signale",
      reportedStory: "Story signalee",
      reportedUser: "Utilisateur signale",
      userProfileReport: "Signalement du profil de",
      noRecentActivity: "Aucune activite recente",
      activeWithinHour: "Actif dans la derniere heure",
      activeAgoHours: "Actif il y a {count} h",
      activeAgoDays: "Actif il y a {count} j",
      openStatus: "Ouvert",
      reviewedStatus: "Relu",
      resolvedStatus: "Resolu",
      postEntity: "Post",
      reelEntity: "Reel",
      storyEntity: "Story",
      userEntity: "Utilisateur",
    };
  }

  if (language === "es") {
    return {
      ...base,
      reportsTitle: "Reportes",
      storiesTitle: "Historias",
      activeUsers: "Usuarios activos",
      reportedContent: "Contenido reportado",
      userStatusFailed: "No se pudo actualizar el estado de este usuario.",
      bannedTitle: "Usuario bloqueado",
      bannedBody: "Esta cuenta ya no puede usar las zonas moderadas.",
      unbannedTitle: "Usuario desbloqueado",
      unbannedBody: "Esta cuenta puede volver a usar la aplicacion.",
      deleteReportedPostTitle: "Eliminar la publicacion reportada",
      deleteReportedPostBody: "Quitar esta publicacion perjudicial de la app?",
      deleteReportedReelTitle: "Eliminar el reel reportado",
      deleteReportedReelBody: "Quitar este reel perjudicial de la app?",
      deleteReportedStoryTitle: "Eliminar la historia reportada",
      deleteReportedStoryBody: "Quitar esta historia perjudicial de la app?",
      adminRole: "Admin",
      memberRole: "Miembro",
      bannedRole: "Bloqueado",
      followersLabel: "seguidores",
      viewProfile: "Ver perfil",
      ban: "Bloquear",
      unban: "Desbloquear",
      untitledPost: "Publicacion sin titulo",
      untitledReel: "Reel sin titulo",
      unknownAuthor: "Autor desconocido",
      unknownCreator: "Creador desconocido",
      unknownUser: "Usuario desconocido",
      noHashtags: "Sin hashtags",
      likesLabel: "me gusta",
      commentsLabel: "comentarios",
      openPost: "Abrir publicacion",
      openReel: "Abrir reel",
      deleteHarmful: "Eliminar contenido perjudicial",
      deletePostTitle: "Eliminar publicacion",
      deletePostBody: "Quitar esta publicacion de la plataforma?",
      deleteReelTitle: "Eliminar reel",
      deleteReelBody: "Quitar este reel de la plataforma?",
      reportedBy: "Reportado por",
      targetOwner: "Propietario objetivo",
      viewTarget: "Ver objetivo",
      markReviewed: "Marcar revisado",
      resolve: "Resolver",
      banOwner: "Bloquear propietario",
      unbanOwner: "Desbloquear propietario",
      banUser: "Bloquear usuario",
      unbanUser: "Desbloquear usuario",
      reportedPost: "Publicacion reportada",
      reportedReel: "Reel reportado",
      reportedStory: "Historia reportada",
      reportedUser: "Usuario reportado",
      userProfileReport: "Reporte del perfil de",
      noRecentActivity: "Sin actividad reciente",
      activeWithinHour: "Activo en la ultima hora",
      activeAgoHours: "Activo hace {count} h",
      activeAgoDays: "Activo hace {count} d",
      openStatus: "Abierto",
      reviewedStatus: "Revisado",
      resolvedStatus: "Resuelto",
      postEntity: "Publicacion",
      reelEntity: "Reel",
      storyEntity: "Historia",
      userEntity: "Usuario",
    };
  }

  return base;
}

export function AdminDashboardScreen({ navigation }: { navigation: any }) {
  const {
    language,
    currentUser,
    isAdmin,
    users,
    posts,
    reels,
    stories,
    reports,
    getUserById,
    getUserPresence,
    adminDeletePost,
    adminDeleteReel,
    adminDeleteStory,
    setUserBanStatus,
    updateReportStatus,
    isOwner,
    adminSetUserRole,
    adminDeleteUserAccount,
    refreshReports,
  } = useAppState();
  const [userQuery, setUserQuery] = useState("");
  const copy = getCopy(language);
  const adminCopy = getAdminDashboardCopy(language);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function handleRoleChange(user: User) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    setBusyUserId(user.id);
    const result = await adminSetUserRole(user.id, nextRole);
    setBusyUserId(null);
    Alert.alert(
      result.ok ? (nextRole === "admin" ? "Admin added" : "Admin removed") : "Not changed",
      result.ok ? `${user.name} is now ${nextRole === "admin" ? "an admin" : "a regular member"}.` : result.message
    );
  }

  function confirmDeleteAccount(user: User) {
    Alert.alert(
      "Delete account?",
      `This permanently deletes ${user.name}'s account, sign-in, posts, reels, stories, listings, chats and calls. It cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            setBusyUserId(user.id);
            const result = await adminDeleteUserAccount(user.id);
            setBusyUserId(null);
            Alert.alert(result.ok ? "Account deleted" : "Not deleted", result.ok ? `${user.name} was removed from Sohba.` : result.message);
          },
        },
      ]
    );
  }

  const sortedUsers = useMemo(
    () =>
      [...users]
        .filter((user) => {
          const query = userQuery.trim().toLowerCase().replace(/^@/, "");
          return !query || user.name.toLowerCase().includes(query) || user.username.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
        })
        .sort((left, right) => {
        const roleDelta = Number(right.role === "admin") - Number(left.role === "admin");
        if (roleDelta !== 0) {
          return roleDelta;
        }

        const banDelta = Number(Boolean(left.isBanned)) - Number(Boolean(right.isBanned));
        if (banDelta !== 0) {
          return banDelta;
        }

        return left.name.localeCompare(right.name);
      }),
    [users, userQuery]
  );

  const sortedPosts = useMemo(
    () => [...posts].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [posts]
  );
  const sortedReels = useMemo(
    () => [...reels].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [reels]
  );
  const sortedReports = useMemo(
    () =>
      [...reports].sort((left, right) => {
        const statusDelta = reportStatusRank(left.status) - reportStatusRank(right.status);
        if (statusDelta !== 0) {
          return statusDelta;
        }

        return right.createdAt.localeCompare(left.createdAt);
      }),
    [reports]
  );

  const activeUsersCount = useMemo(() => {
    const activeThreshold = Date.now() - 1000 * 60 * 60 * 24 * 30;
    return users.filter((user) => {
      const presence = getUserPresence(user.id);
      if (presence.isOnline) {
        return true;
      }

      const latestActivity = [
        presence.lastSeenAt,
        ...posts.filter((item) => item.userId === user.id).map((item) => item.createdAt),
        ...reels.filter((item) => item.userId === user.id).map((item) => item.createdAt),
        ...stories.filter((item) => item.userId === user.id).map((item) => item.createdAt),
      ]
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => right.localeCompare(left))[0];

      return latestActivity ? new Date(latestActivity).getTime() >= activeThreshold : false;
    }).length;
  }, [getUserPresence, posts, reels, stories, users]);

  const openReportsCount = useMemo(
    () => reports.filter((item) => item.status !== "resolved").length,
    [reports]
  );

  async function handleBanToggle(user: User) {
    const nextBannedState = !user.isBanned;
    const result = await setUserBanStatus(user.id, nextBannedState);
    if (!result.ok) {
      Alert.alert(copy.notificationUnavailableTitle, result.message ?? adminCopy.userStatusFailed);
      return;
    }

    Alert.alert(
      nextBannedState ? adminCopy.bannedTitle : adminCopy.unbannedTitle,
      nextBannedState ? `${user.name}. ${adminCopy.bannedBody}` : `${user.name}. ${adminCopy.unbannedBody}`
    );
  }

  async function handleDeletePost(post: Post) {
    const result = await adminDeletePost(post.id);
    if (!result.ok) {
      Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.deleteUnavailableBody);
      return;
    }

    Alert.alert(copy.post, copy.adminDeletedBody);
  }

  async function handleDeleteReel(reel: Reel) {
    const result = await adminDeleteReel(reel.id);
    if (!result.ok) {
      Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.deleteUnavailableBody);
      return;
    }

    Alert.alert(copy.reels, copy.adminDeletedBody);
  }

  async function handleDeleteStory(story: Story) {
    const result = await adminDeleteStory(story.id);
    if (!result.ok) {
      Alert.alert(copy.deleteUnavailableTitle, result.message ?? copy.deleteStoryUnavailableBody);
      return;
    }

    Alert.alert(copy.storyFallbackLabel, copy.adminDeletedBody);
  }

  async function handleReportStatus(report: ContentReport, status: ContentReport["status"]) {
    const result = await updateReportStatus(report.id, status);
    if (!result.ok) {
      Alert.alert(copy.notificationsUnavailableTitle, result.message ?? copy.notificationsUnavailableBody);
      return;
    }
  }

  function handleOpenReportTarget(report: ContentReport) {
    if (report.entityType === "post") {
      navigation.navigate("PostDetails", { postId: report.entityId });
      return;
    }

    if (report.entityType === "reel") {
      navigation.navigate("ReelViewer", { reelId: report.entityId });
      return;
    }

    if (report.entityType === "story") {
      const userId = report.ownerId ?? report.entityId;
      navigation.navigate("StoryViewer", { userId, storyId: report.entityId });
      return;
    }

    navigation.navigate("PublicProfile", { userId: report.entityId });
  }

  function handleDeleteFromReport(report: ContentReport) {
    if (report.entityType === "post") {
      const post = posts.find((item) => item.id === report.entityId);
      if (post) {
        Alert.alert(adminCopy.deleteReportedPostTitle, adminCopy.deleteReportedPostBody, [
          { text: copy.cancel, style: "cancel" },
          { text: copy.delete, style: "destructive", onPress: () => void handleDeletePost(post) },
        ]);
      }
      return;
    }

    if (report.entityType === "reel") {
      const reel = reels.find((item) => item.id === report.entityId);
      if (reel) {
        Alert.alert(adminCopy.deleteReportedReelTitle, adminCopy.deleteReportedReelBody, [
          { text: copy.cancel, style: "cancel" },
          { text: copy.delete, style: "destructive", onPress: () => void handleDeleteReel(reel) },
        ]);
      }
      return;
    }

    if (report.entityType === "story") {
      const story = stories.find((item) => item.id === report.entityId);
      if (story) {
        Alert.alert(adminCopy.deleteReportedStoryTitle, adminCopy.deleteReportedStoryBody, [
          { text: copy.cancel, style: "cancel" },
          { text: copy.delete, style: "destructive", onPress: () => void handleDeleteStory(story) },
        ]);
      }
    }
  }

  if (!currentUser || !isAdmin) {
    return (
      <Screen contentContainerStyle={styles.deniedScreen}>
        <View style={styles.deniedCard}>
          <View style={styles.deniedIconWrap}>
            <Ionicons color={palette.accentSoft} name="shield-checkmark-outline" size={28} />
          </View>
          <Text style={styles.deniedTitle}>{copy.adminAccessOnly}</Text>
          <Text style={styles.deniedBody}>{copy.adminAccessBody}</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.primaryAction}>
            <Text style={styles.primaryActionLabel}>{copy.goBack}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>{copy.adminDashboard}</Text>
            <Text style={styles.heroTitle}>{copy.moderatePlatform}</Text>
            <Text style={styles.heroBody}>{copy.moderationBody}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons color={palette.text} name="shield-outline" size={18} />
            <Text style={styles.heroBadgeLabel}>{copy.adminTitle}</Text>
          </View>
        </View>

        <View style={styles.analyticsGrid}>
          <AnalyticsCard accent={palette.primary} icon="people-outline" label={`${copy.total} ${copy.usersTitle.toLowerCase()}`} value={users.length} />
          <AnalyticsCard accent={palette.accent} icon="images-outline" label={`${copy.total} ${copy.posts.toLowerCase()}`} value={posts.length} />
          <AnalyticsCard accent="#ff7a2f" icon="play-circle-outline" label={`${copy.total} ${copy.reels.toLowerCase()}`} value={reels.length} />
          <AnalyticsCard accent="#36e0a1" icon="timer-outline" label={`${copy.total} ${adminCopy.storiesTitle.toLowerCase()}`} value={stories.length} />
          <AnalyticsCard accent={palette.success} icon="pulse-outline" label={adminCopy.activeUsers} value={activeUsersCount} />
          <AnalyticsCard
            accent={palette.danger}
            icon="warning-outline"
            label={adminCopy.reportedContent}
            value={openReportsCount}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionChipRow}>
        <SectionChip active={activeSection === "overview"} label="Overview" onPress={() => setActiveSection("overview")} />
        <SectionChip
          active={activeSection === "users"}
          label={`${copy.usersTitle} ${sortedUsers.length}`}
          onPress={() => setActiveSection("users")}
        />
        <SectionChip
          active={activeSection === "posts"}
          label={`${copy.posts} ${sortedPosts.length}`}
          onPress={() => setActiveSection("posts")}
        />
        <SectionChip
          active={activeSection === "reels"}
          label={`${copy.reels} ${sortedReels.length}`}
          onPress={() => setActiveSection("reels")}
        />
        <SectionChip
          active={activeSection === "reports"}
          label={`${adminCopy.reportsTitle} ${sortedReports.length}`}
          onPress={() => {
            setActiveSection("reports");
            void refreshReports();
          }}
        />
        <SectionChip active={activeSection === "calls"} label="Calls" onPress={() => setActiveSection("calls")} />
        <SectionChip active={activeSection === "broadcast"} label="Message all" onPress={() => setActiveSection("broadcast")} />
      </ScrollView>

      {activeSection === "overview" ? <AdminOverviewPanel /> : null}
      {activeSection === "calls" ? (
        <AdminCallsPanel onOpenProfile={(userId) => navigation.navigate("PublicProfile", { userId })} />
      ) : null}
      {activeSection === "broadcast" ? <AdminBroadcastPanel /> : null}

      {activeSection === "users" ? (
        <View style={styles.stack}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setUserQuery}
            placeholder="Search name, @username or email"
            placeholderTextColor={palette.mutedSoft}
            style={styles.userSearch}
            value={userQuery}
          />
          {!isOwner ? (
            <Text style={styles.entityMeta}>Only the owner account can add or remove admins.</Text>
          ) : null}
          {sortedUsers.map((user) => {
            const presence = getUserPresence(user.id);
            return (
              <View key={user.id} style={styles.panelCard}>
                <View style={styles.entityRow}>
                  <Avatar name={user.name} style={styles.avatar} uri={user.profileImage} />
                  <View style={styles.entityCopy}>
                    <View style={styles.inlineRow}>
                      <Text style={styles.entityTitle}>{user.name}</Text>
                      <Badge label={user.role === "admin" ? adminCopy.adminRole : adminCopy.memberRole} tone={user.role === "admin" ? "accent" : "neutral"} />
                      {user.isBanned ? <Badge label={adminCopy.bannedRole} tone="danger" /> : null}
                    </View>
                    <Text style={styles.entitySubtitle}>@{user.username}</Text>
                    <Text style={styles.entityMeta}>
                      {presence.isOnline ? copy.onlineNow : formatLastSeen(presence.lastSeenAt, language, adminCopy)} - {user.followers.length} {adminCopy.followersLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionBar}>
                  <ActionButton
                    icon="person-circle-outline"
                    label={adminCopy.viewProfile}
                    onPress={() => navigation.navigate("PublicProfile", { userId: user.id })}
                    tone="ghost"
                  />
                  {user.id !== currentUser.id ? (
                    <ActionButton
                      icon={user.isBanned ? "checkmark-circle-outline" : "ban-outline"}
                      label={user.isBanned ? adminCopy.unban : adminCopy.ban}
                      onPress={() => void handleBanToggle(user)}
                      tone={user.isBanned ? "accent" : "danger"}
                    />
                  ) : null}
                  {user.id !== currentUser.id && isOwner ? (
                    <ActionButton
                      icon={user.role === "admin" ? "remove-circle-outline" : "shield-checkmark-outline"}
                      label={busyUserId === user.id ? "…" : user.role === "admin" ? "Remove admin" : "Make admin"}
                      onPress={() => void handleRoleChange(user)}
                      tone="accent"
                    />
                  ) : null}
                  {user.id !== currentUser.id ? (
                    <ActionButton
                      icon="trash-outline"
                      label={busyUserId === user.id ? "…" : "Delete account"}
                      onPress={() => confirmDeleteAccount(user)}
                      tone="danger"
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {activeSection === "posts" ? (
        <View style={styles.stack}>
          {sortedPosts.map((post) => {
            const author = getUserById(post.userId);
            const primaryMedia = post.media[0];
            return (
              <View key={post.id} style={styles.panelCard}>
                <View style={styles.contentHeader}>
                  <Image source={{ uri: primaryMedia?.thumbnailUrl ?? primaryMedia?.url }} style={styles.contentPreview} />
                  <View style={styles.entityCopy}>
                    <Text numberOfLines={2} style={styles.entityTitle}>
                      {post.caption || adminCopy.untitledPost}
                    </Text>
                    <Text style={styles.entitySubtitle}>
                      {author ? `@${author.username}` : adminCopy.unknownAuthor} - {formatDate(post.createdAt, language)}
                    </Text>
                    <Text numberOfLines={2} style={styles.entityMeta}>
                      {post.hashtags.length > 0 ? post.hashtags.map((tag) => `#${tag}`).join(" ") : adminCopy.noHashtags} - {post.likedBy.length} {adminCopy.likesLabel} -{" "}
                      {post.commentCount} {adminCopy.commentsLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionBar}>
                  <ActionButton
                    icon="eye-outline"
                    label={adminCopy.openPost}
                    onPress={() => navigation.navigate("PostDetails", { postId: post.id })}
                    tone="ghost"
                  />
                  <ActionButton
                    icon="trash-outline"
                    label={adminCopy.deleteHarmful}
                    onPress={() =>
                      Alert.alert(adminCopy.deletePostTitle, adminCopy.deletePostBody, [
                        { text: copy.cancel, style: "cancel" },
                        { text: copy.delete, style: "destructive", onPress: () => void handleDeletePost(post) },
                      ])
                    }
                    tone="danger"
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {activeSection === "reels" ? (
        <View style={styles.stack}>
          {sortedReels.map((reel) => {
            const author = getUserById(reel.userId);
            return (
              <View key={reel.id} style={styles.panelCard}>
                <View style={styles.contentHeader}>
                  <Image source={{ uri: reel.thumbnailUrl }} style={styles.contentPreview} />
                  <View style={styles.entityCopy}>
                    <Text numberOfLines={2} style={styles.entityTitle}>
                      {reel.caption || adminCopy.untitledReel}
                    </Text>
                    <Text style={styles.entitySubtitle}>
                      {author ? `@${author.username}` : adminCopy.unknownCreator} - {formatDate(reel.createdAt, language)}
                    </Text>
                    <Text numberOfLines={2} style={styles.entityMeta}>
                      {reel.tags.length > 0 ? reel.tags.map((tag) => `#${tag}`).join(" ") : adminCopy.noHashtags} - {reel.viewCount} {copy.views} -{" "}
                      {reel.likedBy.length} {adminCopy.likesLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionBar}>
                  <ActionButton
                    icon="play-outline"
                    label={adminCopy.openReel}
                    onPress={() => navigation.navigate("ReelViewer", { reelId: reel.id })}
                    tone="ghost"
                  />
                  <ActionButton
                    icon="trash-outline"
                    label={adminCopy.deleteHarmful}
                    onPress={() =>
                      Alert.alert(adminCopy.deleteReelTitle, adminCopy.deleteReelBody, [
                        { text: copy.cancel, style: "cancel" },
                        { text: copy.delete, style: "destructive", onPress: () => void handleDeleteReel(reel) },
                      ])
                    }
                    tone="danger"
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {activeSection === "reports" ? (
        <View style={styles.stack}>
          {sortedReports.map((report) => {
            const reporter = getUserById(report.reporterId);
            const owner = report.ownerId ? getUserById(report.ownerId) : undefined;
            const preview = buildReportPreview(report, posts, reels, stories, getUserById, adminCopy);

            return (
              <View key={report.id} style={styles.panelCard}>
                <View style={styles.inlineRow}>
                  <Badge label={formatEntityType(report.entityType, adminCopy)} tone="accent" />
                  <Badge label={formatReportStatus(report.status, adminCopy)} tone={report.status === "resolved" ? "success" : report.status === "reviewed" ? "neutral" : "danger"} />
                </View>

                <View style={styles.reportBody}>
                  <View style={styles.contentHeader}>
                    {preview.imageUrl ? <Image source={{ uri: preview.imageUrl }} style={styles.contentPreview} /> : null}
                    <View style={styles.entityCopy}>
                      <Text style={styles.entityTitle}>{report.reason}</Text>
                      <Text style={styles.entitySubtitle}>
                        {adminCopy.reportedBy} {reporter ? `@${reporter.username}` : adminCopy.unknownUser} - {formatDate(report.createdAt, language)}
                      </Text>
                      <Text numberOfLines={3} style={styles.entityMeta}>
                        {report.details?.trim() || preview.summary}
                      </Text>
                      {owner ? (
                        <Text style={styles.ownerMeta}>
                          {adminCopy.targetOwner}: @{owner.username}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.actionWrap}>
                    <ActionButton icon="open-outline" label={adminCopy.viewTarget} onPress={() => handleOpenReportTarget(report)} tone="ghost" />
                    {report.status === "open" ? (
                      <ActionButton
                        icon="scan-outline"
                        label={adminCopy.markReviewed}
                        onPress={() => void handleReportStatus(report, "reviewed")}
                        tone="ghost"
                      />
                    ) : null}
                    {report.status !== "resolved" ? (
                      <ActionButton
                        icon="checkmark-done-outline"
                        label={adminCopy.resolve}
                        onPress={() => void handleReportStatus(report, "resolved")}
                        tone="success"
                      />
                    ) : null}
                    {report.entityType !== "user" ? (
                      <ActionButton
                        icon="trash-outline"
                        label={adminCopy.deleteHarmful}
                        onPress={() => handleDeleteFromReport(report)}
                        tone="danger"
                      />
                    ) : null}
                    {owner && owner.id !== currentUser.id ? (
                      <ActionButton
                        icon={owner.isBanned ? "checkmark-circle-outline" : "ban-outline"}
                        label={owner.isBanned ? adminCopy.unbanOwner : adminCopy.banOwner}
                        onPress={() => void handleBanToggle(owner)}
                        tone={owner.isBanned ? "accent" : "danger"}
                      />
                    ) : report.entityType === "user" ? (
                      (() => {
                        const targetUser = getUserById(report.entityId);
                        if (!targetUser || targetUser.id === currentUser.id) {
                          return null;
                        }

                        return (
                          <ActionButton
                            icon={targetUser.isBanned ? "checkmark-circle-outline" : "ban-outline"}
                            label={targetUser.isBanned ? adminCopy.unbanUser : adminCopy.banUser}
                            onPress={() => void handleBanToggle(targetUser)}
                            tone={targetUser.isBanned ? "accent" : "danger"}
                          />
                        );
                      })()
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

function AnalyticsCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <View style={styles.analyticsCard}>
      <View style={[styles.analyticsIconWrap, { backgroundColor: `${accent}1a` }]}>
        <Ionicons color={accent} name={icon} size={18} />
      </View>
      <Text style={styles.analyticsValue}>{value}</Text>
      <Text style={styles.analyticsLabel}>{label}</Text>
    </View>
  );
}

function SectionChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.sectionChip, active ? styles.sectionChipActive : null]}>
      <Text style={[styles.sectionChipLabel, active ? styles.sectionChipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: "ghost" | "danger" | "success" | "accent";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionButton,
        tone === "ghost" ? styles.actionButtonGhost : null,
        tone === "danger" ? styles.actionButtonDanger : null,
        tone === "success" ? styles.actionButtonSuccess : null,
        tone === "accent" ? styles.actionButtonAccent : null,
      ]}
    >
      <Ionicons
        color={
          tone === "ghost"
            ? palette.text
            : tone === "danger"
              ? "#1e0407"
              : tone === "success"
                ? "#042010"
                : "#071018"
        }
        name={icon}
        size={15}
      />
      <Text
        style={[
          styles.actionButtonLabel,
          tone === "ghost" ? styles.actionButtonLabelGhost : null,
          tone === "danger" ? styles.actionButtonLabelDanger : null,
          tone === "success" ? styles.actionButtonLabelSuccess : null,
          tone === "accent" ? styles.actionButtonLabelAccent : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "accent" | "danger" | "success";
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === "accent" ? styles.badgeAccent : null,
        tone === "danger" ? styles.badgeDanger : null,
        tone === "success" ? styles.badgeSuccess : null,
      ]}
    >
      <Text
        style={[
          styles.badgeLabel,
          tone === "accent" ? styles.badgeLabelAccent : null,
          tone === "danger" ? styles.badgeLabelDanger : null,
          tone === "success" ? styles.badgeLabelSuccess : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function buildReportPreview(
  report: ContentReport,
  posts: Post[],
  reels: Reel[],
  stories: Story[],
  getUserById: (userId: string) => User | undefined,
  adminCopy: ReturnType<typeof getAdminDashboardCopy>
) {
  if (report.entityType === "post") {
    const post = posts.find((item) => item.id === report.entityId);
    return {
      imageUrl: post?.media[0]?.thumbnailUrl ?? post?.media[0]?.url,
      summary: post?.caption || adminCopy.reportedPost,
    };
  }

  if (report.entityType === "reel") {
    const reel = reels.find((item) => item.id === report.entityId);
    return {
      imageUrl: reel?.thumbnailUrl,
      summary: reel?.caption || adminCopy.reportedReel,
    };
  }

  if (report.entityType === "story") {
    const story = stories.find((item) => item.id === report.entityId);
    return {
      imageUrl: story?.imageUrl,
      summary: story?.caption || adminCopy.reportedStory,
    };
  }

  const user = getUserById(report.entityId);
  return {
    imageUrl: user?.profileImage,
    summary: user ? `${adminCopy.userProfileReport} @${user.username}` : adminCopy.reportedUser,
  };
}

function reportStatusRank(status: ContentReport["status"]) {
  if (status === "open") {
    return 0;
  }

  if (status === "reviewed") {
    return 1;
  }

  return 2;
}

function formatDate(value: string, language: LanguageOption | null | undefined) {
  return formatLocaleDate(value, language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastSeen(
  value: string | undefined,
  language: LanguageOption | null | undefined,
  adminCopy: ReturnType<typeof getAdminDashboardCopy>
) {
  if (!value) {
    return adminCopy.noRecentActivity;
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    return adminCopy.activeWithinHour;
  }

  if (diffHours < 24) {
    return adminCopy.activeAgoHours.replace("{count}", `${diffHours}`);
  }

  if (diffDays < 7) {
    return adminCopy.activeAgoDays.replace("{count}", `${diffDays}`);
  }

  return formatRelativeTime(date, language, { style: "short", fallbackToDateAfterDays: 365, numeric: "auto" });
}

function formatReportStatus(status: ContentReport["status"], adminCopy: ReturnType<typeof getAdminDashboardCopy>) {
  if (status === "open") {
    return adminCopy.openStatus;
  }

  if (status === "reviewed") {
    return adminCopy.reviewedStatus;
  }

  return adminCopy.resolvedStatus;
}

function formatEntityType(entityType: ContentReport["entityType"], adminCopy: ReturnType<typeof getAdminDashboardCopy>) {
  if (entityType === "post") {
    return adminCopy.postEntity;
  }

  if (entityType === "reel") {
    return adminCopy.reelEntity;
  }

  if (entityType === "story") {
    return adminCopy.storyEntity;
  }

  return adminCopy.userEntity;
}

const styles = createThemedStyles({
  userSearch: {
    backgroundColor: palette.input,
    borderRadius: radii.pill,
    color: palette.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  deniedScreen: {
    alignItems: "center",
    justifyContent: "center",
  },
  deniedCard: {
    alignItems: "center",
    backgroundColor: "#0b1219",
    borderColor: palette.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    width: "100%",
    ...shadows.card,
  },
  deniedIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,209,102,0.12)",
    borderRadius: radii.pill,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  deniedTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  deniedBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    minWidth: 140,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryActionLabel: {
    color: "#031018",
    fontSize: 14,
    fontWeight: "900",
  },
  heroCard: {
    backgroundColor: "#0b1219",
    borderColor: palette.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
    ...shadows.card,
  },
  heroHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  kicker: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: palette.text,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 30,
  },
  heroBody: {
    color: palette.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  heroBadgeLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  analyticsCard: {
    backgroundColor: "#101820",
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 8,
    minWidth: "30%",
    padding: spacing.md,
    width: "31%",
  },
  analyticsIconWrap: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  analyticsValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "900",
  },
  analyticsLabel: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  sectionChipRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  sectionChip: {
    backgroundColor: "#0b1219",
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  sectionChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  sectionChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionChipLabelActive: {
    color: "#04070b",
  },
  stack: {
    gap: spacing.md,
  },
  panelCard: {
    backgroundColor: "#0b1219",
    borderColor: palette.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  entityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  avatar: {
    borderRadius: 26,
    height: 52,
    width: 52,
  },
  entityCopy: {
    flex: 1,
    gap: 4,
  },
  inlineRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  entityTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  entitySubtitle: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  entityMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  ownerMeta: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  actionBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  actionButtonGhost: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: palette.border,
    borderWidth: 1,
  },
  actionButtonDanger: {
    backgroundColor: palette.danger,
  },
  actionButtonSuccess: {
    backgroundColor: palette.success,
  },
  actionButtonAccent: {
    backgroundColor: palette.accentSoft,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionButtonLabelGhost: {
    color: palette.text,
  },
  actionButtonLabelDanger: {
    color: "#1e0407",
  },
  actionButtonLabelSuccess: {
    color: "#042010",
  },
  actionButtonLabelAccent: {
    color: "#071018",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeAccent: {
    backgroundColor: "rgba(255,209,102,0.14)",
    borderColor: "rgba(255,209,102,0.22)",
  },
  badgeDanger: {
    backgroundColor: "rgba(248,113,113,0.14)",
    borderColor: "rgba(248,113,113,0.22)",
  },
  badgeSuccess: {
    backgroundColor: "rgba(74,222,128,0.14)",
    borderColor: "rgba(74,222,128,0.22)",
  },
  badgeLabel: {
    color: palette.textSoft,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  badgeLabelAccent: {
    color: palette.accentSoft,
  },
  badgeLabelDanger: {
    color: palette.danger,
  },
  badgeLabelSuccess: {
    color: palette.success,
  },
  contentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  contentPreview: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    height: 82,
    width: 82,
  },
  reportBody: {
    gap: spacing.sm,
  },
});
