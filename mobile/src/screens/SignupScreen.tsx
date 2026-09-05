import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { Screen } from "../components/Screen";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export default function SignupScreen(_: Props) {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signup(email.trim(), password);
      // AuthProvider now has a user -> RootNavigator swaps to the app stack automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Next you'll set up your first auto-posting channel.</Text>

      <Field
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Create account" onPress={handleSubmit} loading={loading} disabled={!email || !password} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.xl },
  error: { color: colors.danger, marginBottom: spacing.md },
});
