import { api } from "./client";
import type {
  MembershipSettings,
  MembershipSettingsResponse,
  UpdateMembershipSettingsInput,
  PointsConfig,
  PointsConfigResponse,
  UpdatePointsConfigInput,
} from "../types/membership-settings";

// ============================================================
// Membership Settings API
// ============================================================

/**
 * Get membership program settings
 */
export async function getMembershipSettings(): Promise<MembershipSettings> {
  const response = await api.get<MembershipSettingsResponse>("/admin/membership/settings");
  return response.data.settings;
}

/**
 * Update membership program settings
 */
export async function updateMembershipSettings(
  input: UpdateMembershipSettingsInput
): Promise<MembershipSettings> {
  const response = await api.put<MembershipSettingsResponse>("/admin/membership/settings", input);
  return response.data.settings;
}

// ============================================================
// Points Configuration API
// ============================================================

/**
 * Get points system configuration
 */
export async function getPointsConfig(): Promise<PointsConfig> {
  const response = await api.get<PointsConfigResponse>("/admin/points/config");
  return response.data.config;
}

/**
 * Update points system configuration
 */
export async function updatePointsConfig(
  input: UpdatePointsConfigInput
): Promise<PointsConfig> {
  const response = await api.put<PointsConfigResponse>("/admin/points/config", input);
  return response.data.config;
}
