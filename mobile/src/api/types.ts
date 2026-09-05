export interface User {
  id: string;
  email: string;
}

export interface Channel {
  id: string;
  userId: string;
  label: string;
  niche: string;
  videoLengthSec: number;
  style: string;
  postingEveryDays: number;
  postingHourUtc: number;
  isActive: boolean;
  youtubeChannelId: string | null;
  youtubeChannelTitle: string | null;
  youtubeConnectedAt: string | null;
  youtubeConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus =
  | "QUEUED"
  | "SCRIPTING"
  | "SOURCING_IMAGES"
  | "NARRATING"
  | "ASSEMBLING"
  | "UPLOADING"
  | "POSTED"
  | "FAILED";

export interface VideoJob {
  id: string;
  channelId: string;
  status: VideoStatus;
  title: string | null;
  description: string | null;
  script: unknown;
  errorMessage: string | null;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  scheduledFor: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelInput {
  label: string;
  niche: string;
  videoLengthSec: number;
  style: string;
  postingEveryDays: number;
  postingHourUtc: number;
}
