"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const { tt } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border/50 bg-background/50 hover:bg-accent transition-colors">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{tt("สลับโหมดสว่าง/มืด", "Toggle light/dark mode")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border-border/50 bg-background/95 backdrop-blur-md shadow-soft">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={`gap-2 cursor-pointer transition-colors ${theme === "light" ? "bg-accent font-bold text-primary" : ""}`}
        >
          <Sun className="h-4 w-4" />
          <span>{tt("โหมดสว่าง", "Light mode")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={`gap-2 cursor-pointer transition-colors ${theme === "dark" ? "bg-accent font-bold text-primary" : ""}`}
        >
          <Moon className="h-4 w-4" />
          <span>{tt("โหมดมืด", "Dark mode")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
