import type { Order } from "@/lib/validators/order";

// Logo URL - configure via NEXT_PUBLIC_LOGO_URL env variable
const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || "";

export function printOrderReceipt(order: Order): void {
  const formatCurrency = (amount: number, currency: string): string => {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Extract discount information from metadata
  const metadata = order.metadata || {};
  const tierDiscountAmount = Number(metadata.tier_discount_amount) || 0;
  const tierDiscountPercentage = Number(metadata.tier_discount_percentage) || 0;
  const tierName = (metadata.tier_name as string) || "";
  const couponDiscount = Number(metadata.applied_coupon_discount) || 0;
  const couponCode = (metadata.coupon_code as string) || "";
  const pointsDiscount = Number(metadata.points_discount_amount) || 0;
  const membershipPromoDiscount = Number(metadata.applied_membership_promo_discount) || 0;

  // Calculate total discounts from metadata
  const totalMetadataDiscounts = tierDiscountAmount + couponDiscount + pointsDiscount + membershipPromoDiscount;

  // Calculate correct total: subtotal + shipping + tax - all discounts
  const calculatedTotal = Math.max(0, order.subtotal + order.shipping_total + order.tax_total - totalMetadataDiscounts);

  // Build discount rows HTML
  let discountRowsHTML = "";

  if (tierDiscountAmount > 0) {
    const tierLabel = tierName
      ? `${tierName} (${tierDiscountPercentage}% off)`
      : `Tier Discount (${tierDiscountPercentage}% off)`;
    discountRowsHTML += `
      <div class="summary-row discount">
        <span class="summary-label">${tierLabel}</span>
        <span class="discount-value">-${formatCurrency(tierDiscountAmount, order.currency)}</span>
      </div>
    `;
  }

  if (couponDiscount > 0) {
    const couponLabel = couponCode ? `Coupon (${couponCode})` : "Coupon Discount";
    discountRowsHTML += `
      <div class="summary-row discount">
        <span class="summary-label">${couponLabel}</span>
        <span class="discount-value">-${formatCurrency(couponDiscount, order.currency)}</span>
      </div>
    `;
  }

  if (pointsDiscount > 0) {
    discountRowsHTML += `
      <div class="summary-row discount">
        <span class="summary-label">Points Redeemed</span>
        <span class="discount-value">-${formatCurrency(pointsDiscount, order.currency)}</span>
      </div>
    `;
  }

  if (membershipPromoDiscount > 0) {
    discountRowsHTML += `
      <div class="summary-row discount">
        <span class="summary-label">Membership Promo</span>
        <span class="discount-value">-${formatCurrency(membershipPromoDiscount, order.currency)}</span>
      </div>
    `;
  }

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - Order #${order.display_id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          color: #030712;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #E5E7EB;
        }
        .logo-img { max-width: 180px; height: auto; margin-bottom: 8px; }
        .logo-text { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .receipt-title { font-size: 14px; color: #6A7282; text-transform: uppercase; letter-spacing: 1px; }
        .order-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 32px;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 8px;
        }
        .order-info-item { text-align: left; }
        .order-info-item:last-child { text-align: right; }
        .order-info-label { font-size: 12px; color: #6A7282; margin-bottom: 4px; }
        .order-info-value { font-size: 14px; font-weight: 600; }
        .section { margin-bottom: 24px; }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #E5E7EB;
        }
        .customer-info { font-size: 14px; line-height: 1.6; }
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table th {
          text-align: left;
          padding: 12px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #6A7282;
          border-bottom: 1px solid #E5E7EB;
        }
        .items-table th:last-child { text-align: right; }
        .items-table td {
          padding: 12px 8px;
          font-size: 14px;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: top;
        }
        .items-table td:last-child { text-align: right; }
        .item-name { font-weight: 500; }
        .item-variant { font-size: 12px; color: #6A7282; }
        .summary { margin-top: 24px; }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .summary-row.discount .discount-value { color: #3B82F6; }
        .summary-row.total {
          border-top: 2px solid #030712;
          margin-top: 8px;
          padding-top: 16px;
          font-size: 18px;
          font-weight: 700;
        }
        .summary-label { color: #6A7282; }
        .summary-row.total .summary-label { color: #030712; }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          font-size: 12px;
          color: #6A7282;
        }
        @media print {
          body { padding: 20px; }
          @page {
            margin: 10mm;
            /* Hide browser-added headers and footers (URL, date, page numbers) */
            margin-top: 0;
            margin-bottom: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${LOGO_URL ? `<img src="${LOGO_URL}" alt="King Jess" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <div class="logo-text" style="display: none;">KING JESS</div>` : `<div class="logo-text">KING JESS</div>`}
        <div class="receipt-title">Order Receipt</div>
      </div>

      <div class="order-info">
        <div class="order-info-item">
          <div class="order-info-label">Order Number</div>
          <div class="order-info-value">#${order.display_id}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Order Date</div>
          <div class="order-info-value">${formatDate(order.created_at)}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Status</div>
          <div class="order-info-value">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="customer-info">
          <strong>${order.customer_name}</strong><br>
          ${order.customer_email}<br>
          ${order.customer_phone ? order.customer_phone + "<br>" : ""}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Order Items</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map((item) => `
              <tr>
                <td>
                  <div class="item-name">${item.product_name}</div>
                  ${item.variant_title ? `<div class="item-variant">${item.variant_title}</div>` : ""}
                  ${item.sku ? `<div class="item-variant">SKU: ${item.sku}</div>` : ""}
                </td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unit_price, order.currency)}</td>
                <td>${formatCurrency(item.total, order.currency)}</td>
              </tr>
            `).join("") || ""}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Subtotal</span>
            <span>${formatCurrency(order.subtotal, order.currency)}</span>
          </div>
          ${discountRowsHTML}
          <div class="summary-row">
            <span class="summary-label">Shipping</span>
            <span>${formatCurrency(order.shipping_total, order.currency)}</span>
          </div>
          ${order.tax_total > 0 ? `
            <div class="summary-row">
              <span class="summary-label">Tax</span>
              <span>${formatCurrency(order.tax_total, order.currency)}</span>
            </div>
          ` : ""}
          <div class="summary-row total">
            <span class="summary-label">Total</span>
            <span>${formatCurrency(calculatedTotal, order.currency)}</span>
          </div>
        </div>
      </div>

      ${order.payment_method ? `
        <div class="section">
          <div class="section-title">Payment Information</div>
          <div class="customer-info">
            <strong>Method:</strong> ${order.payment_method}<br>
            <strong>Status:</strong> ${order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
          </div>
        </div>
      ` : ""}

      <div class="footer">
        <p>Thank you for your order!</p>
        <p style="margin-top: 8px;">Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  // Create a hidden iframe to print from
  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "none";
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(receiptHTML);
    frameDoc.close();

    // Store original title and set dynamic filename for PDF save
    const originalTitle = document.title;
    const receiptFilename = `KingJess-Receipt-Order-${order.display_id}`;

    // Use setTimeout to ensure content is rendered before printing
    setTimeout(() => {
      // Temporarily change parent document title (used as PDF filename by browsers)
      document.title = receiptFilename;

      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();

      // Restore original title after print dialog
      setTimeout(() => {
        document.title = originalTitle;
        document.body.removeChild(printFrame);
      }, 1000);
    }, 250);
  }
}
