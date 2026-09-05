import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../components/Screen";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Chip, ChipRow } from "../components/Chip";
import { channelsApi } from "../api/client";
import { colors, spacing } from "../theme";

const LENGTH_OPTIONS = [
  { label: "Short (30s)", value: 30 },
  { label: "Medium (1 min)", value: 60 },
  { label: "Long (3 min)", value: 180 },
  { label: "Extended (10 min)", value: 600 },
];

const FREQUENCY_OPTIONS = [
  { label: "Daily", value: 1 },
  { label: "Every 2 days", value: 2 },
  { label: "Every 3 days", value: 3 },
  { label: "Weekly", value: 7 },
];

const HOUR_OPTIONS = [0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({
  label: `${h.toString().padStart(2, "0")}:00 UTC`,
  value: h,
}));

const STYLE_PRESETS = ["Calm & informative", "Energetic & fun", "Mysterious & dramatic", "Motivational"];

export default function OnboardingScreen() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [niche, setNiche] = useState("");
  const [style, setStyle] = useState("");
  const [videoLengthSec, setVideoLengthSec] = useState(60);
  const [postingEveryDays, setPostingEveryDays] = useState(1);
  const [postingHourUtc, setPostingHourUtc] = useState(15);
  const [error, setError] = useState<string | null>(null);

  const createChannel = useMutation({
    mutationFn: channelsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channels"] }),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create channel"),
  });

  const canSubmit = label.trim().length > 0 && niche.trim().length > 0 && style.trim().length > 0;

  function handleSubmit() {
    setError(null);
    createChannel.mutate({
      label: label.trim(),
      niche: niche.trim(),
      style: style.trim(),
      videoLengthSec,
      postingEveryDays,
      postingHourUtc,
    });
  }

  return (
    <Screen scroll>
      <Text style={styles.intro}>
        Tell us what kind of channel this is. This runs on our server, so videos still get made and posted even
        while the app is closed.
      </Text>

      <Field
        label="Channel name (just for this app)"
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Daily Stoic Clips"
      />

      <Field
        label="What should the videos be about?"
        value={niche}
        onChangeText={setNiche}
        placeholder="e.g. Short motivational stoic philosophy quotes explained calmly, aimed at young professionals"
        multiline
        numberOfLines={4}
        style={styles.multiline}
        hint="Be specific -- this is the brief the AI writes every script from."
      />

      <Text style={styles.label}>Tone / style</Text>
      <ChipRow style={styles.chipSpacing}>
        {STYLE_PRESETS.map((preset) => (
          <Chip key={preset} label={preset} selected={style === preset} onPress={() => setStyle(preset)} />
        ))}
      </ChipRow>
      <Field label="" value={style} onChangeText={setStyle} placeholder="Or write your own tone" />

      <Text style={styles.label}>Video length</Text>
      <ChipRow style={styles.chipSpacing}>
        {LENGTH_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={videoLengthSec === opt.value}
            onPress={() => setVideoLengthSec(opt.value)}
          />
        ))}
      </ChipRow>

      <Text style={styles.label}>How often should we post?</Text>
      <ChipRow style={styles.chipSpacing}>
        {FREQUENCY_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={postingEveryDays === opt.value}
            onPress={() => setPostingEveryDays(opt.value)}
          />
        ))}
      </ChipRow>

      <Text style={styles.label}>Roughly what time (UTC)?</Text>
      <ChipRow style={styles.chipSpacing}>
        {HOUR_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={postingHourUtc === opt.value}
            onPress={() => setPostingHourUtc(opt.value)}
          />
        ))}
      </ChipRow>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.submitSpacing}>
        <Button
          title="Create channel"
          onPress={handleSubmit}
          loading={createChannel.isPending}
          disabled={!canSubmit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.lg, lineHeight: 21 },
  label: { color: colors.text, fontSize: 14, fontWeight: "600", marginBottom: spacing.sm },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  chipSpacing: { marginBottom: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.md },
  submitSpacing: { marginTop: spacing.md, marginBottom: spacing.xl },
});
