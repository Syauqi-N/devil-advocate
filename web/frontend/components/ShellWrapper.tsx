"use client"

import { usePathname } from "next/navigation"
import IntroModal from "@/components/IntroModal"

// Halaman yang tidak pakai navbar + sidebar
const AUTH_ROUTES = ["/login"]

interface ShellWrapperProps {
  navbar: React.ReactNode
  sidebar: React.ReactNode
  children: React.ReactNode
}

export default function ShellWrapper({ navbar, sidebar, children }: ShellWrapperProps) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <IntroModal />
      {navbar}
      <div className="flex flex-1 overflow-hidden">
        {sidebar}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
