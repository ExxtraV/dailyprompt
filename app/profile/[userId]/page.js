'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, Calendar, Trophy, Flame, User, Edit2, Crown, Sparkles } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import EditProfileModal from '@/components/EditProfileModal';

export default function ProfilePage() {
    const { userId } = useParams();
    const { data: session, update: updateSession } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    useEffect(() => {
        if (userId) {
            fetch(`/api/users/${userId}`)
                .then(res => {
                    if (!res.ok) throw new Error('User not found');
                    return res.json();
                })
                .then(data => {
                    setProfile(data);
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message);
                    setLoading(false);
                });
        }
    }, [userId]);

    const handleUpdate = async (updatedData) => {
        // Update local state
        setProfile(prev => ({
            ...prev,
            user: { ...prev.user, ...updatedData }
        }));
        // Update session to reflect changes immediately in header/other places
        await updateSession(updatedData);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Oops!</h2>
                    <p className="mb-6">{error || 'User not found.'}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const { user, stats, posts } = profile;
    const isOwnProfile = session?.user?.id === user.id;
    const isOwner = user.role === 'OWNER';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative overflow-hidden">
             {isOwner && (
                 // Background Effect for Owner
                 <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             )}

             <div className="absolute top-4 right-4 z-20">
                <ThemeToggle />
            </div>

            <div className="max-w-4xl mx-auto p-6 relative z-10">
                 {/* Back Button */}
                 <div className="mb-6">
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-orange-500 flex items-center gap-2 transition"
                    >
                        ← Back to Feed
                    </button>
                </div>

                {/* Profile Header */}
                <div className={`
                    rounded-2xl shadow-xl overflow-hidden mb-8 border
                    ${isOwner
                        ? 'bg-gradient-to-br from-gray-900 to-black border-amber-500/50 shadow-amber-500/20 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                    }
                `}>
                    <div className={`h-32 relative ${isOwner ? 'bg-gradient-to-r from-amber-600 to-purple-600' : 'bg-gradient-to-r from-orange-400 to-red-500'}`}></div>
                    <div className="px-8 pb-8 relative">
                        <div className="absolute -top-16 left-8 group">
                            <div className={`
                                w-32 h-32 rounded-full overflow-hidden shadow-md relative border-4
                                ${isOwner ? 'border-amber-400 ring-4 ring-amber-500/30' : 'border-white dark:border-gray-800 bg-white'}
                            `}>
                                {user.image ? (
                                    <img
                                        src={user.image}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                                        <User size={48} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                    <h1 className={`text-3xl font-bold ${isOwner ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-white' : ''}`}>
                                        {user.name}
                                    </h1>
                                    {isOwner && (
                                        <Crown size={24} className="text-amber-400 fill-amber-400 animate-pulse" title="Owner / Creator" />
                                    )}
                                    {isOwnProfile && (
                                        <button
                                            onClick={() => setIsEditOpen(true)}
                                            className="p-1 text-gray-400 hover:text-orange-500 transition"
                                            title="Edit Profile"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    )}
                                </div>
                                {isOwner && <p className="text-amber-200/80 text-sm font-medium flex items-center gap-1"><Sparkles size={12}/> The Creator</p>}
                            </div>

                            {/* Stats Overview */}
                            <div className={`flex gap-6 text-center ${isOwner ? 'text-white' : ''}`}>
                                <div>
                                    <div className="flex items-center gap-1 justify-center text-orange-500 font-bold text-xl">
                                        <Flame size={20} fill="currentColor" />
                                        {stats.streak}
                                    </div>
                                    <p className={`text-xs uppercase tracking-wider font-semibold ${isOwner ? 'text-gray-400' : 'text-gray-500'}`}>Streak</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 justify-center text-blue-500 font-bold text-xl">
                                        <BookOpen size={20} />
                                        {stats.totalWords.toLocaleString()}
                                    </div>
                                    <p className={`text-xs uppercase tracking-wider font-semibold ${isOwner ? 'text-gray-400' : 'text-gray-500'}`}>Words</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-8 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Achievements
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {/* Render "The Creator" Badge manually if Owner */}
                        {isOwner && (
                             <div className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-900 to-black border border-amber-500/30 rounded-xl text-center shadow-lg transform hover:scale-105 transition relative overflow-hidden">
                                <div className="absolute inset-0 bg-amber-500/10 animate-pulse pointer-events-none"></div>
                                <div className="text-4xl mb-2 relative z-10">🧙‍♂️</div>
                                <h3 className="font-bold text-sm text-amber-200 relative z-10">The Creator</h3>
                                <p className="text-xs text-gray-400 mt-1 relative z-10">The one who started it all.</p>
                            </div>
                        )}

                        {stats.badges.map(badge => (
                            <div key={badge.id} className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-center hover:scale-105 transition transform">
                                <div className="text-4xl mb-2">{badge.icon}</div>
                                <h3 className="font-bold text-sm">{badge.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{badge.description}</p>
                            </div>
                        ))}

                        {!isOwner && stats.badges.length === 0 && (
                            <div className="col-span-full text-center text-gray-500 italic py-4">No badges earned yet.</div>
                        )}
                    </div>
                </div>

                {/* Published Stories */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
                     <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <BookOpen className="text-blue-500" /> Published Stories
                    </h2>

                    {posts.length === 0 ? (
                        <p className="text-gray-500 italic">No stories published yet.</p>
                    ) : (
                        <div className="space-y-6">
                            {posts.map(post => (
                                <div key={post.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-6 last:pb-0">
                                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                                        <Calendar size={14} />
                                        <span>{post.date}</span>
                                    </div>
                                    <a href={`/community/${post.slug}`} className="block group">
                                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg group-hover:ring-2 ring-orange-500 transition">
                                            {post.title && <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{post.title}</h3>}
                                             <p className="line-clamp-3 text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {post.text.replace(/<[^>]*>/g, ' ')}
                                            </p>
                                            <div className="mt-2 text-orange-500 font-semibold text-sm group-hover:underline">
                                                Read more →
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <EditProfileModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                user={user}
                onUpdate={handleUpdate}
            />
        </div>
    );
}
