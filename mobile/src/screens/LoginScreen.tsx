import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing } from "../theme";

export function LoginScreen({ navigation }: { navigation: any }) {
  const { language, login } = useAppState();
  const copy = getCopy(language);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Enter your email and password.");
      return;
    }

    const result = await login(email, password);
    if (!result.ok) {
      Alert.alert("Login failed", result.message);
    }
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <LinearGradient colors={["rgba(255,122,47,0.16)", "rgba(54,224,161,0.10)", "rgba(255,255,255,0.02)"]} style={styles.heroCard}>
        <Text style={styles.eyebrow}>{copy.appName}</Text>
        <SectionTitle title={copy.welcomeBack} subtitle={copy.signInBody} />
        <View style={styles.chips}>
          <HeroChip label="Reels" value="Viral feed" />
          <HeroChip label="Store" value="Sell fast" />
        </View>
      </LinearGradient>

      <View style={styles.form}>
        <InputField
          keyboardType="email-address"
          label={copy.email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          value={email}
        />
        <InputField
          label={copy.password}
          onChangeText={setPassword}
          placeholder="password"
          secureTextEntry
          value={password}
        />
        <PrimaryButton label={copy.login} onPress={handleLogin} />
        <PrimaryButton label={copy.register} onPress={() => navigation.navigate("Register")} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});

function HeroChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.value}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
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
