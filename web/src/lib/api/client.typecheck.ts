// Compile-time checks that the generated types and the client agree with the
// contract. This file is only type-checked (npm run typecheck), never run.
import { type ApiError, createApiClient, type PageInfo } from "./client";

const api = createApiClient("http://localhost:8080");

export async function contract(): Promise<void> {
  const health = await api.GET("/healthz");
  const status: "ok" | "unavailable" | undefined = health.data?.status;

  const ready = await api.GET("/readyz");
  const failed: "ok" | "failed" | undefined = ready.error?.checks?.["database"];

  // @ts-expect-error paths that are not in the spec must not compile
  await api.GET("/not-in-the-spec");

  const error: ApiError = { code: "not_found", message: "", request_id: "" };
  // @ts-expect-error request_id is required on every error
  const incomplete: ApiError = { code: "not_found", message: "" };

  const lastPage: PageInfo = { next_cursor: null };
  // @ts-expect-error next_cursor must be present, even when null
  const missingCursor: PageInfo = {};

  void [status, failed, error, incomplete, lastPage, missingCursor];
}
