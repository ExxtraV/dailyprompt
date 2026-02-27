export default function PromptDisplay({ prompt, loading, error }) {
    return (
        <div id="promptContainer" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-orange-500 text-lg">✦</span>
                <h2 className="text-sm font-bold text-orange-600 dark:text-orange-500 uppercase tracking-widest">
                    Today's Writing Prompt
                </h2>
                <span className="text-orange-500 text-lg">✦</span>
            </div>
            <div
                id="promptDisplay"
                className={`min-h-[110px] flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200/70 dark:from-gray-800 dark:to-gray-700 dark:border-gray-600 ${!loading && prompt ? 'fade-in' : ''}`}
            >
                <p
                    id="promptText"
                    className={`text-lg leading-relaxed font-medium ${
                        loading
                            ? 'text-orange-400 dark:text-orange-400 italic animate-pulse'
                            : error
                            ? 'text-red-500'
                            : 'text-gray-800 dark:text-gray-200 font-serif'
                    }`}
                >
                    {loading ? '✨ Summoning a new prophecy from the ether...' : (error || prompt)}
                </p>
            </div>
            {error && (
                <div className="mt-3 text-red-600 bg-red-50 p-3 rounded-lg text-sm dark:text-red-300 dark:bg-red-900/20">
                    {error}
                </div>
            )}
        </div>
    );
}
