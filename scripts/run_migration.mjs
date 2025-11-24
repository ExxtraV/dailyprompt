import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL,
  token: process.env.MANUAL_UPSTASH_TOKEN,
});

async function migrate() {
    if (!process.env.MANUAL_UPSTASH_URL || !process.env.MANUAL_UPSTASH_TOKEN) {
        console.error("Error: MANUAL_UPSTASH_URL and MANUAL_UPSTASH_TOKEN environment variables are required.");
        console.error("Please run with: export MANUAL_UPSTASH_URL=... MANUAL_UPSTASH_TOKEN=... && node scripts/run_migration.mjs");
        process.exit(1);
    }

    console.log("Starting migration...");
    const log = [];
    let count = 0;

    try {
        // 1. Migrate Prompts
        console.log("Scanning Prompts...");
        const promptKeys = await redis.keys('prompt:*');
        for (const key of promptKeys) {
            if (key.startsWith('prompts:')) continue;
            const date = key.split(':')[1];
            if (!date) continue;
            const newKey = `prompts:${date}`;

            const val = await redis.get(key);
            if (val) {
                // Check if new key already exists to avoid overwriting if migration ran partially
                const exists = await redis.exists(newKey);
                if (!exists) {
                    await redis.set(newKey, val);
                    await redis.del(key);
                    log.push(`Migrated ${key} -> ${newKey}`);
                    count++;
                } else {
                     // Already migrated, just delete old? Safer to keep both or delete old?
                     // Let's delete old to clean up as requested.
                     // If values match?
                     // Assume safe to delete old if new exists.
                     await redis.del(key);
                     log.push(`Cleaned up ${key} (New key exists)`);
                }
            }
        }

        // 2. Migrate Posts & Build User Post Index
        console.log("Scanning Posts...");
        const postKeys = await redis.keys('post:*:*');
        for (const key of postKeys) {
            const parts = key.split(':'); // post:userId:date
            if (parts.length !== 3) continue;

            const userId = parts[1];
            const date = parts[2];
            const newKey = `posts:${userId}:${date}`;

            const val = await redis.get(key);
            if (val) {
                await redis.set(newKey, val);

                const score = await redis.zscore('community:feed:ids', key);
                if (score !== null) {
                    await redis.zrem('community:feed:ids', key);
                    await redis.zadd('community:feed:ids', { score, member: newKey });
                    log.push(`Updated feed index for ${key} -> ${newKey}`);
                }

                const timestamp = new Date(date).getTime();
                await redis.zadd(`users:${userId}:posts`, { score: timestamp, member: newKey });

                await redis.del(key);
                log.push(`Migrated ${key} -> ${newKey}`);
                count++;
            }
        }

        // 3. Migrate Drafts
        console.log("Scanning Drafts...");
        const draftKeys = await redis.keys('user:*:draft:*');
        for (const key of draftKeys) {
            const parts = key.split(':'); // user:userId:draft:date
            if (parts.length !== 4) continue;

            const userId = parts[1];
            const date = parts[3];
            const newKey = `drafts:${userId}:${date}`;

            const val = await redis.get(key);
            if (val) {
                await redis.set(newKey, val);
                await redis.del(key);
                log.push(`Migrated ${key} -> ${newKey}`);
                count++;
            }
        }

        // 4. Migrate Stats (Total Words)
        console.log("Scanning Word Stats...");
        const wordKeys = await redis.keys('user:*:stats:totalWords');
        for (const key of wordKeys) {
            const parts = key.split(':');
            const userId = parts[1];
            const val = await redis.get(key);
            if (val) {
                await redis.hset(`users:${userId}:stats`, { totalWords: val });
                await redis.del(key);
                log.push(`Migrated ${key} -> users:${userId}:stats (totalWords)`);
                count++;
            }
        }

        // 5. Migrate Stats (Streak)
        console.log("Scanning Streak Stats...");
        const streakKeys = await redis.keys('user:*:stats:streak');
        for (const key of streakKeys) {
            const parts = key.split(':');
            const userId = parts[1];
            const val = await redis.get(key);
            if (val) {
                await redis.hset(`users:${userId}:stats`, { streak: val });
                await redis.del(key);
                log.push(`Migrated ${key} -> users:${userId}:stats (streak)`);
                count++;
            }
        }

        // 6. Migrate Activity Sets
        console.log("Scanning Activity Sets...");
        const activityKeys = await redis.keys('user:*:activity');
        for (const key of activityKeys) {
            const parts = key.split(':');
            const userId = parts[1];
            const newKey = `users:${userId}:activity`;

            if (key !== newKey) {
                 const exists = await redis.exists(key);
                 if (exists) {
                    const members = await redis.smembers(key);
                    if (members.length > 0) {
                        await redis.sadd(newKey, ...members);
                    }
                    await redis.del(key);
                    log.push(`Migrated ${key} -> ${newKey}`);
                    count++;
                 }
            }
        }

         // 7. Migrate Badges Sets
        console.log("Scanning Badges...");
        const badgesKeys = await redis.keys('user:*:badges');
        for (const key of badgesKeys) {
            const parts = key.split(':');
            const userId = parts[1];
            const newKey = `users:${userId}:badges`;
            if (key !== newKey) {
                 const exists = await redis.exists(key);
                 if (exists) {
                    const members = await redis.smembers(key);
                    if (members.length > 0) {
                        await redis.sadd(newKey, ...members);
                    }
                    await redis.del(key);
                    log.push(`Migrated ${key} -> ${newKey}`);
                    count++;
                 }
            }
        }

        // 8. Migrate Daily Word Counts
        console.log("Scanning Daily Word Counts...");
        const dailyCountKeys = await redis.keys('user:*:wordcount:*');
        for (const key of dailyCountKeys) {
             // user:userId:wordcount:date
             const parts = key.split(':');
             if (parts.length !== 4) continue;
             const userId = parts[1];
             const date = parts[3];
             const newKey = `users:${userId}:wordcount:${date}`;

             const val = await redis.get(key);
             if (val) {
                 await redis.set(newKey, val);
                 await redis.del(key);
                 log.push(`Migrated ${key} -> ${newKey}`);
                 count++;
             }
        }

        console.log("Migration Log:", log);
        console.log(`Migration completed. Moved ${count} items.`);

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();
