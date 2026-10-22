import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { SafeLinearGradient } from "../components/SafeLinearGradient";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";

export function LoginScreen({ navigation }: { navigation: any }) {
  const { language, login, continueWithGoogle, googleSignInEnabled, googleSignInMessage } = useAppState();
  const copy = getCopy(language);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <SafeLinearGradient colors={[palette.surface, palette.surface]} style={styles.heroCard}>
        <Text style={styles.eyebrow}>{copy.appName}</Text>
        <SectionTitle title={copy.welcomeBack} subtitle={copy.signInBody} />
        <View style={styles.chips}>
          <HeroChip label={copy.loginHeroReelsLabel} value={copy.loginHeroReelsValue} />
          <HeroChip label={copy.loginHeroStoreLabel} value={copy.loginHeroStoreValue} />
        </View>
      </SafeLinearGradient>

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
          disabled={isSubmitting || isGoogleSubmitting}
          label={isSubmitting ? copy.loginSigningIn : copy.login}
          onPress={handleLogin}
        />
        <SocialDivider text={copy.orDivider} />
        <GoogleButton
          disabled={!googleSignInEnabled || isSubmitting || isGoogleSubmitting}
          label={isGoogleSubmitting ? copy.connectingGoogle : copy.continueWithGoogle}
          onPress={() => {
            void handleGoogle();
          }}
        />
        {!googleSignInEnabled && googleSignInMessage ? <Text style={styles.helperText}>{googleSignInMessage}</Text> : null}
        <PrimaryButton label={copy.register} onPress={() => navigation.navigate("Register")} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = createThemedStyles({
  content: {
    flexGrow: 1,
    justifyContent: "center",
  },
  heroCard: {
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  eyebrow: {
    color: palette.accentSoft,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  form: {
    gap: spacing.md,
  },
  chips: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  helperText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});

function HeroChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.value}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = createThemedStyles({
  container: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  value: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  label: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
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
