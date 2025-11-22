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
    // Check ban status
    const isBanned = await redis.get(`user:${userId}:banned`);
    if (isBanned) {
        return NextResponse.json({ message: 'User is banned' }, { status: 403 });
    }

    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

    if (wordCount >= 150) {
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
    const sortedDates = activityDates.sort().reverse();

    let currentStreak = 0;

    if (sortedDates.length > 0) {
        const latestDateStr = sortedDates[0];
        // Instead of comparing against Server Time (which might be UTC tomorrow/yesterday vs User Time),
        // We anchor the streak calculation on the LATEST ACTIVITY DATE itself.
        // Logic: A streak is a contiguous block of dates ending at the latest activity.
        // If the user just saved an activity for "Today" (in their local time), it is now the latest date.
        // So we just count backwards from that latest date.

        // NOTE: This implies if a user skips a day, their streak is preserved until they write again and create a gap?
        // No, the streak is usually "Current Streak".
        // If I write on Monday (Streak 1). Tuesday I don't write. Wednesday I check my profile. Streak should be 0?
        // Or Streak should be 1 (last active)?
        // Usually "Current Streak" implies it is active *now* or *yesterday*.

        // However, since we are inside the POST handler (User is writing NOW),
        // if they just wrote, the latest date IS today (or effectively the active day).
        // So we can safely count backwards from the latest date in the list.

        // BUT, what if they write for a PAST date?
        // sortedDates[0] is the latest date. If they wrote for 2020-01-01, but latest is 2023-10-27.
        // We should count from 2023-10-27.

        // What if they haven't written in a week?
        // If they write TODAY, sortedDates[0] becomes TODAY. Streak is recalculated from TODAY. Correct.
        // If they write for LAST WEEK, sortedDates[0] is still TODAY (if they wrote today). Streak unaffected.

        // So, we just need to walk back from sortedDates[0].
        // Wait, if I wrote Yesterday (Streak 5), and I haven't written Today yet.
        // If I fetch stats (GET), I want to see Streak 5.
        // If I skip today, and fetch stats Tomorrow, I want to see Streak 0.

        // This POST handler updates the stored streak value.
        // If I write Today, my streak becomes valid from Today.

        // So the logic is:
        // 1. Find the most recent date (latestDateStr).
        // 2. Check if this date is "recent enough" to maintain a streak relative to "Now".
        //    Actually, if I am WRITING right now, I am creating activity.
        //    If I write for "Today" (client time), that date becomes the head of the streak.
        //    If I write for "Yesterday" (maybe I forgot), that fills a gap.

        // Let's assume we just calculate the continuous block ending at sortedDates[0].
        // But we must verify that sortedDates[0] is indeed "Today" or "Yesterday" relative to REAL TIME?
        // The user complained that "sometimes it resets to 0".
        // If we enforce a check against Server Time, we risk Timezone bugs.
        // If we DON'T enforce it, a user could have a "Streak of 100" that ended 1 year ago.
        // And if we display that as "Current Streak", it's misleading.

        // Compromise:
        // We calculate the "Potential Streak" ending at sortedDates[0].
        // Then we check: Is sortedDates[0] close to NOW?
        // If yes, that's the streak.
        // If no, the streak is effectively 0 (but we might store the 'record' or just store 0).

        // In this POST handler, we are updating stats AFTER a write.
        // If the user just wrote, they likely updated `activityDates`.
        // So `sortedDates[0]` is likely the date they just wrote (if it's new) or a later one.

        // If I write for `date` = "2023-10-27".
        // If `sortedDates[0]` is "2023-10-27", then we count back from there.
        // This seems correct for a "Streak upon update".

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

        // Now, is this streak "live"?
        // We check the gap between latestDateStr and "Server Today".
        // However, we should be lenient.
        // If the latest date is Today or Yesterday (Server Time), it's valid.
        // If the latest date is "Future" (Client ahead of Server), it's valid.
        // If the latest date is 2 days ago? Then the streak is broken.
        // BUT, if the user just wrote for "2 days ago" (backfilling), and that connected a chain?
        // Then the streak is valid relative to *that date*, but not "Now".
        // But usually users care about "Current Streak".

        // If I backfill 2 days ago, and I haven't written today or yesterday, my "Current Streak" is still 0.
        // But if I backfill yesterday, and I wrote 2 days ago, my streak becomes 2 (active yesterday).

        // Let's use the logic:
        // 1. Calculate the continuous chain from sortedDates[0] backwards.
        // 2. Check if sortedDates[0] is >= Yesterday (Server Time).

        const today = new Date();
        today.setUTCHours(0,0,0,0);

        const latestDate = new Date(latestDateStr);
        latestDate.setUTCHours(0,0,0,0);

        const diffTime = today - latestDate;
        const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));

        // If the latest activity is Today (0), Yesterday (1), or Future (<0), keeping the streak.
        // If it's older (diffDays >= 2), then the "Current Streak" is 0.
        if (diffDays <= 1) {
            currentStreak = tempStreak;
        } else {
             currentStreak = 0;
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
