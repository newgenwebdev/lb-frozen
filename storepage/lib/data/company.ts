// Company details shown on the homepage.
// Values match app/contact-us/page.tsx. Translatable text (hours, delivery area) lives in messages/*.json.
export const COMPANY = {
  brandName: "LB Frozen Food",
  registeredName: "LB Frozen Food Marketing Sdn Bhd",
  registrationNo: "200501009827 (686874-V)",
  phone: "03-62772009",
  // WhatsApp number in international format, digits only.
  // TODO: replace with the business's WhatsApp mobile number (03-62772009 is a landline).
  whatsappNumber: "60362772009",
  email: "lbfrozenweb@gmail.com",
  address: "No. 19, Jalan Tago 6, Taman Perindustrian Tago, Sri Damansara, 52200 Kuala Lumpur",
} as const;

export function telUrl(phone: string = COMPANY.phone) {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

export function whatsappUrl(text?: string) {
  const base = `https://wa.me/${COMPANY.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
