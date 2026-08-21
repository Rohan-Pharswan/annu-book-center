import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import ToastProvider from "@/components/ToastProvider";

export const metadata = {
  title: {
    default: "Annu Book Store — Books, Stationery & Learning Supplies",
    template: "%s | Annu Book Store"
  },
  description: "Browse and order educational books, competitive exam guides, stationery, school and office essentials with cash-on-delivery and local store consultations.",
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
        <ToastProvider>
          <Navbar />
          <main className="container">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}

