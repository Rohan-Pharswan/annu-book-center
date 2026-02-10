import "@/app/globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Annu Book Store",
  description: "Bookstore and stationery shop"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

