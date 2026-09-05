import React, { useLayoutEffect, useState } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { channelsApi, videosApi, youtubeApi } from "../api/client";
import type { VideoJob } from "../api/types";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../theme";
import { timeAgo } from "../utils/timeAgo";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export default function DashboardScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);

  const channelsQuery = useQuery({ queryKey: ["channels"], queryFn: () => channelsApi.list() });
  const channel = channelsQuery.data?.channels[0];

  const videosQuery = useQuery({
    queryKey: ["videos", channel?.id],
    queryFn: () => videosApi.listForChannel(channel!.id),
    enabled: Boolean(channel),
    refetchInterval: 15_000, // pipeline statuses change server-side; poll for progress
  });

  useLayoutEffect(() => {
    if (!channel) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("Settings", { channelId: channel.id })}>
          <Text style={styles.headerAction}>Settings</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, channel]);

  const toggleActive = useMutation({
    mutationFn: () => channelsApi.update(channel!.id, { isActive: !channel!.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channels"] }),
  });

  const generateNow = useMutation({
    mutationFn: () => channelsApi.generateNow(channel!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["videos", channel?.id] }),
  });

  async function handleConnectYoutube() {
    if (!channel) return;
    setConnecting(true);
    try {
      const { authUrl } = await youtubeApi.connectUrl(channel.id);
      await WebBrowser.openBrowserAsync(authUrl);
    } finally {
      setConnecting(false);
      // The user finishes the Google flow in the browser and comes back manually --
      // refresh so a newly-connected channel shows up without needing app restart.
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    }
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["channels"] });
    if (channel) queryClient.invalidateQueries({ queryKey: ["videos", channel.id] });
  }

  if (!channel) return null;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={videosQuery.data?.videos ?? []}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={channelsQuery.isFetching} onRefresh={refresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <View style={styles.card}>
            <Text style={styles.channelLabel}>{channel.label}</Text>
            <Text style={styles.channelNiche} numberOfLines={2}>
              {channel.niche}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Every {channel.postingEveryDays === 1 ? "day" : `${channel.postingEveryDays} days`} ·{" "}
                {channel.postingHourUtc.toString().padStart(2, "0")}:00 UTC
              </Text>
            </View>

            {channel.youtubeConnected ? (
              <View style={styles.connectedRow}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Connected as {channel.youtubeChannelTitle}</Text>
              </View>
            ) : (
              <Button
                title={connecting ? "Opening..." : "Connect YouTube"}
                onPress={handleConnectYoutube}
                loading={connecting}
                style={styles.connectButton}
              />
            )}

            <View style={styles.actionsRow}>
              <Button
                title="Generate now"
                onPress={() => generateNow.mutate()}
                loading={generateNow.isPending}
                disabled={!channel.youtubeConnected}
                style={styles.actionButton}
              />
              <Button
                title={channel.isActive ? "Pause" : "Resume"}
                variant="secondary"
                onPress={() => toggleActive.mutate()}
                loading={toggleActive.isPending}
                style={styles.actionButton}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Videos</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          No videos yet. They'll show up here once the schedule kicks in, or tap "Generate now".
        </Text>
      }
      renderItem={({ item }) => (
        <VideoRow item={item} onPress={() => navigation.navigate("VideoDetail", { videoId: item.id })} />
      )}
    />
  );
}

function VideoRow({ item, onPress }: { item: VideoJob; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.videoRow} onPress={onPress} activeOpacity={0.7}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title ?? "Untitled video"}
        </Text>
        <StatusBadge status={item.status} />
        <Text style={styles.videoTime}>{timeAgo(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  headerAction: { color: colors.primary, fontWeight: "600", marginRight: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  channelLabel: { color: colors.text, fontSize: 20, fontWeight: "800" },
  channelNiche: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  metaRow: { marginTop: spacing.sm },
  metaText: { color: colors.textMuted, fontSize: 13 },
  connectedRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md, gap: 6 },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  connectedText: { color: colors.success, fontWeight: "600", fontSize: 13 },
  connectButton: { marginTop: spacing.md },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: spacing.lg },
  videoRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  thumbnail: { width: 96, height: 72, borderRadius: radii.sm, backgroundColor: colors.border },
  thumbnailPlaceholder: {},
  videoInfo: { flex: 1, justifyContent: "space-between" },
  videoTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  videoTime: { color: colors.textMuted, fontSize: 12 },
});
