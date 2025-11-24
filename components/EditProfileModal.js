'use client';
import { useState, useRef, useEffect } from 'react';

const PRESET_AVATARS = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Coco',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Bear',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Liam',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Abby',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Felix',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Bella',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Leo',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Loki',
];

export default function EditProfileModal({ isOpen, onClose, user, onUpdate }) {
    const [name, setName] = useState(user?.name || '');
    const [image, setImage] = useState(user?.image || '');
    const [isSaving, setIsSaving] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setImage(user.image || '');
        }
    }, [user]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, image }),
            });

            if (!res.ok) throw new Error('Failed to update');

            const data = await res.json();
            onUpdate(data);
            onClose();
        } catch (error) {
            alert('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                >
                    ✕
                </button>
                <h2 className="text-2xl font-bold mb-6 dark:text-white">Edit Profile</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition"
                            placeholder="Enter your name"
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Profile Picture
                        </label>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-500 bg-gray-100 dark:bg-gray-700">
                                <img src={image || 'https://via.placeholder.com/150'} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <input
                                type="text"
                                value={image}
                                onChange={(e) => setImage(e.target.value)}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition text-sm"
                                placeholder="Paste image URL..."
                            />
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Or choose a preset:</p>
                        <div className="grid grid-cols-5 gap-2">
                            {PRESET_AVATARS.map((avatar, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setImage(avatar)}
                                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition ${image === avatar ? 'border-orange-500 scale-110' : 'border-transparent hover:border-gray-300'}`}
                                >
                                    <img src={avatar} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
