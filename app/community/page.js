import CommunityFeed from '@/components/CommunityFeed';

export const metadata = {
    title: 'Community Stories | Run & Write',
    description: 'Explore inspiring stories from our writing community. Read, like, and share creative writing from writers around the world.',
    openGraph: {
        type: 'website',
        siteName: 'Run & Write',
        title: 'Community Stories | Run & Write',
        description: 'Explore inspiring stories from our writing community. Read, like, and share creative writing from writers around the world.',
    },
    twitter: {
        card: 'summary',
        title: 'Community Stories | Run & Write',
        description: 'Read and share inspiring creative writing from the Run & Write community.',
    },
};

export default function CommunityPage() {
    return <CommunityFeed />;
}
