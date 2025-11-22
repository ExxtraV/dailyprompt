import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateUserDisplayName } from '@/lib/user';

export async function PATCH(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
        return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const userId = session.user.id;
    const success = await updateUserDisplayName(userId, name);

    if (!success) {
        return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ success: true, name: name.trim() });
}
