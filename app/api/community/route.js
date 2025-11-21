import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch last 20 items
        const feedRaw = await redis.lrange('community:feed', 0, 19);

        const feed = feedRaw.map(item => {
            // Upstash Redis client might auto-parse JSON, or return strings.
            // We handle both cases to be robust.
            if (typeof item === 'object' && item !== null) {
                return item;
            }
            try {
                return JSON.parse(item);
            } catch (e) {
                console.error("Failed to parse feed item:", item);
                return null;
            }
        }).filter(Boolean);

        return NextResponse.json(feed);
    } catch (error) {
        console.error("Community Feed Error:", error);
        return NextResponse.json([], { status: 500 });
    }
}
