import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch last 20 IDs from ZSET (Reverse order: newest first)
        const postKeys = await redis.zrange('community:feed:ids', 0, 19, { rev: true });

        if (postKeys.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Fetch content for these keys
        const posts = await redis.mget(...postKeys);

        // 3. Filter and format
        // Upstash MGET returns an array of values (objects if JSON, or strings)
        const feed = posts.filter(Boolean);

        return NextResponse.json(feed);
    } catch (error) {
        console.error("Community Feed Error:", error);
        return NextResponse.json([], { status: 500 });
    }
}
