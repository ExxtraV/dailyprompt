import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const adminEmails = process.env.ADMIN_EMAILS || '';
    const admins = adminEmails.split(',').map(e => e.trim());

    if (!admins.includes(session.user.email)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const { postId, pinType } = await req.json();

        // pinType must be "none", "favorite", or "announcement"
        if (!['none', 'favorite', 'announcement'].includes(pinType)) {
             return NextResponse.json({ message: 'Invalid pinType' }, { status: 400 });
        }

        // postId passed from frontend is the slug (e.g. "post:cuid" or just cuid if handled that way)
        // Wait, frontend feed uses slug as ID. But admin dashboard uses `post.id` which is the CUID?
        // Let's check AdminDashboard.js.
        // It uses `const postId = post.id;` (wait, verify AdminDashboard).
        // AdminDashboard uses `const postId = post.id` but keys with `post:${post.id}`.
        // But the delete function used `postId` which was constructed as `post:${post.id}`?
        // Let's re-read AdminDashboard carefully.

        // In AdminDashboard:
        // feed is from /api/community.
        // /api/community returns `id: post.slug`.
        // So post.id IN DASHBOARD is actually the SLUG.

        // But for update, we should probably use the real ID if possible, or query by slug.
        // Since slug is unique, we can update by slug.

        const updatedPost = await prisma.post.update({
            where: {
                slug: postId // Assuming the ID passed is the slug, based on AdminDashboard logic
            },
            data: {
                pinType
            }
        });

        return NextResponse.json(updatedPost);

    } catch (error) {
        console.error("Pin Update Error:", error);
        return NextResponse.json({ message: 'Error updating post' }, { status: 500 });
    }
}
