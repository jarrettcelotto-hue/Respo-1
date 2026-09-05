import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { channelsApi, youtubeApi } from "../api/client";
import { Screen } from "../components/Screen";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Chip, ChipRow } from "../components/Chip";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

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

export default function SettingsScreen({ route }: Props) {
  const { channelId } = route.params;
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const channelQuery = useQuery({ queryKey: ["channel", channelId], queryFn: () => channelsApi.get(channelId) });
  const channel = channelQuery.data?.channel;

  const [label, setLabel] = useState(channel?.label ?? "");
  const [niche, setNiche] = useState(channel?.niche ?? "");
  const [style, setStyle] = useState(channel?.style ?? "");
  const [videoLengthSec, setVideoLengthSec] = useState(channel?.videoLengthSec ?? 60);
  const [postingEveryDays, setPostingEveryDays] = useState(channel?.postingEveryDays ?? 1);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!channel || initialized) return;
    setLabel(channel.label);
    setNiche(channel.niche);
    setStyle(channel.style);
    setVideoLengthSec(channel.videoLengthSec);
    setPostingEveryDays(channel.postingEveryDays);
    setInitialized(true);
  }, [channel, initialized]);

  function invalidateChannel() {
    queryClient.invalidateQueries({ queryKey: ["channel", channelId] });
    queryClient.invalidateQueries({ queryKey: ["channels"] });
  }

  const save = useMutation({
    mutationFn: () => channelsApi.update(channelId, { label, niche, style, videoLengthSec, postingEveryDays }),
    onSuccess: invalidateChannel,
  });

  const disconnectYoutube = useMutation({
    mutationFn: () => youtubeApi.disconnect(channelId),
    onSuccess: invalidateChannel,
  });

  const removeChannel = useMutation({
    mutationFn: () => channelsApi.remove(channelId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channels"] }),
  });

  function confirmDisconnect() {
    Alert.alert("Disconnect YouTube?", "New videos won't be posted until you reconnect.", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: () => disconnectYoutube.mutate() },
    ]);
  }

  function confirmDelete() {
    Alert.alert("Delete this channel?", "This removes its config and video history. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeChannel.mutate() },
    ]);
  }

  if (!channel) return null;

  return (
    <Screen scroll>
      <Field label="Channel name" value={label} onChangeText={setLabel} />
      <Field label="Content brief" value={niche} onChangeText={setNiche} multiline numberOfLines={4} style={styles.multiline} />
      <Field label="Tone / style" value={style} onChangeText={setStyle} />

      <Text style={styles.label}>Video length</Text>
      <ChipRow style={styles.chipSpacing}>
        {LENGTH_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} selected={videoLengthSec === opt.value} onPress={() => setVideoLengthSec(opt.value)} />
        ))}
      </ChipRow>

      <Text style={styles.label}>Posting frequency</Text>
      <ChipRow style={styles.chipSpacing}>
        {FREQUENCY_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} selected={postingEveryDays === opt.value} onPress={() => setPostingEveryDays(opt.value)} />
        ))}
      </ChipRow>

      <Button title="Save changes" onPress={() => save.mutate()} loading={save.isPending} style={styles.spaced} />

      <View style={styles.divider} />

      {channel.youtubeConnected ? (
        <Button
          title="Disconnect YouTube"
          variant="danger"
          onPress={confirmDisconnect}
          loading={disconnectYoutube.isPending}
          style={styles.spaced}
        />
      ) : (
        <Text style={styles.mutedNote}>YouTube isn't connected. Connect it from the dashboard.</Text>
      )}

      <Button title="Delete channel" variant="danger" onPress={confirmDelete} loading={removeChannel.isPending} style={styles.spaced} />

      <View style={styles.divider} />

      <Button title="Log out" variant="secondary" onPress={() => logout()} style={styles.spaced} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontSize: 14, fontWeight: "600", marginBottom: spacing.sm },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  chipSpacing: { marginBottom: spacing.md },
  spaced: { marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  mutedNote: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
});
