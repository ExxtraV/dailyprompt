import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redis } from '@/lib/redis';
import { BADGES } from '@/lib/gamification';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const statsHash = await redis.hgetall(`users:${userId}:stats`) || {};
    const streak = statsHash.streak || 0;
    const totalWords = statsHash.totalWords || 0;
    const userBadges = await redis.smembers(`users:${userId}:badges`);

    // Fetch Fresh User Data (Name might have changed)
    const userData = await redis.get(`user:${userId}`);
    let displayUser = session.user;

    if (userData && userData.name) {
        displayUser = { ...session.user, name: userData.name };
    }

    // Hydrate badges with metadata
    const earnedBadges = BADGES.filter(b => userBadges.includes(b.id));

    return NextResponse.json({
        user: displayUser,
        stats: {
            streak: parseInt(streak, 10),
            totalWords: parseInt(totalWords, 10),
            joinDate: new Date().toISOString(), // Placeholder
            badges: earnedBadges
        }
    });
}
