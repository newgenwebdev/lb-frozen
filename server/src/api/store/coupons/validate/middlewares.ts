import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { ValidateCouponSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/coupons/validate",
      method: "POST",
      middlewares: [validateAndTransformBody(ValidateCouponSchema as any)],
    },
  ],
})
