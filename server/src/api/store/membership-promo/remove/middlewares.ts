import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { RemoveMembershipPromoSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/membership-promo/remove",
      method: "POST",
      middlewares: [validateAndTransformBody(RemoveMembershipPromoSchema as any)],
    },
  ],
})
