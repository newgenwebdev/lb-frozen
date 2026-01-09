import { defineMiddlewares } from "@medusajs/medusa"
import { z } from "zod"
import { CheckPWPSchema } from "../schemas"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/pwp/check",
      method: "POST",
      middlewares: [
        async (req, _res, next) => {
          try {
            req.validatedBody = CheckPWPSchema.parse(req.body)
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
