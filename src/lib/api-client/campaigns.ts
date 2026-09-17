/**
 * apiClient.campaigns — All campaign-related API calls.
 */
import { get, post, put, patch } from "./http";
import type { HttpOptions } from "./http";
import {
  campaignsListResponseSchema,
  singleCampaignResponseSchema,
  type CampaignsListResponse,
  type SingleCampaignResponse,
} from "@/lib/schemas";

/** GET /api/campaigns — list with filter/sort/page params (validated against campaignsListResponseSchema) */
export function list(
  params: Record<string, string | number> = {},
  options?: HttpOptions,
): Promise<CampaignsListResponse> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return get<CampaignsListResponse>(`/api/campaigns${qs ? `?${qs}` : ""}`, {
    schema: campaignsListResponseSchema,
    ...options,
  });
}

/** GET /api/campaigns/:id (validated against singleCampaignResponseSchema) */
export function getById(id: string, options?: HttpOptions): Promise<SingleCampaignResponse> {
  return get<SingleCampaignResponse>(`/api/campaigns/${encodeURIComponent(id)}`, {
    schema: singleCampaignResponseSchema,
    ...options,
  });
}


/** POST /api/campaigns — create new campaign */
export function create(data: Record<string, unknown>, options?: HttpOptions) {
  return post("/api/campaigns", data, options);
}

/** PUT /api/campaigns/:id — full update (edit draft) */
export function update(
  id: string,
  data: Record<string, unknown>,
  options?: HttpOptions,
) {
  return put(`/api/campaigns/${encodeURIComponent(id)}`, data, options);
}

/** PATCH /api/campaigns/:id — partial update (ACTIVATE / CANCEL action) */
export function patchAction(
  id: string,
  action: "ACTIVATE" | "CANCEL",
  options?: HttpOptions,
) {
  return patch(`/api/campaigns/${encodeURIComponent(id)}`, { action }, options);
}
