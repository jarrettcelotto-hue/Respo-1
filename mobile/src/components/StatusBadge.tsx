import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import type { VideoStatus } from "../api/types";

const LABELS: Record<VideoStatus, string> = {
  QUEUED: "Queued",
  SCRIPTING: "Writing script",
  SOURCING_IMAGES: "Finding visuals",
  NARRATING: "Recording narration",
  ASSEMBLING: "Assembling video",
  UPLOADING: "Uploading to YouTube",
  POSTED: "Posted",
  FAILED: "Failed",
};

const COLORS: Record<VideoStatus, string> = {
  QUEUED: colors.textMuted,
  SCRIPTING: colors.warning,
  SOURCING_IMAGES: colors.warning,
  NARRATING: colors.warning,
  ASSEMBLING: colors.warning,
  UPLOADING: colors.warning,
  POSTED: colors.success,
  FAILED: colors.danger,
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  const color = COLORS[status];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "600" },
});
