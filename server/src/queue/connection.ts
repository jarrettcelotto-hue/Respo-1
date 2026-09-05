import IORedis from "ioredis";
import { env } from "../env";

// BullMQ requires this exact option on the shared connection.
export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});
