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
 * Generates pre-filled WhatsApp link for Customer contacting Store with complete order, customer, address, items, and pricing details
 */
export function getCustomerToStoreWhatsAppUrl(order, currentUser = null) {
  const phone = STORE_CONFIG.primaryPhoneRaw;
  const orderId = order?._id ? String(order._id).slice(-6) : (order?.orderId ? String(order.orderId).slice(-6) : "");

  const customerName = order?.customerName || order?.userId?.name || currentUser?.name || "Customer";
  const customerPhone = order?.customerPhone || order?.address?.phone || order?.userId?.phone || currentUser?.phone || "";

  const addr = order?.address;
  let formattedAddress = "";
  if (typeof addr === "string" && addr.trim()) {
    formattedAddress = `${addr.trim()}\n`;
  } else if (addr && typeof addr === "object") {
    const lines = [];
    if (addr.line1 && addr.line1.trim()) lines.push(addr.line1.trim());
    if (addr.city && addr.city.trim()) lines.push(addr.city.trim());
    if (addr.state || addr.postalCode) {
      const statePart = addr.state ? addr.state.trim() : "";
      const zipPart = addr.postalCode ? addr.postalCode.trim() : "";
      lines.push(`${statePart}${statePart && zipPart ? ` - ${zipPart}` : zipPart}`);
    }
    if (lines.length > 0) {
      formattedAddress = lines.join("\n") + "\n";
    }
  }

  let itemsSummary = "";
  if (Array.isArray(order?.items) && order.items.length > 0) {
    itemsSummary = order.items
      .map((i) => {
        const qty = Number(i.quantity || 1);
        const price = Number(i.price || 0);
        return `• ${qty} × ${i.name} — ₹${price} each`;
      })
      .join("\n");
  }

  const deliveryCharge = Number(order?.deliveryCharge ?? 0);
  const totalSavings = Number(order?.totalSavings ?? 0);
  const subtotalAmount = Number(
    order?.subtotalAmount ?? Math.max(Number(order?.totalAmount || 0) - deliveryCharge + totalSavings, 0)
  );
  const totalAmount = Number(order?.totalAmount ?? (subtotalAmount - totalSavings + deliveryCharge));

  const isPending = !order?.deliveryChargeStatus || order?.deliveryChargeStatus === "pending";
  const deliveryChargeText = isPending
    ? "To be confirmed"
    : `₹${deliveryCharge} (Confirmed)`;

  let msg = `Hello Annu Book Center,\n\n`;
  msg += `I have placed Home Delivery order #${orderId}.\n\n`;
  msg += `Customer Details:\n`;
  msg += `Name: ${customerName}\n`;
  if (customerPhone) {
    msg += `Phone: ${customerPhone}\n`;
  }
  if (formattedAddress) {
    msg += `\nDelivery Address:\n${formattedAddress}`;
  }

  if (itemsSummary) {
    msg += `\nOrder Items:\n${itemsSummary}\n`;
  }

  msg += `\nBook Subtotal: ₹${subtotalAmount}\n`;
  if (totalSavings > 0) {
    msg += `Discount: ₹${totalSavings}\n`;
  }
  msg += `Current Order Amount: ₹${totalAmount}\n`;
  msg += `Delivery Charge: ${deliveryChargeText}\n\n`;
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
