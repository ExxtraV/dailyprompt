import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BADGES } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    const { userId } = await params;

    // Fetch User with Relations
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            badges: true,
            posts: {
                where: { published: true },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Filter sensitive data
    const safeUser = {
        id: userId,
        name: user.name,
        image: user.image,
    };

    // Hydrate badges
    const earnedBadgeNames = user.badges.map(b => b.name);
    const earnedBadges = BADGES.filter(b => earnedBadgeNames.includes(b.id));

    // Format posts
    const posts = user.posts.map(post => ({
        id: post.id,
        slug: post.slug,
        date: post.date,
        text: post.content,
        publishedAt: post.createdAt
    }));

    return NextResponse.json({
        user: safeUser,
        stats: {
            streak: user.streak,
            totalWords: user.totalWords,
            badges: earnedBadges
        },
        posts
    });
}
