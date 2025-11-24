import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isAdmin(email) {
    const adminEmails = process.env.ADMIN_EMAILS || '';
    const admins = adminEmails.split(',').map(e => e.trim());
    return admins.includes(email);
}

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdmin(session.user.email)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' }
        });

        const safeUsers = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.image,
            isBanned: u.isBanned // Now using the real field
        }));

        return NextResponse.json(safeUsers);

    } catch (error) {
        console.error("Admin Users Error:", error);
        return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
    }
}

export async function PATCH(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdmin(session.user.email)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, name, isBanned } = body;

    if (!userId) {
        return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    try {
        const data = {};
        if (name !== undefined) data.name = name;
        if (isBanned !== undefined) data.isBanned = isBanned;

        await prisma.user.update({
            where: { id: userId },
            data: data
        });

        // If banning, maybe unpublish their posts?
        // For now, we just stop them from posting new things.
        // But let's optionally unpublish all their posts if banned?
        // The prompt didn't strictly say so, but usually that's desired.
        // I'll stick to just the banning flag for now.

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin Update Error:", error);
        return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }
}
