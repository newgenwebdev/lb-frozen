import { api } from "./client";
import {
  ReturnSchema,
  ReturnStatsSchema,
  ReturnListResponseSchema,
  CanReturnResponseSchema,
  type Return,
  type ReturnStats,
  type ReturnListResponse,
  type ReturnFilter,
  type CreateReturnRequest,
  type ApproveReturnRequest,
  type RejectReturnRequest,
  type MarkInTransitRequest,
  type CompleteReturnRequest,
  type CanReturnResponse,
} from "@/lib/validators/return";

/**
 * Get return statistics for dashboard cards
 */
export async function getReturnStats(): Promise<ReturnStats> {
  const res = await api.get("/admin/return-requests/stats");
  const parsed = ReturnStatsSchema.safeParse(res.data.stats);

  if (!parsed.success) {
    throw new Error("Invalid return stats response");
  }

  return parsed.data;
}

/**
 * Get paginated list of returns with filters
 */
export async function getReturns(filters?: ReturnFilter): Promise<ReturnListResponse> {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== "all") {
    params.append("status", filters.status);
  }

  if (filters?.return_type && filters.return_type !== "all") {
    params.append("return_type", filters.return_type);
  }

  if (filters?.date_range && filters.date_range !== "all") {
    params.append("date_range", filters.date_range);
  }

  if (filters?.search) {
    params.append("q", filters.search);
  }

  if (filters?.order_id) {
    params.append("order_id", filters.order_id);
  }

  if (filters?.limit) {
    params.append("limit", filters.limit.toString());
  }

  if (filters?.offset) {
    params.append("offset", filters.offset.toString());
  }

  const res = await api.get(`/admin/return-requests?${params.toString()}`);
  const parsed = ReturnListResponseSchema.safeParse(res.data);

  if (!parsed.success) {
    throw new Error("Invalid returns list response");
  }

  return parsed.data;
}

/**
 * Get single return by ID
 */
export async function getReturnById(id: string): Promise<Return> {
  const res = await api.get(`/admin/return-requests/${id}`);
  const parsed = ReturnSchema.safeParse(res.data.return);

  if (!parsed.success) {
    throw new Error("Invalid return response");
  }

  return parsed.data;
}

/**
 * Create a new return request
 */
export async function createReturn(data: CreateReturnRequest): Promise<Return> {
  try {
    const res = await api.post("/admin/return-requests", data);
    const parsed = ReturnSchema.safeParse(res.data.return);

    if (!parsed.success) {
      throw new Error("Invalid return response");
    }

    return parsed.data;
  } catch (error: unknown) {
    // Surface the actual server error message
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      throw new Error(axiosError.response.data.message);
    }
    throw error;
  }
}

/**
 * Check if an order is eligible for return
 */
export async function checkCanReturn(orderId: string): Promise<CanReturnResponse> {
  const res = await api.get(`/admin/orders/${orderId}/can-return`);
  const parsed = CanReturnResponseSchema.safeParse(res.data);

  if (!parsed.success) {
    throw new Error("Invalid can-return response");
  }

  return parsed.data;
}

/**
 * Approve a return request
 */
export async function approveReturn(
  id: string,
  data?: ApproveReturnRequest
): Promise<Return> {
  const res = await api.post(`/admin/return-requests/${id}/approve`, data || {});
  const parsed = ReturnSchema.safeParse(res.data.return);

  if (!parsed.success) {
    throw new Error("Invalid return response");
  }

  return parsed.data;
}

/**
 * Reject a return request
 */
export async function rejectReturn(
  id: string,
  data: RejectReturnRequest
): Promise<Return> {
  // Server expects 'reason', not 'rejection_reason'
  const res = await api.post(`/admin/return-requests/${id}/reject`, {
    reason: data.rejection_reason,
  });
  const parsed = ReturnSchema.safeParse(res.data.return);

  if (!parsed.success) {
    throw new Error("Invalid return response");
  }

  return parsed.data;
}

/**
 * Mark return as in transit (customer has shipped)
 */
export async function markReturnInTransit(
  id: string,
  data?: MarkInTransitRequest
): Promise<Return> {
  const res = await api.post(`/admin/return-requests/${id}/in-transit`, data || {});
  const parsed = ReturnSchema.safeParse(res.data.return);

  if (!parsed.success) {
    throw new Error("Invalid return response");
  }

  return parsed.data;
}

/**
 * Mark return as received at warehouse
 */
export async function markReturnReceived(id: string): Promise<Return> {
  const res = await api.post(`/admin/return-requests/${id}/received`);
  const parsed = ReturnSchema.safeParse(res.data.return);

  if (!parsed.success) {
    throw new Error("Invalid return response");
  }

  return parsed.data;
}

/**
 * Complete return after inspection
 */
export async function completeReturn(
  id: string,
  data?: CompleteReturnRequest
): Promise<Return> {
  const res = await api.post(`/admin/return-requests/${id}/complete`, data || {});
  const parsed = ReturnSchema.safeParse(res.data.return);

  if (!parsed.success) {
    throw new Error("Invalid return response");
  }

  return parsed.data;
}

/**
 * Process refund via Stripe
 */
export async function processRefund(id: string): Promise<{
  success: boolean;
  return: Return;
  refund: {
    id: string;
    amount: number;
    status: string;
    currency: string;
  };
  points?: {
    points_deducted: number;
    points_restored: number;
    new_balance: number;
  } | null;
}> {
  const res = await api.post(`/admin/return-requests/${id}/refund`);
  return res.data;
}

/**
 * Get returns for a specific order
 */
export async function getReturnsByOrderId(orderId: string): Promise<Return[]> {
  const res = await getReturns({ order_id: orderId });
  return res.returns;
}

/**
 * Create replacement order request type
 */
export type CreateReplacementOrderRequest = {
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country_code?: string;
    phone?: string;
  };
  admin_notes?: string;
};

/**
 * Replacement order response type
 */
export type ReplacementOrderResponse = {
  success: boolean;
  return: {
    id: string;
    status: string;
    return_type: string;
    replacement_order_id: string;
    replacement_created_at: string;
  };
  replacement_order: {
    id: string;
    display_id: number;
    customer_id: string;
    email: string;
    currency_code: string;
    items: Array<{
      id: string;
      variant_id: string;
      title: string;
      quantity: number;
      unit_price: number;
    }>;
    shipping_address: {
      first_name: string;
      last_name: string;
      address_1: string;
      address_2: string;
      city: string;
      province: string;
      postal_code: string;
      country_code: string;
      phone: string;
    };
    metadata: Record<string, unknown>;
    created_at: string;
  };
};

/**
 * Create replacement order for a completed replacement-type return
 */
export async function createReplacementOrder(
  returnId: string,
  data?: CreateReplacementOrderRequest
): Promise<ReplacementOrderResponse> {
  try {
    const res = await api.post(
      `/admin/return-requests/${returnId}/create-replacement`,
      data || {}
    );
    return res.data;
  } catch (error: unknown) {
    // Surface the actual server error message
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message);
      }
    }
    throw error;
  }
}

// ==========================================
// EasyParcel Return Shipping Integration
// ==========================================

/**
 * Shipping rate from EasyParcel
 */
export type ShippingRate = {
  service_id: string;
  service_name: string;
  courier_id: string;
  courier_name: string;
  courier_logo: string;
  price: number;
  price_display: string;
  pickup_date: string;
  delivery_eta: string;
  has_cod: boolean;
  has_insurance: boolean;
};

/**
 * Response from get return shipping rates
 */
export type ReturnShippingRatesResponse = {
  success: boolean;
  rates: ShippingRate[];
  count: number;
  return_id: string;
  weight: number; // Weight used for rate calculation (in kg)
  calculated_weight: number; // Weight calculated from items (in kg)
  customer_postcode: string;
  warehouse_postcode: string;
  customer_address?: {
    name: string;
    address: string;
    postcode: string;
    phone: string;
  };
  warehouse_address?: {
    name: string;
    address: string;
    postcode: string;
    phone: string;
  };
  environment: "demo" | "production";
  message?: string;
};

/**
 * Request to submit return shipping to EasyParcel
 */
export type SubmitReturnShippingRequest = {
  service_id: string;
  service_name: string;
  courier_id: string;
  courier_name: string;
  weight: number;
  rate: number; // in cents
  pickup_date: string; // YYYY-MM-DD
  pickup_time?: string;
  content?: string;
};

/**
 * Response from submit return shipping
 */
export type SubmitReturnShippingResponse = {
  success: boolean;
  message: string;
  return_id: string;
  order_no: string;
  easyparcel_return_id: string;
  environment: "demo" | "production";
};

/**
 * Response from pay return shipping
 */
export type PayReturnShippingResponse = {
  success: boolean;
  message: string;
  return_id: string;
  order_no: string;
  parcel_no?: string;
  awb: string;
  tracking_url?: string;
  environment: "demo" | "production" | "mock";
  mock_mode?: boolean;
  already_paid?: boolean;
};

/**
 * EasyParcel shipping status for a return
 */
export type ReturnShippingStatus = {
  success: boolean;
  return_id: string;
  has_easyparcel_shipping: boolean;
  message?: string;
  shipping?: {
    id: string;
    order_no: string | null;
    parcel_no: string | null;
    awb: string | null;
    status: string;
    courier_name: string;
    service_name: string;
    weight: number;
    rate: number;
    pickup_date: string | null;
    tracking_url: string | null;
    sender: {
      name: string;
      phone: string;
      address: string;
      postcode: string;
    };
    receiver: {
      name: string;
      phone: string;
      address: string;
      postcode: string;
    };
    created_at: string;
    updated_at: string;
  };
};

/**
 * Get available shipping rates for a return request
 * Weight is automatically calculated from return items on the backend
 */
export async function getReturnShippingRates(
  returnId: string,
  weight?: number
): Promise<ReturnShippingRatesResponse> {
  try {
    // If weight is provided, use it as override; otherwise backend calculates from items
    const body = weight ? { weight } : {};
    const res = await api.post(`/admin/return-requests/${returnId}/shipping/rates`, body);
    return res.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      throw new Error(axiosError.response.data.message);
    }
    throw error;
  }
}

/**
 * Submit return shipping to EasyParcel
 */
export async function submitReturnShipping(
  returnId: string,
  data: SubmitReturnShippingRequest
): Promise<SubmitReturnShippingResponse> {
  try {
    const res = await api.post(`/admin/return-requests/${returnId}/shipping/submit`, data);
    return res.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      throw new Error(axiosError.response.data.message);
    }
    throw error;
  }
}

/**
 * Pay for return shipping and get AWB/tracking number
 */
export async function payReturnShipping(
  returnId: string
): Promise<PayReturnShippingResponse> {
  try {
    const res = await api.post(`/admin/return-requests/${returnId}/shipping/pay`);
    return res.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      throw new Error(axiosError.response.data.message);
    }
    throw error;
  }
}

/**
 * Get EasyParcel shipping status for a return
 */
export async function getReturnShippingStatus(
  returnId: string
): Promise<ReturnShippingStatus> {
  try {
    const res = await api.get(`/admin/return-requests/${returnId}/shipping/status`);
    return res.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      throw new Error(axiosError.response.data.message);
    }
    throw error;
  }
}
