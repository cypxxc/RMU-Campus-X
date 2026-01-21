// ============================================================
// Create Exchange Use Case
// ============================================================

import type { Exchange } from "@/types"
import type { IUseCase, UseCaseResult } from "./types"
import { success, failure } from "./types"
import type { IItemRepository } from "@/lib/repositories/item-repository"
import type { IExchangeRepository } from "@/lib/repositories/exchange-repository"
import type { IUserRepository } from "@/lib/repositories/user-repository"
import { ERROR_CODES } from "@/lib/errors/error-codes"

// ============ Types ============

export interface CreateExchangeInput {
  itemId: string
  requesterId: string
  requesterEmail: string
}

export interface CreateExchangeDeps {
  itemRepository: IItemRepository
  exchangeRepository: IExchangeRepository
  userRepository: IUserRepository
  onExchangeCreated?: (exchange: Exchange) => Promise<void>
}

// ============ Use Case ============

export class CreateExchangeUseCase implements IUseCase<CreateExchangeInput, UseCaseResult<Exchange>> {
  constructor(private deps: CreateExchangeDeps) {}

  async execute(input: CreateExchangeInput): Promise<UseCaseResult<Exchange>> {
    const { itemId, requesterId, requesterEmail } = input
    const { itemRepository, exchangeRepository, userRepository, onExchangeCreated } = this.deps

    // 1. Check if requester is allowed to exchange
    const requester = await userRepository.findById(requesterId)
    if (requester) {
      if (requester.status === "SUSPENDED") {
        return failure("บัญชีของคุณถูกระงับชั่วคราว", ERROR_CODES.USER_SUSPENDED)
      }
      if (requester.status === "BANNED") {
        return failure("บัญชีของคุณถูกระงับถาวร", ERROR_CODES.USER_BANNED)
      }
      if (requester.restrictions && !requester.restrictions.canExchange) {
        return failure("คุณถูกจำกัดสิทธิ์การแลกเปลี่ยน", ERROR_CODES.FORBIDDEN)
      }
    }

    // 2. Get item
    const item = await itemRepository.findById(itemId)
    if (!item) {
      return failure("ไม่พบสิ่งของที่ต้องการ", ERROR_CODES.NOT_FOUND)
    }

    // 3. Check if item is available
    if (item.status !== "available") {
      return failure("สิ่งของนี้ไม่พร้อมแลกเปลี่ยนแล้ว", ERROR_CODES.ITEM_NOT_AVAILABLE)
    }

    // 4. Cannot exchange own item
    if (item.postedBy === requesterId) {
      return failure("ไม่สามารถขอแลกเปลี่ยนสิ่งของของตัวเองได้", ERROR_CODES.CANNOT_EXCHANGE_OWN_ITEM)
    }

    // 5. Check if exchange already exists
    const existingExchange = await exchangeRepository.findActiveByItem(itemId)
    if (existingExchange) {
      if (existingExchange.requesterId === requesterId) {
        return failure("คุณได้ขอแลกเปลี่ยนสิ่งของนี้ไปแล้ว", ERROR_CODES.EXCHANGE_ALREADY_EXISTS)
      }
      return failure("สิ่งของนี้มีคนขอแลกเปลี่ยนอยู่แล้ว", ERROR_CODES.ITEM_NOT_AVAILABLE)
    }

    // 6. Create exchange
    const exchange = await exchangeRepository.create({
      itemId,
      itemTitle: item.title,
      ownerId: item.postedBy,
      ownerEmail: item.postedByEmail,
      requesterId,
      requesterEmail,
    })

    // 7. Update item status
    await itemRepository.updateStatus(itemId, "pending")

    // 8. Trigger side effects (notifications, events)
    if (onExchangeCreated) {
      await onExchangeCreated(exchange)
    }

    return success(exchange)
  }
}

// ============ Factory ============

export function createCreateExchangeUseCase(deps: CreateExchangeDeps): CreateExchangeUseCase {
  return new CreateExchangeUseCase(deps)
}
