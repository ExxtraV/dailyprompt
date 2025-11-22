import "./globals.css";
import { Inter } from 'next/font/google';
import { Providers } from "@/components/Providers";
import BannedNotice from "@/components/BannedNotice";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: "Run & Write | Daily Writing Prompts for Creative Writers",
  description: "Unlock your imagination with a fresh, daily writing prompt. Run & Write is a free sanctuary for creative writers seeking inspiration, story ideas, and a cure for writer's block.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-300 min-h-screen transition-colors duration-300`}>
        <Providers>
          <BannedNotice />
          {children}
        </Providers>
      </body>
    </html>
  );
}
