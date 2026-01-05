'use client'

/**
 * Status Badge Component
 * Reusable status badges with color coding
 */

import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertTriangle, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusType = 
  | 'active' | 'ACTIVE'
  | 'suspended' | 'SUSPENDED'
  | 'banned' | 'BANNED'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'new'
  | 'resolved'
  | 'available'

interface StatusBadgeProps {
  status: StatusType
  className?: string
  showIcon?: boolean
}

const statusConfig = {
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle,
  },
  SUSPENDED: {
    label: 'Suspended',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle,
  },
  banned: {
    label: 'Banned',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: Ban,
  },
  BANNED: {
    label: 'Banned',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: Ban,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle,
  },
  new: {
    label: 'New',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: AlertTriangle,
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  available: {
    label: 'Available',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle,
  },
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
