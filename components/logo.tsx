import Link from "next/link"
import Image from "next/image"

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
      icon: "h-7 w-7",
      iconPx: 28,
      text: "text-base",
      subtitle: "text-[10px]",
    },
    md: {
      container: "gap-2.5",
      icon: "h-9 w-9",
      iconPx: 36,
      text: "text-xl",
      subtitle: "text-xs",
    },
    lg: {
      container: "gap-3",
      icon: "h-14 w-14",
      iconPx: 56,
      text: "text-3xl",
      subtitle: "text-sm",
    },
  }

  const sizeConfig = sizes[size]
  const content = (
    <div className={`flex items-center ${sizeConfig.container} ${className}`}>
      {showIcon && (
        <div className={`${sizeConfig.icon} relative shrink-0`}>
          <Image
            src="/images/exchange.svg"
            alt="RMU-Campus X Logo"
            width={sizeConfig.iconPx}
            height={sizeConfig.iconPx}
            className="object-contain"
          />
        </div>
      )}
      <div className="flex flex-col leading-none">
        <span className={`${sizeConfig.text} font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent`}>
          RMU-Campus X
        </span>
        <span className={`${sizeConfig.subtitle} text-muted-foreground font-medium tracking-wide uppercase`}>
          University Platform
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
        {content}
      </Link>
    )
  }

  return content
}
