import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const baseUrl = 'https://run-write.com';

  // Static routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  try {
     const prompts = await prisma.prompt.findMany({
         select: { date: true }
     });

    const promptRoutes = prompts.map((p) => {
        return {
        url: `${baseUrl}/prompt/${p.date}`,
        lastModified: new Date(),
        changeFrequency: 'never',
        priority: 0.8,
        };
    });
    return [...routes, ...promptRoutes];

  } catch (error) {
    console.warn('Sitemap generation failed:', error.message);
    return routes;
  }
}
