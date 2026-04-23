import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from "react-native";
import { palette, radii, spacing } from "../theme";

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType,
  multiline = false,
}: InputFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        keyboardType={keyboardType}
        numberOfLines={multiline ? 4 : 1}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline ? styles.multiline : null]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  label: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: palette.input,
    borderColor: palette.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  multiline: {
    minHeight: 126,
    textAlignVertical: "top",
  },
});
