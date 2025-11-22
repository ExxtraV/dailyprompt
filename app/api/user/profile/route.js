import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redis } from '@/lib/redis';

export async function PATCH(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
        return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const userId = session.user.id;
    const userKey = `user:${userId}`;

    // The @auth/upstash-redis-adapter stores the user as a generic object (JSON?) or hash?
    // It usually stores as a Hash if using 'hset' or JSON if 'set'.
    // Let's check how we initialized. We used `UpstashRedisAdapter(redis)`.
    // By default, the adapter determines storage.
    // However, updating via `redis.set` might overwrite other fields if it's a blob.
    // Safer: Get, Update, Set.

    // NOTE: The adapter implementation details matter.
    // If I change it manually, I might break it if I don't match the schema.
    // Usually it's: { name, email, image, emailVerified }

    // Let's try to fetch it first.
    const userData = await redis.get(userKey);

    if (userData && typeof userData === 'object') {
        // It's likely a JSON object.
        const updatedUser = { ...userData, name: name.trim() };
        await redis.set(userKey, updatedUser);

        // Propagate name change to all past posts
        // 1. Get all activity dates
        const activityDates = await redis.smembers(`user:${userId}:activity`);

        // 2. Iterate and update
        // Use Promise.all for concurrency, but limit if array is huge (unlikely for now)
        await Promise.all(activityDates.map(async (date) => {
            const postKey = `post:${userId}:${date}`;
            const postData = await redis.get(postKey);

            if (postData && typeof postData === 'object') {
                const updatedPost = { ...postData, userName: name.trim() };
                // We only need to update the object, the ZSET contains the key reference
                await redis.set(postKey, updatedPost);
            }
        }));

    } else {
        // If it's mostly string or null, this approach is risky.
        // But since we are using the standard adapter, it's likely JSON.
        // Let's assume JSON for now.
        // If authentication breaks, I will revert.
        // A safer bet is to just update our own "metadata" if we don't want to touch auth.
        // BUT the user wants to change their "Display Name".
        // Let's risk the update.
        return NextResponse.json({ message: 'User update not fully supported without verifying storage format' }, { status: 501 });
    }

    return NextResponse.json({ success: true, name: name.trim() });
}
