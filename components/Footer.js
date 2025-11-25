import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
      <div className="flex justify-center gap-6 mb-4">
        <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition">Terms of Service</Link>
        {/* Add more footer links here if needed */}
      </div>
      <p>&copy; {new Date().getFullYear()} Run & Write. All rights reserved.</p>
    </footer>
  );
}
