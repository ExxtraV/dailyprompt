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

    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true }
    });

    const postRoutes = posts.map((p) => ({
      url: `${baseUrl}/community/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    const users = await prisma.user.findMany({
      select: { id: true }
    });

    const userRoutes = users.map((u) => ({
      url: `${baseUrl}/profile/${u.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...routes, ...promptRoutes, ...postRoutes, ...userRoutes];

  } catch (error) {
    console.warn('Sitemap generation failed:', error.message);
    return routes;
  }
}
