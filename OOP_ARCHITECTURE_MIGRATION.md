# OOP Architecture Migration Guide

## Overview
This guide outlines a strategic migration from functional programming patterns to Object-Oriented Programming (OOP) principles in the RMU Campus X project. The migration maintains backward compatibility while establishing scalable, maintainable architecture.

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
// ❌ Current: Functional utilities with singleton pattern
class Logger {
  private static instance: Logger
  // Mixing concerns: logging format + external service integration
  private log(level, message, context, source) { /* ... */ }
}
export const logger = Logger.getInstance()
export const log = { debug, info, warn, error } // Function wrappers

class SecurityService {
  // All security concerns in one class (200+ lines)
  sanitizeHtml() { /* ... */ }
  sanitizeEmail() { /* ... */ }
  validateRMUEmail() { /* ... */ }
  // Mixed responsibilities: sanitization, validation, XSS detection
}
```

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

### 2.2 Repository Pattern

```typescript
// Abstract repository with common CRUD operations
abstract class BaseRepository<T, ID> implements IRepository<T, ID> {
  protected db: IDatabase
  protected mapper: IEntityMapper<T>

  async create(entity: T): Promise<T> {
    const data = this.mapper.toPersistence(entity)
    const ref = await this.db.collection(this.getCollectionName()).add(data)
    return this.mapper.toDomain({ id: ref.id, ...data })
  }

  async findById(id: ID): Promise<T | null> {
    const doc = await this.db.collection(this.getCollectionName()).doc(id).get()
    return doc.exists ? this.mapper.toDomain({ id: doc.id, ...doc.data() }) : null
  }

  protected abstract getCollectionName(): string
}

// Domain repository
class ItemRepository extends BaseRepository<Item, string> implements IItemRepository {
  protected getCollectionName(): string {
    return 'items'
  }

  async findByUserId(userId: string): Promise<Item[]> {
    const snapshot = await this.db
      .collection(this.getCollectionName())
      .where('owner', '==', userId)
      .get()
    
    return snapshot.docs.map(doc => 
      this.mapper.toDomain({ id: doc.id, ...doc.data() })
    )
  }
}
```

### 2.3 Dependency Injection Container

```typescript
interface ContainerConfig {
  environment: 'development' | 'production'
  firebaseConfig: FirebaseConfig
  logLevel: LogLevel
}

class DIContainer {
  private singletons: Map<string, any> = new Map()

  constructor(private config: ContainerConfig) {}

  // Register singleton services
  registerSingleton<T>(key: string, factory: () => T): void {
    this.singletons.set(key, factory())
  }

  // Retrieve services
  get<T>(key: string): T {
    return this.singletons.get(key)
  }

  // Setup method called during app initialization
  static async setup(config: ContainerConfig): Promise<DIContainer> {
    const container = new DIContainer(config)

    // Register core services
    container.registerSingleton('logger', () => 
      new Logger(config.logLevel, config.environment)
    )

    container.registerSingleton('securityService', () =>
      new SecurityService(container.get('logger'))
    )

    container.registerSingleton('itemRepository', () =>
      new ItemRepository(firebase.firestore(), container.get('logger'))
    )

    container.registerSingleton('validationService', () =>
      new ValidationService(container.get('logger'))
    )

    container.registerSingleton('itemService', () =>
      new ItemService({
        repository: container.get('itemRepository'),
        validationService: container.get('validationService'),
        logger: container.get('logger'),
      })
    )

    return container
  }
}
```

---

## 3. Refactored Core Services

### 3.1 Logger Service (Segregated)

**Interface Layer:**
```typescript
// lib/logger/ILogger.ts
export interface ILogger {
  debug(message: string, context?: Context, source?: string): void
  info(message: string, context?: Context, source?: string): void
  warn(message: string, context?: Context, source?: string): void
  error(message: string, context?: Context, source?: string): void
  fatal(message: string, context?: Context, source?: string): void
}

export interface IExternalLogService {
  send(entry: LogEntry): Promise<void>
}

export interface ILogFormatter {
  format(entry: LogEntry): string
}
```

**Implementation:**
```typescript
// lib/logger/Logger.ts
export class Logger implements ILogger {
  private logLevel: LogLevel
  private formatters: ILogFormatter[]
  private externalService?: IExternalLogService

  constructor(
    logLevel: LogLevel | undefined,
    private environment: 'development' | 'production',
    config?: LoggerConfig
  ) {
    this.logLevel =
      logLevel ?? (environment === 'production' ? LogLevel.WARN : LogLevel.DEBUG)
    this.formatters = config?.formatters ?? [new DefaultLogFormatter()]
    this.externalService = config?.externalService
  }

  debug(message: string, context?: Context, source?: string): void {
    this.log(LogLevel.DEBUG, message, context, source)
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: Context,
    source?: string
  ): Promise<void> {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = { level, message, context, timestamp: new Date(), source }
    const formatted = this.formatters.map(f => f.format(entry))

    // Log to console
    this.writeToConsole(level, formatted.join('\n'))

    // Log to external service if in production
    if (this.environment === 'production' && this.externalService) {
      await this.externalService.send(entry).catch(err =>
        console.error('Failed to send log to external service:', err)
      )
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }

  private writeToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message)
        break
      case LogLevel.INFO:
        console.info(message)
        break
      case LogLevel.WARN:
        console.warn(message)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message)
        break
    }
  }
}
```

### 3.2 Security Service (Segregated into Strategies)

**Interfaces:**
```typescript
// lib/security/ISanitizer.ts
export interface ISanitizer {
  sanitize(input: string): string
}

export interface IValidator {
  validate(input: string): boolean
}

export interface IXSSDetector {
  hasPatterns(input: string): boolean
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

// lib/security/SecurityContextBuilder.ts
export class SecurityContextBuilder {
  private sanitizers: Map<string, ISanitizer> = new Map()
  private validators: Map<string, IValidator> = new Map()
  private detectors: IXSSDetector[] = []

  addSanitizer(type: string, sanitizer: ISanitizer): this {
    this.sanitizers.set(type, sanitizer)
    return this
  }

  addValidator(type: string, validator: IValidator): this {
    this.validators.set(type, validator)
    return this
  }

  addDetector(detector: IXSSDetector): this {
    this.detectors.push(detector)
    return this
  }

  build(): ISecurityContext {
    return new SecurityContext(this.sanitizers, this.validators, this.detectors)
  }
}

// lib/security/SecurityContext.ts
export class SecurityContext implements ISecurityContext {
  constructor(
    private sanitizers: Map<string, ISanitizer>,
    private validators: Map<string, IValidator>,
    private detectors: IXSSDetector[]
  ) {}

  sanitize(type: string, input: string): string {
    const sanitizer = this.sanitizers.get(type)
    if (!sanitizer) throw new Error(`Unknown sanitizer type: ${type}`)
    return sanitizer.sanitize(input)
  }

  validate(type: string, input: string): boolean {
    const validator = this.validators.get(type)
    if (!validator) throw new Error(`Unknown validator type: ${type}`)
    return validator.validate(input)
  }

  hasXSSPatterns(input: string): boolean {
    return this.detectors.some(detector => detector.hasPatterns(input))
  }
}
```

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
- [ ] Set up DI container
- [ ] Refactor Logger service
- [ ] Refactor Security service
- [ ] Maintain backward compatibility with exports

#### Phase 2: Repository Layer (Week 2-3)
- [ ] Create domain entities
- [ ] Implement repository pattern
- [ ] Create data mappers
- [ ] Migrate database layer

#### Phase 3: Application Services (Week 3-4)
- [ ] Implement ItemService
- [ ] Implement UserService
- [ ] Implement ExchangeService
- [ ] Add dependency injection

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
// lib/logger/index.ts - Backward Compatibility
const loggerInstance = new Logger(LogLevel.DEBUG, process.env.NODE_ENV)

// Export singleton (old style)
export const logger = loggerInstance

// Export convenience functions (old style)
export const log = {
  debug: (msg: string, ctx?: Context) => logger.debug(msg, ctx),
  info: (msg: string, ctx?: Context) => logger.info(msg, ctx),
  warn: (msg: string, ctx?: Context) => logger.warn(msg, ctx),
  error: (msg: string, ctx?: Context) => logger.error(msg, ctx),
}

// Export OOP interface (new style)
export { Logger, type ILogger }
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
- [ ] Logger (completed: Logger class)
- [ ] SecurityService (refactor with strategy pattern)
- [ ] ErrorHandler (create base error class)
- [ ] ValidationService (create validators)

### Infrastructure
- [ ] Database connection management
- [ ] Repository implementations
- [ ] External service adapters

### Application Layer
- [ ] ItemService
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

### 9.2 Dependency Injection Best Practices
```typescript
// ✅ Constructor injection (preferred)
class ItemService {
  constructor(
    private repository: IItemRepository,
    private logger: ILogger
  ) {}
}

// ❌ Property injection (avoid)
class ItemService {
  @Inject
  private repository: IItemRepository
}

// ❌ Service locator pattern (avoid unless necessary)
const service = container.get('ItemService')
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

### 10.1 Memory Management
```typescript
// Use object pooling for frequently created instances
class ObjectPool<T> {
  private available: T[] = []
  private inUse: Set<T> = new Set()

  constructor(private factory: () => T, initialSize: number) {
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory())
    }
  }

  acquire(): T {
    const obj = this.available.pop() || this.factory()
    this.inUse.add(obj)
    return obj
  }

  release(obj: T): void {
    this.inUse.delete(obj)
    this.available.push(obj)
  }
}
```

### 10.2 Lazy Loading
```typescript
// Lazy load heavy dependencies
class LazyDependency<T> {
  private instance: T | null = null

  constructor(private factory: () => Promise<T>) {}

  async get(): Promise<T> {
    if (!this.instance) {
      this.instance = await this.factory()
    }
    return this.instance
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
│   ├── BaseService.ts
│   ├── BaseRepository.ts
│   ├── BaseEntity.ts
│   ├── ApplicationError.ts
│   └── ErrorHandler.ts
├── logger/
│   ├── ILogger.ts
│   ├── Logger.ts
│   ├── LogFormatter.ts
│   └── index.ts
├── security/
│   ├── ISecurityContext.ts
│   ├── SecurityContext.ts
│   ├── sanitizers/
│   └── validators/
├── container/
│   ├── DIContainer.ts
│   └── ContainerConfig.ts
└── ...

__tests__/
├── unit/
│   ├── Logger.test.ts
│   ├── SecurityContext.test.ts
│   └── ItemService.test.ts
└── integration/
    └── DIContainer.test.ts
```

---

## References

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Design Patterns](https://refactoring.guru/design-patterns)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
