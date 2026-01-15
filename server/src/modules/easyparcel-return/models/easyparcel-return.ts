import { model } from "@medusajs/framework/utils"

/**
 * EasyParcelReturn Model
 * Stores EasyParcel shipment data for return requests
 *
 * Note: For returns, the shipping direction is reversed:
 * - Sender (pickup): Customer address
 * - Receiver (delivery): Warehouse address
 *
 * Lifecycle:
 * 1. rate_checked - Rates fetched, courier selected
 * 2. order_created - Order submitted to EasyParcel (has order_no)
 * 3. paid - Order paid, AWB assigned (has awb)
 * 4. in_transit - Parcel picked up and in transit
 * 5. delivered - Parcel delivered to warehouse
 * 6. cancelled - Order cancelled
 */
const EasyParcelReturn = model.define("easyparcel_return", {
  id: model.id().primaryKey(),

  // Return request reference
  return_id: model.text(), // Return request ID
  order_id: model.text(), // Original Medusa order ID (for reference)

  // EasyParcel identifiers
  order_no: model.text().nullable(), // EasyParcel order number (after submission)
  parcel_no: model.text().nullable(), // EasyParcel parcel number (after payment)
  awb: model.text().nullable(), // Airway bill / tracking number (after payment)

  // Courier/Service info
  service_id: model.text(),
  service_name: model.text(),
  courier_id: model.text(),
  courier_name: model.text(),

  // Shipment details
  weight: model.float(), // Weight in kg
  rate: model.number(), // Rate in cents

  // Pickup details (from customer)
  pickup_date: model.text().nullable(),
  pickup_time: model.text().nullable(),

  // Sender info (customer - where package is picked up)
  sender_name: model.text(),
  sender_phone: model.text(),
  sender_address: model.text(),
  sender_postcode: model.text(),
  sender_country: model.text().default("MY"),

  // Receiver info (warehouse - where package is delivered)
  receiver_name: model.text(),
  receiver_phone: model.text(),
  receiver_address: model.text(),
  receiver_postcode: model.text(),
  receiver_country: model.text().default("MY"),

  // Status tracking
  status: model.text().default("rate_checked"), // rate_checked | order_created | paid | in_transit | delivered | cancelled

  // Tracking
  tracking_url: model.text().nullable(),

  // Metadata for additional info
  metadata: model.json().nullable(),
})

export default EasyParcelReturn
