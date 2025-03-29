
import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  className?: string
  children: React.ReactNode
}

export function PageHeader({ className, children }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-2", className)}>
      {children}
    </div>
  )
}
