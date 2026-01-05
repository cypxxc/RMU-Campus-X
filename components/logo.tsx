import Link from "next/link"
import { GraduationCap } from "lucide-react"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  href?: string
  className?: string
}

export function Logo({ size = "md", showIcon = true, href = "/dashboard", className = "" }: LogoProps) {
  const sizes = {
    sm: {
      container: "gap-2",
      icon: "h-7 w-7 rounded-lg",
      iconSize: "h-4 w-4",
      text: "text-base",
      subtitle: "text-[10px]",
    },
    md: {
      container: "gap-2.5",
      icon: "h-9 w-9 rounded-xl",
      iconSize: "h-5 w-5",
      text: "text-xl",
      subtitle: "text-xs",
    },
    lg: {
      container: "gap-3",
      icon: "h-14 w-14 rounded-2xl",
      iconSize: "h-7 w-7",
      text: "text-3xl",
      subtitle: "text-sm",
    },
  }

  const sizeConfig = sizes[size]

  const LogoContent = () => (
    <div className={`flex items-center ${sizeConfig.container} ${className}`}>
      {showIcon && (
        <div className={`${sizeConfig.icon} bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm`}>
          <GraduationCap className={`${sizeConfig.iconSize} text-primary-foreground`} />
        </div>
      )}
      <div className="flex flex-col leading-none">
        <span className={`${sizeConfig.text} font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent`}>
          RMU Exchange
        </span>
        <span className={`${sizeConfig.subtitle} text-muted-foreground font-medium tracking-wide uppercase`}>
          Student Platform
        </span>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link 
        href={href}
        className="hover:opacity-80 transition-opacity"
      >
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
}
