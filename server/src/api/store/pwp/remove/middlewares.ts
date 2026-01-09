import { defineMiddlewares } from "@medusajs/medusa"
import { z } from "zod"
import { RemovePWPSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/pwp/remove",
      method: "POST",
      middlewares: [
        async (req, _res, next) => {
          try {
            req.validatedBody = RemovePWPSchema.parse(req.body)
            next()
          } catch (error) {
            if (error instanceof z.ZodError) {
              next(error)
            } else {
              next(error)
            }
          }
        },
      ],
    },
  ],
})
