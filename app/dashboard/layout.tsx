'use client'

import { useState, useEffect } from 'react'
import { requireProfile } from '@/lib/auth'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import type { Profile } from '@/lib/types/database'

async function getProfile() {
  return await requireProfile()
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Set hydration flag
    setIsHydrated(true)
    
    // Load profile
    getProfile().then(setProfile).catch(console.error)
    
    // Set sidebar to closed on mobile on first load
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 768) {
          setSidebarOpen(false)
        } else {
          setSidebarOpen(true)
        }
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isHydrated || !profile) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transition-all duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <DashboardNav profile={profile} />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <DashboardHeader 
          profile={profile} 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
