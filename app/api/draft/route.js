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

    return NextResponse.json({ text: draft || '' });
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, text } = body;

    if (!date || text === undefined) {
        return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const userId = session.user.id;
    const draftKey = `user:${userId}:draft:${date}`;

    // 1. Save draft
    await redis.set(draftKey, text);

    // 2. Calculate Stats
    const wordCount = text.trim().split(/\s+/).length || 0;

    // Update activity set (dates user has written)
    // We only count activity if they wrote something substantial (e.g., > 10 words)
    // For now, let's count any save as activity to be generous, or maybe > 5 words.
    if (wordCount > 5) {
        await redis.sadd(`user:${userId}:activity`, date);
    }

    // 3. Update Total Words (This is tricky because we are overwriting drafts)
    // A simple incrementer `incrby` is dangerous if we save multiple times per draft.
    // BETTER APPROACH: Store the word count of *this specific draft* in a separate key,
    // and calculate total words by summing all draft word counts, OR:
    // Keep a running total? No, running total breaks on edits.
    // Compromise: We will just track "Total Words Written" as a monotonically increasing stat
    // whenever they *finish* or *significantly update*.
    // ACTUALLY: Let's just calculate total words on the fly or update a "max word count for this date" and sum those?
    // Too complex for MVP.
    // SIMPLEST MVP: Just increment a counter every time they save *new* words? No.
    // Let's just estimate: We will store `user:{userId}:wordcount:{date}` with the current count.
    // And `user:{userId}:stats` can hold the sum.
    // On every save:
    //   old_count = get `user:{userId}:wordcount:{date}`
    //   diff = new_count - old_count
    //   incrby `user:{userId}:stats:totalWords` diff
    //   set `user:{userId}:wordcount:{date}` new_count

    const dailyWordCountKey = `user:${userId}:wordcount:${date}`;
    const oldDailyCount = await redis.get(dailyWordCountKey) || 0;
    const diff = wordCount - parseInt(oldDailyCount, 10);

    if (diff !== 0) {
        await redis.incrby(`user:${userId}:stats:totalWords`, diff);
        await redis.set(dailyWordCountKey, wordCount);
    }

    // 4. Calculate Streak
    // Fetch all activity dates
    const activityDates = await redis.smembers(`user:${userId}:activity`);
    const sortedDates = activityDates.sort(); // YYYY-MM-DD sorts correctly as string

    let streak = 0;
    let currentStreak = 0;
    // Simple streak calc: iterate backwards from today
    // Actually, we need to parse dates to check adjacency.

    // Set for O(1) lookup
    const dateSet = new Set(activityDates);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If they wrote today, start streak at 1. If not, but wrote yesterday, start at 0 (will be 1 after check).
    // Actually, logic:
    // Check today. If yes, streak = 1. Check yesterday. If yes, streak++. etc.
    // If today is missing, check yesterday. If yes, streak = 1...

    let cursor = new Date();
    // Start checking from today
    let checkStr = cursor.toISOString().split('T')[0];

    // If user hasn't written today yet (or just saved now), we start from today.
    // If they haven't written today, streak might be active from yesterday.

    // We just saved, so today IS active.
    currentStreak = 0;
    while (true) {
        const dStr = cursor.toISOString().split('T')[0];
        if (dateSet.has(dStr)) {
            currentStreak++;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            // If we miss a day, streak breaks.
            break;
        }
    }

    // Save streak
    await redis.set(`user:${userId}:stats:streak`, currentStreak);

    // 5. Check Badges
    const totalWords = await redis.get(`user:${userId}:stats:totalWords`) || 0;
    const completions = await redis.scard(`user:${userId}:activity`); // Approximation: days active = completions

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
