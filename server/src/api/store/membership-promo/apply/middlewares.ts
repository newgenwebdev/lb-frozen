import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { ApplyMembershipPromoSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/membership-promo/apply",
      method: "POST",
      middlewares: [validateAndTransformBody(ApplyMembershipPromoSchema as any)],
    },
  ],
})
