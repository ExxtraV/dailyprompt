import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, image } = body; // Added image support

    if ((!name || name.trim().length === 0) && !image) {
        return NextResponse.json({ message: 'Name or Image is required' }, { status: 400 });
    }

    const userId = session.user.id;

    try {
        const dataToUpdate = {};
        if (name && name.trim().length > 0) dataToUpdate.name = name.trim();
        if (image && image.trim().length > 0) dataToUpdate.image = image.trim();

        await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate
        });

        return NextResponse.json({ success: true, ...dataToUpdate });
    } catch (error) {
        console.error("Update Profile Error:", error);
        return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }
}
