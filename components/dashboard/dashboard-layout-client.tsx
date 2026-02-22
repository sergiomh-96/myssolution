'use client'

import { useState, useEffect } from 'react'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import type { Profile } from '@/lib/types/database'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  profile: Profile
}

export function DashboardLayoutClient({ children, profile }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768
      setIsMobile(isMobileView)
      if (isMobileView) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Layout container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 md:static md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col`}
        >
          <DashboardNav 
            profile={profile}
            isMobile={isMobile}
            onNavigate={() => {
              if (isMobile) setSidebarOpen(false)
            }}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden w-full">
          <DashboardHeader 
            profile={profile}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-4 md:px-6 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>© 2026 Sistema de Ofertas</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacidad</a>
            <a href="#" className="hover:text-foreground transition-colors">Términos</a>
            <a href="#" className="hover:text-foreground transition-colors">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
