import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { UpdateLineItemSchema } from "../../../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/cart/:id/line-items/:line_id",
      method: "PATCH",
      middlewares: [validateAndTransformBody(UpdateLineItemSchema as any)],
    },
  ],
})
