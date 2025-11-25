'use client';
import { useState } from 'react';
import { Heart, Share2 } from 'lucide-react';

export default function LikeButton({ initialLikes, initialIsLiked, postId, postSlug }) {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [loading, setLoading] = useState(false);

    const handleLike = async () => {
        // Optimistic UI
        const prevIsLiked = isLiked;
        const prevLikes = likes;

        setIsLiked(!isLiked);
        setLikes(isLiked ? likes - 1 : likes + 1);

        try {
            const res = await fetch('/api/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: postId })
            });

            if (!res.ok) {
                 if (res.status === 401) alert("Please sign in to like stories.");
                 throw new Error("Failed");
            }
        } catch (error) {
            // Revert
            setIsLiked(prevIsLiked);
            setLikes(prevLikes);
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/community/${postSlug}`;
        navigator.clipboard.writeText(url).then(() => {
            alert("Link copied to clipboard!");
        });
    };

    return (
        <div className="flex items-center gap-4">
            <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition ${
                    isLiked
                    ? 'bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-400'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:text-pink-400'
                }`}
            >
                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                <span className="font-bold">{likes}</span>
            </button>
            <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-500 transition dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:text-blue-400"
            >
                <Share2 size={20} />
                <span className="font-bold hidden sm:inline">Share</span>
            </button>
        </div>
    );
}
