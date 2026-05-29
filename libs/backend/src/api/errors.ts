import { z } from "zod";

export const ErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export type ApiError = z.infer<typeof ErrorSchema>;

export function notFound(resource: string): ApiError {
  return { error: `${resource} not found`, code: "NOT_FOUND" };
}

export function badRequest(message: string): ApiError {
  return { error: message, code: "BAD_REQUEST" };
}

export function internalError(): ApiError {
  return { error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
}

export function unauthorized(message = "Unauthorized"): ApiError {
  return { error: message, code: "UNAUTHORIZED" };
}

export function forbidden(message = "Access denied"): ApiError {
  return { error: message, code: "FORBIDDEN" };
}
