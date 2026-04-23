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

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { language, register } = useAppState();
  const copy = getCopy(language);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {
    if (!name || !username || !email || !password) {
      Alert.alert("Missing details", "Please fill out every field.");
      return;
    }

    const result = await register({ name, username, email, password });
    if (!result.ok) {
      Alert.alert("Registration failed", result.message);
    }
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <LinearGradient colors={["rgba(54,224,161,0.12)", "rgba(255,122,47,0.10)", "rgba(255,255,255,0.02)"]} style={styles.heroCard}>
        <SectionTitle title={copy.createAccount} subtitle={copy.registerBody} />
        <View style={styles.points}>
          <Point text="Launch your creator profile" />
          <Point text="Post reels and offers in one place" />
          <Point text="Upgrade later for premium AI tools" />
        </View>
      </LinearGradient>

      <View style={styles.form}>
        <InputField label={copy.fullName} onChangeText={setName} placeholder="Layla Noor" value={name} />
        <InputField label={copy.username} onChangeText={setUsername} placeholder="laylanoor" value={username} />
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
          placeholder="Choose a password"
          secureTextEntry
          value={password}
        />
        <PrimaryButton label={copy.register} onPress={handleRegister} />
        <PrimaryButton label={copy.login} onPress={() => navigation.goBack()} variant="ghost" />
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
  form: {
    gap: spacing.md,
  },
  points: {
    gap: spacing.sm,
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

const pointStyles = StyleSheet.create({
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
