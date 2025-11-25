'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Heart, Share2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function CommunityPage() {
    const { data: session } = useSession();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/community')
            .then(res => res.json())
            .then(data => {
                setFeed(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleLike = async (post, e) => {
        e.preventDefault(); // Prevent navigation
        if (!session) return alert("Please sign in to like stories.");

        // Optimistic UI Update
        const isLiked = !post.isLiked;
        const newCount = isLiked ? post.likes + 1 : post.likes - 1;

        setFeed(prev => prev.map(p => p.id === post.id ? { ...p, isLiked, likes: newCount } : p));

        try {
            await fetch('/api/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: post.realId }) // Use realId for API
            });
        } catch (error) {
            console.error("Like failed", error);
            // Revert on error
            setFeed(prev => prev.map(p => p.id === post.id ? post : p));
        }
    };

    const handleShare = (post, e) => {
        e.preventDefault();
        const url = `${window.location.origin}/community/${post.id}`;
        navigator.clipboard.writeText(url).then(() => {
            alert("Link copied to clipboard!");
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition">
                        <ArrowLeft size={20} /> Back to Writing
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">Community Feed</h1>
                </div>

                {loading && <div className="text-center py-20">Loading stories...</div>}

                {!loading && feed.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                        <p className="text-xl text-gray-500 dark:text-gray-400">The library is empty.</p>
                        <p className="mt-2 text-gray-400">Be the first to publish a story!</p>
                    </div>
                )}

                <div className="space-y-6">
                    {feed.map((item) => (
                        <div
                            key={item.id}
                            className={`
                                rounded-xl shadow-lg p-6 border transition hover:shadow-xl relative group-card
                                ${item.pinType === 'announcement'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
                            `}
                        >
                            {item.pinType === 'announcement' && (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg z-20 shadow-sm flex items-center gap-1">
                                    <span>📢 Announcement</span>
                                </div>
                            )}
                            {item.pinType === 'favorite' && (
                                <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg z-20 shadow-sm flex items-center gap-1">
                                    <span>★ Editor's Pick</span>
                                </div>
                            )}

                            <Link href={`/community/${item.id}`} className="absolute inset-0 z-0" aria-label="Read full story"></Link>
                            <div className="flex items-center justify-between mb-2 border-b border-gray-100 dark:border-gray-700 pb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <Link href={`/profile/${item.userId}`} className="flex items-center gap-3 group">
                                        {item.userImage ? (
                                            <img src={item.userImage} alt={item.userName} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 group-hover:ring-2 ring-orange-500 transition" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center group-hover:ring-2 ring-orange-500 transition">
                                                <User size={20} className="text-orange-500 dark:text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition">{item.userName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Calendar size={12} /> {item.date}
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                                <Link
                                    href={`/prompt/${item.date}`}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    Prompt Context
                                </Link>
                            </div>

                            <div className="relative z-10 pointer-events-none mb-2">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.title}</h2>
                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 text-sm">
                                        {item.text.replace(/<[^>]*>/g, ' ')}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between relative z-10 pointer-events-none">
                                <span
                                    className="inline-flex items-center text-sm font-bold text-orange-600 group-card-hover:text-orange-700 dark:text-orange-500 dark:group-card-hover:text-orange-400"
                                >
                                    Read full story &rarr;
                                </span>

                                <div className="flex items-center gap-4 pointer-events-auto">
                                     <button
                                        onClick={(e) => handleLike(item, e)}
                                        className={`flex items-center gap-1 text-sm font-medium transition ${item.isLiked ? 'text-pink-600 dark:text-pink-400' : 'text-gray-500 hover:text-pink-500 dark:text-gray-400 dark:hover:text-pink-400'}`}
                                     >
                                        <Heart size={18} fill={item.isLiked ? "currentColor" : "none"} />
                                        {item.likes}
                                     </button>
                                     <button
                                        onClick={(e) => handleShare(item, e)}
                                        className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition"
                                        title="Share Story"
                                     >
                                        <Share2 size={18} />
                                     </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
