import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import {
  getUsernameValidationMessage,
  getWebsiteValidationMessage,
} from "../utils/profileValidation";

export function EditProfileScreen({ navigation }: { navigation: any }) {
  const { language, currentUser, updateProfile } = useAppState();
  const copy = getCopy(language);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [username, setUsername] = useState(currentUser?.username ?? "");
  const [headline, setHeadline] = useState(currentUser?.headline ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [website, setWebsite] = useState(currentUser?.website ?? "");
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage ?? "");
  const [isSaving, setIsSaving] = useState(false);
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
  const websiteValidationMessage = website ? getWebsiteValidationMessage(website, validationMessages) : null;

  async function handlePickProfilePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(copy.profilePhotoAccessTitle, copy.profilePhotoAccessBody);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    setProfileImage(asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(copy.nameRequiredTitle, copy.nameRequiredBody);
      return;
    }

    if (usernameValidationMessage) {
      Alert.alert(copy.usernameUnavailableTitle, usernameValidationMessage);
      return;
    }

    if (websiteValidationMessage) {
      Alert.alert(copy.websiteUnavailableTitle, websiteValidationMessage);
      return;
    }

    setIsSaving(true);
    const result = await updateProfile({ name, username, headline, bio, website, profileImage });
    setIsSaving(false);
    if (!result.ok) {
      Alert.alert(copy.profileUnavailableTitle, result.message ?? copy.profileSaveFailedBody);
      return;
    }

    Alert.alert(copy.profileUpdated);
    navigation.goBack();
  }

  return (
    <Screen scrollable>
      <SectionTitle title={copy.editProfile} subtitle={copy.tagline} />
      <View style={styles.form}>
        <View style={styles.photoCard}>
          <Image source={{ uri: profileImage || currentUser?.profileImage }} style={styles.photoPreview} />
          <PrimaryButton label={copy.uploadProfilePhoto} onPress={() => void handlePickProfilePhoto()} variant="ghost" />
        </View>
        <InputField autoCapitalize="words" autoCorrect={false} label={copy.fullName} onChangeText={setName} value={name} />
        <InputField
          autoCapitalize="none"
          autoCorrect={false}
          errorText={usernameValidationMessage}
          helperText={copy.usernameRuleHint}
          label={copy.username}
          onChangeText={setUsername}
          value={username}
        />
        <InputField label={copy.headline} onChangeText={setHeadline} value={headline} />
        <InputField label={copy.bioLabel} multiline onChangeText={setBio} value={bio} />
        <InputField
          autoCapitalize="none"
          autoCorrect={false}
          errorText={websiteValidationMessage}
          helperText={copy.websiteRuleHint}
          keyboardType="url"
          label={copy.website}
          onChangeText={setWebsite}
          placeholder={copy.websitePlaceholder}
          value={website}
        />
        <PrimaryButton label={isSaving ? copy.savingProfile : copy.saveChanges} onPress={handleSave} />
      </View>
    </Screen>
  );
}

const styles = createThemedStyles({
  form: {
    gap: spacing.md,
  },
  photoCard: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  photoPreview: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
});
