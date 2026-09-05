import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewProps } from "react-native";
import { colors, spacing } from "../theme";

/** Consistent full-screen background + safe padding + keyboard avoidance for form screens. */
export function Screen({ children, scroll = false, style, ...rest }: ViewProps & { scroll?: boolean }) {
  const Container = scroll ? ScrollView : View;
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Container
        style={scroll ? styles.scrollContent : [styles.flex, styles.padded]}
        contentContainerStyle={scroll ? styles.padded : undefined}
        {...rest}
      >
        {children}
      </Container>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flex: 1, backgroundColor: colors.background },
  padded: { padding: spacing.lg },
});
