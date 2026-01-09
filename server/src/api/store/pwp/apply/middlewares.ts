import { defineMiddlewares } from "@medusajs/medusa"
import { z } from "zod"
import { ApplyPWPSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/pwp/apply",
      method: "POST",
      middlewares: [
        async (req, _res, next) => {
          try {
            req.validatedBody = ApplyPWPSchema.parse(req.body)
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
