import { prisma } from '@/lib/prisma';
import ProfileClient from '@/components/ProfileClient';

export async function generateMetadata({ params }) {
    const { userId } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt.run-write.com';

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true, totalWords: true },
    });

    if (!user) return { title: 'User Profile | Run & Write' };

    return {
        title: `${user.name}'s Profile | Run & Write`,
        description: `${user.name} has written ${user.totalWords.toLocaleString()} words on Run & Write. View their published stories and writing journey.`,
        alternates: { canonical: `${baseUrl}/profile/${userId}` },
        openGraph: {
            type: 'profile',
            siteName: 'Run & Write',
            url: `${baseUrl}/profile/${userId}`,
            title: `${user.name}'s Profile | Run & Write`,
            description: `${user.name} has written ${user.totalWords.toLocaleString()} words on Run & Write.`,
            images: user.image ? [{ url: user.image, width: 512, height: 512, alt: `${user.name}'s avatar` }] : [],
        },
        twitter: {
            card: 'summary',
            title: `${user.name}'s Profile | Run & Write`,
            description: `${user.name} has written ${user.totalWords.toLocaleString()} words on Run & Write.`,
            images: user.image ? [user.image] : [],
        },
    };
}

export default async function ProfilePage({ params }) {
    const { userId } = await params;
    return <ProfileClient userId={userId} />;
}
