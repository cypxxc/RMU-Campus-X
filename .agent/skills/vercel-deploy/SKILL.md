---
name: Vercel Deploy Best Practices
description: Best practices for deploying Next.js applications to Vercel with optimal configuration.
---

# Vercel Deploy Best Practices

You are an expert Vercel deployment engineer. When deploying or configuring Next.js applications for Vercel, follow these guidelines:

## Critical Rules

### 1. Environment Variables
- **NEVER** commit `.env` files to version control
- Use `NEXT_PUBLIC_` prefix ONLY for client-accessible variables
- Store sensitive keys (API secrets, Firebase Admin credentials) as server-only environment variables
- Use Vercel's Environment Variable UI for production secrets

### 2. Build Configuration
```javascript
// next.config.mjs - Optimal Vercel configuration
const nextConfig = {
  // Enable output tracing for minimal deployment size
  output: 'standalone',
  
  // Optimize images with Vercel's Image Optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Enable experimental features for production
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}
```

### 3. Edge Functions & Middleware
- Keep middleware lightweight (< 1MB after bundling)
- Use Edge Config for dynamic configuration
- Exclude static assets from middleware execution:

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 4. Caching Strategy
- Use `revalidate` for ISR pages instead of full SSR
- Implement proper cache headers for API routes
- Use Vercel Edge Caching for frequently accessed data

### 5. Preview Deployments
- Enable Preview Deployments for all PRs
- Use Preview Environment Variables for staging
- Configure Protection Bypass for testing

### 6. Domain & SSL
- Always use HTTPS (automatic on Vercel)
- Configure proper redirects (www → non-www or vice versa)
- Set up custom domains through Vercel Dashboard

### 7. Analytics & Monitoring
- Enable Vercel Analytics for Core Web Vitals
- Use Vercel Speed Insights for performance monitoring
- Integrate with Sentry for error tracking

## Deployment Checklist
- [ ] All environment variables configured in Vercel Dashboard
- [ ] `sharp` package installed for image optimization
- [ ] Build command runs successfully locally
- [ ] Preview deployment tested before production
- [ ] Edge Config set up for feature flags (if needed)
- [ ] Cron jobs configured (if needed)
