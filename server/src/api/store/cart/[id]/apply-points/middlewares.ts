import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { ApplyPointsSchema } from "../../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/cart/:id/apply-points",
      method: "POST",
      middlewares: [validateAndTransformBody(ApplyPointsSchema as any)],
    },
  ],
})
