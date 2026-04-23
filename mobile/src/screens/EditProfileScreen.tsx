import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { palette, radii, spacing } from "../theme";

export function EditProfileScreen({ navigation }: { navigation: any }) {
  const { language, currentUser, updateProfile } = useAppState();
  const copy = getCopy(language);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [username, setUsername] = useState(currentUser?.username ?? "");
  const [headline, setHeadline] = useState(currentUser?.headline ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage ?? "");

  async function handlePickProfilePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo library access so you can choose your profile photo.");
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
    if (!asset.base64) {
      Alert.alert("Image issue", "The selected photo could not be prepared. Try another image.");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setProfileImage(`data:${mimeType};base64,${asset.base64}`);
  }

  async function handleSave() {
    const result = await updateProfile({ name, username, headline, bio, profileImage });
    if (!result.ok) {
      Alert.alert("Content blocked", result.message ?? "This profile update was blocked.");
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
          <PrimaryButton label="Upload profile photo" onPress={() => void handlePickProfilePhoto()} variant="ghost" />
        </View>
        <InputField label={copy.fullName} onChangeText={setName} value={name} />
        <InputField label={copy.username} onChangeText={setUsername} value={username} />
        <InputField label="Headline" onChangeText={setHeadline} value={headline} />
        <InputField label="Bio" multiline onChangeText={setBio} value={bio} />
        <PrimaryButton label={copy.saveChanges} onPress={handleSave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
