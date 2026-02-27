'use client';
import { useState } from 'react';
import { Heart, Share2 } from 'lucide-react';

export default function LikeButton({ initialLikes, initialIsLiked, postId, postSlug }) {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialIsLiked);

    const handleLike = async () => {
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

    const handleTwitterShare = () => {
        const url = `${window.location.origin}/community/${postSlug}`;
        const text = `Check out this story on Run & Write ✍️`;
        window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
            '_blank',
            'noopener,noreferrer'
        );
    };

    return (
        <div className="flex items-center gap-3">
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
                onClick={handleTwitterShare}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-sky-300 hover:text-sky-500 transition dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:text-sky-400"
                title="Share on X"
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            </button>
            <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-500 transition dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:text-blue-400"
                title="Copy link"
            >
                <Share2 size={18} />
                <span className="font-bold hidden sm:inline text-sm">Share</span>
            </button>
        </div>
    );
}
