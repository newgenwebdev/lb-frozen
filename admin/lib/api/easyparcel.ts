import { api } from "./client";

/**
 * EasyParcel shipping info stored in order metadata
 */
export interface EasyParcelShippingInfo {
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
}

/**
 * Order submission item for EasyParcel
 */
export interface EasyParcelOrderSubmission {
  order_id: string;
  service_id: string;
  service_name: string;
  courier_id: string;
  courier_name: string;
  weight: number;
  rate: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_postcode: string;
  receiver_country?: string;
  content: string;
  pickup_date: string;
  pickup_time?: string;
}

/**
 * Submit order result
 */
export interface EasyParcelSubmitResult {
  order_id: string;
  success: boolean;
  order_no?: string;
  message?: string;
}

/**
 * Payment result
 */
export interface EasyParcelPayResult {
  order_no: string;
  success: boolean;
  parcel_no?: string;
  awb?: string;
  tracking_url?: string;
  message?: string;
}

/**
 * Submit orders to EasyParcel
 */
export async function submitEasyParcelOrders(
  orders: EasyParcelOrderSubmission[]
): Promise<{
  success: boolean;
  message: string;
  results: EasyParcelSubmitResult[];
  environment: string;
}> {
  try {
    const res = await api.post("/admin/easyparcel/orders", { orders });
    return res.data;
  } catch (error: unknown) {
    // Extract error message from API response if available
    const axiosError = error as { response?: { data?: { message?: string } } };
    const errorMessage = axiosError.response?.data?.message || "Failed to submit orders to EasyParcel";
    return {
      success: false,
      message: errorMessage,
      results: [],
      environment: "unknown",
    };
  }
}

/**
 * Pay for EasyParcel orders and get AWB numbers
 */
export async function payEasyParcelOrders(
  orderNos: string[]
): Promise<{
  success: boolean;
  message: string;
  results: EasyParcelPayResult[];
  environment: string;
}> {
  const res = await api.post("/admin/easyparcel/pay", { order_nos: orderNos });
  return res.data;
}

/**
 * Ship a single order with EasyParcel
 * This combines submit + pay into a single flow for convenience
 */
export async function shipWithEasyParcel(
  orderId: string,
  shippingInfo: EasyParcelShippingInfo,
  receiverInfo: {
    name: string;
    phone: string;
    address: string;
    postcode: string;
    country?: string;
  },
  packageInfo: {
    weight: number;
    content: string;
    pickup_date: string;
    pickup_time?: string;
  }
): Promise<{
  success: boolean;
  order_no?: string;
  awb?: string;
  tracking_url?: string;
  message: string;
}> {
  // Step 1: Submit the order to EasyParcel
  const submitResult = await submitEasyParcelOrders([
    {
      order_id: orderId,
      service_id: shippingInfo.service_id,
      service_name: shippingInfo.service_name,
      courier_id: shippingInfo.courier_id,
      courier_name: shippingInfo.courier_name,
      weight: packageInfo.weight,
      rate: shippingInfo.price,
      receiver_name: receiverInfo.name,
      receiver_phone: receiverInfo.phone,
      receiver_address: receiverInfo.address,
      receiver_postcode: receiverInfo.postcode,
      receiver_country: receiverInfo.country || "SG",
      content: packageInfo.content,
      pickup_date: packageInfo.pickup_date,
      pickup_time: packageInfo.pickup_time,
    },
  ]);

  if (!submitResult.success || submitResult.results.length === 0) {
    return {
      success: false,
      message: submitResult.message || "Failed to submit order to EasyParcel",
    };
  }

  const submitOrderResult = submitResult.results[0];
  if (!submitOrderResult.success || !submitOrderResult.order_no) {
    return {
      success: false,
      message: submitOrderResult.message || "Failed to create EasyParcel order",
    };
  }

  // Step 2: Pay for the order to get AWB
  const payResult = await payEasyParcelOrders([submitOrderResult.order_no]);

  if (!payResult.success || payResult.results.length === 0) {
    return {
      success: false,
      order_no: submitOrderResult.order_no,
      message: payResult.message || "Order created but payment failed",
    };
  }

  const payOrderResult = payResult.results[0];
  if (!payOrderResult.success || !payOrderResult.awb) {
    return {
      success: false,
      order_no: submitOrderResult.order_no,
      message: payOrderResult.message || "Order created but payment failed",
    };
  }

  return {
    success: true,
    order_no: submitOrderResult.order_no,
    awb: payOrderResult.awb,
    tracking_url: payOrderResult.tracking_url,
    message: `Shipment created successfully. AWB: ${payOrderResult.awb}`,
  };
}

/**
 * Get tracking information for an AWB
 */
export async function trackEasyParcelShipment(
  awb: string
): Promise<{
  success: boolean;
  tracking_events?: Array<{
    date: string;
    time: string;
    status: string;
    location: string;
  }>;
  message?: string;
}> {
  const res = await api.get(`/admin/easyparcel/track/${encodeURIComponent(awb)}`);
  return res.data;
}
