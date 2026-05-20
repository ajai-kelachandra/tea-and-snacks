import type { Metadata } from "next";
import { 
  DM_Sans
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ReduxProvider from "@/components/ReduxProvider";
import AuthObserver from "@/components/AuthObserver";
import { Toaster } from "react-hot-toast";
import PushNotificationManager from "@/components/PushNotificationManager";

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900", "1000"]
});

const notoMalayalam = localFont({
  src: "../public/fonts/NotoSansMalayalam-VariableFont_wdth,wght.ttf",
  variable: "--font-noto-malayalam",
});

export const metadata: Metadata = {
  title: "Tea & Snacks | Office Booking System",
  description:
    "Book your daily tea, coffee, and snacks with ease. A simple office refreshment ordering system.",
  keywords: "tea, coffee, snacks, office booking, refreshments",
  icons: {
    icon: "/tandb.jpg",
    apple: "/tandb.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${dmSans.className} ${dmSans.variable} ${notoMalayalam.variable} antialiased`}>
        <ReduxProvider>
          <AuthObserver>
            <PushNotificationManager />
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3500,
                className: "font-dm-sans",
                style: {
                  background: "#fff",
                  color: "#000",
                  borderRadius: "24px",
                  padding: "16px 24px",
                  fontSize: "11px",
                  fontWeight: "900",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                  border: "1px solid #f3f4f6",
                },
                success: {
                  icon: null,
                },
                error: {
                  icon: null,
                },
              }}
            />
          </AuthObserver>
        </ReduxProvider>
      </body>
    </html>
  );
}
