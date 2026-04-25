import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { useAppState } from "../providers/AppProvider";
import { CommunityKind, CommunityVisibility } from "../types/models";
import { palette, radii, spacing } from "../theme";

const communityKinds: CommunityKind[] = ["page", "group", "channel"];
const visibilityOptions: CommunityVisibility[] = ["public", "private"];

export function CreateCommunityScreen({ navigation }: { navigation: any }) {
  const { createCommunity } = useAppState();
  const [kind, setKind] = useState<CommunityKind>("page");
  const [visibility, setVisibility] = useState<CommunityVisibility>("public");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [coverImage, setCoverImage] = useState("");

  async function handlePickCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo library access so you can upload a cover image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.45,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Image issue", "The selected cover image could not be prepared. Try another image.");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setCoverImage(`data:${mimeType};base64,${asset.base64}`);
  }

  async function handleCreate() {
    if (!name.trim() || !description.trim() || !category.trim() || !coverImage.trim()) {
      Alert.alert("Missing details", "Add a name, description, category, and cover image first.");
      return;
    }

    const result = await createCommunity({
      kind,
      name,
      description,
      category,
      coverImage,
      visibility,
    });

    if (!result.ok) {
      Alert.alert("Creation unavailable", result.message ?? "This page, group, or channel could not be created.");
      return;
    }

    Alert.alert("Created", `Your ${kind} is now live inside Pulseora.`);
    navigation.navigate("Communities");
  }

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <SectionTitle
          title="Create a page, group, or channel"
          subtitle="Build your own space for branding, discussion, or broadcasts."
        />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>Type</Text>
        <View style={styles.choiceRow}>
          {communityKinds.map((item) => (
            <ChoiceChip key={item} active={kind === item} label={item} onPress={() => setKind(item)} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Visibility</Text>
        <View style={styles.choiceRow}>
          {visibilityOptions.map((item) => (
            <ChoiceChip key={item} active={visibility === item} label={item} onPress={() => setVisibility(item)} />
          ))}
        </View>

        <PrimaryButton
          label={coverImage ? "Change cover image" : "Upload cover image"}
          onPress={() => {
            void handlePickCover();
          }}
          variant="ghost"
        />
        {coverImage ? <Image source={{ uri: coverImage }} style={styles.coverPreview} /> : null}

        <InputField label="Name" onChangeText={setName} placeholder="Creator Growth Circle" value={name} />
        <InputField label="Category" onChangeText={setCategory} placeholder="Business, Fashion, Productivity..." value={category} />
        <InputField
          label="Description"
          onChangeText={setDescription}
          placeholder="Tell people what this space is for and why they should join."
          value={description}
          multiline
        />

        <PrimaryButton
          label={`Create ${kind}`}
          onPress={() => {
            void handleCreate();
          }}
        />
      </View>
    </Screen>
  );
}

function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceChip, active ? styles.choiceChipActive : null]}>
      <Text style={[styles.choiceLabel, active ? styles.choiceLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  sectionLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  choiceChip: {
    backgroundColor: palette.glass,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  choiceLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  choiceLabelActive: {
    color: "#071118",
  },
  coverPreview: {
    width: "100%",
    height: 180,
    borderRadius: radii.lg,
  },
});
