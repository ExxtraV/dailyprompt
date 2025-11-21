import AuthButton from "./AuthButton";

export default function Header({ streak }) {
    return (
        <header className="text-center mb-8 relative">
            <div className="absolute top-0 left-0">
                 <AuthButton />
            </div>

            <h1 className="text-5xl font-black text-gray-900 dark:text-gray-100 mt-8 sm:mt-0">Run & Write</h1>
            <p className="text-lg text-gray-600 mt-2 dark:text-gray-400">Your Daily Dose of Creative Inspiration</p>
            <div className="mt-4">
                <a href="https://www.run-write.com" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg shadow hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">
                    Visit run-write.com
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14m0 0H3m7 0v7"></path>
                    </svg>
                </a>
            </div>
            <p id="streakCounter" className="mt-3 inline-flex items-center justify-center px-4 py-1 text-sm font-semibold text-orange-600 bg-orange-100 rounded-full dark:text-orange-300 dark:bg-gray-800">
                🔥 Writing streak: {streak} days
            </p>
        </header>
    );
}
