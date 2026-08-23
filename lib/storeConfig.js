// Centralized Store Contact & Location Configuration
// Annu Book Center — Single Source of Truth

export const STORE_CONFIG = {
  name: "Annu Book Center",
  primaryPhone: "+91 8077308953",
  primaryPhoneRaw: "918077308953",
  altPhone: "+91 9411395022",
  altPhoneRaw: "919411395022",
  address: "Shop number GS 56, Rajiv Gandhi Complex, Dispensary Road, Dehradun, Uttarakhand - 248001",
  city: "Dehradun",
  state: "Uttarakhand",
  postalCode: "248001",
  googleMapsUrl: "https://maps.app.goo.gl/3Vtj996chThP277h6",
  timings: "10:00 AM - 8:30 PM (Mon-Sat)"
};

/**
 * Generates pre-filled WhatsApp link for Customer contacting Store with complete order and address details
 */
export function getCustomerToStoreWhatsAppUrl(order) {
  const phone = STORE_CONFIG.primaryPhoneRaw;
  const orderId = order?._id ? String(order._id).slice(-6) : (order?.orderId ? String(order.orderId).slice(-6) : "");
  const customerName = order?.customerName || order?.userId?.name || "Customer";
  const customerPhone = order?.customerPhone || order?.address?.phone || "";

  const addr = order?.address;
  const addressLine = addr?.line1 || "";
  const locationLine = [addr?.city, addr?.state].filter(Boolean).join(", ") + (addr?.postalCode ? ` - ${addr.postalCode}` : "");

  let itemsSummary = "";
  if (Array.isArray(order?.items) && order.items.length > 0) {
    itemsSummary = order.items.map((i) => `• ${i.quantity}x ${i.name} (₹${i.price})`).join("\n");
  }

  const subtotal = order?.subtotalAmount ?? order?.totalAmount ?? "";

  let msg = `Hello Annu Book Center,\n\n`;
  msg += `I have placed Home Delivery order #${orderId}.\n\n`;
  msg += `Name: ${customerName}\n`;
  if (customerPhone) msg += `Phone: ${customerPhone}\n`;
  if (addressLine || locationLine) {
    msg += `\nDelivery Address:\n`;
    if (addressLine) msg += `${addressLine}\n`;
    if (locationLine) msg += `${locationLine}\n`;
  }
  if (itemsSummary) {
    msg += `\nItems:\n${itemsSummary}\n`;
  }
  msg += `\nOrder Amount: ₹${subtotal}\n`;
  msg += `Delivery Charge: To be confirmed\n\n`;
  msg += `Please confirm my home delivery charges.\n\n`;
  msg += `Thank you.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

/**
 * Generates pre-filled WhatsApp link for Admin/Store contacting Customer
 */
export function getAdminToCustomerWhatsAppUrl(order) {
  let customerPhone = (order?.customerPhone || order?.address?.phone || "").replace(/\D/g, "");
  if (!customerPhone) return "";
  if (customerPhone.length === 10) customerPhone = `91${customerPhone}`;

  const orderId = order?._id ? String(order._id).slice(-6) : (order?.orderId ? String(order.orderId).slice(-6) : "");
  const customerName = order?.customerName || order?.userId?.name || "Customer";

  const msg = `Hello ${customerName}, this is Annu Book Center regarding your home delivery order #${orderId}. We are contacting you to confirm your delivery charges.`;

  return `https://wa.me/${customerPhone}?text=${encodeURIComponent(msg)}`;
}

/**
 * Generates Google Maps Search URL for customer's delivery address
 */
export function getCustomerMapSearchUrl(address) {
  if (!address) return "";
  const parts = [
    address.line1,
    address.city,
    address.state,
    address.postalCode
  ].filter(Boolean);

  if (!parts.length) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
}
