import type { Metadata } from "next";
import { Nunito_Sans, Source_Serif_4 } from "next/font/google";

import { AppToaster } from "@/components/ui/sonner";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIGEA",
  description: "Sistema de Gestion Documental para Audiencias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${nunitoSans.variable} ${sourceSerif.variable} antialiased`}>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
