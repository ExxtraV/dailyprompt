import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function BannedNotice() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) return null;

    // As discussed in admin/users, the 'isBanned' field is not yet in the schema.
    // For now, we assume no users are banned in this new system until migrated.
    // If we wanted to check, we would need to add the field to the User model.
    // For now, simply return null.

    // const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    // if (user?.isBanned) ...

    return null;
}
