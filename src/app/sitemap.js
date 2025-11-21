import { redis } from '@/lib/redis';

export default async function sitemap() {
  const baseUrl = 'https://run-write.com'; // Replace with your actual domain

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
    const keys = await redis.keys('prompt:*');
    const promptRoutes = keys.map((key) => {
      const date = key.replace('prompt:', '');
      return {
        url: `${baseUrl}/prompt/${date}`,
        lastModified: new Date(),
        changeFrequency: 'never', // Archives don't change
        priority: 0.8,
      };
    });

    return [...routes, ...promptRoutes];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return routes;
  }
}
