import createClient, { type Client } from "openapi-fetch";

import type { components, paths } from "./schema.gen";

/** Body of every error response. Translate by `code`; never display `message`. */
export type ApiError = components["schemas"]["Error"];

/** Pagination state returned as `page` by every list endpoint. */
export type PageInfo = components["schemas"]["PageInfo"];

export type ApiClient = Client<paths>;

/**
 * Returns a client whose paths, parameters and response bodies are typed
 * from openapi/openapi.yaml.
 */
export function createApiClient(baseUrl: string): ApiClient {
  return createClient<paths>({ baseUrl });
}
