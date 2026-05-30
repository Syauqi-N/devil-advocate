import type { Metadata } from "next"
import "./globals.css"
import Providers from "@/components/providers"
import Navbar from "@/components/navbar"
import Sidebar from "@/components/sidebar"
import ShellWrapper from "@/components/ShellWrapper"

export const metadata: Metadata = {
  title: "Devil's Advocate — Sebelum eksekusi, debatkan dulu.",
  description: "Tool AI debate untuk stress-test ide bisnis dan keputusan penting.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="bg-[#0f0f0f] text-[#e5e5e5] font-sans antialiased">
        <Providers>
          <ShellWrapper
            navbar={<Navbar />}
            sidebar={<Sidebar />}
          >
            {children}
          </ShellWrapper>
        </Providers>
      </body>
    </html>
  )
}
