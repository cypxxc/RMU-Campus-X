# OOP Architecture Migration Guide

## Overview
This guide outlines an incremental migration toward clearer OOP boundaries in the RMU Campus X project. The goal is not to replace every module with classes, but to introduce explicit domain services, server-side use cases, and composable infrastructure while preserving the existing API-first enforcement model, backward compatibility, and operational behavior.

---

## 1. Core OOP Principles to Implement

### 1.1 SOLID Principles

| Principle | Description | Current State | Target State |
|-----------|-------------|----------------|--------------|
| **S**ingle Responsibility | One reason to change | Partially (mixins in utils) | Services + Repositories |
| **O**pen/Closed | Open for extension, closed for modification | Limited | Abstract base classes + interfaces |
| **L**iskov Substitution | Subclasses substitute parent classes | Not implemented | Polymorphic service interfaces |
| **I**nterface Segregation | Specific client interfaces | Partially | Segregated interfaces per domain |
| **D**ependency Inversion | Depend on abstractions, not concretions | Functional approach | Dependency injection container |

### 1.2 Current Architecture Issues

```typescript
// Legacy singleton logger still exists in lib/logger.ts
class Logger {
  private static instance: Logger
  // Mixing concerns: formatting + console output + optional external hook
  private log(level, message, context, source) { /* ... */ }
}
export const logger = Logger.getInstance()
export const log = { debug, info, warn, error } // Function wrappers

// Newer logging modules are already more composable
type LogSink = { write(event: LogEvent): Promise<void> }
type AdminNotifier = { notify(event: LogEvent): Promise<void> }
function createSystemLogger(deps: {
  consoleSink: LogSink
  firestoreSink?: LogSink
  adminNotifier?: AdminNotifier
}) { /* ... */ }

class SecurityService {
  // Multiple concerns already live behind one facade for compatibility
  sanitizeHtml() { /* ... */ }
  sanitizeText() { /* ... */ }
  sanitizeEmail() { /* ... */ }
  sanitizeUrl() { /* ... */ }
  sanitizeFilename() { /* ... */ }
  generateSafeId() { /* ... */ }
  isValidIntegerInRange() { /* ... */ }
  // Mixed responsibilities: sanitization, validation, XSS detection, utility helpers
}
```

### 1.3 Architectural Constraints To Preserve

- Client-side create/update/delete flows must continue to go through authenticated API routes or server-only use cases. Do not move browser code to direct Firestore writes.
- Repositories are infrastructure adapters, not a replacement for API-layer authorization, terms checks, posting restrictions, timestamp generation, or search keyword generation.
- Prefer request-scoped composition roots or module factories over one global singleton container in Next.js handlers.
- Logging must preserve console output, optional Firestore persistence, and CRITICAL admin notification paths.
- Security refactors must preserve the current public helper surface used by schemas and route handlers.

---

## 2. Proposed OOP Architecture

### 2.1 Service Layer Architecture

```typescript
// Base abstract service class
abstract class BaseService {
  protected logger: ILogger
  protected errorHandler: IErrorHandler
  
  constructor(dependencies: ServiceDependencies) {
    this.logger = dependencies.logger
    this.errorHandler = dependencies.errorHandler
  }

  // Template method pattern
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ExecutionContext
  ): Promise<T> {
    try {
      this.logger.info(`Executing ${context.operationName}`, context)
      const result = await operation()
      this.logger.info(`Completed ${context.operationName}`)
      return result
    } catch (error) {
      this.errorHandler.handle(error, context)
      throw error
    }
  }
}

// Domain-specific services
class ItemService extends BaseService implements IItemService {
  private itemRepository: IItemRepository
  private validationService: IValidationService

  async createItem(data: CreateItemDTO): Promise<Item> {
    return this.executeWithErrorHandling(
      () => this.itemRepository.create(data),
      { operationName: 'createItem', userId: data.userId }
    )
  }
}
```

### 2.2 Repository Pattern (Server-side Adapters)

```typescript
// Repository remains server-only and is used by route handlers / use cases
interface IItemRepository {
  create(data: CreateItemRecord): Promise<string>
  findById(id: string): Promise<ItemRecord | null>
  update(id: string, data: Partial<ItemRecord>): Promise<void>
}

class FirestoreItemRepository implements IItemRepository {
  constructor(
    private db: FirebaseFirestore.Firestore,
    private collectionName: string = 'items'
  ) {}

  async create(data: CreateItemRecord): Promise<string> {
    const ref = await this.db.collection(this.collectionName).add(data)
    return ref.id
  }

  async findById(id: string): Promise<ItemRecord | null> {
    const doc = await this.db.collection(this.collectionName).doc(id).get()
    return doc.exists ? ({ id: doc.id, ...doc.data() } as ItemRecord) : null
  }

  async update(id: string, data: Partial<ItemRecord>): Promise<void> {
    await this.db.collection(this.collectionName).doc(id).update(data)
  }
}

// Use case keeps business rules and server-enforced invariants
class CreateItemUseCase {
  constructor(
    private items: IItemRepository,
    private users: IUserRepository,
    private policy: PostingPolicy,
    private keywordService: SearchKeywordService
  ) {}

  async execute(input: CreateItemInput, actor: AuthContext): Promise<string> {
    await this.policy.assertCanPost(actor.userId)
    const profile = await this.users.getProfileSummary(actor.userId)
    const searchKeywords = this.keywordService.generate(input.title, input.description)

    return this.items.create({
      ...input,
      postedBy: actor.userId,
      postedByEmail: actor.email,
      postedByName: profile.displayName,
      status: 'available',
      searchKeywords,
      postedAt: new Date(),
      updatedAt: new Date(),
    })
  }
}
```

**Important:** browser-facing modules such as `lib/db/items.ts` should continue to call `/api/items`. Repositories are for server handlers and server-only services, not for bypassing API enforcement from the client.

### 2.3 Composition Root / Request-scoped Wiring

```typescript
interface RequestServices {
  items: IItemRepository
  users: IUserRepository
  logger: SystemLogger
  createItem: CreateItemUseCase
}

export function createRequestServices(): RequestServices {
  const db = getAdminDb()
  const logger = createSystemLogger({
    consoleSink: createConsoleSink(),
    firestoreSink: process.env.NODE_ENV === 'production' ? createFirestoreSink() : undefined,
    adminNotifier: createAdminNotifier(),
  })

  const items = new FirestoreItemRepository(db)
  const users = new FirestoreUserRepository(db)
  const policy = new PostingPolicy(users)
  const keywordService = new SearchKeywordService()

  return {
    items,
    users,
    logger,
    createItem: new CreateItemUseCase(items, users, policy, keywordService),
  }
}

// Route handler stays as the enforcement boundary
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  const body = await parseCreateItemBody(request)
  const services = createRequestServices()
  const itemId = await services.createItem.execute(body, auth)
  return NextResponse.json({ success: true, data: { id: itemId } }, { status: 201 })
}
```

---

## 3. Refactored Core Services

### 3.1 Logger Service (Preserve Sink-based Logging)

**Interface Layer:**
```typescript
// lib/services/logging/types.ts
export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface LogEvent {
  category: LogCategory
  eventName: string
  data: unknown
  severity: LogSeverity
}

export interface LogSink {
  write(event: LogEvent): Promise<void>
}

export interface AdminNotifier {
  notify(event: LogEvent): Promise<void>
}

export interface SystemLogger {
  logEvent(
    category: LogCategory,
    eventName: string,
    data?: unknown,
    severity?: LogSeverity
  ): Promise<void>

  logError(error: unknown, context: string, severity?: LogSeverity): Promise<void>
}
```

**Implementation:**
```typescript
// lib/services/logging/system-logger.ts
export function createSystemLogger(deps: {
  consoleSink: LogSink
  firestoreSink?: LogSink
  adminNotifier?: AdminNotifier
  shouldPersist?: (severity: LogSeverity) => boolean
}): SystemLogger {
  const shouldPersist =
    deps.shouldPersist ||
    ((severity) =>
      process.env.NODE_ENV === 'production' ||
      severity === 'ERROR' ||
      severity === 'CRITICAL')

  async function logEvent(
    category: LogCategory,
    eventName: string,
    data: unknown = {},
    severity: LogSeverity = 'INFO'
  ): Promise<void> {
    const event = { category, eventName, data, severity }

    await deps.consoleSink.write(event)

    if (deps.firestoreSink && shouldPersist(severity)) {
      await deps.firestoreSink.write(event)
    }

    if (deps.adminNotifier && severity === 'CRITICAL') {
      await deps.adminNotifier.notify(event)
    }
  }

  async function logError(error: unknown, context: string, severity: LogSeverity = 'ERROR') {
    return logEvent(
      'SYSTEM',
      'ERROR_OCCURRED',
      {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
      },
      severity
    )
  }

  return { logEvent, logError }
}
```

**Migration note:** keep `lib/logger.ts` as a compatibility facade while gradually moving server code to `lib/services/logging/*`. The target is better composition, not reduced operational coverage.

### 3.2 Security Service (Segregated but Backward Compatible)

**Interfaces:**
```typescript
// lib/security/contracts.ts
export interface ISanitizer {
  sanitize(input: string): string
}

export interface IValidator {
  validate(input: string): boolean
}

export interface IXSSDetector {
  hasPatterns(input: string): boolean
}

export interface ITextSanitizer {
  sanitizeText(input: string): string
}

export interface IUrlSanitizer {
  sanitizeUrl(input: string): string | null
}

export interface IFilenameSanitizer {
  sanitizeFilename(input: string): string
}

export interface IIdGenerator {
  generate(length?: number): string
}
```

**Strategy Pattern Implementation:**
```typescript
// lib/security/sanitizers/HtmlSanitizer.ts
export class HtmlSanitizer implements ISanitizer {
  sanitize(input: string): string {
    if (!input || typeof input !== 'string') return ''
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }
}

// lib/security/sanitizers/EmailSanitizer.ts
export class EmailSanitizer implements ISanitizer {
  sanitize(email: string): string {
    if (!email || typeof email !== 'string') return ''
    return email.trim().toLowerCase()
  }
}

// lib/security/validators/RMUEmailValidator.ts
export class RMUEmailValidator implements IValidator {
  validate(email: string): boolean {
    if (!email) return false
    const normalized = email.trim().toLowerCase()
    return /^[a-zA-Z0-9._+-]{1,64}@rmu\.ac\.th$/.test(normalized)
  }
}

export class TextSanitizer implements ITextSanitizer {
  sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return ''
    return input
      .trim()
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  }
}

// Compatibility facade remains the public entrypoint
export class SecurityFacade {
  constructor(
    private htmlSanitizer: ISanitizer,
    private textSanitizer: ITextSanitizer,
    private emailSanitizer: ISanitizer,
    private emailValidator: IValidator,
    private xssDetector: IXSSDetector,
    private urlSanitizer: IUrlSanitizer,
    private filenameSanitizer: IFilenameSanitizer,
    private idGenerator: IIdGenerator
  ) {}

  sanitizeHtml(input: string): string {
    return this.htmlSanitizer.sanitize(input)
  }

  sanitizeText(input: string): string {
    return this.textSanitizer.sanitizeText(input)
  }

  sanitizeEmail(input: string): string {
    return this.emailSanitizer.sanitize(input)
  }

  isValidRMUEmail(input: string): boolean {
    return this.emailValidator.validate(input)
  }

  hasXSSPatterns(input: string): boolean {
    return this.xssDetector.hasPatterns(input)
  }

  sanitizeUrl(input: string): string | null {
    return this.urlSanitizer.sanitizeUrl(input)
  }

  sanitizeFilename(input: string): string {
    return this.filenameSanitizer.sanitizeFilename(input)
  }

  generateSafeId(length: number = 16): string {
    return this.idGenerator.generate(length)
  }
}
```

**Migration note:** preserve the current public exports from `lib/security.ts` (`sanitizeText`, `sanitizeObject`, `sanitizeUrl`, `sanitizeFilename`, `generateSafeId`, `isValidIntegerInRange`, etc.) while moving internal behavior behind smaller strategy classes. Existing schemas and route handlers should not need a flag day rewrite.

---

## 4. Domain-Driven Design (DDD) Structure

### 4.1 Directory Organization

```
lib/
├── core/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Item.ts
│   │   │   ├── User.ts
│   │   │   └── Exchange.ts
│   │   ├── valueObjects/
│   │   │   ├── ItemId.ts
│   │   │   ├── UserId.ts
│   │   │   └── Rating.ts
│   │   ├── repositories/
│   │   │   ├── IItemRepository.ts
│   │   │   ├── IUserRepository.ts
│   │   │   └── IExchangeRepository.ts
│   │   └── services/
│   │       └── IDomainService.ts
│   ├── application/
│   │   ├── services/
│   │   │   ├── ItemService.ts
│   │   │   ├── UserService.ts
│   │   │   └── ExchangeService.ts
│   │   ├── dto/
│   │   │   ├── CreateItemDTO.ts
│   │   │   └── UpdateItemDTO.ts
│   │   └── handlers/
│   │       └── CommandHandler.ts
│   └── infrastructure/
│       ├── repositories/
│       │   ├── FirestoreItemRepository.ts
│       │   └── FirestoreUserRepository.ts
│       ├── database/
│       │   └── FirestoreConnection.ts
│       └── external/
│           ├── LineNotificationService.ts
│           └── CloudinaryImageService.ts
├── shared/
│   ├── interfaces/
│   │   ├── IRepository.ts
│   │   ├── IService.ts
│   │   └── ILogger.ts
│   ├── errors/
│   │   ├── ApplicationError.ts
│   │   ├── ValidationError.ts
│   │   └── NotFoundError.ts
│   └── utils/
│       └── Result.ts
└── container/
    └── DIContainer.ts
```

### 4.2 Entity and Value Object Example

```typescript
// lib/core/domain/valueObjects/ItemId.ts
export class ItemId {
  private readonly value: string

  private constructor(value: string) {
    if (!value || value.trim() === '') {
      throw new InvalidItemIdError('Item ID cannot be empty')
    }
    this.value = value
  }

  static create(value: string): ItemId {
    return new ItemId(value)
  }

  getValue(): string {
    return this.value
  }

  equals(other: ItemId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}

// lib/core/domain/entities/Item.ts
export class Item {
  private id: ItemId
  private title: string
  private description: string
  private owner: UserId
  private status: ItemStatus
  private createdAt: Date
  private updatedAt: Date

  private constructor(props: ItemProps) {
    this.id = props.id
    this.title = props.title
    this.description = props.description
    this.owner = props.owner
    this.status = props.status
    this.createdAt = props.createdAt || new Date()
    this.updatedAt = props.updatedAt || new Date()
  }

  static create(props: Omit<ItemProps, 'id' | 'createdAt' | 'updatedAt'>): Item {
    return new Item({
      ...props,
      id: ItemId.create(generateId()),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromPersistence(data: PersistenceItem): Item {
    return new Item({
      id: ItemId.create(data.id),
      ...data,
    })
  }

  getId(): ItemId {
    return this.id
  }

  getTitle(): string {
    return this.title
  }

  setTitle(title: string): void {
    this.title = title
    this.updatedAt = new Date()
  }

  toPersistence(): PersistenceItem {
    return {
      id: this.id.getValue(),
      title: this.title,
      description: this.description,
      owner: this.owner.getValue(),
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
```

---

## 5. Migration Strategy

### 5.1 Phase-based Migration Plan

#### Phase 1: Foundation (Week 1-2)
- [ ] Create base classes and interfaces
- [ ] Set up request-scoped composition root for server handlers
- [ ] Refactor Logger service without removing sinks / persistence / admin alerting
- [ ] Refactor Security service while preserving current helper exports
- [ ] Maintain backward compatibility with exports

#### Phase 2: Repository Layer (Week 2-3)
- [ ] Create domain entities
- [ ] Implement server-only repository pattern
- [ ] Create data mappers
- [ ] Migrate database access inside API routes and server-only services only

#### Phase 3: Application Services (Week 3-4)
- [ ] Implement Create/Update Item use cases behind API handlers
- [ ] Implement UserService
- [ ] Implement ExchangeService
- [ ] Move shared business rules into use-case classes

#### Phase 4: Integration (Week 4-5)
- [ ] Wire up API routes
- [ ] Update React components
- [ ] Integration tests
- [ ] E2E testing

#### Phase 5: Cleanup (Week 5-6)
- [ ] Remove old functional exports
- [ ] Full refactor validation
- [ ] Performance optimization
- [ ] Documentation finalization

### 5.2 Backward Compatibility Layer

```typescript
// lib/logger.ts - Backward Compatibility facade
const loggerInstance = new LegacyLogger(LogLevel.DEBUG, process.env.NODE_ENV)

// Export singleton (old style)
export const logger = loggerInstance

// Export convenience functions (old style)
export const log = {
  debug: (msg: string, ctx?: Context) => logger.debug(msg, ctx),
  info: (msg: string, ctx?: Context) => logger.info(msg, ctx),
  warn: (msg: string, ctx?: Context) => logger.warn(msg, ctx),
  error: (msg: string, ctx?: Context) => logger.error(msg, ctx),
  fatal: (msg: string, ctx?: Context) => logger.fatal(msg, ctx),
}

// Server code can gradually adopt sink-based logging
export { createSystemLogger, createFirestoreSink, createAdminNotifier }
```

```typescript
// lib/security.ts - Keep stable exports during migration
export {
  sanitizeHtml,
  sanitizeText,
  sanitizeEmail,
  isValidRMUEmail,
  isValidEmail,
  truncateString,
  sanitizeUrl,
  hasSuspiciousPatterns,
  sanitizeFilename,
  generateSafeId,
  isValidIntegerInRange,
  sanitizeObject,
} from './security/facade'
```

---

## 6. Error Handling Strategy

```typescript
// lib/shared/errors/ApplicationError.ts
export abstract class ApplicationError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, ApplicationError.prototype)
  }
}

export class ValidationError extends ApplicationError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400
  readonly details: Record<string, string[]>

  constructor(message: string, details: Record<string, string[]>) {
    super(message)
    this.details = details
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND'
  readonly statusCode = 404

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class UnauthorizedError extends ApplicationError {
  readonly code = 'UNAUTHORIZED'
  readonly statusCode = 401

  constructor(message: string = 'Unauthorized') {
    super(message)
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class UnknownApplicationError extends ApplicationError {
  readonly code = 'UNKNOWN_ERROR'
  readonly statusCode = 500

  constructor(message: string = 'Unknown error occurred') {
    super(message)
    Object.setPrototypeOf(this, UnknownApplicationError.prototype)
  }
}

// Error handler
export class ErrorHandler {
  constructor(private logger: ILogger) {}

  handle(error: unknown, context: ErrorContext): ApplicationError {
    if (error instanceof ApplicationError) {
      this.logger.error(error.message, {
        code: error.code,
        statusCode: error.statusCode,
        ...context,
      })
      return error
    }

    const unknownError = new UnknownApplicationError()
    this.logger.error('Unknown error', {
      error: error instanceof Error ? error.message : String(error),
      ...context,
    })
    return unknownError
  }
}
```

---

## 7. Testing Strategy

```typescript
// __tests__/unit/Logger.test.ts
describe('Logger Service', () => {
  let logger: Logger
  let mockFormatter: ILogFormatter
  let mockExternalService: IExternalLogService

  beforeEach(() => {
    mockFormatter = {
      format: jest.fn((entry) => JSON.stringify(entry)),
    }
    mockExternalService = {
      send: jest.fn(),
    }

    logger = new Logger(LogLevel.DEBUG, 'development', {
      formatters: [mockFormatter],
      externalService: mockExternalService,
    })
  })

  describe('debug', () => {
    it('should format and log debug messages', () => {
      const consoleSpy = jest.spyOn(console, 'debug')
      logger.debug('Test message', { userId: '123' })

      expect(consoleSpy).toHaveBeenCalled()
      expect(mockFormatter.format).toHaveBeenCalled()
    })

    it('should not log debug in production with WARN level', () => {
      const prodLogger = new Logger(LogLevel.WARN, 'production')
      const consoleSpy = jest.spyOn(console, 'debug')

      prodLogger.debug('Test')
      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })
})

// __tests__/unit/ItemService.test.ts
describe('ItemService', () => {
  let itemService: ItemService
  let mockRepository: IItemRepository
  let mockValidator: IValidator
  let mockLogger: ILogger

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
    }
    mockValidator = {
      validate: jest.fn().mockReturnValue(true),
    }
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any

    itemService = new ItemService({
      repository: mockRepository,
      validationService: mockValidator,
      logger: mockLogger,
    })
  })

  describe('createItem', () => {
    it('should create a new item with valid data', async () => {
      const itemData = {
        title: 'Test Item',
        description: 'Test Description',
        userId: 'user1',
      }

      const mockItem = Item.create(itemData)
      ;(mockRepository.create as jest.Mock).mockResolvedValue(mockItem)

      const result = await itemService.createItem(itemData)

      expect(mockRepository.create).toHaveBeenCalledWith(itemData)
      expect(result).toEqual(mockItem)
    })

    it('should throw ValidationError for invalid data', async () => {
      ;(mockValidator.validate as jest.Mock).mockReturnValue(false)

      await expect(itemService.createItem({})).rejects.toThrow(ValidationError)
    })
  })
})
```

---

## 8. Implementation Checklist

### Core Services
- [ ] Logger compatibility facade
- [ ] System logger with sinks, persistence, and escalation
- [ ] Security facade (keep public helpers stable)
- [ ] Security strategies for text, email, URL, filename, and ID generation
- [ ] ErrorHandler (create base error class)
- [ ] ValidationService (create validators)

### Infrastructure
- [ ] Database connection management
- [ ] Server-only repository implementations
- [ ] External service adapters

### Application Layer
- [ ] Item use cases for API handlers
- [ ] UserService
- [ ] ExchangeService
- [ ] ReportService

### Presentation Layer
- [ ] API route handlers
- [ ] React component integration
- [ ] State management update

### Testing
- [ ] Unit test for each service
- [ ] Integration tests
- [ ] E2E tests

---

## 9. Best Practices

### 9.1 Naming Conventions
```typescript
// Interfaces: IServiceName
interface IItemService {
  createItem(): Promise<Item>
}

// Concrete Classes: ServiceName
class ItemService implements IItemService {
  // implementation
}

// Abstract Classes: AbstractServiceName
abstract class BaseService {
  // shared behavior
}

// Exceptions: ErrorNameError
class ValidationError extends ApplicationError {}
class NotFoundError extends ApplicationError {}

// Mappers: EntityNameMapper
class ItemMapper {
  static toDomain(raw: any): Item {}
  static toPersistence(entity: Item): any {}
}
```

### 9.2 Composition and Dependency Injection Best Practices
```typescript
// ✅ Constructor injection inside use cases / services
class CreateItemUseCase {
  constructor(
    private repository: IItemRepository,
    private logger: ILogger
  ) {}
}

// ✅ Request-scoped composition in route handlers
export async function POST(request: NextRequest) {
  const services = createRequestServices()
  return services.createItem.execute(await request.json(), await requireAuth(request))
}

// ❌ Global singleton container for request-specific dependencies
const service = globalContainer.get('CreateItemUseCase')
```

### 9.3 SOLID Principles Checklist
```typescript
// Single Responsibility: Each class has one reason to change
class EmailValidator implements IValidator {} // Only validates emails
class HtmlSanitizer implements ISanitizer {} // Only sanitizes HTML

// Open/Closed: Open for extension, closed for modification
interface ISanitizer {
  sanitize(input: string): string
}
class CustomSanitizer implements ISanitizer {} // Extend without modifying

// Liskov Substitution: Subtypes must be substitutable
class Logger implements ILogger {}
class MockLogger implements ILogger {}
// Both can be used interchangeably

// Interface Segregation: Many specific interfaces
interface ILogger { log(): void }
interface IMetrics { record(): void }
// Not one fat interface with everything

// Dependency Inversion: Depend on abstractions
class ItemService {
  constructor(private repository: IItemRepository) {} // Depend on interface
}
```

---

## 10. Performance Considerations

### 10.1 Practical Performance Priorities
```typescript
// Prefer preserving query constraints, server-side filtering, and caches
class PosterProfileCache {
  private cache = new Map<string, { profile: PosterProfileSummary; at: number }>()

  get(userId: string): PosterProfileSummary | null {
    const entry = this.cache.get(userId)
    if (!entry) return null
    if (Date.now() - entry.at > 5 * 60_000) {
      this.cache.delete(userId)
      return null
    }
    return entry.profile
  }
}
```

### 10.2 Lazy Loading
```typescript
// Lazy load optional integrations where it reduces cold path cost
class AdminNotifierAdapter {
  async notify(event: LogEvent): Promise<void> {
    const { getAuth } = await import('firebase/auth')
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()
    if (!token) return
    await fetch('/api/line/notify-admin', { method: 'POST', body: JSON.stringify(event) })
  }
}
```

---

## 11. Migration Timeline

| Phase | Duration | Key Activities | Status |
|-------|----------|----------------|--------|
| Foundation | Week 1-2 | Base classes, DI, Core services | 🔵 To Do |
| Repositories | Week 2-3 | Repository pattern, Entities | 🔵 To Do |
| Services | Week 3-4 | Domain services, Application layer | 🔵 To Do |
| Integration | Week 4-5 | API wiring, Component updates | 🔵 To Do |
| Cleanup | Week 5-6 | Remove legacy code, Optimization | 🔵 To Do |

---

## 12. Key Files to Create

```
lib/
├── core/
│   ├── use-cases/
│   │   ├── CreateItemUseCase.ts
│   │   ├── UpdateItemUseCase.ts
│   │   └── ConfirmExchangeUseCase.ts
│   ├── policies/
│   │   └── PostingPolicy.ts
│   ├── errors/
│   │   ├── ApplicationError.ts
│   │   └── ErrorHandler.ts
│   └── services/
│       └── SearchKeywordService.ts
├── services/
│   └── logging/
│       ├── types.ts
│       ├── system-logger.ts
│       ├── console-sink.ts
│       ├── firestore-sink.ts
│       └── admin-notifier.ts
├── security/
│   ├── contracts.ts
│   ├── facade.ts
│   ├── sanitizers/
│   ├── validators/
│   └── detectors/
├── repositories/
│   ├── FirestoreItemRepository.ts
│   └── FirestoreUserRepository.ts
├── composition/
│   └── createRequestServices.ts
└── ...

__tests__/
├── unit/
│   ├── system-logger.test.ts
│   ├── security-facade.test.ts
│   └── create-item-use-case.test.ts
└── integration/
    └── create-request-services.test.ts
```

---

## References

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Design Patterns](https://refactoring.guru/design-patterns)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
