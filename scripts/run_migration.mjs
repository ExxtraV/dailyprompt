import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL,
  token: process.env.MANUAL_UPSTASH_TOKEN,
});

async function migrate() {
    console.log("Starting migration...");
    const log = [];

    try {
        // 1. Migrate Prompts
        const promptKeys = await redis.keys('prompt:*');
        for (const key of promptKeys) {
            if (key.startsWith('prompts:')) continue;
            const date = key.split(':')[1];
            if (!date) continue;
            const newKey = `prompts:${date}`;
            const val = await redis.get(key);
            if (val) {
                await redis.set(newKey, val);
                await redis.del(key);
                log.push(`Migrated ${key} -> ${newKey}`);
            }
        }

        // 2. Migrate Posts & Build User Post Index
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
            }
        }

        // 3. Migrate Drafts
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
            }
        }

        // 4. Migrate Stats (Total Words)
        const wordKeys = await redis.keys('user:*:stats:totalWords');
        for (const key of wordKeys) {
            const parts = key.split(':');
            const userId = parts[1];
            const val = await redis.get(key);
            if (val) {
                await redis.hset(`users:${userId}:stats`, { totalWords: val });
                await redis.del(key);
                log.push(`Migrated ${key} -> users:${userId}:stats (totalWords)`);
            }
        }

        // 5. Migrate Stats (Streak)
        const streakKeys = await redis.keys('user:*:stats:streak');
        for (const key of streakKeys) {
            const parts = key.split(':');
            const userId = parts[1];
            const val = await redis.get(key);
            if (val) {
                await redis.hset(`users:${userId}:stats`, { streak: val });
                await redis.del(key);
                log.push(`Migrated ${key} -> users:${userId}:stats (streak)`);
            }
        }

        // 6. Migrate Activity Sets
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
                 }
            }
        }

         // 7. Migrate Badges Sets
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
                 }
            }
        }

        // 8. Migrate Daily Word Counts (Fix for double-counting bug)
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
             }
        }

        console.log("Migration Log:", log);
        console.log("Migration completed successfully.");

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();
