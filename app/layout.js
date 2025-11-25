import "./globals.css";
import { Inter } from 'next/font/google';
import { Providers } from "@/components/Providers";
import BannedNotice from "@/components/BannedNotice";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: "Run & Write | Daily Writing Prompts for Creative Writers",
  description: "Unlock your imagination with a fresh, daily writing prompt. Run & Write is a free sanctuary for creative writers seeking inspiration, story ideas, and a cure for writer's block.",
  keywords: ["writing prompts", "creative writing", "daily prompts", "writer's block", "story ideas", "writing community", "creative writing exercises", "short stories", "writing challenge"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-300 min-h-screen transition-colors duration-300`}>
        <Providers>
          <BannedNotice />
          <div className="flex flex-col min-h-screen">
             <div className="flex-grow">
               {children}
             </div>
             <Footer />
          </div>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
