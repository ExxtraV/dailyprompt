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

    const streak = await redis.get(`user:${userId}:stats:streak`) || 0;
    const totalWords = await redis.get(`user:${userId}:stats:totalWords`) || 0;
    const userBadges = await redis.smembers(`user:${userId}:badges`);

    // Hydrate badges with metadata
    const earnedBadges = BADGES.filter(b => userBadges.includes(b.id));

    return NextResponse.json({
        user: session.user,
        stats: {
            streak: parseInt(streak, 10),
            totalWords: parseInt(totalWords, 10),
            joinDate: new Date().toISOString(), // Placeholder
            badges: earnedBadges
        }
    });
}
