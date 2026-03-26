import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { nativeFetch } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ClipboardCheck,
  Calendar,
  ChevronRight,
  User,
} from "lucide-react";
import type { EvaluationAttribute, PlayerEvaluation, PlayerEvaluationRating } from "@shared/schema";

interface EnrichedEvaluation extends PlayerEvaluation {
  trainerName: string;
}

interface EvalRatingWithAttr extends PlayerEvaluationRating {
  attribute: EvaluationAttribute;
}

interface EvalDetail {
  evaluation: PlayerEvaluation;
  ratings: EvalRatingWithAttr[];
  trainerName: string;
}

const CATEGORIES = ["Offense", "Defense", "Intangibles", "Other"];

function getCategoryColor(cat: string | null) {
  switch (cat) {
    case "Offense": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "Defense": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "Intangibles": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getWordNumericEquivalent(wordValue: string, wordOptions: string[]): number {
  const idx = wordOptions.indexOf(wordValue);
  if (idx === -1) return 0;
  return idx + 1;
}

export default function MyEvaluationsPage() {
  const [viewingEvalId, setViewingEvalId] = useState<string | null>(null);

  const { data: evaluations, isLoading } = useQuery<EnrichedEvaluation[]>({
    queryKey: ["/api/my-evaluations"],
    staleTime: 0,
  });

  const { data: evalDetail } = useQuery<EvalDetail>({
    queryKey: ["/api/my-evaluations", viewingEvalId],
    enabled: !!viewingEvalId,
    queryFn: () => nativeFetch(`/api/my-evaluations/${viewingEvalId}`).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-my-evaluations-title">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          My Evaluations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Skill evaluations shared by your trainers</p>
      </div>

      {!evaluations || evaluations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No evaluations yet</p>
            <p className="text-sm mt-1">When a trainer shares an evaluation with you, it will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {evaluations.map(ev => (
            <Card
              key={ev.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setViewingEvalId(ev.id)}
              data-testid={`card-my-eval-${ev.id}`}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatDate(ev.evaluationDate)}</span>
                  </div>
                  <Badge variant={ev.evaluationType === "initial" ? "default" : "secondary"}>
                    {ev.evaluationType === "initial" ? "Initial" : "Progress"}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>{ev.trainerName}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!viewingEvalId} onOpenChange={(open) => { if (!open) setViewingEvalId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle data-testid="text-eval-detail-title">Evaluation Details</SheetTitle>
            <SheetDescription asChild>
              <div>
                {evalDetail && (
                  <span>
                    {formatDate(evalDetail.evaluation.evaluationDate)} &middot;{" "}
                    by {evalDetail.trainerName} &middot;{" "}
                    <Badge variant={evalDetail.evaluation.evaluationType === "initial" ? "default" : "secondary"} className="text-xs">
                      {evalDetail.evaluation.evaluationType === "initial" ? "Initial" : "Progress"}
                    </Badge>
                  </span>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>

          {evalDetail && (
            <div className="space-y-4 mt-4">
              {evalDetail.evaluation.notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Trainer Notes</p>
                  <p className="text-sm">{evalDetail.evaluation.notes}</p>
                </div>
              )}

              {CATEGORIES.map(cat => {
                const catRatings = evalDetail.ratings.filter(r => (r.attribute.category || "Other") === cat);
                if (catRatings.length === 0) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <Badge variant="outline" className={getCategoryColor(cat)}>{cat}</Badge>
                    {catRatings.map(r => {
                      const maxVal = r.attribute.scaleType === "1-10" ? 10 : 5;
                      const currentVal = r.attribute.scaleType === "word"
                        ? (r.wordValue && r.attribute.wordOptions ? getWordNumericEquivalent(r.wordValue, JSON.parse(r.attribute.wordOptions)) : 0)
                        : (r.numericValue || 0);
                      const pct = (currentVal / maxVal) * 100;

                      return (
                        <div key={r.id} className="rounded-lg border p-3" data-testid={`rating-${r.id}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium">{r.attribute.name}</span>
                            <span className="text-sm font-bold text-primary">
                              {r.attribute.scaleType === "word" ? r.wordValue : `${r.numericValue}/${maxVal}`}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {r.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic" data-testid={`text-rating-notes-${r.id}`}>
                              {r.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
