/**
 * Test script to verify ApiClient error handling consistency,
 * specifically deliberate 500 internal server error, 401, 403, 404,
 * and Zod schema validation.
 */
import { ApiClientError } from "../src/lib/api-client/errors";
import { http } from "../src/lib/api-client/http";
import { z } from "zod";

async function runTests() {
  console.log("=== Testing ApiClient Error Handling Consistency ===");
  let passed = 0;
  let failed = 0;

  // Mock global fetch for controlled testing
  const originalFetch = global.fetch;

  // Test 1: Deliberate 500 Internal Server Error
  try {
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          error: "Database transaction deadlocked",
          code: "INTERNAL_SERVER_ERROR",
          details: { query: "UPDATE wallet_balances..." },
        }),
        {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    try {
      await http("/api/wallet/withdraw", { method: "POST", body: JSON.stringify({ amount: 1000 }) });
      console.error("FAIL: 500 did not throw an error");
      failed++;
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const rawPayload = err.raw as { details?: { query?: string } } | null | undefined;
        if (
          err.status === 500 &&
          err.code === "INTERNAL_SERVER_ERROR" &&
          err.message === "Database transaction deadlocked" &&
          rawPayload?.details?.query === "UPDATE wallet_balances..."
        ) {
          console.log("PASS: Deliberate 500 returned consistent ApiClientError shape");
          console.log("      status:", err.status);
          console.log("      code:", err.code);
          console.log("      message:", err.message);
          console.log("      raw:", JSON.stringify(err.raw));
          passed++;
        } else {
          console.error("FAIL: ApiClientError properties did not match expected shape:", err);
          failed++;
        }
      } else {
        console.error("FAIL: Error was not an instance of ApiClientError:", err);
        failed++;
      }
    }

    // Test 2: Deliberate 403 Forbidden Error
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: "You do not have permission to perform this action",
            code: "FORBIDDEN",
          }),
          {
            status: 403,
            statusText: "Forbidden",
            headers: { "Content-Type": "application/json" },
          }
        );
      };

      await http("/api/admin/payouts", { method: "GET" });
      console.error("FAIL: 403 did not throw");
      failed++;
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.isForbidden && err.status === 403) {
        console.log("PASS: 403 returned ApiClientError with isForbidden === true");
        passed++;
      } else {
        console.error("FAIL: 403 failed verification:", err);
        failed++;
      }
    }

    // Test 3: Deliberate 404 Not Found Error
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: "Deal not found",
            code: "NOT_FOUND",
          }),
          {
            status: 404,
            statusText: "Not Found",
            headers: { "Content-Type": "application/json" },
          }
        );
      };

      await http("/api/deals/non-existent-id", { method: "GET" });
      console.error("FAIL: 404 did not throw");
      failed++;
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.isNotFound && err.status === 404) {
        console.log("PASS: 404 returned ApiClientError with isNotFound === true");
        passed++;
      } else {
        console.error("FAIL: 404 failed verification:", err);
        failed++;
      }
    }

    // Test 4: Zod Schema Validation Failure on 200 OK
    try {
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            id: 12345, // Invalid: should be string
            status: "UNKNOWN_STATUS",
          }),
          {
            status: 200,
            statusText: "OK",
            headers: { "Content-Type": "application/json" },
          }
        );
      };

      const DealSchema = z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "ACTIVE", "COMPLETED"]),
      });

      await http("/api/deals/123", { method: "GET", schema: DealSchema });
      console.error("FAIL: Invalid schema response did not throw ZodError");
      failed++;
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        console.log("PASS: Schema validation failed as expected on malformed 200 response");
        passed++;
      } else {
        console.error("FAIL: Did not throw ZodError:", err);
        failed++;
      }
    }

    // Test 5: Network Failure Retry Behavior
    let attemptCount = 0;
    try {
      global.fetch = async () => {
        attemptCount++;
        throw new TypeError("Failed to fetch (network error)");
      };

      await http(
        "/api/wallet",
        { method: "GET", retry: { retries: 2, baseDelayMs: 10 } }
      );
      console.error("FAIL: Network error did not throw");
      failed++;
    } catch (err: unknown) {
      if (attemptCount === 3) {
        // Initial try + 2 retries = 3 attempts
        console.log(`PASS: Centralized retry attempted exactly ${attemptCount} times on network error`);
        passed++;
      } else {
        console.error(`FAIL: Expected 3 attempts, got ${attemptCount}`);
        failed++;
      }
    }

  } finally {
    global.fetch = originalFetch;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
