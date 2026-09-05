import React from "react";
import { Image, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { videosApi } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";
import { colors, radii, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "VideoDetail">;

interface ScriptScene {
  narration: string;
  imageQuery: string;
}
interface ScriptShape {
  title?: string;
  description?: string;
  tags?: string[];
  scenes?: ScriptScene[];
}

const TERMINAL_STATUSES = new Set(["POSTED", "FAILED"]);

export default function VideoDetailScreen({ route }: Props) {
  const { videoId } = route.params;

  const videoQuery = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => videosApi.get(videoId),
    refetchInterval: (query) => (query.state.data && TERMINAL_STATUSES.has(query.state.data.video.status) ? false : 5_000),
  });

  const video = videoQuery.data?.video;
  if (!video) return null;

  const script = (video.script ?? null) as ScriptShape | null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {video.thumbnailUrl ? <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} /> : null}

      <StatusBadge status={video.status} />
      <Text style={styles.title}>{video.title ?? "Untitled video"}</Text>

      {video.status === "FAILED" && video.errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>This attempt failed</Text>
          <Text style={styles.errorText}>{video.errorMessage}</Text>
        </View>
      ) : null}

      {video.description ? <Text style={styles.description}>{video.description}</Text> : null}

      {video.youtubeUrl ? (
        <Button title="Open on YouTube" onPress={() => Linking.openURL(video.youtubeUrl!)} style={styles.openButton} />
      ) : null}

      {script?.scenes?.length ? (
        <View style={styles.scenesSection}>
          <Text style={styles.sectionTitle}>Script</Text>
          {script.scenes.map((scene, i) => (
            <View key={i} style={styles.sceneCard}>
              <Text style={styles.sceneIndex}>Scene {i + 1}</Text>
              <Text style={styles.sceneNarration}>{scene.narration}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  thumbnail: { width: "100%", aspectRatio: 16 / 9, borderRadius: radii.md, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.sm },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  errorBox: {
    backgroundColor: "#3A1A1A",
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorTitle: { color: colors.danger, fontWeight: "700", marginBottom: spacing.xs },
  errorText: { color: colors.text, fontSize: 13 },
  openButton: { marginBottom: spacing.lg },
  scenesSection: { marginTop: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
  sceneCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sceneIndex: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: spacing.xs },
  sceneNarration: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
