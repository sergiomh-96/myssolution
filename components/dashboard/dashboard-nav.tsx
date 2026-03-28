'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types/database'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Headphones, 
  MessageSquare, 
  Settings, 
  BarChart3,
  Package,
  UserCog,
  Upload,
  ClipboardCheck
} from 'lucide-react'
import { canManageOffers, canManageRequests, canViewAnalytics, canManageUsers } from '@/lib/auth'

interface DashboardNavProps {
  profile: Profile
  isMobile?: boolean
  onNavigate?: () => void
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Panel',
    icon: LayoutDashboard,
    allowedRoles: ['admin', 'manager', 'sales_rep', 'support_agent', 'viewer']
  },
  {
    href: '/dashboard/customers',
    label: 'Clientes',
    icon: Users,
    allowedRoles: ['admin', 'manager', 'sales_rep', 'viewer']
  },
  {
    href: '/dashboard/products',
    label: 'Productos',
    icon: Package,
    allowedRoles: ['admin', 'manager', 'sales_rep', 'support_agent', 'viewer']
  },
  {
    href: '/dashboard/offers',
    label: 'Ofertas',
    icon: FileText,
    allowedRoles: ['admin', 'manager', 'sales_rep', 'viewer']
  },
  {
    href: '/dashboard/validations',
    label: 'Validaciones Pendientes',
    icon: ClipboardCheck,
    allowedRoles: ['admin']
  },
  {
    href: '/dashboard/requests',
    label: 'Soporte Técnico',
    icon: Headphones,
    allowedRoles: ['admin', 'manager', 'support_agent']
  },
  {
    href: '/dashboard/chat',
    label: 'Chat',
    icon: MessageSquare,
    allowedRoles: ['admin', 'manager', 'sales_rep', 'support_agent']
  },
  {
    href: '/dashboard/analytics',
    label: 'Analíticas',
    icon: BarChart3,
    allowedRoles: ['admin', 'manager', 'viewer']
  },
  {
    href: '/dashboard/users',
    label: 'Gestión de Usuarios',
    icon: UserCog,
    allowedRoles: ['admin']
  },
  {
    href: '/dashboard/import',
    label: 'Importación Masiva',
    icon: Upload,
    allowedRoles: ['admin']
  },
  {
    href: '/dashboard/settings',
    label: 'Configuración',
    icon: Settings,
    allowedRoles: ['admin', 'sales_rep', 'support_agent']
  },
]

export function DashboardNav({ profile, onNavigate }: DashboardNavProps) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(item => 
    item.allowedRoles.includes(profile.role)
  )

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image 
            src="/images/myssolution-logo.png" 
            alt="MYS Solution" 
            width={140}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="px-3 py-2 rounded-lg bg-muted">
          <p className="text-xs font-medium text-foreground">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</p>
        </div>
      </div>
    </aside>
  )
}
