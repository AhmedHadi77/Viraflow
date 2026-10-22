import * as ImagePicker from "expo-image-picker";
import { communityKindLabel, fill, visibilityLabel } from "../utils/labels";
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { CommunityKind, CommunityVisibility } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";

const communityKinds: CommunityKind[] = ["page", "group", "channel"];
const visibilityOptions: CommunityVisibility[] = ["public", "private"];

export function CreateCommunityScreen({ navigation }: { navigation: any }) {
  const { language, createCommunity } = useAppState();
  const copy = getCopy(language);
  const [kind, setKind] = useState<CommunityKind>("page");
  const [visibility, setVisibility] = useState<CommunityVisibility>("public");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [coverImage, setCoverImage] = useState("");

  async function handlePickCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(copy.profilePhotoAccessTitle, copy.profilePhotoAccessBody);
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
      Alert.alert(copy.imageIssueTitle, copy.imageIssueBody);
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setCoverImage(`data:${mimeType};base64,${asset.base64}`);
  }

  async function handleCreate() {
    if (!name.trim() || !description.trim() || !category.trim() || !coverImage.trim()) {
      Alert.alert(copy.communityMissingDetailsTitle, copy.communityMissingDetailsBody);
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
      Alert.alert(copy.communityCreationUnavailable, result.message ?? copy.communityCreationUnavailableBody);
      return;
    }

    Alert.alert(copy.createdTitle, copy.communityLiveBody);
    navigation.navigate("Communities");
  }

  return (
    <Screen scrollable>
      <View style={styles.heroCard}>
        <SectionTitle
          title={copy.createCommunityTitle}
          subtitle={copy.createCommunityBody}
        />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>{copy.type}</Text>
        <View style={styles.choiceRow}>
          {communityKinds.map((item) => (
            <ChoiceChip key={item} active={kind === item} label={communityKindLabel(item, copy)} onPress={() => setKind(item)} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>{copy.visibility}</Text>
        <View style={styles.choiceRow}>
          {visibilityOptions.map((item) => (
            <ChoiceChip key={item} active={visibility === item} label={visibilityLabel(item, copy)} onPress={() => setVisibility(item)} />
          ))}
        </View>

        <PrimaryButton
          label={coverImage ? copy.changeCoverImage : copy.uploadCoverImage}
          onPress={() => {
            void handlePickCover();
          }}
          variant="ghost"
        />
        {coverImage ? <Image source={{ uri: coverImage }} style={styles.coverPreview} /> : null}

        <InputField label={copy.name} onChangeText={setName} placeholder={copy.communityNamePlaceholder} value={name} />
        <InputField label={copy.category} onChangeText={setCategory} placeholder={copy.communityCategoryPlaceholder} value={category} />
        <InputField
          label={copy.productDescription}
          onChangeText={setDescription}
          placeholder={copy.communityDescriptionPlaceholder}
          value={description}
          multiline
        />

        <PrimaryButton
          label={fill(copy.createKind, { kind: communityKindLabel(kind, copy).toLowerCase() })}
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

const styles = createThemedStyles({
  heroCard: {
    gap: spacing.md,
    paddingTop: spacing.sm,
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
    color: "#ffffff",
  },
  coverPreview: {
    width: "100%",
    height: 180,
    borderRadius: radii.lg,
  },
});
