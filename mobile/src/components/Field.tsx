import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, radii, spacing } from "../theme";

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

export function Field({ label, hint, style, ...rest }: FieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { color: colors.text, fontSize: 14, fontWeight: "600", marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontSize: 16,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
