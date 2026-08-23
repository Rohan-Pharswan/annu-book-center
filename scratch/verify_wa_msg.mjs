import { getCustomerToStoreWhatsAppUrl, STORE_CONFIG } from "../lib/storeConfig.js";

const sampleOrder = {
  _id: "6a8b323e396abdd289488bcb",
  customerName: "Rohan Pharswan",
  customerPhone: "9876543210",
  address: {
    line1: "Flat 402, Green Valley Apartments, Rajpur Road",
    city: "Dehradun",
    state: "Uttarakhand",
    postalCode: "248001"
  },
  items: [
    { name: "Lucent Hindi", quantity: 2, price: 210 },
    { name: "Class 10 Math", quantity: 1, price: 350 }
  ],
  subtotalAmount: 770,
  totalAmount: 770
};

const waUrl = getCustomerToStoreWhatsAppUrl(sampleOrder);
console.log("=== GENERATED WHATSAPP URL ===");
console.log(waUrl);

console.log("\n=== DECODED MESSAGE ===");
const decodedText = decodeURIComponent(waUrl.split("text=")[1]);
console.log(decodedText);
