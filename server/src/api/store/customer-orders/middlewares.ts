import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customer-orders",
      method: "GET",
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    {
      matcher: "/store/customer-orders/:id",
      method: "GET",
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
  ],
})
