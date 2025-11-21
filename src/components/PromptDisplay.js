export default function PromptDisplay({ prompt, loading, error }) {
    return (
        <div id="promptContainer" className="text-center">
            <h2 className="text-xl font-bold text-orange-600 dark:text-orange-500 mb-4">Today's Writing Prompt</h2>
            <div id="promptDisplay" className={`min-h-[100px] flex items-center justify-center p-4 bg-orange-50 rounded-lg border-2 border-dashed border-orange-200 dark:bg-gray-700 dark:border-gray-600 ${!loading && prompt ? 'fade-in' : ''}`}>
                <p id="promptText" className={`text-lg leading-relaxed ${error ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {loading ? 'Summoning a new prophecy from the ether...' : (error || prompt)}
                </p>
            </div>
            {error && <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-md dark:text-red-300 dark:bg-red-900">{error}</div>}
        </div>
    );
}
