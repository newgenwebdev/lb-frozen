import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { ApplyCouponSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/coupons/apply",
      method: "POST",
      middlewares: [validateAndTransformBody(ApplyCouponSchema as any)],
    },
  ],
})
