import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { getCopy, supportedLanguages } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function LoginScreen({ navigation }: { navigation: any }) {
  const { language, setLanguage, login, continueWithGoogle, googleSignInEnabled, googleSignInMessage } = useAppState();
  const copy = getCopy(language);
  const [mode, setMode] = useState<"welcome" | "signin">("welcome");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const currentLanguage = supportedLanguages.find((option) => option.code === language);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(copy.loginMissingDetailsTitle, copy.loginMissingDetailsBody);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        Alert.alert(copy.loginFailedTitle, result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    setIsGoogleSubmitting(true);
    try {
      const result = await continueWithGoogle();
      if (!result.ok) {
        Alert.alert(copy.googleSignInTitle, result.message ?? copy.googleSignInUnavailable);
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  const googleButton = (
    <GoogleButton
      disabled={!googleSignInEnabled || isSubmitting || isGoogleSubmitting}
      label={isGoogleSubmitting ? copy.connectingGoogle : copy.continueWithGoogle}
      onPress={() => {
        void handleGoogle();
      }}
    />
  );

  if (mode === "signin") {
    return (
      <Screen scrollable contentContainerStyle={styles.signinContent}>
        <Pressable accessibilityLabel={copy.back} accessibilityRole="button" hitSlop={8} onPress={() => setMode("welcome")} style={styles.backButton}>
          <Ionicons color={palette.text} name="chevron-back" size={24} />
        </Pressable>
        <View style={styles.signinHeader}>
          <Text style={styles.title}>{copy.welcomeBack}</Text>
          <Text style={styles.subtitle}>{copy.signInBody}</Text>
        </View>
        <View style={styles.form}>
          <InputField
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label={copy.email}
            onChangeText={setEmail}
            placeholder={copy.loginPlaceholderEmail}
            value={email}
          />
          <InputField
            autoCapitalize="none"
            autoCorrect={false}
            label={copy.password}
            onChangeText={setPassword}
            placeholder={copy.loginPlaceholderPassword}
            secureTextEntry
            value={password}
          />
          <PrimaryButton
            disabled={isGoogleSubmitting}
            label={isSubmitting ? copy.loginSigningIn : copy.login}
            loading={isSubmitting}
            onPress={handleLogin}
          />
          <SocialDivider text={copy.orDivider} />
          {googleButton}
          {!googleSignInEnabled && googleSignInMessage ? <Text style={styles.helperText}>{googleSignInMessage}</Text> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.welcomeContent}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel={copy.chooseLanguage}
          accessibilityRole="button"
          onPress={() => setLanguageOpen(true)}
          style={({ pressed }) => [styles.languageChip, pressed ? styles.pressed : null]}
        >
          <Ionicons color={palette.text} name="globe-outline" size={16} />
          <Text style={styles.languageChipLabel}>{currentLanguage?.nativeName ?? "English"}</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.art}>
          <View style={[styles.artCard, styles.artLeft]} />
          <View style={[styles.artCard, styles.artRight]} />
          <View style={[styles.artCard, styles.artCenter]} />
          <View style={styles.artBadge}>
            <Text style={styles.artBadgeLetter}>s</Text>
          </View>
        </View>
        <Text style={styles.title}>{copy.welcomeHeadline}</Text>
        <Text style={styles.subtitleCentered}>{copy.welcomeBody}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={copy.createAccount} onPress={() => navigation.navigate("Register")} />
        {googleButton}
        {!googleSignInEnabled && googleSignInMessage ? <Text style={styles.helperText}>{googleSignInMessage}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => setMode("signin")} style={styles.signinLink}>
          <Text style={styles.signinLinkText}>
            {copy.haveAccount} <Text style={styles.signinLinkStrong}>{copy.signIn}</Text>
          </Text>
        </Pressable>
      </View>

      <Modal animationType="fade" onRequestClose={() => setLanguageOpen(false)} transparent visible={languageOpen}>
        <Pressable onPress={() => setLanguageOpen(false)} style={styles.sheetBackdrop}>
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <Text style={styles.sheetTitle}>{copy.chooseLanguage}</Text>
            <ScrollView contentContainerStyle={styles.sheetList}>
              {supportedLanguages.map((option) => {
                const selected = option.code === language;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.code}
                    onPress={() => {
                      setLanguageOpen(false);
                      void setLanguage(option.code);
                    }}
                    style={[styles.sheetRow, selected ? styles.sheetRowActive : null]}
                  >
                    <Text style={styles.sheetRowTitle}>{option.nativeName}</Text>
                    <Text style={styles.sheetRowSubtitle}>{option.englishName}</Text>
                    {selected ? <Ionicons color={palette.primary} name="checkmark" size={20} style={styles.sheetCheck} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = createThemedStyles({
  welcomeContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  signinContent: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  topRow: {
    alignItems: "flex-end",
  },
  languageChip: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
  },
  languageChipLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  art: {
    height: 200,
    marginBottom: spacing.sm,
    width: 236,
  },
  artCard: {
    borderRadius: 22,
    height: 128,
    position: "absolute",
    top: 26,
    width: 96,
  },
  artLeft: {
    backgroundColor: "#ffd9b8",
    left: 18,
    transform: [{ rotate: "-8deg" }],
  },
  artRight: {
    backgroundColor: "#d9c8f2",
    right: 18,
    transform: [{ rotate: "8deg" }],
  },
  artCenter: {
    backgroundColor: "#b8d4f0",
    borderColor: palette.background,
    borderRadius: 24,
    borderWidth: 4,
    height: 140,
    left: 66,
    top: 6,
    width: 104,
  },
  artBadge: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderColor: palette.background,
    borderRadius: 22,
    borderWidth: 4,
    bottom: 0,
    height: 68,
    justifyContent: "center",
    left: 84,
    position: "absolute",
    width: 68,
  },
  artBadgeLetter: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: -4,
  },
  title: {
    color: palette.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 37,
    textAlign: "center",
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  subtitleCentered: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
    textAlign: "center",
  },
  actions: {
    gap: spacing.sm,
  },
  signinLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  signinLinkText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  signinLinkStrong: {
    color: palette.primary,
    fontWeight: "800",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  signinHeader: {
    gap: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
  helperText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  sheetBackdrop: {
    backgroundColor: palette.overlay,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.sm,
    maxHeight: "75%",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
  },
  sheetList: {
    gap: 6,
  },
  sheetRow: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sheetRowActive: {
    backgroundColor: palette.surfaceMuted,
  },
  sheetRowTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  sheetRowSubtitle: {
    color: palette.muted,
    fontSize: 13,
  },
  sheetCheck: {
    position: "absolute",
    right: spacing.md,
    top: 16,
  },
});

function SocialDivider({ text }: { text: string }) {
  return (
    <View style={socialStyles.dividerRow}>
      <View style={socialStyles.dividerLine} />
      <Text style={socialStyles.dividerText}>{text}</Text>
      <View style={socialStyles.dividerLine} />
    </View>
  );
}

function GoogleButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        socialStyles.googleButton,
        disabled ? socialStyles.googleButtonDisabled : null,
        pressed && !disabled ? socialStyles.googleButtonPressed : null,
      ]}
    >
      <Ionicons color={palette.text} name="logo-google" size={18} />
      <Text style={socialStyles.googleButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const socialStyles = createThemedStyles({
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  dividerLine: {
    backgroundColor: palette.borderStrong,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: "#151922",
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  googleButtonLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  googleButtonDisabled: {
    opacity: 0.45,
  },
  googleButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
