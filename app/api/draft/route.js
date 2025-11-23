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

    const key = `drafts:${session.user.id}:${date}`;
    const draft = await redis.get(key);

    // Check published state via Post key
    const postKey = `posts:${session.user.id}:${date}`;
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

    // Check ban status immediately (using user: for Auth/Status related things, keeping it simple or assuming migrated?)
    // The plan didn't mention moving banned status. It's admin stuff. Let's check if we should move it.
    // "Clean up storage method... grouped together".
    // Ideally `users:{id}:banned`.
    // For now, I'll leave it as `user:{id}:banned` or check both?
    // I'll leave it as `user:{id}:banned` since I didn't migrate it.

    const isBanned = await redis.get(`user:${userId}:banned`);
    if (isBanned) {
        return NextResponse.json({ message: 'User is banned' }, { status: 403 });
    }

    const draftKey = `drafts:${userId}:${date}`;
    const postKey = `posts:${userId}:${date}`;
    const feedId = `${userId}:${date}`;

    // 1. Save draft
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

        await redis.set(postKey, feedItem);
        await redis.zadd('community:feed:ids', { score: Date.now(), member: postKey });

        // Add to User's Post Index
        const timestamp = new Date(date).getTime();
        await redis.zadd(`users:${userId}:posts`, { score: timestamp, member: postKey });

    } else if (published === false) {
        // Unpublish
        await redis.del(postKey);
        await redis.zrem('community:feed:ids', postKey);
        await redis.zrem(`users:${userId}:posts`, postKey);
    }
    else {
        // Draft update (auto-update published content if exists)
        const isPublished = await redis.exists(postKey);
        if (isPublished) {
             const feedItem = {
                id: feedId,
                userId: userId,
                userName: session.user.name,
                userImage: session.user.image,
                date: date,
                text: text,
                publishedAt: Date.now()
            };
            await redis.set(postKey, feedItem);
            // Do not bump score in feed?
        }
    }

    // 3. Calculate Stats
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

    if (wordCount >= 150) {
        await redis.sadd(`users:${userId}:activity`, date);
    }

    // Daily Word Count - keep tracking per day?
    // `user:{id}:wordcount:{date}` -> `users:{id}:wordcount:{date}`?
    // Yes, stick to users: namespace.
    const dailyWordCountKey = `users:${userId}:wordcount:${date}`;
    const oldDailyCount = await redis.get(dailyWordCountKey) || 0;
    const diff = wordCount - parseInt(oldDailyCount, 10);

    if (diff !== 0) {
        // Update Hash
        await redis.hincrby(`users:${userId}:stats`, 'totalWords', diff);
        await redis.set(dailyWordCountKey, wordCount);
    }

    // 4. Calculate Streak
    const activityDates = await redis.smembers(`users:${userId}:activity`);
    const sortedDates = activityDates.sort().reverse();

    let currentStreak = 0;

    if (sortedDates.length > 0) {
        const latestDateStr = sortedDates[0];
        const dateSet = new Set(activityDates);
        let cursor = new Date(latestDateStr);
        let tempStreak = 0;

        while (true) {
            const dStr = cursor.toISOString().split('T')[0];
            if (dateSet.has(dStr)) {
                tempStreak++;
                cursor.setUTCDate(cursor.getUTCDate() - 1);
            } else {
                break;
            }
        }

        const today = new Date();
        today.setUTCHours(0,0,0,0);

        const latestDate = new Date(latestDateStr);
        latestDate.setUTCHours(0,0,0,0);

        const diffTime = today - latestDate;
        const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));

        if (diffDays <= 1) {
            currentStreak = tempStreak;
        } else {
             currentStreak = 0;
        }
    }

    await redis.hset(`users:${userId}:stats`, { streak: currentStreak });

    // 5. Check Badges
    // Get stats from Hash
    const statsHash = await redis.hgetall(`users:${userId}:stats`) || {};
    const totalWords = parseInt(statsHash.totalWords || 0, 10);
    const completions = await redis.scard(`users:${userId}:activity`);

    const statsForBadges = {
        completions: completions,
        streak: currentStreak,
        totalWords: totalWords
    };

    const currentBadges = await redis.smembers(`users:${userId}:badges`);
    const newBadges = checkBadges(statsForBadges, currentBadges);

    if (newBadges.length > 0) {
        await redis.sadd(`users:${userId}:badges`, ...newBadges);
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
