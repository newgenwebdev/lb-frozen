import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { RemoveCouponSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/coupons/remove",
      method: "POST",
      middlewares: [validateAndTransformBody(RemoveCouponSchema as any)],
    },
  ],
})
