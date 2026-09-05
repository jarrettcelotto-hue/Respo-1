import axios from "axios";
import { API_URL } from "../config";
import type { Channel, ChannelInput, User, VideoJob } from "./types";

export const api = axios.create({ baseURL: API_URL });

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

function unwrapError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.error;
    if (typeof message === "string") return new Error(message);
  }
  return err instanceof Error ? err : new Error("Something went wrong");
}

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export const authApi = {
  signup: (email: string, password: string) =>
    request<{ token: string; user: User }>(() => api.post("/auth/signup", { email, password })),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>(() => api.post("/auth/login", { email, password })),
  me: () => request<{ user: User }>(() => api.get("/auth/me")),
};

export const channelsApi = {
  list: () => request<{ channels: Channel[] }>(() => api.get("/channels")),
  create: (input: ChannelInput) => request<{ channel: Channel }>(() => api.post("/channels", input)),
  get: (id: string) => request<{ channel: Channel }>(() => api.get(`/channels/${id}`)),
  update: (id: string, input: Partial<ChannelInput> & { isActive?: boolean }) =>
    request<{ channel: Channel }>(() => api.patch(`/channels/${id}`, input)),
  remove: (id: string) => request<void>(() => api.delete(`/channels/${id}`)),
  generateNow: (id: string) => request<{ videoJob: VideoJob }>(() => api.post(`/channels/${id}/generate-now`)),
};

export const youtubeApi = {
  connectUrl: (channelId: string) => request<{ authUrl: string }>(() => api.get(`/youtube/connect/${channelId}`)),
  disconnect: (channelId: string) => request<void>(() => api.delete(`/youtube/${channelId}`)),
};

export const videosApi = {
  listForChannel: (channelId: string) =>
    request<{ videos: VideoJob[] }>(() => api.get(`/channels/${channelId}/videos`)),
  get: (id: string) => request<{ video: VideoJob }>(() => api.get(`/videos/${id}`)),
};
