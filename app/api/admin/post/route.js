import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isAdmin(email) {
    const adminEmails = process.env.ADMIN_EMAILS || '';
    const admins = adminEmails.split(',').map(e => e.trim());
    return admins.includes(email);
}

export async function DELETE(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdmin(session.user.email)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { postId } = body;

        if (!postId) {
            return NextResponse.json({ message: 'Post ID required' }, { status: 400 });
        }

        // The frontend sends "post:{id}" from the old redis logic (seen in AdminDashboard.js)
        // We need to clean this up to just get the ID (the slug or the CUID)
        // Looking at app/api/community/route.js, the `id` returned in the feed is `post.slug`.
        // Looking at AdminDashboard.js, it does `const postId = post:${post.id};`.
        // So we likely receive `post:some-slug-here`.

        const cleanId = postId.replace('post:', '');

        // Delete by slug (since that's what we use as ID in the community feed mostly)
        // OR by ID. The community route returns `id: post.slug`.
        // Let's try to delete by slug first.

        await prisma.post.delete({
            where: { slug: cleanId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin Delete Post Error:", error);
        // Try deleting by ID if slug failed? No, slug is unique.
        return NextResponse.json({ message: 'Failed to delete post' }, { status: 500 });
    }
}
