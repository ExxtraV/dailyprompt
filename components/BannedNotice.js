import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function BannedNotice() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isBanned: true }
    });

    if (user?.isBanned) {
        return (
            <div className="w-full bg-red-600 text-white p-4 text-center font-bold fixed top-0 left-0 z-50">
                You have been banned from participating in the community.
            </div>
        );
    }

    return null;
}
