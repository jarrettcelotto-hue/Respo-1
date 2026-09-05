import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { Screen } from "../components/Screen";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>AI Auto Poster</Text>
      <Text style={styles.subtitle}>Log in to manage your channel</Text>

      <Field
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />
      <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Log in" onPress={handleSubmit} loading={loading} disabled={!email || !password} />

      <Button
        title="Create an account"
        variant="secondary"
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Signup")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 32, fontWeight: "800", marginTop: spacing.xl, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.xl },
  error: { color: colors.danger, marginBottom: spacing.md },
  secondaryButton: { marginTop: spacing.sm },
});
