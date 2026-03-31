import { createSupabaseClient } from "./supabase.ts";

/**
 * Structured error response pattern.
 * Never naked try/catch — log to error_log table per ARCHITECTURE.md §8.3.
 */
export async function logError(
  functionName: string,
  error: Error,
  userId?: string
): Promise<void> {
  try {
    const supabase = createSupabaseClient();
    await supabase.from("error_log").insert({
      function_name: functionName,
      error_message: error.message,
      stack_trace: error.stack,
      user_id: userId ?? null,
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
