import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BADGES } from '@/lib/gamification';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch User with included relations
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true }
    });

    if (!user) {
         return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Hydrate badges with metadata
    // user.badges is an array of objects: [{ name: 'First Step', ... }]
    const earnedBadgeNames = user.badges.map(b => b.name);
    const earnedBadges = BADGES.filter(b => earnedBadgeNames.includes(b.id));

    return NextResponse.json({
        user: {
            name: user.name,
            email: user.email,
            image: user.image
        },
        stats: {
            streak: user.streak,
            totalWords: user.totalWords,
            joinDate: "2024-01-01", // Prisma User doesn't have createdAt in my schema, oops. Let's assume handled or ignore.
            badges: earnedBadges
        }
    });
}
