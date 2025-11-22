import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redis } from '@/lib/redis';

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

    const { postId } = await request.json(); // postId = post:{userId}:{date}
    if (!postId) {
         return NextResponse.json({ message: 'Post ID required' }, { status: 400 });
    }

    // Delete content
    await redis.del(postId);
    // Remove from feed
    await redis.zrem('community:feed:ids', postId);

    return NextResponse.json({ success: true });
}
