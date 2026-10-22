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
import { getUsernameValidationMessage } from "../utils/profileValidation";

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { language, register, continueWithGoogle, googleSignInEnabled, googleSignInMessage } = useAppState();
  const copy = getCopy(language);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const validationMessages = {
    usernameRuleHint: copy.usernameRuleHint,
    websiteRuleHint: copy.websiteRuleHint,
    chooseUsernameValidation: copy.chooseUsernameValidation,
    usernameLengthValidation: copy.usernameLengthValidation,
    usernameCharactersValidation: copy.usernameCharactersValidation,
    usernameEdgeValidation: copy.usernameEdgeValidation,
    usernamePunctuationValidation: copy.usernamePunctuationValidation,
    websiteSchemeValidation: copy.websiteSchemeValidation,
    websiteInvalidValidation: copy.websiteInvalidValidation,
  };
  const usernameValidationMessage = username ? getUsernameValidationMessage(username, validationMessages) : null;
  const confirmPasswordMessage = confirmPassword && password !== confirmPassword ? copy.confirmPasswordMismatchHint : null;

  async function handleRegister() {
    if (!name.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert(copy.registerMissingDetailsTitle, copy.registerMissingDetailsBody);
      return;
    }

    if (usernameValidationMessage) {
      Alert.alert(copy.usernameUnavailableTitle, usernameValidationMessage);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(copy.passwordMismatchTitle, copy.passwordMismatchBody);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({ name, username, email, password });
      if (!result.ok) {
        Alert.alert(copy.registerFailedTitle, result.message);
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
        Alert.alert(copy.googleSignUpTitle, result.message ?? copy.googleSignInUnavailable);
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <SafeLinearGradient colors={[palette.surface, palette.surface]} style={styles.heroCard}>
        <SectionTitle title={copy.createAccount} subtitle={copy.registerBody} />
        <View style={styles.points}>
          <Point text={copy.registerPointProfile} />
          <Point text={copy.registerPointPost} />
          <Point text={copy.registerPointAi} />
        </View>
      </SafeLinearGradient>

      <View style={styles.form}>
        <InputField
          autoCapitalize="words"
          autoCorrect={false}
          label={copy.fullName}
          onChangeText={setName}
          placeholder={copy.fullName}
          value={name}
        />
        <InputField
          autoCapitalize="none"
          autoCorrect={false}
          errorText={usernameValidationMessage}
          helperText={copy.usernameRuleHint}
          label={copy.username}
          onChangeText={setUsername}
          placeholder={copy.username}
          value={username}
        />
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
          placeholder={copy.password}
          secureTextEntry
          value={password}
        />
        <InputField
          autoCapitalize="none"
          autoCorrect={false}
          errorText={confirmPasswordMessage}
          label={copy.confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={copy.confirmPasswordPlaceholder}
          secureTextEntry
          value={confirmPassword}
        />
        <PrimaryButton
          disabled={isSubmitting || isGoogleSubmitting}
          label={isSubmitting ? copy.creatingAccount : copy.register}
          onPress={handleRegister}
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
        <PrimaryButton label={copy.login} onPress={() => navigation.goBack()} variant="ghost" />
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
  form: {
    gap: spacing.md,
  },
  points: {
    gap: spacing.sm,
  },
  helperText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});

function Point({ text }: { text: string }) {
  return (
    <View style={pointStyles.row}>
      <View style={pointStyles.dot} />
      <Text style={pointStyles.text}>{text}</Text>
    </View>
  );
}

const pointStyles = createThemedStyles({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  dot: {
    backgroundColor: palette.accentSoft,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  text: {
    color: palette.textSoft,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
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
