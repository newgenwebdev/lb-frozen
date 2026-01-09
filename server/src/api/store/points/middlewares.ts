import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/points",
      method: "GET",
      middlewares: [],
    },
    {
      matcher: "/store/points/history",
      method: "GET",
      middlewares: [],
    },
  ],
})
