import { z } from "zod";

const ReturnItemSchema = z.object({
  item_id: z.string(),
  variant_id: z.string(),
  product_name: z.string(),
  quantity: z.number().min(1),
  unit_price: z.number(),
});

export const PostAdminReturnsSchema = z.object({
  order_id: z.string(),
  return_type: z.enum(["refund", "replacement"]),
  reason: z.enum(["defective", "wrong_item", "not_as_described", "changed_mind", "other"]),
  reason_details: z.string().optional(),
  items: z.array(ReturnItemSchema).min(1),
  refund_amount: z.number(),
  shipping_refund: z.number().optional(),
  admin_notes: z.string().optional(),
});

export type PostAdminReturnsType = z.infer<typeof PostAdminReturnsSchema>;
