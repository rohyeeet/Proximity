import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proximity",
  description: "Data collection, workflows, and traceability — configured once, run everywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
