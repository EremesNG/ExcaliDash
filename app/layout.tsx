import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExcaliDash",
  description: "ExcaliDash workspace for ChatGPT Sites.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
