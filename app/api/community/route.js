import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Fetch last 20 items
    const feedRaw = await redis.lrange('community:feed', 0, 19);

    const feed = feedRaw.map(item => {
        try {
            return JSON.parse(item);
        } catch (e) {
            return null;
        }
    }).filter(Boolean);

    return NextResponse.json(feed);
}
