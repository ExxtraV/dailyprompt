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

    // Check published state via Post key
    const postKey = `post:${session.user.id}:${date}`;
    const postExists = await redis.exists(postKey);

    return NextResponse.json({ text: draft || '', published: postExists === 1 });
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
    const postKey = `post:${userId}:${date}`; // Stores the feed item content
    const feedId = `${userId}:${date}`;

    // 1. Save draft (Always save the raw text to the user's private draft)
    await redis.set(draftKey, text);

    // 2. Handle Publishing / Unpublishing / Updating
    if (published === true) {
        const feedItem = {
            id: feedId,
            userId: userId,
            userName: session.user.name,
            userImage: session.user.image,
            date: date,
            text: text,
            publishedAt: Date.now()
        };

        // Update content
        await redis.set(postKey, feedItem);
        // Ensure it is in the feed (Update score to now to bump? Or keep original time? Let's bump for now or keep original)
        // Ideally: Keep original publish time if just editing.
        // We can check if it exists in ZSET. For MVP, let's just add/update score to NOW (bump to top on edit).
        await redis.zadd('community:feed:ids', { score: Date.now(), member: postKey });

    } else if (published === false) {
        // Unpublish
        await redis.del(postKey);
        await redis.zrem('community:feed:ids', postKey);
    }
    // If published is undefined, we assume it's a draft save.
    // If the post ALREADY exists (was published), we should update the content silently without bumping score?
    // Or should we require explicit 're-publish'?
    // Let's auto-update content if it IS published.
    else {
        const isPublished = await redis.exists(postKey);
        if (isPublished) {
             const feedItem = {
                id: feedId,
                userId: userId,
                userName: session.user.name,
                userImage: session.user.image,
                date: date,
                text: text,
                publishedAt: Date.now() // Updating timestamp? Maybe preserve?
            };
            // Update the content, do NOT touch the ZSET score (maintains feed position)
            await redis.set(postKey, feedItem);
        }
    }

    // 3. Calculate Stats
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

    // 4. Calculate Streak
    const activityDates = await redis.smembers(`user:${userId}:activity`);
    const dateSet = new Set(activityDates);

    let currentStreak = 0;
    let cursor = new Date();

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
