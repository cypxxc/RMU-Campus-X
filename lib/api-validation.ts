/**
 * API Validation Wrapper
 * Provides consistent server-side Zod validation for API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { verifyIdToken, extractBearerToken, hasAcceptedTerms } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";

export interface ValidationContext {
  userId: string;
  email?: string;
  isAdmin?: boolean;
}

export interface ApiHandlerOptions {
  /** Whether authentication is required */
  requireAuth?: boolean;
  /** Optional: Check if user is admin */
  requireAdmin?: boolean;
  /** Optional: Require user to have accepted terms & privacy (user doc termsAccepted === true) */
  requireTermsAccepted?: boolean;
}

type ApiHandler<T> = (
  request: NextRequest,
  data: T,
  context: ValidationContext | null,
) => Promise<Response>;

/**
 * Wrap an API route with Zod schema validation
 *
 * @example
 * ```typescript
 * export const POST = withValidation(
 *   createExchangeSchema,
 *   async (req, data, ctx) => {
 *     // data is fully typed and validated
 *     const exchange = await createExchange({ ...data, requesterId: ctx.userId })
 *     return NextResponse.json({ success: true, id: exchange.id })
 *   },
 *   { requireAuth: true }
 * )
 * ```
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: ApiHandler<T>,
  options: ApiHandlerOptions = {},
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      // Handle authentication if required
      let context: ValidationContext | null = null;

      if (options.requireAuth) {
        const token = extractBearerToken(request.headers.get("Authorization"));
        if (!token) {
          return NextResponse.json(
            { error: "Authentication required", code: "AUTH_REQUIRED" },
            { status: 401 },
          );
        }

        const decoded = await verifyIdToken(token, true);
        if (!decoded) {
          return NextResponse.json(
            { error: "Invalid or expired token", code: "INVALID_TOKEN" },
            { status: 401 },
          );
        }

        context = {
          userId: decoded.uid,
          email: decoded.email,
        };

        // Check if user is admin when requireAdmin is true
        if (options.requireAdmin) {
          const adminCheck = decoded.email
            ? await isAdmin(decoded.email)
            : false;
          if (!adminCheck) {
            return NextResponse.json(
              { error: "Admin access required", code: "ADMIN_REQUIRED" },
              { status: 403 },
            );
          }
          context.isAdmin = true;
        }

        // Check if user has accepted terms when requireTermsAccepted is true
        if (options.requireTermsAccepted) {
          const accepted = await hasAcceptedTerms(decoded.uid);
          if (!accepted) {
            return NextResponse.json(
              { error: "กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวก่อนใช้งาน", code: "TERMS_REQUIRED" },
              { status: 403 },
            );
          }
        }
      }

      // Parse and validate request body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body", code: "INVALID_JSON" },
          { status: 400 },
        );
      }

      // Validate against schema
      const result = schema.safeParse(body);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        return NextResponse.json(
          {
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: errors,
          },
          { status: 400 },
        );
      }

      // Call the actual handler with validated data
      return handler(request, result.data, context);
    } catch (error) {
      console.error("[API Validation] Unexpected error:", error);
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }
  };
}

/**
 * Format Zod errors for API response
 */
function formatZodErrors(
  error: ZodError,
): Array<{ field: string; message: string }> {
  return error.errors.map((e) => ({
    field: e.path.join(".") || "root",
    message: e.message,
  }));
}

/**
 * Wrapper for routes that only need auth (no body validation)
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: ValidationContext,
  ) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const token = extractBearerToken(request.headers.get("Authorization"));
      if (!token) {
        return NextResponse.json(
          { error: "Authentication required", code: "AUTH_REQUIRED" },
          { status: 401 },
        );
      }

      const decoded = await verifyIdToken(token, true);
      if (!decoded) {
        return NextResponse.json(
          { error: "Invalid or expired token", code: "INVALID_TOKEN" },
          { status: 401 },
        );
      }

      return await handler(request, {
        userId: decoded.uid,
        email: decoded.email,
      });
    } catch (error) {
      console.error("[API Auth] Unexpected error:", error);
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }
  };
}

/**
 * Wrapper for routes that need admin auth (no body validation)
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    context: ValidationContext,
  ) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const token = extractBearerToken(request.headers.get("Authorization"));
      if (!token) {
        return NextResponse.json(
          { error: "Authentication required", code: "AUTH_REQUIRED" },
          { status: 401 },
        );
      }

      const decoded = await verifyIdToken(token, true);
      if (!decoded) {
        return NextResponse.json(
          { error: "Invalid or expired token", code: "INVALID_TOKEN" },
          { status: 401 },
        );
      }

      // Check admin status
      const adminCheck = decoded.email ? await isAdmin(decoded.email) : false;
      if (!adminCheck) {
        return NextResponse.json(
          { error: "Admin access required", code: "ADMIN_REQUIRED" },
          { status: 403 },
        );
      }

      return await handler(request, {
        userId: decoded.uid,
        email: decoded.email,
        isAdmin: true,
      });
    } catch (error) {
      console.error("[API AdminAuth] Unexpected error:", error);
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }
  };
}
