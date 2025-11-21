import { redis } from '@/lib/redis';

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
    // Attempt to fetch if credentials exist, otherwise return static routes (e.g. during build)
    if (process.env.MANUAL_UPSTASH_URL && !process.env.MANUAL_UPSTASH_URL.includes('mock-url')) {
        const keys = await redis.keys('prompt:*');
        const promptRoutes = keys.map((key) => {
          const date = key.replace('prompt:', '');
          return {
            url: `${baseUrl}/prompt/${date}`,
            lastModified: new Date(),
            changeFrequency: 'never',
            priority: 0.8,
          };
        });
        return [...routes, ...promptRoutes];
    }
    return routes;

  } catch (error) {
    console.warn('Sitemap generation failed to connect to Redis:', error.message);
    return routes;
  }
}
