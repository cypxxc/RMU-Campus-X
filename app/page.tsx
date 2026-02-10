import Link from "next/link"
import { ArrowRight, Bell, MessageSquare, Package, Shield, Sparkles, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LandingHero3D } from "@/components/landing-hero-3d"
import { LandingStats } from "@/components/landing-stats"
import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import { ScrollReveal } from "@/components/scroll-reveal"
import { getServerTranslator } from "@/lib/i18n/server"

export default async function LandingPage() {
  const { t } = await getServerTranslator()

  const features = [
    {
      icon: Package,
      title: t("landing.features.postTitle"),
      description: t("landing.features.postDescription"),
      color: "text-primary bg-primary/10",
    },
    {
      icon: MessageSquare,
      title: t("landing.features.chatTitle"),
      description: t("landing.features.chatDescription"),
      color: "text-primary bg-primary/10",
    },
    {
      icon: Bell,
      title: t("landing.features.lineTitle"),
      description: t("landing.features.lineDescription"),
      color: "text-primary bg-primary/10",
    },
    {
      icon: Shield,
      title: t("landing.features.safeTitle"),
      description: t("landing.features.safeDescription"),
      color: "text-primary bg-primary/10",
    },
    {
      icon: Users,
      title: t("landing.features.communityTitle"),
      description: t("landing.features.communityDescription"),
      color: "text-primary bg-primary/10",
    },
  ]

  const steps = [
    {
      step: 1,
      title: t("landing.steps.step1Title"),
      desc: t("landing.steps.step1Description"),
    },
    {
      step: 2,
      title: t("landing.steps.step2Title"),
      desc: t("landing.steps.step2Description"),
    },
    {
      step: 3,
      title: t("landing.steps.step3Title"),
      desc: t("landing.steps.step3Description"),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <LandingHero3D />

      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/90 border-b shadow-sm" role="banner">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" href="/" />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher compact />
            <ModeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t("landing.login")}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t("landing.register")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="pt-36 pb-24 px-4 relative z-10" aria-labelledby="hero-heading">
          <div className="container mx-auto text-center max-w-3xl">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium border-primary/30 text-primary animate-fade-in animation-duration-[0.6s]">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {t("landing.badge")}
            </Badge>

            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 animate-fade-in animation-duration-[0.6s] [animation-delay:100ms]">
              {t("landing.heroTitle")}
              <span className="block mt-2 bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {t("landing.heroHighlight")}
              </span>
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed animate-fade-in animation-duration-[0.6s] [animation-delay:200ms]">
              {t("landing.heroDescription")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-duration-[0.6s] [animation-delay:300ms]">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto gap-2 px-8 h-12 text-base font-bold shadow-lg hover:shadow-xl transition-shadow ring-2 ring-primary/20 ring-offset-2 ring-offset-background focus-visible:ring-primary">
                  {t("landing.start")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 h-12 text-base font-bold border-2 hover:bg-muted/50 transition-colors">
                  {t("landing.register")}
                </Button>
              </Link>
            </div>

            <div className="animate-fade-in animation-duration-[0.6s] [animation-delay:400ms]">
              <LandingStats />
            </div>
          </div>
        </section>

        <section className="py-24 px-4 bg-muted/30 relative z-10">
          <div className="container mx-auto max-w-6xl">
            <ScrollReveal variant="slide-up" className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">{t("landing.whyTitle")}</h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">{t("landing.whyDescription")}</p>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <ScrollReveal key={feature.title} variant="slide-up" delay={index * 80}>
                    <Card className="border border-border/60 shadow-soft bg-background/90 backdrop-blur rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/20 h-full">
                      <CardContent className="p-6 h-full flex flex-col justify-center text-center">
                        <div className={`h-12 w-12 rounded-xl mx-auto mb-4 flex items-center justify-center shrink-0 ${feature.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-24 px-4 relative z-10">
          <div className="container mx-auto max-w-2xl">
            <ScrollReveal variant="slide-up" className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">{t("landing.howTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("landing.howDescription")}</p>
            </ScrollReveal>

            <ScrollReveal variant="slide-up" delay={100}>
              <div className="relative">
                <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-linear-to-b from-primary/40 via-primary/30 to-primary/20 rounded-full" aria-hidden />
                {steps.map((item) => (
                  <div key={item.step} className="relative flex items-start gap-5 pl-2 pb-10 last:pb-0">
                    <div className="relative z-10 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 ring-4 ring-background shadow-md">
                      {item.step}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <h3 className="font-bold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal variant="slide-up" delay={150} className="text-center mt-8">
              <Link
                href="/guide?from=landing"
                className="text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                {t("landing.guideLink")}
              </Link>
            </ScrollReveal>
          </div>
        </section>

        <section className="py-24 px-4 bg-primary text-primary-foreground relative z-10 rounded-t-3xl overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)] pointer-events-none" aria-hidden />
          <ScrollReveal variant="fade" className="container mx-auto text-center max-w-2xl relative">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">{t("landing.finalTitle")}</h2>
            <p className="mb-8 opacity-90">{t("landing.finalDescription")}</p>
            <Link href="/register">
              <Button size="lg" className="px-8 h-12 text-base font-bold shadow-lg hover:shadow-xl transition-shadow bg-white text-primary hover:bg-white/90 border-0 focus-visible:ring-2 focus-visible:ring-white/50">
                {t("landing.finalButton")}
              </Button>
            </Link>
          </ScrollReveal>
        </section>
      </main>
    </div>
  )
}
