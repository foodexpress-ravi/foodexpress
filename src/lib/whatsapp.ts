/**
 * No WhatsApp Business API credentials are configured, so we never claim a message was "sent".
 * This builds a wa.me deep link with a pre-filled message; the user must tap it and press send
 * themselves inside WhatsApp. Swap this for the real Cloud API once WHATSAPP_ACCESS_TOKEN and
 * WHATSAPP_PHONE_NUMBER_ID are set in the environment (not yet configured).
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

export function sellerOrderMessage(opts: { orderNumber: string; customerName: string; phone: string; items: string; total: string; paymentMethod: string; address: string }) {
  return `FoodExpress Order\nOrder number: ${opts.orderNumber}\nCustomer: ${opts.customerName}\nPhone: ${opts.phone}\nItems: ${opts.items}\nTotal: ₹${opts.total}\nPayment: ${opts.paymentMethod}\nAddress: ${opts.address}`;
}

export function deliveryPartnerMessage(opts: { orderNumber: string; customerName: string; phone: string; address: string; total: string; paymentMethod: string }) {
  return `Order number: ${opts.orderNumber}\nCustomer: ${opts.customerName}\nPhone: ${opts.phone}\nAddress: ${opts.address}\nTotal: ₹${opts.total}\nPayment: ${opts.paymentMethod}`;
}
