import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { PurchaseMembershipSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/membership/purchase",
      method: "POST",
      middlewares: [validateAndTransformBody(PurchaseMembershipSchema as any)],
    },
  ],
})
