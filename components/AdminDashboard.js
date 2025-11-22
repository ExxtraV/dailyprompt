'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function AdminDashboard() {
    const { data: session } = useSession();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Assume auth is handled by parent
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            const res = await fetch('/api/community');
            const data = await res.json();
            setFeed(data);
        } catch (error) {
            console.error('Failed to fetch feed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBan = async (userId) => {
        if (!confirm('Are you sure you want to BAN this user? This will delete all their posts.')) return;

        try {
            const res = await fetch('/api/admin/ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (res.ok) {
                alert('User banned successfully');
                fetchFeed(); // Refresh
            } else {
                const err = await res.json();
                alert(`Error: ${err.message}`);
            }
        } catch (error) {
            alert('Failed to ban user');
        }
    };

    const handleDeletePost = async (postId) => {
         if (!confirm('Are you sure you want to DELETE this post?')) return;

         try {
            const res = await fetch('/api/admin/post', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId })
            });

            if (res.ok) {
                alert('Post deleted successfully');
                fetchFeed(); // Refresh
            } else {
                const err = await res.json();
                alert(`Error: ${err.message}`);
            }
        } catch (error) {
            alert('Failed to delete post');
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-stone-900 text-stone-100 p-8">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 p-8 font-serif">
            <h1 className="text-3xl font-bold mb-8 text-amber-500">Admin Moderation</h1>

            <div className="grid gap-6 max-w-4xl mx-auto">
                {feed.map((post) => {
                    const postId = `post:${post.id}`;

                    return (
                        <div key={post.id} className="bg-stone-900 p-6 rounded-lg border border-stone-800 shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {post.userImage ? (
                                        <img src={post.userImage} alt={post.userName} className="w-10 h-10 rounded-full border border-stone-700" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-500">?</div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-stone-200">{post.userName}</h3>
                                        <p className="text-xs text-stone-500">{post.date}</p>
                                        <p className="text-xs text-stone-600 font-mono">{post.userId}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDeletePost(postId)}
                                        className="px-3 py-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded transition-colors"
                                    >
                                        Delete Post
                                    </button>
                                    <button
                                        onClick={() => handleBan(post.userId)}
                                        className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-bold"
                                    >
                                        BAN USER
                                    </button>
                                </div>
                            </div>
                            <div className="prose prose-invert max-w-none">
                                <p className="text-stone-300 whitespace-pre-wrap">{post.text}</p>
                            </div>
                        </div>
                    );
                })}

                {feed.length === 0 && (
                    <p className="text-center text-stone-500 italic">No active posts in the feed.</p>
                )}
            </div>
        </div>
    );
}
