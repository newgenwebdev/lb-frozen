import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import PDFDocument from "pdfkit"
import { getVerifiedCustomerId } from "../../../../../utils/store-auth"

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currencyCode: string): string {
  const formatter = new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: 2,
  })
  return formatter.format(amount / 100)
}

/**
 * Format date for invoice
 */
function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * GET /store/customer-orders/:id/invoice
 * Generate and download invoice PDF for an order
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" } as any)
    return
  }

  const orderId = req.params.id

  const orderModule = req.scope.resolve(Modules.ORDER)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Fetch the order with items
  const orders = await orderModule.listOrders(
    { id: orderId },
    {
      relations: ["items", "items.adjustments", "shipping_address"],
    }
  )

  const order = orders[0]

  if (!order) {
    res.status(404).json({ message: "Order not found" } as any)
    return
  }

  // Verify the order belongs to the authenticated customer
  if (order.customer_id !== customerId) {
    res.status(403).json({ message: "Access denied" } as any)
    return
  }

  // Get customer details
  let customerEmail = order.email || ""
  let customerName = ""

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)
    const customers = await customerModule.listCustomers({ id: customerId })
    if (customers[0]) {
      customerEmail = customers[0].email || customerEmail
      customerName = `${customers[0].first_name || ""} ${customers[0].last_name || ""}`.trim()
    }
  } catch {
    // Continue without customer details
  }

  // Get variant thumbnails
  const variantIds = [
    ...new Set(
      order.items?.map((item) => item.variant_id).filter(Boolean) || []
    ),
  ]

  let variantMap = new Map<string, { thumbnail: string | null; product_name: string }>()
  if (variantIds.length > 0) {
    try {
      const variants = await productModule.listProductVariants(
        { id: variantIds },
        { relations: ["product"] }
      )
      variantMap = new Map(
        variants.map((v) => [
          v.id,
          {
            thumbnail: (v.product as any)?.thumbnail || null,
            product_name: (v.product as any)?.title || v.title || "Unknown Product",
          },
        ])
      )
    } catch {
      // Continue without thumbnails
    }
  }

  // Calculate totals
  const items = order.items || []
  const currencyCode = order.currency_code || "myr"

  const subtotal = items.reduce((sum, item) =>
    sum + (item.unit_price || 0) * (item.quantity || 0), 0)

  const pwpDiscount = items.reduce((sum, item) => {
    const metadata = (item as any).metadata
    if (metadata?.is_pwp_item && metadata?.pwp_discount_amount) {
      return sum + Number(metadata.pwp_discount_amount) * (item.quantity || 1)
    }
    return sum
  }, 0)

  let couponDiscount = items.reduce((sum, item) => {
    const adjustments = (item as any).adjustments || []
    return sum + adjustments.reduce((adjSum: number, adj: any) =>
      adjSum + (adj.amount || 0), 0)
  }, 0)

  if (couponDiscount === 0 && (order as any).metadata?.applied_coupon_discount) {
    couponDiscount = Number((order as any).metadata.applied_coupon_discount) || 0
  }

  const pointsDiscount = Number((order as any).metadata?.points_discount_amount) || 0
  const shippingTotal = 0 // Adjust if you have shipping data
  const taxTotal = 0 // Adjust if you have tax data
  const totalDiscount = pwpDiscount + couponDiscount + pointsDiscount
  const grandTotal = Math.max(0, subtotal - totalDiscount + shippingTotal + taxTotal)

  // Generate PDF
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `Invoice #${order.display_id}`,
      Author: "LB Frozen",
    }
  })

  // Set response headers for PDF download
  const filename = `invoice-${order.display_id}.pdf`
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)

  // Pipe PDF to response
  doc.pipe(res as any)

  // === HEADER ===
  doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", 50, 50)

  // Company info (right side)
  doc.fontSize(10).font("Helvetica")
  doc.text("LB Frozen", 400, 50, { align: "right" })
  doc.text("Malaysia", 400, 65, { align: "right" })

  // Invoice details
  doc.fontSize(10).font("Helvetica")
  doc.text(`Invoice #: ${order.display_id}`, 50, 100)
  doc.text(`Date: ${formatDate(order.created_at)}`, 50, 115)
  doc.text(`Order ID: ${order.id.substring(0, 8)}...`, 50, 130)

  // === BILLING INFO ===
  doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", 50, 170)
  doc.fontSize(10).font("Helvetica")

  const shippingAddr = order.shipping_address
  let yPos = 185

  if (customerName) {
    doc.text(customerName, 50, yPos)
    yPos += 15
  } else if (shippingAddr) {
    const name = `${shippingAddr.first_name || ""} ${shippingAddr.last_name || ""}`.trim()
    if (name) {
      doc.text(name, 50, yPos)
      yPos += 15
    }
  }

  if (customerEmail) {
    doc.text(customerEmail, 50, yPos)
    yPos += 15
  }

  if (shippingAddr) {
    if (shippingAddr.address_1) {
      doc.text(shippingAddr.address_1, 50, yPos)
      yPos += 15
    }
    if (shippingAddr.address_2) {
      doc.text(shippingAddr.address_2, 50, yPos)
      yPos += 15
    }
    const cityLine = [
      shippingAddr.city,
      shippingAddr.province,
      shippingAddr.postal_code,
    ].filter(Boolean).join(", ")
    if (cityLine) {
      doc.text(cityLine, 50, yPos)
      yPos += 15
    }
    if (shippingAddr.country_code) {
      doc.text(shippingAddr.country_code.toUpperCase(), 50, yPos)
      yPos += 15
    }
    if (shippingAddr.phone) {
      doc.text(`Phone: ${shippingAddr.phone}`, 50, yPos)
      yPos += 15
    }
  }

  // === ITEMS TABLE ===
  const tableTop = Math.max(yPos + 30, 280)
  const tableLeft = 50
  const colWidths = { item: 250, qty: 60, price: 90, total: 95 }

  // Table header
  doc.fontSize(10).font("Helvetica-Bold")
  doc.rect(tableLeft, tableTop, 495, 20).fill("#f0f0f0")
  doc.fillColor("#000000")
  doc.text("Item", tableLeft + 5, tableTop + 5)
  doc.text("Qty", tableLeft + colWidths.item + 5, tableTop + 5, { width: colWidths.qty, align: "center" })
  doc.text("Unit Price", tableLeft + colWidths.item + colWidths.qty + 5, tableTop + 5, { width: colWidths.price, align: "right" })
  doc.text("Total", tableLeft + colWidths.item + colWidths.qty + colWidths.price + 5, tableTop + 5, { width: colWidths.total, align: "right" })

  // Table rows
  let rowY = tableTop + 25
  doc.font("Helvetica").fontSize(9)

  for (const item of items) {
    const variantInfo = variantMap.get(item.variant_id || "")
    const itemTitle = item.title || variantInfo?.product_name || "Unknown Product"
    const unitPrice = item.unit_price || 0
    const quantity = item.quantity || 0
    const itemTotal = unitPrice * quantity
    const isPWP = (item as any).metadata?.is_pwp_item

    // Check if we need a new page
    if (rowY > 700) {
      doc.addPage()
      rowY = 50
    }

    // Item name (with PWP indicator if applicable)
    const displayTitle = isPWP ? `${itemTitle} (PWP)` : itemTitle
    doc.text(displayTitle, tableLeft + 5, rowY, { width: colWidths.item - 10 })

    // Quantity
    doc.text(quantity.toString(), tableLeft + colWidths.item + 5, rowY, { width: colWidths.qty, align: "center" })

    // Unit price
    doc.text(formatCurrency(unitPrice, currencyCode), tableLeft + colWidths.item + colWidths.qty + 5, rowY, { width: colWidths.price, align: "right" })

    // Total
    doc.text(formatCurrency(itemTotal, currencyCode), tableLeft + colWidths.item + colWidths.qty + colWidths.price + 5, rowY, { width: colWidths.total, align: "right" })

    rowY += 20
  }

  // === TOTALS ===
  const totalsX = 380
  let totalsY = rowY + 20

  // Draw line above totals
  doc.moveTo(tableLeft, totalsY - 10).lineTo(545, totalsY - 10).stroke()

  doc.fontSize(10).font("Helvetica")

  // Subtotal
  doc.text("Subtotal:", totalsX, totalsY)
  doc.text(formatCurrency(subtotal, currencyCode), totalsX + 70, totalsY, { width: 95, align: "right" })
  totalsY += 18

  // PWP Discount
  if (pwpDiscount > 0) {
    doc.text("PWP Discount:", totalsX, totalsY)
    doc.fillColor("#b45309").text(`-${formatCurrency(pwpDiscount, currencyCode)}`, totalsX + 70, totalsY, { width: 95, align: "right" })
    doc.fillColor("#000000")
    totalsY += 18
  }

  // Coupon Discount
  if (couponDiscount > 0) {
    const couponCode = (order as any).metadata?.applied_coupon_code
    const couponLabel = couponCode ? `Coupon (${couponCode}):` : "Coupon:"
    doc.text(couponLabel, totalsX, totalsY)
    doc.fillColor("#16a34a").text(`-${formatCurrency(couponDiscount, currencyCode)}`, totalsX + 70, totalsY, { width: 95, align: "right" })
    doc.fillColor("#000000")
    totalsY += 18
  }

  // Points Discount
  if (pointsDiscount > 0) {
    const pointsRedeemed = (order as any).metadata?.points_to_redeem
    const pointsLabel = pointsRedeemed ? `Points (${pointsRedeemed} pts):` : "Points:"
    doc.text(pointsLabel, totalsX, totalsY)
    doc.fillColor("#b45309").text(`-${formatCurrency(pointsDiscount, currencyCode)}`, totalsX + 70, totalsY, { width: 95, align: "right" })
    doc.fillColor("#000000")
    totalsY += 18
  }

  // Shipping
  doc.text("Shipping:", totalsX, totalsY)
  doc.text(shippingTotal === 0 ? "Free" : formatCurrency(shippingTotal, currencyCode), totalsX + 70, totalsY, { width: 95, align: "right" })
  totalsY += 18

  // Tax
  if (taxTotal > 0) {
    doc.text("Tax:", totalsX, totalsY)
    doc.text(formatCurrency(taxTotal, currencyCode), totalsX + 70, totalsY, { width: 95, align: "right" })
    totalsY += 18
  }

  // Grand Total
  totalsY += 5
  doc.moveTo(totalsX, totalsY).lineTo(545, totalsY).stroke()
  totalsY += 10
  doc.fontSize(12).font("Helvetica-Bold")
  doc.text("Total:", totalsX, totalsY)
  doc.text(formatCurrency(grandTotal, currencyCode), totalsX + 70, totalsY, { width: 95, align: "right" })

  // === FOOTER ===
  const footerY = 750
  doc.fontSize(9).font("Helvetica").fillColor("#666666")
  doc.text("Thank you for your purchase!", 50, footerY, { align: "center", width: 495 })
  doc.text("For questions about this invoice, please contact support@lb-frozen.com", 50, footerY + 15, { align: "center", width: 495 })

  // Finalize PDF
  doc.end()
}

/**
 * OPTIONS /store/customer-orders/:id/invoice
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
