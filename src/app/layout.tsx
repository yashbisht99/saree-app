import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PageTransition } from "@/components/ui/motion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vaishnavi Saree — Store OS",
  description: "Vaishnavi Saree premium collection — POS, inventory, khata and reports with Smart Ingest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <TopBar />
            <main className="flex-1 px-4 lg:px-8 py-6 pb-20 lg:pb-6">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
