---
name: Vercel React Best Practices
description: Best practices for React and Next.js performance from Vercel Engineering.
---

# Vercel React Best Practices

You are an expert Vercel engineer. When writing React or Next.js code, you MUST follow these performance best practices.

## CRITICAL: Eliminating Waterfalls
Request waterfalls are the most common performance killer.
- **Avoid Sequential Awaits**: Do not await promises sequentially if they are independent.
  - *Bad*: `const user = await getUser(); const posts = await getPosts();`
  - *Good*: `const [user, posts] = await Promise.all([getUser(), getPosts()]);`
- **Preload Data**: Start fetching data as early as possible.

## HIGH: Server Components & Rendering
- **Use Server Components by Default**: Only use `"use client"` when absolutely necessary (for interactivity, hooks, or browser-only APIs).
- **Move Client Boundaries Down**: Push `"use client"` as far down the component tree as possible (to the leaf nodes) to keep parent layouts as Server Components.
- **Dynamic Imports**: Use `next/dynamic` or `React.lazy` for heavy client components that are not critical for the initial paint (e.g., modals, components below the fold).

## MEDIUM: Data Fetching and Caching
- **Fetch in Components**: In Next.js App Router, fetch data directly inside the Server Component that needs it. Next.js automatically dedupes requests.
- **Client-Side Fetching**: If fetching on the client, ALWAYS use a library like SWR or React Query (TanStack Query) for deduplication, caching, and revalidation. Do not use raw `useEffect` + `fetch` for data requirements.

## CORE WEB VITALS
- **Images**: ALWAYS use `next/image`.
  - Must define `width` and `height` or `fill`.
  - Use `priority` for the Largest Contentful Paint (LCP) image (usually the hero image).
  - Use `placeholder="blur"` for local images or generated blur data for remote images.
- **Fonts**: ALWAYS use `next/font` (e.g., `next/font/google`) to prevent layout shift and optimize loading.

## Code Optimization
- **Barrel Files**: Avoid importing from huge barrel files if not using a bundler that tree-shakes perfectly. Import implementation files directly if needed.
- **Memoization**: Use `useMemo` and `useCallback` only when props changes are frequent or calculations are expensive. Don't over-optimize prematurely.

Apply these rules to all code you write or refactor.
