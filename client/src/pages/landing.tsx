import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  TrendingUp, 
  Users, 
  Play, 
  ChevronRight,
  Video,
  Menu,
  X
} from "lucide-react";
import heroImage from "@assets/bballpic5_1.1.1_1769377307157.png";
import logoLandscape from "@assets/Playr1_App_Logo_1773593823443.png";
import basketballImage from "@assets/Handlz_(26)_1769377307158.png";
import productImage from "@assets/BBallpic2_1.14.1_1769377307157.png";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Play,
      title: "Access Drill Library with 50+ Drills",
      description: "Access 50+ drills across 7 categories - ball handling, shooting, passing, finishing, defense, IQ, and workouts."
    },
    {
      icon: TrendingUp,
      title: "Track Your Training & Stats",
      description: "PLAYR1 gives you the tools to train consistently, track your workouts, and master your game over time."
    },
    {
      icon: Users,
      title: "Find Trainer, Teams, and Leagues",
      description: "See how you stack up against players your age nationwide. Compete, compare, and climb the ranks."
    },
    {
      icon: Video,
      title: "Upload Your Videos",
      description: "Record and upload your training sessions. Review your form and share your progress with the community."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoLandscape} 
                alt="PLAYR1" 
                className="h-10 w-40 object-cover mix-blend-screen dark:mix-blend-screen"
                data-testid="img-logo"
              />
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">How It Works</a>
              <a href="https://www.handlz.co" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-shop">Shop</a>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <a href="/auth" className="hidden md:block">
                <Button data-testid="button-login">
                  Start Training
                </Button>
              </a>
              <button
                className="md:hidden p-2 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2" data-testid="link-mobile-features">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground py-2" data-testid="link-mobile-how-it-works">How It Works</a>
              <a href="https://www.handlz.co" target="_blank" rel="noopener noreferrer" className="block text-sm text-muted-foreground hover:text-foreground py-2" data-testid="link-mobile-shop">Shop</a>
              <a href="/auth" className="block pt-2">
                <Button className="w-full" data-testid="button-mobile-login">Start Training</Button>
              </a>
            </div>
          </div>
        )}
      </nav>

      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-center mb-10">
            <img
              src={logoLandscape}
              alt="PLAYR1"
              className="h-24 w-[480px] max-w-full object-cover mix-blend-screen dark:mix-blend-screen"
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                  Become{" "}
                  <span className="text-primary">PLAYR1</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg">
                  The all-in-one basketball platform to train, track, and master your game.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/auth">
                  <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-get-started">
                    Start Training Free
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </a>
                <a href="#features">
                  <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto" data-testid="button-learn-more">
                    <Play className="w-4 h-4" />
                    Learn More
                  </Button>
                </a>
              </div>

            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 lg:hidden" />
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                <img 
                  src={heroImage}
                  alt="Basketball player training"
                  className="w-full h-auto object-cover transition-transform duration-500 hover:scale-105"
                  data-testid="img-hero"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Watch Pro Drills</p>
                      <p className="text-sm text-white/70">50+ training videos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-primary">Level Up</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From beginner fundamentals to elite-level training, our platform has everything 
              you need to take your game to the next level.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover-elevate transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2" data-testid={`text-feature-title-${index}`}>
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm" data-testid={`text-feature-desc-${index}`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <img 
                src={productImage}
                alt="PLAYR1 weighted basketball"
                className="w-full rounded-2xl ring-1 ring-black/5 dark:ring-white/5"
                data-testid="img-product"
              />
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <div>
                <Badge variant="secondary" className="mb-4">How It Works</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Train Like a{" "}
                  <span className="text-primary">Pro</span>
                </h2>
                <p className="text-muted-foreground">
                  Our platform combines professional-grade training content with 
                  data-driven progress tracking to help you reach your goals faster.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { step: "1", title: "Choose Your Category", desc: "Select from ball handling, shooting, passing, finishing, defense, IQ, or workouts." },
                  { step: "2", title: "Follow the Drills", desc: "Watch step-by-step training videos and practice anytime, anywhere." },
                  { step: "3", title: "Log Your Sessions", desc: "Track reps, sets, duration, and rate your performance after each session." },
                  { step: "4", title: "See Your Growth", desc: "View your progress and analytics to see your game evolve." }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold" data-testid={`text-step-title-${index}`}>{item.title}</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-step-desc-${index}`}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden">
            <img 
              src={basketballImage}
              alt="PLAYR1 basketball on court"
              className="w-full h-80 object-cover"
              data-testid="img-cta-background"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
            <div className="absolute inset-0 flex items-center">
              <div className="px-8 sm:px-12 max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Become PLAYR1
                </h2>
                <p className="text-white/80 mb-6">
                  Join a community of players who are focused on improving their skills with the PLAYR1 training platform.
                </p>
                <a href="/auth">
                  <Button size="lg" className="gap-2" data-testid="button-cta-join">
                    Start Training Free
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoLandscape} 
                alt="PLAYR1" 
                className="h-8 w-32 object-cover mix-blend-screen dark:mix-blend-screen"
              />
              <span className="text-sm text-muted-foreground">
                © 2025 PLAYR1. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://www.handlz.co" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-shop">
                Shop
              </a>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-privacy">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-terms">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
