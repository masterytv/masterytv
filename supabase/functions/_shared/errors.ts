import { createSupabaseClient } from "./supabase.ts";

/**
 * Structured error response pattern.
 * Never naked try/catch — log to error_log table per ARCHITECTURE.md §8.3.
 *
 * S6.13: Enhanced with severity, metadata, and retry-aware logging.
 */
export async function logError(
  functionName: string,
  error: Error,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createSupabaseClient();
    await supabase.from("error_log").insert({
      function_name: functionName,
      error_message: error.message,
      stack_trace: error.stack,
      user_id: userId ?? null,
      metadata: metadata ?? {},
    });
  } catch {
    // If error logging itself fails, write to console as last resort
    console.error(`[${functionName}] Failed to log error:`, error.message);
  }
}

/**
 * Creates a JSON error response with proper status code.
 */
export function errorResponse(
  errorCode: string,
  message: string,
  status: number = 500,
  headers: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: errorCode,
      message,
    }),
    {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    }
  );
}

/**
 * Creates a JSON success response.
 */
export function jsonResponse(
  data: unknown,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * S6.13: Retry with exponential backoff.
 * Retries an async operation up to `maxRetries` times with exponential delay.
 * Used for LLM calls, external API calls, and any flaky network operations.
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in ms before first retry (default: 1000)
 * @param shouldRetry - Optional predicate to decide if a specific error is retryable
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxRetries?: number;
    baseDelay?: number;
    functionName?: string;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, functionName = "unknown", shouldRetry } = opts;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if this error is retryable
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s
        console.warn(
          `[${functionName}] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * S6.13: Predicate for retryable HTTP errors.
 * Returns true for 5xx server errors, 429 rate limits, and network errors.
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("429") ||
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    error.name === "TimeoutError" ||
    error.name === "AbortError"
  );
}
