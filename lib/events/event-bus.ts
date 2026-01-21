// ============================================================
// Event Bus - Simple In-Process Event Dispatcher
// ============================================================

import type { AppEvent, EventType } from "./event-types"

type EventHandler<T extends AppEvent = AppEvent> = (event: T) => Promise<void> | void

interface EventBus {
  emit: <T extends AppEvent>(event: T) => Promise<void>
  on: <T extends AppEvent>(type: EventType, handler: EventHandler<T>) => () => void
  off: (type: EventType, handler: EventHandler) => void
  clear: () => void
}

/**
 * Create a simple in-process event bus
 * For production, consider using a message queue like Redis, RabbitMQ, etc.
 */
export function createEventBus(): EventBus {
  const handlers = new Map<EventType, Set<EventHandler>>()

  return {
    async emit<T extends AppEvent>(event: T): Promise<void> {
      const eventHandlers = handlers.get(event.type)
      if (!eventHandlers) return

      const promises: Promise<void>[] = []

      for (const handler of eventHandlers) {
        try {
          const result = handler(event)
          if (result instanceof Promise) {
            promises.push(result)
          }
        } catch (error) {
          console.error(`[EventBus] Error in handler for ${event.type}:`, error)
        }
      }

      // Wait for all async handlers
      if (promises.length > 0) {
        await Promise.allSettled(promises)
      }
    },

    on<T extends AppEvent>(type: EventType, handler: EventHandler<T>): () => void {
      if (!handlers.has(type)) {
        handlers.set(type, new Set())
      }
      handlers.get(type)!.add(handler as EventHandler)

      // Return unsubscribe function
      return () => {
        handlers.get(type)?.delete(handler as EventHandler)
      }
    },

    off(type: EventType, handler: EventHandler): void {
      handlers.get(type)?.delete(handler)
    },

    clear(): void {
      handlers.clear()
    },
  }
}

// ============ Global Event Bus Instance ============

let globalEventBus: EventBus | null = null

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = createEventBus()
  }
  return globalEventBus
}

// ============ Helper Functions ============

/**
 * Emit an event to the global event bus
 */
export async function emitEvent<T extends AppEvent>(event: T): Promise<void> {
  await getEventBus().emit(event)
}

/**
 * Subscribe to an event type on the global event bus
 */
export function onEvent<T extends AppEvent>(
  type: EventType,
  handler: EventHandler<T>
): () => void {
  return getEventBus().on(type, handler)
}
