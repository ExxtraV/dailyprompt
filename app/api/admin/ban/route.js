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
    // We need to find all posts by this user in the feed, not just those in 'activity' (which only tracks >150 words).
    // ZSCAN is the way to find members in a ZSET.
    // Pattern: post:{userId}:*

    let cursor = 0;
    const pattern = `post:${userId}:*`;
    const postsToDelete = [];

    do {
        // ZSCAN key cursor MATCH pattern
        const [newCursor, members] = await redis.zscan('community:feed:ids', cursor, { match: pattern });
        cursor = newCursor;

        // members is an array of [member, score, member, score...]
        for (let i = 0; i < members.length; i += 2) {
            postsToDelete.push(members[i]);
        }
    } while (cursor !== 0 && cursor !== '0'); // Upstash might return string '0'

    if (postsToDelete.length > 0) {
        // 1. Remove from ZSET
        await redis.zrem('community:feed:ids', ...postsToDelete);
        // 2. Delete the actual post keys
        await redis.del(...postsToDelete);
    }

    return NextResponse.json({ success: true });
}
