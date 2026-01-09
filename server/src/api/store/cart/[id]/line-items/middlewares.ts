import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { AddLineItemSchema } from "../../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/cart/:id/line-items",
      method: "POST",
      middlewares: [validateAndTransformBody(AddLineItemSchema as any)],
    },
  ],
})
