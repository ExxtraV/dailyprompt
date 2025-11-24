import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { BADGES } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    const { userId } = await params;

    // 1. Fetch User Basic Info (Auth)
    // Note: `user:{id}` is the NextAuth key. It contains name, email, image.
    const userData = await redis.get(`user:${userId}`);

    if (!userData) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Filter sensitive data
    const safeUser = {
        id: userId,
        name: userData.name,
        image: userData.image,
        // Do NOT include email
    };

    // 2. Fetch Stats (Consolidated Hash)
    const statsHash = await redis.hgetall(`users:${userId}:stats`) || {};
    const streak = parseInt(statsHash.streak || 0, 10);
    const totalWords = parseInt(statsHash.totalWords || 0, 10);

    // 3. Fetch Badges
    const userBadges = await redis.smembers(`users:${userId}:badges`);
    const earnedBadges = BADGES.filter(b => userBadges.includes(b.id));

    // 4. Fetch Published Posts
    // Use the new ZSET index: `users:{userId}:posts`
    // Get all posts, reverse ordered (newest first)
    const postKeys = await redis.zrange(`users:${userId}:posts`, 0, -1, { rev: true });

    let posts = [];
    if (postKeys.length > 0) {
        const rawPosts = await redis.mget(...postKeys);
        posts = rawPosts.filter(Boolean);
    }

    return NextResponse.json({
        user: safeUser,
        stats: {
            streak,
            totalWords,
            badges: earnedBadges
        },
        posts
    });
}
