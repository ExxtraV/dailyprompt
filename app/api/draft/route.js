import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redis } from '@/lib/redis';
import { checkBadges } from '@/lib/gamification';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ message: 'Date required' }, { status: 400 });
    }

    const key = `user:${session.user.id}:draft:${date}`;
    const draft = await redis.get(key);

    // Also check if it was published
    // (Optional optimization: store isPublished in a key or return based on feed presence)
    // For MVP, we assume client state manages the toggle until reload,
    // OR we store metadata. Let's store metadata in a separate key or JSON.
    // MVP: Just return text. Client will default to unpublished on reload (minor UX issue)
    // Better: Store `user:{id}:meta:{date}` -> { published: true }
    const metaKey = `user:${session.user.id}:meta:${date}`;
    const meta = await redis.get(metaKey) || {};

    return NextResponse.json({ text: draft || '', published: meta.published || false });
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, text, published } = body;

    if (!date || text === undefined) {
        return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const userId = session.user.id;
    const draftKey = `user:${userId}:draft:${date}`;
    const metaKey = `user:${userId}:meta:${date}`;

    // 1. Save draft
    await redis.set(draftKey, text);

    // Save Metadata (Published state)
    if (published !== undefined) {
        await redis.set(metaKey, { published });

        if (published) {
            // Add to Community Feed
            const feedItem = {
                id: `${userId}-${date}`,
                userId: userId,
                userName: session.user.name,
                userImage: session.user.image,
                date: date,
                text: text, // Store full text or snippet? Let's store full for now.
                publishedAt: Date.now()
            };
            // Push to list (Head)
            await redis.lpush('community:feed', JSON.stringify(feedItem));
            // Trim list to keep only last 100 items to save space
            await redis.ltrim('community:feed', 0, 99);
        }
    }

    // 2. Calculate Stats
    const wordCount = text.trim().split(/\s+/).length || 0;

    if (wordCount > 5) {
        await redis.sadd(`user:${userId}:activity`, date);
    }

    const dailyWordCountKey = `user:${userId}:wordcount:${date}`;
    const oldDailyCount = await redis.get(dailyWordCountKey) || 0;
    const diff = wordCount - parseInt(oldDailyCount, 10);

    if (diff !== 0) {
        await redis.incrby(`user:${userId}:stats:totalWords`, diff);
        await redis.set(dailyWordCountKey, wordCount);
    }

    // 4. Calculate Streak (Simple Logic)
    const activityDates = await redis.smembers(`user:${userId}:activity`);
    const dateSet = new Set(activityDates);

    let currentStreak = 0;
    let cursor = new Date();

    // Check today and go backwards
    while (true) {
        const dStr = cursor.toISOString().split('T')[0];
        if (dateSet.has(dStr)) {
            currentStreak++;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }

    await redis.set(`user:${userId}:stats:streak`, currentStreak);

    // 5. Check Badges
    const totalWords = await redis.get(`user:${userId}:stats:totalWords`) || 0;
    const completions = await redis.scard(`user:${userId}:activity`);

    const statsForBadges = {
        completions: completions,
        streak: currentStreak,
        totalWords: parseInt(totalWords, 10)
    };

    const currentBadges = await redis.smembers(`user:${userId}:badges`);
    const newBadges = checkBadges(statsForBadges, currentBadges);

    if (newBadges.length > 0) {
        await redis.sadd(`user:${userId}:badges`, ...newBadges);
    }

    return NextResponse.json({
        success: true,
        stats: {
            words: wordCount,
            streak: currentStreak,
            newBadges: newBadges
        }
    });
}
