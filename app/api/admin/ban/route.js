import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redis } from '@/lib/redis';

function isAdmin(email) {
    const adminEmails = process.env.ADMIN_EMAILS || '';
    const admins = adminEmails.split(',').map(e => e.trim());
    return admins.includes(email);
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdmin(session.user.email)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
         return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    // 1. Mark as banned
    await redis.set(`user:${userId}:banned`, 'true');

    // 2. Remove content
    const activityDates = await redis.smembers(`user:${userId}:activity`);

    for (const date of activityDates) {
        const postKey = `post:${userId}:${date}`;
        // Delete content
        await redis.del(postKey);
        // Remove from feed
        await redis.zrem('community:feed:ids', postKey);
    }

    return NextResponse.json({ success: true });
}
