import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { track } from "@/lib/track";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Sparkles, Target } from "lucide-react";
import type { Program } from "@shared/schema";

export default function CourseLeadMagnetPage() {
  const { slug = "mechanical-foundation-14" } = useParams<{ slug: string }>();
  const { data } = useQuery<{ program: Program }>({ queryKey: [`/api/programs/${slug}`] });

  useEffect(() => {
    track("course_lead_magnet_view", { slug });
  }, [slug]);

  const course = data?.program;

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href={`/courses/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to course
        </Link>
        <div className="mt-8 max-w-3xl">
          <Badge variant="outline" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Free starter</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mt-4">Find the leak in your jumper.</h1>
          <p className="text-lg text-muted-foreground mt-4 leading-relaxed">
            Use this quick scorecard to identify whether your next breakthrough starts with balance, sequencing, or follow-through. It is the free starting point for The Mechanical Foundation.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {[
            ["01", "Balance", "Can you stay stacked and centered when your legs get tired?"],
            ["02", "Sequencing", "Do your hips, ball, and shooting hand move together without a pause?"],
            ["03", "Finish", "Does the guide hand clear, the wrist snap, and the finish hold?"],
          ].map(([number, title, description]) => (
            <Card key={title}>
              <CardContent className="p-5">
                <span className="text-xs font-black tracking-widest text-primary">{number}</span>
                <h2 className="text-xl font-bold mt-3 flex items-center gap-2"><Target className="w-5 h-5 text-primary" />{title}</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-primary/30 bg-primary/5">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold">Your free practice rules</h2>
            <div className="grid md:grid-cols-3 gap-4 mt-5">
              {["Start close enough to make clean feedback obvious.", "Change one variable at a time.", "Hold the finish until you see the result."].map((rule) => (
                <div key={rule} className="flex gap-2 text-sm text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span>{rule}</span></div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 overflow-hidden">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Next step</p>
              <h2 className="text-2xl font-bold mt-1">{course?.title ?? "The Mechanical Foundation"}</h2>
              <p className="text-sm text-muted-foreground mt-1">Unlock 14 days of lessons, workouts, and key takeaways.</p>
            </div>
            <Link href={`/courses/${slug}`} onClick={() => track("course_lead_magnet_cta", { slug })}>
              <Button size="lg" className="gap-2"><Lock className="w-4 h-4" /> See the full course <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}