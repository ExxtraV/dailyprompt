import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt.run-write.com';

  // Static routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ];

  try {
    const prompts = await prisma.prompt.findMany({
      select: { date: true }
    });

    const promptRoutes = prompts.map((p) => ({
      url: `${baseUrl}/prompt/${p.date}`,
      lastModified: new Date(`${p.date}T00:00:00Z`), // use the prompt's actual date
      changeFrequency: 'never',
      priority: 0.6,
    }));

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

    // Only index non-banned users who have at least one published post
    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        posts: { some: { published: true } },
      },
      select: { id: true, lastActive: true }
    });

    const userRoutes = users.map((u) => ({
      url: `${baseUrl}/profile/${u.id}`,
      lastModified: u.lastActive || new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

    return [...routes, ...promptRoutes, ...postRoutes, ...userRoutes];

  } catch (error) {
    console.warn('Sitemap generation failed:', error.message);
    return routes;
  }
}
