import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { redis } from '@/lib/redis';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch basic stats (Mocked calculation for now, in reality we would aggregate this)
    // For MVP, let's say we trust the client to send 'completions' or we scan keys (expensive)
    // Better: Use a 'completions' set in Redis.

    // Let's assume we haven't tracked history yet.
    // We'll return 0 for now, or basic info.

    // In a real app, we'd scan `user:id:draft:*` or maintain a counter.
    // Let's start maintaining a counter in the future.

    // For now, return user info.
    return NextResponse.json({
        user: session.user,
        stats: {
            streak: 0, // We need to migrate local streak to cloud to be real
            totalWords: 0,
            joinDate: new Date().toISOString() // We don't track this yet either
        }
    });
}
