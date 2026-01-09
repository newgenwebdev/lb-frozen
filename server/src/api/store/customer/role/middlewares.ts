import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customer/role",
      method: "GET",
      middlewares: [authenticate("customer", ["bearer", "session"], { allowUnregistered: true })],
    },
  ],
})
