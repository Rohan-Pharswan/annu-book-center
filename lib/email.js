import nodemailer from "nodemailer";
import Order from "../models/Order.js";
import { STORE_CONFIG } from "./storeConfig.js";

/**
 * Returns centralized email configuration from environment variables
 */
export function getEmailConfig() {
  const gmailUser = (process.env.GMAIL_USER || "").trim() || "ordersannubookcenter@gmail.com";
  const gmailPassword = (process.env.GMAIL_APP_PASSWORD || "").trim();
  const from = (process.env.EMAIL_FROM || "").trim() || `Annu Book Center <${gmailUser}>`;
  const replyTo = (process.env.EMAIL_REPLY_TO || "").trim() || "ordersannubookcenter@gmail.com";
  const baseUrl = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

  const isConfigured = Boolean(gmailUser && gmailPassword);

  return {
    gmailUser,
    gmailPassword,
    from,
    replyTo,
    baseUrl,
    isConfigured
  };
}

/**
 * Creates a Nodemailer SMTP transporter using Gmail App Password
 */
export function createMailTransporter(config) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.gmailUser,
      pass: config.gmailPassword
    }
  });
}

/**
 * Generates the direct URL for a customer to view their specific order
 */
export function getCustomerOrderUrl(orderId, baseUrl) {
  return `${baseUrl}/orders#order-${orderId}`;
}

/**
 * Formats a currency amount into standard INR representation (e.g. ₹450)
 */
function formatCurrency(amount) {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Formats full physical address into string lines
 */
function formatAddressLines(address) {
  if (!address) return [];
  const lines = [];
  if (address.line1 && address.line1.trim()) lines.push(address.line1.trim());
  if (address.city && address.city.trim()) lines.push(address.city.trim());
  const statePart = address.state ? address.state.trim() : "";
  const zipPart = address.postalCode ? address.postalCode.trim() : "";
  if (statePart || zipPart) {
    lines.push(`${statePart}${statePart && zipPart ? ` - ${zipPart}` : zipPart}`);
  }
  return lines;
}

/**
 * Generates branded, responsive HTML template for Customer Order Confirmation
 */
export function generateOrderConfirmationEmailHtml(order, baseUrl) {
  const shortId = String(order._id).slice(-6).toUpperCase();
  const customerName = order.customerName || order.userId?.name || "Valued Customer";
  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const dateFormatted = orderDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  const timeFormatted = orderDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const isStoreVisit = order.fulfillmentType === "store_visit";
  const fulfillmentLabel = isStoreVisit ? "🏬 Store Pickup & Reservation" : "🏠 Home Delivery";
  const orderStatus = order.status || "Pending";

  const subtotal = Number(order.subtotalAmount || 0);
  const savings = Number(order.totalSavings || 0);
  const deliveryCharge = Number(order.deliveryCharge || 0);
  const total = Number(order.totalAmount || 0);

  const isPendingDeliveryFee = !isStoreVisit && (!order.deliveryChargeStatus || order.deliveryChargeStatus === "pending");
  const deliveryChargeDisplay = isStoreVisit
    ? '<span style="color:#16a34a;font-weight:600;">FREE (Store Pickup)</span>'
    : isPendingDeliveryFee
      ? '<span style="color:#d97706;font-weight:600;">To be confirmed by store</span>'
      : `<span style="color:#16a34a;font-weight:600;">${formatCurrency(deliveryCharge)} (Confirmed)</span>`;

  const orderUrl = getCustomerOrderUrl(order._id, baseUrl);
  const addressLines = formatAddressLines(order.address);

  // Generate item rows
  const itemRowsHtml = (order.items || [])
    .map((item) => {
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.price || 0);
      const lineTotal = unitPrice * qty;
      const itemSavings = Number(item.savingsPerUnit || 0);

      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:12px 8px;vertical-align:top;">
            <div style="font-weight:600;color:#0f172a;font-size:14px;line-height:1.4;">${item.name}</div>
            ${
              itemSavings > 0
                ? `<div style="font-size:12px;color:#16a34a;margin-top:2px;">Saved ${formatCurrency(itemSavings)}/unit</div>`
                : ""
            }
          </td>
          <td style="padding:12px 8px;text-align:center;color:#475569;font-size:14px;vertical-align:top;">
            ${qty}
          </td>
          <td style="padding:12px 8px;text-align:right;color:#475569;font-size:14px;vertical-align:top;">
            ${formatCurrency(unitPrice)}
          </td>
          <td style="padding:12px 8px;text-align:right;font-weight:600;color:#0f172a;font-size:14px;vertical-align:top;">
            ${formatCurrency(lineTotal)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation #${shortId} — Annu Book Center</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.6;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);padding:28px 24px;text-align:center;border-bottom:3px solid #2563eb;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
                📚 ${STORE_CONFIG.name}
              </h1>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">
                Academic & Competition Book Store • Dehradun
              </p>
            </td>
          </tr>

          <!-- Thank you & Intro -->
          <tr>
            <td style="padding:28px 24px 16px;">
              <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 16px;border-radius:6px;margin-bottom:20px;">
                <h2 style="margin:0 0 4px;color:#166534;font-size:18px;font-weight:700;">
                  Thank you for your order, ${customerName}!
                </h2>
                <p style="margin:0;color:#15803d;font-size:14px;">
                  We have successfully received your order and will process it shortly.
                </p>
              </div>

              <!-- Order Overview Card -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;padding:16px;">
                <tr>
                  <td width="50%" style="padding:6px 8px;font-size:13px;color:#64748b;">
                    Order Number:
                  </td>
                  <td width="50%" style="padding:6px 8px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">
                    #${shortId}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-size:13px;color:#64748b;">
                    Order Date:
                  </td>
                  <td style="padding:6px 8px;font-size:13px;color:#0f172a;text-align:right;">
                    ${dateFormatted} at ${timeFormatted}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-size:13px;color:#64748b;">
                    Order Status:
                  </td>
                  <td style="padding:6px 8px;font-size:13px;font-weight:700;color:#2563eb;text-align:right;">
                    ${orderStatus}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-size:13px;color:#64748b;">
                    Fulfillment Method:
                  </td>
                  <td style="padding:6px 8px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">
                    ${fulfillmentLabel}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-size:13px;color:#64748b;">
                    Payment Method:
                  </td>
                  <td style="padding:6px 8px;font-size:13px;color:#0f172a;text-align:right;">
                    ${order.paymentMethod || (isStoreVisit ? "Pay at Store" : "Cash on Delivery")}
                  </td>
                </tr>
              </table>

              <!-- Fulfillment Details Box -->
              ${
                isStoreVisit
                  ? `
                  <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
                    <div style="font-weight:700;color:#1e40af;font-size:14px;margin-bottom:6px;">
                      🏬 Store Pickup Details
                    </div>
                    <div style="font-size:13px;color:#1e3a8a;line-height:1.5;">
                      <strong>Planned Visit:</strong> ${order.storeVisit?.visitDate || "Scheduled Date"} &bull; ${order.storeVisit?.visitTime || "Store Hours"}<br>
                      <strong>Store Location:</strong> ${STORE_CONFIG.name}, ${STORE_CONFIG.address}<br>
                      <strong>Store Timings:</strong> ${STORE_CONFIG.timings}
                    </div>
                    <div style="margin-top:10px;">
                      <a href="${STORE_CONFIG.googleMapsUrl}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:6px 12px;border-radius:4px;font-size:12px;text-decoration:none;font-weight:600;">
                        📍 View Store Location on Google Maps
                      </a>
                    </div>
                  </div>
                  `
                  : `
                  <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px;">
                    <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:6px;">
                      🏠 Delivery Address
                    </div>
                    <div style="font-size:13px;color:#334155;line-height:1.5;">
                      ${order.address?.label ? `<strong>${order.address.label}</strong><br>` : ""}
                      ${addressLines.join("<br>") || "Address on record"}
                      ${order.customerPhone ? `<br><strong>Contact:</strong> ${order.customerPhone}` : ""}
                    </div>
                    ${
                      isPendingDeliveryFee
                        ? `<div style="margin-top:8px;font-size:12px;color:#b45309;background:#fef3c7;padding:6px 10px;border-radius:4px;">
                            ℹ️ Delivery fee will be confirmed by the store based on your location.
                          </div>`
                        : ""
                    }
                  </div>
                  `
              }

              <!-- Ordered Items Table -->
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:6px;">
                Ordered Items
              </h3>

              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
                <thead>
                  <tr style="background-color:#f8fafc;border-bottom:2px solid #e2e8f0;">
                    <th style="padding:8px;text-align:left;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;">Item</th>
                    <th style="padding:8px;text-align:center;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;">Qty</th>
                    <th style="padding:8px;text-align:right;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;">Price</th>
                    <th style="padding:8px;text-align:right;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRowsHtml}
                </tbody>
              </table>

              <!-- Pricing Summary -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
                <tr>
                  <td style="padding:4px 8px;font-size:13px;color:#64748b;">Books Subtotal:</td>
                  <td style="padding:4px 8px;font-size:13px;color:#0f172a;text-align:right;">${formatCurrency(subtotal)}</td>
                </tr>
                ${
                  savings > 0
                    ? `
                    <tr>
                      <td style="padding:4px 8px;font-size:13px;color:#16a34a;">Total Savings / Discount:</td>
                      <td style="padding:4px 8px;font-size:13px;color:#16a34a;font-weight:600;text-align:right;">-${formatCurrency(savings)}</td>
                    </tr>
                    `
                    : ""
                }
                <tr>
                  <td style="padding:4px 8px;font-size:13px;color:#64748b;">Delivery Fee:</td>
                  <td style="padding:4px 8px;font-size:13px;text-align:right;">${deliveryChargeDisplay}</td>
                </tr>
                <tr style="border-top:2px solid #0f172a;">
                  <td style="padding:10px 8px;font-size:16px;font-weight:800;color:#0f172a;">
                    ${isPendingDeliveryFee ? "Current Total (Excl. Delivery):" : "Total Amount:"}
                  </td>
                  <td style="padding:10px 8px;font-size:18px;font-weight:800;color:#0f172a;text-align:right;">
                    ${formatCurrency(total)}
                  </td>
                </tr>
              </table>

              <!-- View Order Button CTA -->
              <div style="text-align:center;padding:12px 0 24px;">
                <a href="${orderUrl}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;box-shadow:0 4px 6px -1px rgba(37,99,235,0.3);letter-spacing:0.3px;">
                  View My Order &rarr;
                </a>
                <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">
                  Click above or log into your Annu Book Center account to manage your order.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f1f5f9;padding:24px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#334155;">
                Need help or have questions about your order?
              </p>
              <p style="margin:0 0 10px;font-size:12px;color:#64748b;">
                📞 Call: <a href="tel:${STORE_CONFIG.primaryPhoneRaw}" style="color:#2563eb;text-decoration:none;font-weight:600;">${STORE_CONFIG.primaryPhone}</a> / <a href="tel:${STORE_CONFIG.altPhoneRaw}" style="color:#2563eb;text-decoration:none;font-weight:600;">${STORE_CONFIG.altPhone}</a>
                &bull; ✉️ Reply to this email or contact <a href="mailto:ordersannubookcenter@gmail.com" style="color:#2563eb;text-decoration:none;">ordersannubookcenter@gmail.com</a>
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.4;">
                ${STORE_CONFIG.name} &bull; ${STORE_CONFIG.address}<br>
                Timings: ${STORE_CONFIG.timings}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generates clean plain-text fallback for non-HTML email readers
 */
export function generateOrderConfirmationEmailText(order, baseUrl) {
  const shortId = String(order._id).slice(-6).toUpperCase();
  const customerName = order.customerName || order.userId?.name || "Valued Customer";
  const orderUrl = getCustomerOrderUrl(order._id, baseUrl);
  const isStoreVisit = order.fulfillmentType === "store_visit";

  const subtotal = Number(order.subtotalAmount || 0);
  const savings = Number(order.totalSavings || 0);
  const deliveryCharge = Number(order.deliveryCharge || 0);
  const total = Number(order.totalAmount || 0);

  let text = `ANNU BOOK CENTER - ORDER CONFIRMATION\n`;
  text += `==========================================\n\n`;
  text += `Thank you for your order, ${customerName}!\n`;
  text += `We have successfully received your order and will process it shortly.\n\n`;
  text += `ORDER SUMMARY\n`;
  text += `------------------------------------------\n`;
  text += `Order Number: #${shortId}\n`;
  text += `Order Status: ${order.status || "Pending"}\n`;
  text += `Fulfillment: ${isStoreVisit ? "Store Pickup & Reservation" : "Home Delivery"}\n`;
  text += `Payment Method: ${order.paymentMethod || (isStoreVisit ? "Pay at Store" : "Cash on Delivery")}\n\n`;

  if (isStoreVisit) {
    text += `STORE PICKUP DETAILS\n`;
    text += `Planned Visit: ${order.storeVisit?.visitDate || "Scheduled Date"} (${order.storeVisit?.visitTime || "Store Hours"})\n`;
    text += `Location: ${STORE_CONFIG.name}, ${STORE_CONFIG.address}\n`;
    text += `Timings: ${STORE_CONFIG.timings}\n\n`;
  } else if (order.address) {
    const addressLines = formatAddressLines(order.address);
    text += `DELIVERY ADDRESS\n`;
    text += `${addressLines.join("\n")}\n`;
    if (order.customerPhone) text += `Phone: ${order.customerPhone}\n`;
    text += `\n`;
  }

  text += `ORDERED ITEMS\n`;
  text += `------------------------------------------\n`;
  (order.items || []).forEach((item) => {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.price || 0);
    const lineTotal = unitPrice * qty;
    text += `• ${item.name} x ${qty} @ ${formatCurrency(unitPrice)} = ${formatCurrency(lineTotal)}\n`;
  });

  text += `\nPRICING\n`;
  text += `------------------------------------------\n`;
  text += `Subtotal: ${formatCurrency(subtotal)}\n`;
  if (savings > 0) text += `Discount Saved: -${formatCurrency(savings)}\n`;
  text += `Delivery Fee: ${isStoreVisit ? "FREE (Store Pickup)" : (order.deliveryChargeStatus === "confirmed" ? formatCurrency(deliveryCharge) : "To be confirmed")}\n`;
  text += `Total: ${formatCurrency(total)}\n\n`;

  text += `VIEW YOUR ORDER:\n${orderUrl}\n\n`;
  text += `NEED HELP?\n`;
  text += `Phone: ${STORE_CONFIG.primaryPhone} / ${STORE_CONFIG.altPhone}\n`;
  text += `Email: ordersannubookcenter@gmail.com\n`;
  text += `Address: ${STORE_CONFIG.address}\n`;

  return text;
}

/**
 * Dispatches automated order confirmation email to the customer using Gmail SMTP.
 * 
 * Guarantees:
 * - Server-side only: never exposes keys or credentials to the browser.
 * - Idempotent: acquires atomic lock on Order to ensure exactly one confirmation email per order.
 * - Non-blocking: failures, API outages, or missing config will never throw or disrupt customer checkout.
 * - Dynamic recipient: always sends to the customer's personal email on record.
 * 
 * @param {Object|string} orderOrId - Full Order document or Order ID
 * @returns {Promise<{ success: boolean, messageId?: string, skipped?: boolean, error?: string }>}
 */
export async function sendCustomerOrderConfirmationEmail(orderOrId) {
  const config = getEmailConfig();
  const orderId = typeof orderOrId === "object" ? orderOrId._id : orderOrId;

  if (!orderId) {
    return { success: false, skipped: true, error: "No order ID provided" };
  }

  try {
    // Quick idempotency pre-check
    if (typeof orderOrId === "object" && orderOrId.confirmationEmailSent) {
      console.log(`[Email Service] Confirmation email for order ${String(orderId).slice(-6)} already sent.`);
      return { success: true, skipped: true };
    }

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return { success: false, skipped: true, error: "Order not found" };
    }

    if (existingOrder.confirmationEmailSent) {
      console.log(`[Email Service] Confirmation email for order ${String(orderId).slice(-6)} already sent.`);
      return { success: true, skipped: true };
    }

    const recipientEmail = (existingOrder.customerEmail || "").trim();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      console.warn(`[Email Service] Order ${String(orderId).slice(-6)} has no valid customer email (${recipientEmail}). Skipping.`);
      await Order.findByIdAndUpdate(orderId, {
        confirmationEmailStatus: "failed",
        confirmationEmailError: `Invalid or missing recipient email: "${recipientEmail}"`
      });
      return { success: false, skipped: true, error: "Missing customer email" };
    }

    // Gracefully handle unconfigured Gmail credentials
    if (!config.isConfigured) {
      console.log(`[Email Service] Gmail SMTP credentials not configured. Recording status for order ${String(orderId).slice(-6)}.`);
      await Order.findByIdAndUpdate(orderId, {
        confirmationEmailStatus: "not_configured",
        confirmationEmailError: "GMAIL_APP_PASSWORD environment variable is not configured."
      });
      return { success: false, skipped: true, error: "Provider not configured" };
    }

    // Atomic idempotency lock: claim lock only if email hasn't been sent or is in progress
    const claim = await Order.findOneAndUpdate(
      {
        _id: orderId,
        confirmationEmailSent: { $ne: true },
        confirmationEmailStatus: { $nin: ["in_progress", "sent"] }
      },
      {
        $set: {
          confirmationEmailStatus: "in_progress"
        }
      },
      { new: true }
    );

    if (!claim) {
      console.log(`[Email Service] Order ${String(orderId).slice(-6)} confirmation email already in progress or sent.`);
      return { success: true, skipped: true };
    }

    const shortId = String(claim._id).slice(-6).toUpperCase();
    const htmlContent = generateOrderConfirmationEmailHtml(claim, config.baseUrl);
    const textContent = generateOrderConfirmationEmailText(claim, config.baseUrl);

    const transporter = createMailTransporter(config);

    const emailPayload = {
      from: config.from,
      to: recipientEmail,
      replyTo: config.replyTo,
      subject: `Order Confirmation #${shortId} — Annu Book Center`,
      html: htmlContent,
      text: textContent
    };

    const info = await transporter.sendMail(emailPayload);
    const messageId = info?.messageId || "sent";

    await Order.findByIdAndUpdate(orderId, {
      confirmationEmailSent: true,
      confirmationEmailSentAt: new Date(),
      confirmationEmailMessageId: messageId,
      confirmationEmailStatus: "sent",
      confirmationEmailError: ""
    });

    console.log(`[Email Service] Confirmation email successfully sent via Gmail SMTP to ${recipientEmail} for order #${shortId} (Message ID: ${messageId})`);
    return { success: true, messageId };
  } catch (err) {
    const errorMsg = err?.message || String(err);
    console.error(`[Email Service] Unexpected error sending confirmation email for order ${String(orderId).slice(-6)}:`, errorMsg);

    try {
      await Order.findByIdAndUpdate(orderId, {
        confirmationEmailStatus: "failed",
        confirmationEmailError: errorMsg
      });
    } catch {
      // Ignore database update error in catch block
    }

    return { success: false, error: errorMsg };
  }
}
