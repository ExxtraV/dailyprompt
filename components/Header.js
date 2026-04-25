export default function Header({ streak }) {
    return (
        <header className="text-center mb-8 mt-10">
            <h1 className="text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Run & Write</h1>
            <p className="text-lg text-gray-500 mt-2 dark:text-gray-400 italic">Where Writers Find Their Spark Daily</p>
            <p id="streakCounter" className="mt-4 inline-flex items-center justify-center px-4 py-1.5 text-sm font-semibold text-orange-600 bg-orange-100 rounded-full dark:text-orange-300 dark:bg-gray-800">
                🔥 Writing streak: {streak} {streak === 1 ? 'day' : 'days'}
            </p>
        </header>
    );
}
