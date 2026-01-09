import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { generateOpenAPIDocument } from "../../../utils/generate-openapi"

/**
 * GET /docs/swagger.json
 * Return OpenAPI JSON specification
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const openApiDocument = generateOpenAPIDocument()

  res.json(openApiDocument)
}
