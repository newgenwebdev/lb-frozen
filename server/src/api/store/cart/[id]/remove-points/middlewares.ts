import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/cart/:id/remove-points",
      method: "POST",
      middlewares: [],
    },
  ],
})
