import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    const post = await prisma.post.findFirst({
        where: {
            userId: session.user.id,
            date: date
        }
    });

    return NextResponse.json({
        text: post?.content || '',
        published: post?.published || false
    });
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user is banned
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isBanned: true }
    });

    if (user?.isBanned) {
        return NextResponse.json({ message: 'User is banned' }, { status: 403 });
    }

    const body = await request.json();
    const { date, text, published } = body;

    if (!date || text === undefined) {
        return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

    // Create or Update Post
    const post = await prisma.post.upsert({
        where: {
             slug: `${userId.replace(/[^a-zA-Z0-9]/g, '-')}-${date}`
        },
        update: {
            content: text,
            wordCount: wordCount,
            published: published !== undefined ? published : undefined, // Only update if provided
        },
        create: {
            userId: userId,
            date: date,
            slug: `${userId.replace(/[^a-zA-Z0-9]/g, '-')}-${date}`,
            content: text,
            wordCount: wordCount,
            published: published || false
        }
    });

    // --- Stats Calculation ---
    // (Rest of the stats calculation remains the same)

    // 1. Total Words
    const totalWordsResult = await prisma.post.aggregate({
        where: { userId: userId },
        _sum: { wordCount: true }
    });
    const totalWords = totalWordsResult._sum.wordCount || 0;

    // 2. Streak
    const activePosts = await prisma.post.findMany({
        where: {
            userId: userId,
            wordCount: { gte: 150 }
        },
        select: { date: true },
        orderBy: { date: 'desc' }
    });

    const sortedDates = activePosts.map(p => p.date);
    let currentStreak = 0;

    if (sortedDates.length > 0) {
        const dateSet = new Set(sortedDates);
        const latestDateStr = sortedDates[0];
        const latestDate = new Date(latestDateStr);
        const today = new Date();
        today.setUTCHours(0,0,0,0);
        latestDate.setUTCHours(0,0,0,0);

        const diffTime = today - latestDate;
        const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));

        if (diffDays <= 1) {
            let tempStreak = 0;
            let checkDate = new Date(latestDateStr);
            while (true) {
                const dStr = checkDate.toISOString().split('T')[0];
                if (dateSet.has(dStr)) {
                    tempStreak++;
                    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
                } else {
                    break;
                }
            }
            currentStreak = tempStreak;
        } else {
            currentStreak = 0;
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            totalWords: totalWords,
            streak: currentStreak,
            lastActive: new Date()
        }
    });

    // --- Badges ---
    const completions = activePosts.length;

    const statsForBadges = {
        completions: completions,
        streak: currentStreak,
        totalWords: totalWords
    };

    const existingBadges = await prisma.badge.findMany({
        where: { userId: userId },
        select: { name: true }
    });
    const currentBadgeNames = existingBadges.map(b => b.name);

    const newBadgeNames = checkBadges(statsForBadges, currentBadgeNames);

    if (newBadgeNames.length > 0) {
        await prisma.badge.createMany({
            data: newBadgeNames.map(name => ({
                userId: userId,
                name: name
            }))
        });
    }

    return NextResponse.json({
        success: true,
        stats: {
            words: wordCount,
            streak: currentStreak,
            newBadges: newBadgeNames
        }
    });
}
