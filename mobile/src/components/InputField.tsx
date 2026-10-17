import { KeyboardTypeOptions, Text, TextInput, TextInputProps, View } from "react-native";
import { palette, radii, spacing, createThemedStyles } from "../theme";

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  helperText?: string;
  errorText?: string | null;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType,
  multiline = false,
  helperText,
  errorText,
  autoCapitalize = "sentences",
  autoCorrect = true,
}: InputFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        multiline={multiline}
        keyboardType={keyboardType}
        numberOfLines={multiline ? 4 : 1}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline ? styles.multiline : null, errorText ? styles.inputError : null]}
        value={value}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = createThemedStyles({
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
  inputError: {
    borderColor: palette.danger,
  },
  multiline: {
    minHeight: 126,
    textAlignVertical: "top",
  },
  helperText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    lineHeight: 18,
  },
});
