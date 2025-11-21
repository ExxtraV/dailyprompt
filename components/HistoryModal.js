'use client';
import Link from 'next/link';

export default function HistoryModal({ isOpen, onClose, history, loading, error }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col transform transition-transform duration-300 dark:bg-gray-800 dark:border dark:border-gray-700">
                <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-gray-600">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Prompt Archive</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none dark:text-gray-400 dark:hover:text-white">&times;</button>
                </div>
                <div className="overflow-y-auto space-y-4 pr-2">
                    {loading && <p className="text-gray-500 dark:text-gray-400 text-center p-4">Summoning memories from the Great Library...</p>}
                    {error && (
                        <div className="p-4">
                            <p className="text-red-500 font-semibold">A scroll was burnt in transit. Could not retrieve the archives.</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{error}</p>
                        </div>
                    )}
                    {!loading && !error && history.length === 0 && (
                         <p className="text-gray-500 dark:text-gray-400 text-center p-4">The archives are quiet. No past prompts have been recorded.</p>
                    )}
                    {!loading && !error && history.map((item) => (
                        <div key={item.date} className="p-4 border-b border-gray-200 last:border-b-0 fade-in dark:border-gray-700">
                            <p className="text-sm font-semibold text-orange-600 dark:text-orange-500">{item.date}</p>
                            <Link href={`/prompt/${item.date}`} className="text-gray-700 mt-1 hover:text-orange-700 hover:underline dark:text-gray-300 dark:hover:text-orange-400">
                                {item.prompt}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
