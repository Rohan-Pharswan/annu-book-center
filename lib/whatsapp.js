import Order from "../models/Order.js";

/**
 * Meta WhatsApp Cloud API configuration helper
 */
export function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const adminNumber = (process.env.WHATSAPP_ADMIN_NUMBER || "").replace(/\D/g, "");
  const templateName = (process.env.WHATSAPP_TEMPLATE_NAME || "").trim();
  const templateLang = (process.env.WHATSAPP_TEMPLATE_LANG || "en_US").trim();
  const baseUrl = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

  const isConfigured = Boolean(accessToken && phoneNumberId && adminNumber);

  return {
    accessToken,
    phoneNumberId,
    adminNumber,
    templateName,
    templateLang,
    baseUrl,
    isConfigured
  };
}

/**
 * Builds the exact direct admin order URL
 */
export function getAdminOrderDirectUrl(orderId, baseUrl) {
  return `${baseUrl}/admin/orders?orderId=${orderId}#order-${orderId}`;
}

/**
 * Formats a clean, readable text notification message for the admin
 */
export function buildAdminOrderTextMessage(order, baseUrl) {
  const shortId = String(order._id).slice(-6).toUpperCase();
  const customerName = order.customerName || order.userId?.name || "Customer";
  const customerPhone = order.customerPhone || order.address?.phone || "Not provided";
  const fulfillmentLabel = order.fulfillmentType === "store_visit" ? "🏬 Store Pickup" : "🏠 Home Delivery";
  
  const subtotal = Number(order.subtotalAmount || 0);
  const deliveryCharge = Number(order.deliveryCharge || 0);
  const total = Number(order.totalAmount || 0);
  const orderUrl = getAdminOrderDirectUrl(order._id, baseUrl);

  let itemsSummary = "";
  if (Array.isArray(order.items) && order.items.length > 0) {
    itemsSummary = order.items
      .map((i) => `• ${i.name} (x${i.quantity || 1}) - ₹${i.price}`)
      .join("\n");
  }

  let text = `🔔 *NEW ORDER #${shortId}*\n\n`;
  text += `*Customer:* ${customerName}\n`;
  text += `*Phone:* ${customerPhone}\n`;
  text += `*Type:* ${fulfillmentLabel}\n\n`;

  if (itemsSummary) {
    text += `*Items:*\n${itemsSummary}\n\n`;
  }

  text += `*Subtotal:* ₹${subtotal}\n`;
  if (order.fulfillmentType === "doorstep") {
    text += `*Delivery:* ${order.deliveryChargeStatus === "confirmed" ? `₹${deliveryCharge}` : "To Be Confirmed"}\n`;
  }
  text += `*Total:* ₹${total}\n\n`;

  if (order.fulfillmentType === "doorstep" && (!order.deliveryChargeStatus || order.deliveryChargeStatus === "pending")) {
    text += `⚠️ *Action Required:* Please confirm delivery charge.\n\n`;
  }

  text += `🔗 *Open Order:*\n${orderUrl}`;

  return text;
}

/**
 * Builds Meta WhatsApp Cloud API JSON payload
 */
export function buildMetaWhatsAppPayload(order, config) {
  const recipient = config.adminNumber;
  const shortId = String(order._id).slice(-6).toUpperCase();
  const customerName = order.customerName || order.userId?.name || "Customer";
  const customerPhone = order.customerPhone || order.address?.phone || "N/A";
  const total = String(order.totalAmount || 0);
  const orderUrl = getAdminOrderDirectUrl(order._id, config.baseUrl);

  // If a template is configured in Meta WhatsApp Manager, use template format
  if (config.templateName) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: config.templateName,
        language: {
          code: config.templateLang || "en_US"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: shortId },
              { type: "text", text: customerName },
              { type: "text", text: customerPhone },
              { type: "text", text: total }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "text",
                text: String(order._id)
              }
            ]
          }
        ]
      }
    };
  }

  // Fallback / default text message format
  const bodyText = buildAdminOrderTextMessage(order, config.baseUrl);
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: true,
      body: bodyText
    }
  };
}

/**
 * Sends automated WhatsApp notification to admin upon order creation.
 * Idempotent: Ensures at most one notification is dispatched per order.
 * Non-blocking: Errors are caught and recorded without throwing or disrupting checkout.
 *
 * @param {Object|string} orderOrId - Full Order document or Order ID
 * @returns {Promise<{ success: boolean, messageId?: string, skipped?: boolean, error?: string }>}
 */
export async function sendAdminWhatsAppOrderNotification(orderOrId) {
  const config = getWhatsAppConfig();
  const orderId = typeof orderOrId === "object" ? orderOrId._id : orderOrId;

  if (!orderId) {
    return { success: false, skipped: true, error: "No order ID provided" };
  }

  try {
    // Quick idempotency pre-check
    if (typeof orderOrId === "object" && orderOrId.whatsappAdminNotificationSent) {
      console.log(`[WhatsApp Admin Alert] Notification for order ${String(orderId).slice(-6)} already sent.`);
      return { success: true, skipped: true };
    }

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return { success: false, skipped: true, error: "Order not found" };
    }
    if (existingOrder.whatsappAdminNotificationSent) {
      console.log(`[WhatsApp Admin Alert] Notification for order ${String(orderId).slice(-6)} already sent.`);
      return { success: true, skipped: true };
    }

    // If WhatsApp credentials are not configured, mark status and return gracefully
    if (!config.isConfigured) {
      await Order.findByIdAndUpdate(orderId, {
        whatsappAdminNotificationStatus: "not_configured",
        whatsappAdminNotificationError: "WhatsApp API credentials not configured in environment"
      });
      console.log(`[WhatsApp Admin Alert] Notification skipped for order ${String(orderId).slice(-6)}: Meta credentials not set.`);
      return { success: false, skipped: true, error: "Credentials not configured" };
    }

    // Atomic idempotency check: only acquire lock if notification has not yet been sent
    const claim = await Order.findOneAndUpdate(
      {
        _id: orderId,
        whatsappAdminNotificationSent: { $ne: true }
      },
      {
        $set: {
          whatsappAdminNotificationStatus: "pending"
        }
      },
      { new: true }
    );

    if (!claim) {
      console.log(`[WhatsApp Admin Alert] Notification for order ${String(orderId).slice(-6)} already sent or in progress.`);
      return { success: true, skipped: true };
    }

    const payload = buildMetaWhatsAppPayload(claim, config);
    const endpoint = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = responseData?.error?.message || `HTTP ${response.status} from Meta API`;
      console.error(`[WhatsApp Admin Alert] Failed to send WhatsApp notification for order ${String(orderId).slice(-6)}:`, errorMessage);

      await Order.findByIdAndUpdate(orderId, {
        whatsappAdminNotificationStatus: "failed",
        whatsappAdminNotificationError: errorMessage
      });

      return { success: false, error: errorMessage };
    }

    const messageId = responseData?.messages?.[0]?.id || "sent";

    await Order.findByIdAndUpdate(orderId, {
      whatsappAdminNotificationSent: true,
      whatsappAdminNotificationSentAt: new Date(),
      whatsappAdminNotificationMessageId: messageId,
      whatsappAdminNotificationStatus: "sent",
      whatsappAdminNotificationError: ""
    });

    console.log(`[WhatsApp Admin Alert] Notification successfully sent for order ${String(orderId).slice(-6)} (Message ID: ${messageId})`);
    return { success: true, messageId };
  } catch (err) {
    const errorString = err?.message || String(err);
    console.error(`[WhatsApp Admin Alert] Unexpected error sending WhatsApp notification for order ${String(orderId).slice(-6)}:`, errorString);

    try {
      await Order.findByIdAndUpdate(orderId, {
        whatsappAdminNotificationStatus: "failed",
        whatsappAdminNotificationError: errorString
      });
    } catch {
      // Ignore database logging failure during catch block
    }

    return { success: false, error: errorString };
  }
}
