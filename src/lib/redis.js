import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL || 'https://mock-url.upstash.io',
  token: process.env.MANUAL_UPSTASH_TOKEN || 'mock-token',
});
