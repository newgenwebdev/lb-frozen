import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework"
import { CalculatePointsSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/points/calculate",
      method: "POST",
      middlewares: [validateAndTransformBody(CalculatePointsSchema as any)],
    },
  ],
})
