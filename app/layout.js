import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import ToastProvider from "@/components/ToastProvider";
import AuthProvider from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: {
    default: "Annu Book Store — Product Prices, Details & Store Inventory",
    template: "%s | Annu Book Store"
  },
  description: "Browse live store inventory, check real-time product prices, stock availability, educational books, stationery, and learning supplies at Annu Book Store.",
  keywords: ["books", "stationery", "school supplies", "educational books", "Annu Book Store"],
  authors: [{ name: "Annu Book Store" }],
  openGraph: {
    title: "Annu Book Store — Books & Stationery",
    description: "Your local bookstore and stationery destination with fast delivery and great savings.",
    type: "website",
    locale: "en_IN",
    siteName: "Annu Book Store"
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a"
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <AuthModal />
            <main className="container">{children}</main>
          </ToastProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}

