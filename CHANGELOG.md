# Changelog

All notable changes to RMU-Campus X will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Security headers (CSP, HSTS, X-Frame-Options)
- robots.txt for SEO
- sitemap.xml for search engine indexing
- Dynamic favicon and OpenGraph images
- Web Vitals tracking
- Comprehensive documentation

## [0.1.0] - 2026-01-14

### Added

- **Core Features**

  - User authentication with Firebase Auth (RMU email only)
  - Item posting and management
  - Exchange request system
  - Real-time chat between users
  - Review and rating system
  - Favorites/Wishlist functionality

- **Admin Panel**

  - User management (suspend/ban)
  - Item moderation
  - Report handling
  - Activity logs
  - Dashboard analytics

- **Notifications**

  - In-app notifications
  - LINE Push notifications
  - Email verification

- **Security**

  - Firestore security rules
  - API rate limiting
  - Input validation with Zod
  - XSS prevention utilities

- **Performance**

  - Pagination for large collections
  - Lazy loading components
  - Image optimization with Cloudinary
  - Count aggregations for stats

- **Testing**

  - Unit tests with Vitest
  - E2E tests with Playwright
  - Test coverage reporting

- **PWA Support**
  - Web app manifest
  - App shortcuts
  - Installable on mobile/desktop

### Security

- Firebase Authentication with email verification
- Firestore security rules for all collections
- API rate limiting middleware
- Input sanitization utilities

### Technical

- Next.js 16 with App Router
- TypeScript with strict mode
- TailwindCSS v4 for styling
- Firebase Firestore for database
- Cloudinary for image hosting
- Vercel for deployment

---

## Version History

| Version | Date       | Description     |
| ------- | ---------- | --------------- |
| 0.1.0   | 2026-01-14 | Initial release |

## Contributors

- RMU-Campus X Team
- Chayaphon (653120100120)

