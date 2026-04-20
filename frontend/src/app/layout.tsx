import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FounderMap — Every accelerator, grant & fellowship, globally",
  description:
    "Free, open-source aggregator of incubators, accelerators, grants, and fellowships worldwide. Updated automatically every 12 hours.",
  openGraph: {
    title: "FounderMap",
    description: "Every founder opportunity, aggregated and free.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
