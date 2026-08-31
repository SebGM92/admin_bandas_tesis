import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/components/ui/tokens.css";
import "@/components/ui/ui.css";

const inter = Inter({
  variable: "--ba-font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BandAdmin",
  description: "Administración de bandas: ensayos, catálogo y finanzas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3/dist/tabler-icons.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
