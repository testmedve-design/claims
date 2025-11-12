import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import GlobalLoadingProvider from "@/components/GlobalLoadingProvider";
import AuthProvider from "@/providers/AuthProvider";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Medverve",
  description: "Medverve",
  icons: {
    icon: [
      { url: "/assets/logo.svg" },
    ],
    apple: "/assets/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable} antialiased`}>
        <AuthProvider>
          <NotificationsProvider>
            <GlobalLoadingProvider>
              {children}
            </GlobalLoadingProvider>
          </NotificationsProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
