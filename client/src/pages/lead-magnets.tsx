import { useEffect } from "react";
import { Link } from "wouter";
import { track } from "@/lib/track";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Download, Sparkles, Target } from "lucide-react";

export default function LeadMagnetsPage() {
  useEffect(() => {
    track("lead_magnets_browse_view");
  }, []);

  return (
    <div className="min-h-screen pb-12">
      <div className="relative overflow-hidden border-b border-border/40">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 15%, hsl(var(--primary) / 0.25) 0%, transparent 48%), radial-gradient(circle at 88% 80%, hsl(24 95% 53% / 0.18) 0%, transparent 52%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <Badge variant="outline" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Free resources</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-4">Lead Magnets</h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-2xl">
            Short, useful tools to help you understand your game before you commit to a full course.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Card className="overflow-hidden border-primary/30">
          <div className="h-2 bg-gradient-to-r from-primary via-orange-400 to-amber-300" />
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
              <div className="max-w-2xl">
                <Badge className="gap-1.5"><Target className="w-3.5 h-3.5" /> Shooting mechanics</Badge>
                <h2 className="text-3xl font-bold mt-4">Mechanical Foundation Scorecard</h2>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  Identify whether your next breakthrough starts with balance, sequencing, or follow-through. This free scorecard is the starting point for the 14-day Mechanical Foundation course.
                </p>
                <div className="grid sm:grid-cols-3 gap-3 mt-6">
                  {["Balance check", "Sequencing check", "Finish check"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="shrink-0 flex flex-col gap-3 lg:min-w-48">
                <Link href="/courses/mechanical-foundation-14/lead-magnet">
                  <Button size="lg" className="w-full gap-2">
                    Open scorecard <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Download className="w-3 h-3" /> Free to use
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}