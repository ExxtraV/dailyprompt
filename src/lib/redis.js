import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL,
  token: process.env.MANUAL_UPSTASH_TOKEN,
});
