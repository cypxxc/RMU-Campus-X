import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rmu-campus-x.vercel.app'
  
  // Static pages
  const staticPages = [
    '',
    '/dashboard',
    '/login',
    '/register',
    '/guide',
    '/guidelines',
    '/terms',
    '/privacy',
  ]
  
  const sitemap: MetadataRoute.Sitemap = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/dashboard' ? 0.9 : 0.7,
  }))
  
  return sitemap
}
