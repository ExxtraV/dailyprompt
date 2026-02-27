import "./globals.css";
import { Inter } from 'next/font/google';
import { Providers } from "@/components/Providers";
import BannedNotice from "@/components/BannedNotice";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt.run-write.com'),
  title: "Run & Write | Daily Writing Prompts for Creative Writers",
  description: "Get a free daily writing prompt and join a community of creative writers. Overcome writer's block with inspiring prompts, story ideas, and writing challenges.",
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Run & Write',
    title: 'Run & Write | Daily Writing Prompts for Creative Writers',
    description: "Get a free daily writing prompt and join a community of creative writers. Overcome writer's block with inspiring prompts, story ideas, and writing challenges.",
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'Run & Write — Daily Writing Prompts' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Run & Write | Daily Writing Prompts',
    description: "Free daily writing prompts to spark your creativity and overcome writer's block.",
    images: ['/og-image.png'],
  },
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
