# Contributing to RMU-Campus X

ขอบคุณที่สนใจมีส่วนร่วมในโปรเจค RMU-Campus X! 🎉

## 📋 Code of Conduct

โปรดปฏิบัติตนอย่างสุภาพและให้เกียรติผู้อื่น

## 🚀 Getting Started

### Prerequisites

- Bun >= 1.0.0 ([ติดตั้ง Bun](https://bun.sh/docs/installation))
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/cypxxc/RMU-Campus-X.git
cd RMU-Campus-X

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Run development server
bun dev
```

## 🛠️ Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Adding tests

Example: `feature/add-search-filter`

### Commit Messages

ใช้ [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user profile page
fix: resolve login redirect issue
docs: update README
test: add unit tests for auth
refactor: simplify item card component
```

## 🧪 Testing

```bash
# Run unit tests
bun run test

# Run tests with watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run E2E tests
bun run test:e2e

# Run all checks
bun run check-all
```

## 📝 Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add JSDoc comments for public functions
- Run `bun run type-check` before committing

## 🔀 Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run `bun run check-all` to verify
5. Push to your fork
6. Open a Pull Request

### PR Checklist

- [ ] Tests pass (`bun run test`)
- [ ] TypeScript compiles (`bun run type-check`)
- [ ] Build succeeds (`bun run build`)
- [ ] E2E tests pass (`bun run test:e2e`)
- [ ] Code follows project style
- [ ] Documentation updated if needed

## 📁 Project Structure

```
├── app/              # Next.js App Router pages
│   ├── api/          # API routes
│   ├── (auth)/       # Auth pages (login, register)
│   └── admin/        # Admin panel
├── components/       # React components
├── lib/              # Utility functions
│   ├── db/           # Database operations
│   └── __tests__/    # Unit tests
├── hooks/            # Custom React hooks
├── types/            # TypeScript types
├── e2e/              # E2E tests
└── public/           # Static assets
```

## 🐛 Bug Reports

เปิด Issue พร้อมรายละเอียด:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment (browser, OS)

## 💡 Feature Requests

เปิด Issue พร้อมอธิบาย:
- Use case
- Proposed solution
- Alternatives considered

## 📧 Contact

หากมีคำถาม สามารถติดต่อได้ที่:
- GitHub Issues
- Email: [project email]

---

ขอบคุณที่ช่วยทำให้ RMU-Campus X ดีขึ้น! 🙏
