import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Brain, Flame, Target, Zap, BookOpen, Users, Mic, Heart } from "lucide-react";
import type { BrandPrinciples } from "@shared/schema";

const SECTIONS = [
  {
    key: "mission" as const,
    label: "Mission",
    icon: Flame,
    description: "The core purpose and movement behind PLAYR1 / Handlz.",
    placeholder: "Our Mission: Handlz / PLAYR1 is building a movement...",
  },
  {
    key: "brandBeliefs" as const,
    label: "Brand Beliefs",
    icon: Heart,
    description: "The foundational beliefs that drive everything the brand does.",
    placeholder: "Anyone can be great. Effort > Outcome...",
  },
  {
    key: "coreValues" as const,
    label: "Core Values",
    icon: Target,
    description: "The values that guide player development and community.",
    placeholder: "Learn From THE Experience. Love the Game. Growth Mindset...",
  },
  {
    key: "trainingPhilosophy" as const,
    label: "Training Philosophy",
    icon: Zap,
    description: "How PLAYR1 thinks about building players — the principles behind every workout.",
    placeholder: "The Foundation Is Everything. Fundamentals First...",
  },
  {
    key: "basketballIntelligence" as const,
    label: "Basketball Intelligence & AI Workout Logic",
    icon: Brain,
    description: "The 5-step trainer thinking framework and the 5-level progressive training model the AI uses to build workouts.",
    placeholder: "Step 1: What game situation are we solving?...",
  },
  {
    key: "gamePrinciples" as const,
    label: "Game Principles",
    icon: BookOpen,
    description: "The 7 principles of how basketball is actually played — shapes drill selection logic.",
    placeholder: "1. The Game Rewards Advantage Creation...",
  },
  {
    key: "toneReferences" as const,
    label: "Tone & Voice References",
    icon: Mic,
    description: "The people and philosophies that shape how PLAYR1 communicates with players.",
    placeholder: "Steven Bartlett: emotional honesty + self-awareness...\nRyan Trahan: small goals feel meaningful...\nEd Sheeran: repetition without ego...",
  },
  {
    key: "lifePrinciple" as const,
    label: "The PLAYR1 Life Principle",
    icon: Users,
    description: "The most important final principle — what the game should add to a player's life.",
    placeholder: "PLAYR1 Believes The Game Should Add To Your Life...",
  },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

type FormState = Partial<Record<SectionKey, string>>;

export default function AdminBrandPrinciples() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<BrandPrinciples>({
    queryKey: ["/api/admin/brand-principles"],
  });

  useEffect(() => {
    if (data) {
      setForm({
        mission: data.mission ?? "",
        brandBeliefs: data.brandBeliefs ?? "",
        coreValues: data.coreValues ?? "",
        trainingPhilosophy: data.trainingPhilosophy ?? "",
        basketballIntelligence: data.basketballIntelligence ?? "",
        gamePrinciples: data.gamePrinciples ?? "",
        toneReferences: data.toneReferences ?? "",
        lifePrinciple: data.lifePrinciple ?? "",
      });
      setDirty(false);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (values: FormState) => apiRequest("PUT", "/api/admin/brand-principles", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand-principles"] });
      setDirty(false);
      toast({ title: "Brand principles saved", description: "The AI agent will use these on all future requests." });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const handleChange = (key: SectionKey, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const filledCount = SECTIONS.filter(s => (form[s.key] ?? "").trim().length > 0).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Brand Principles</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Everything here is injected into the PLAYR1 AI Agent's system prompt. The agent thinks, speaks, and builds workouts through this lens.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant={filledCount === SECTIONS.length ? "default" : "secondary"} className="text-xs">
              {filledCount}/{SECTIONS.length} sections filled
            </Badge>
            <Button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !dirty}
              data-testid="button-save-brand-principles"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-4">
            {SECTIONS.map(s => (
              <Card key={s.key} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const value = form[section.key] ?? "";
              const filled = value.trim().length > 0;
              return (
                <Card key={section.key} className={`border transition-colors ${filled ? "border-border" : "border-dashed border-muted-foreground/30"}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${filled ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${filled ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{section.label}</CardTitle>
                      </div>
                      {filled && (
                        <Badge variant="outline" className="text-xs text-primary border-primary/30">
                          {value.trim().split(/\s+/).length} words
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1 ml-9">{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Label htmlFor={section.key} className="sr-only">{section.label}</Label>
                    <Textarea
                      id={section.key}
                      data-testid={`textarea-${section.key}`}
                      value={value}
                      onChange={e => handleChange(section.key, e.target.value)}
                      placeholder={section.placeholder}
                      rows={8}
                      className="resize-y text-sm leading-relaxed font-mono bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !dirty}
            data-testid="button-save-brand-principles-bottom"
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? "Saving..." : "Save Principles"}
          </Button>
        </div>
      </div>
    </div>
  );
}
