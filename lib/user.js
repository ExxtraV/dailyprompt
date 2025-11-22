import { redis } from '@/lib/redis';

export async function updateUserDisplayName(userId, newName) {
    const userKey = `user:${userId}`;

    // 1. Update User Profile
    const userData = await redis.get(userKey);

    if (userData && typeof userData === 'object') {
        const updatedUser = { ...userData, name: newName.trim() };
        await redis.set(userKey, updatedUser);

        // 2. Propagate to all past posts
        // Find all posts by user
        // Using ZSCAN on the feed or SCAN on keys.
        // Since we store posts as `post:{userId}:{date}`, we can scan for that pattern.

        let cursor = 0;
        const pattern = `post:${userId}:*`;
        const postKeys = [];

        do {
            const [newCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
            cursor = newCursor;
            postKeys.push(...keys);
        } while (cursor !== 0 && cursor !== '0');

        if (postKeys.length > 0) {
            // We need to update each post.
            // Since we need to read-modify-write, we do it in a loop or batched.
            // Ideally use Lua script for atomicity, but simple loop is fine for MVP.

            // Fetch all posts
            const posts = await redis.mget(...postKeys);

            // Create a pipeline for updates? Upstash supports pipeline?
            // Yes, redis.pipeline().
            const pipeline = redis.pipeline();

            posts.forEach((post, index) => {
                if (post && typeof post === 'object') {
                    const updatedPost = { ...post, userName: newName.trim() };
                    pipeline.set(postKeys[index], updatedPost);
                }
            });

            if (pipeline._chain && pipeline._chain.length > 0) {
                 await pipeline.exec();
            } else if (posts.length > 0) {
                 // Fallback if pipeline usage matches different version/lib
                 // The @upstash/redis library uses .pipeline() -> .set() -> .exec()
                 await Promise.all(posts.map(async (post, index) => {
                     if (post && typeof post === 'object') {
                         const updatedPost = { ...post, userName: newName.trim() };
                         await redis.set(postKeys[index], updatedPost);
                     }
                 }));
            }
        }
        return true;
    }
    return false;
}

export async function banUser(userId) {
    // 1. Mark as banned
    await redis.set(`user:${userId}:banned`, 'true');

    // 2. Remove content (Delete all posts)
    let cursor = 0;
    const pattern = `post:${userId}:*`;
    const postsToDelete = [];

    // Find posts via ZSCAN on the feed for efficiency in feed removal?
    // Or SCAN for keys?
    // The previous implementation used ZSCAN on 'community:feed:ids'.
    // Let's do that to ensure we clean the Feed ZSET.

    do {
        const [newCursor, members] = await redis.zscan('community:feed:ids', cursor, { match: pattern });
        cursor = newCursor;
        for (let i = 0; i < members.length; i += 2) {
            postsToDelete.push(members[i]);
        }
    } while (cursor !== 0 && cursor !== '0');

    if (postsToDelete.length > 0) {
        await redis.zrem('community:feed:ids', ...postsToDelete);
        await redis.del(...postsToDelete);
    }

    // Also scan for any other keys? (Drafts? We leave drafts, just block access?)
    // User drafts are `user:{id}:draft:{date}`.
    // We don't necessarily need to delete private drafts, just public posts.
    return true;
}

export async function unbanUser(userId) {
    await redis.del(`user:${userId}:banned`);
    // Cannot restore posts.
    return true;
}
