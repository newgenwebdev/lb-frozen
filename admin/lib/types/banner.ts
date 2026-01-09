export type BannerStatus = "active" | "non-active";

// API Response Types
export type BannerAPI = {
  id: string;
  announcement_text: string;
  link: string;
  start_date: string;
  end_date: string;
  background_color: string;
  text_color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_enabled: boolean;
  is_active: boolean;
};

export type BannerAPIListResponse = {
  banners: BannerAPI[];
  count: number;
  limit: number;
  offset: number;
};

// UI Types
export type Banner = {
  id: string;
  displayId: string; // e.g., "2109"
  text: string;
  period: string; // e.g., "Nov 2025" or "Jun 2025 - Des 2025"
  status: BannerStatus;
  isEnabled: boolean; // Manual toggle (independent of dates)
  link?: string;
  startDate?: string;
  endDate?: string;
  backgroundColor?: string;
  textColor?: string;
};

export type BannerListResponse = {
  banners: Banner[];
  count: number;
  page: number;
  limit: number;
};

export type BannerFormData = {
  text: string;
  link: string;
  startDate: string;
  endDate: string;
  backgroundColor: string;
  textColor: string;
};

// API Query Parameters
export type BannerListParams = {
  limit?: number;
  offset?: number;
  status?: "active" | "non_active" | "all";
};
