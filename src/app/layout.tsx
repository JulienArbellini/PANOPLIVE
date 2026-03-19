import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import { Cinzel_Decorative, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const cinzel = Cinzel_Decorative({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const wornas = localFont({
  src: "../../public/fonts/wornas/Wornas.otf",
  variable: "--font-wornas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PANOPLIVE",
  description: "Site officiel du groupe Panoplie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${outfit.variable} ${cinzel.variable} ${playfair.variable} ${wornas.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
