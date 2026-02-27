import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';

export async function PATCH(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !isAdmin(session.user.email)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const { postId, pinType } = await req.json();

        // pinType must be "none", "favorite", or "announcement"
        if (!['none', 'favorite', 'announcement'].includes(pinType)) {
             return NextResponse.json({ message: 'Invalid pinType' }, { status: 400 });
        }

        const updatedPost = await prisma.post.update({
            where: {
                slug: postId // postId here is the slug from AdminDashboard
            },
            data: {
                pinType
            },
            include: { user: true } // Include user to get ID for badge
        });

        // --- Award "Run & Write" Badge if pinned as favorite ---
        if (pinType === 'favorite') {
             const badgeName = 'run_and_write';
             const userId = updatedPost.userId;

             const hasBadge = await prisma.badge.findUnique({
                 where: {
                     userId_name: { userId, name: badgeName }
                 }
             });

             if (!hasBadge) {
                 await prisma.badge.create({
                     data: {
                         userId,
                         name: badgeName
                     }
                 });
             }
        }

        return NextResponse.json(updatedPost);

    } catch (error) {
        console.error("Pin Update Error:", error);
        return NextResponse.json({ message: 'Error updating post' }, { status: 500 });
    }
}
