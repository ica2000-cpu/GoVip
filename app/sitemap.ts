import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const BASE_URL = 'https://govip.com.ar'; // Replace with actual production URL

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static Routes
  const routes = [
    '',
    '/login',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: 1,
  }));

  // 2. Dynamic Commerce Routes
  try {
    const { data: commerces } = await supabase
      .from('comercios')
      .select('slug, updated_at');

    if (commerces) {
      const commerceRoutes = commerces.map((commerce: { slug: string; updated_at: string }) => ({
        url: `${BASE_URL}/${commerce.slug}`,
        lastModified: commerce.updated_at || new Date().toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
      
      return [...routes, ...commerceRoutes];
    }
  } catch (error) {
    console.error('Sitemap generation error:', error);
  }

  return routes;
}
