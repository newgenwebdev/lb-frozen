export type ShipmentStatus = "Active" | "Non Active";

// API Response Types
export type ShipmentAPI = {
  id: string;
  name: string;
  base_rate: number;
  eta: string;
  status: ShipmentStatus;
  created_at: string;
  updated_at: string;
};

export type ShipmentAPIListResponse = {
  shipments: ShipmentAPI[];
  count: number;
  limit: number;
  offset: number;
};

export type ShipmentAPIGetResponse = {
  shipment: ShipmentAPI;
};

// UI Types
export type Shipment = {
  id: string;
  displayId: string; // e.g., "2109"
  name: string;
  baseRate: number;
  eta: string;
  status: ShipmentStatus;
};

export type ShipmentListResponse = {
  shipments: Shipment[];
  count: number;
  page: number;
  limit: number;
};

export type ShipmentFormData = {
  name: string;
  base_rate: number;
  eta: string;
  status: ShipmentStatus;
};

// API Query Parameters
export type ShipmentListParams = {
  limit?: number;
  offset?: number;
  status?: "Active" | "Non Active" | "all";
};
