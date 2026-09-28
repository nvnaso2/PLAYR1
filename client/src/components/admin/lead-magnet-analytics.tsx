import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { leadMagnetAnalyticsCatalog } from "@/lib/lead-magnet-analytics-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type LeadMagnetMetric = {
  leadMagnet: string;
  questionId?: string;
  answerId?: string;
  resultId?: string;
  count: number;
  uniqueUsers: number;
};

type LeadMagnetAnalyticsResponse = {
  period: string;
  answers: LeadMagnetMetric[];
  results: LeadMagnetMetric[];
};

const PERIODS = [
  { value: "7d", label: "Past 7 days" },
  { value: "30d", label: "Past 30 days" },
  { value: "90d", label: "Past 90 days" },
  { value: "lifetime", label: "Lifetime" },
];

const number = (value: number) => Number(value || 0).toLocaleString();
const percentage = (count: number, total: number) =>
  total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";

export function LeadMagnetAnalyticsSubTab() {
  const [period, setPeriod] = useState("30d");
  const { data, isLoading, isError, refetch } = useQuery<LeadMagnetAnalyticsResponse>({
    queryKey: ["/api/admin/analytics/lead-magnets", period],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/admin/analytics/lead-magnets?period=${encodeURIComponent(period)}`,
      );
      return response.json();
    },
  });

  return (
    <div className="space-y-5" data-testid="lead-magnet-analytics">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-white">Lead magnet responses</p>
          <p className="mt-1 text-xs text-zinc-500">
            See which answers players choose most often and how often each result is reached.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
          <span>Time range</span>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            data-testid="lead-magnet-analytics-period"
          >
            {PERIODS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-80 rounded-2xl" />)}
        </div>
      ) : isError ? (
        <Card className="border-red-900/60 bg-zinc-950">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <p className="font-bold text-zinc-100">Could not load lead magnet analytics</p>
              <p className="mt-1 text-sm text-zinc-500">Try again. Only administrators can view this data.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()} className="border-zinc-700">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {leadMagnetAnalyticsCatalog.map((magnet) => {
            const answers = data?.answers ?? [];
            const results = data?.results ?? [];
            const magnetAnswers = answers.filter((item) => item.leadMagnet === magnet.id);
            const magnetResults = results.filter((item) => item.leadMagnet === magnet.id);
            const starts = magnetAnswers
              .filter((item) => item.questionId === "q1")
              .reduce((sum, item) => sum + item.count, 0);
            const completions = magnetResults.reduce((sum, item) => sum + item.count, 0);
            const answerEvents = magnetAnswers.reduce((sum, item) => sum + item.count, 0);

            return (
              <Card key={magnet.id} className="border-zinc-800 bg-zinc-950/70" data-testid={`lead-magnet-analytics-${magnet.id}`}>
                <CardHeader className="border-b border-zinc-800/80 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base font-black text-white">{magnet.title}</CardTitle>
                    <span className="shrink-0 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-300">
                      {PERIODS.find((option) => option.value === period)?.label}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <SummaryMetric label="Started" value={starts} />
                    <SummaryMetric label="Results" value={completions} />
                    <SummaryMetric label="Answers" value={answerEvents} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                  {magnet.questions.map((question) => {
                    const questionMetrics = magnetAnswers.filter((item) => item.questionId === question.id);
                    const total = questionMetrics.reduce((sum, item) => sum + item.count, 0);
                    const rows = question.answers.map((answer) => {
                      const metric = questionMetrics.find((item) => item.answerId === answer.id);
                      return {
                        id: answer.id,
                        label: answer.label,
                        count: metric?.count ?? 0,
                        uniqueUsers: metric?.uniqueUsers ?? 0,
                      };
                    }).sort((a, b) => b.count - a.count);

                    return (
                      <section key={question.id} className="space-y-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <h4 className="text-xs font-bold leading-relaxed text-zinc-200">{question.title}</h4>
                          <span className="shrink-0 text-[10px] text-zinc-600">{number(total)} responses</span>
                        </div>
                        <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
                          {rows.map((row, index) => (
                            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2.5">
                              <div className="min-w-0">
                                <div className="flex items-start gap-2">
                                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${row.count > 0 && index === 0 ? "bg-orange-400" : "bg-zinc-700"}`} />
                                  <span className="break-words text-xs leading-relaxed text-zinc-300">{row.label}</span>
                                </div>
                                <p className="ml-3.5 mt-1 text-[10px] text-zinc-600">
                                  {number(row.uniqueUsers)} unique players
                                </p>
                              </div>
                              <div className="min-w-12 text-right">
                                <span className="block text-xs font-bold tabular-nums text-zinc-100">{number(row.count)}</span>
                                <span className="mt-1 block text-[10px] tabular-nums text-zinc-500">
                                  {percentage(row.count, total)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  <section className="space-y-2.5 border-t border-zinc-800 pt-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h4 className="text-xs font-bold text-zinc-200">Results reached</h4>
                      <span className="shrink-0 text-[10px] text-zinc-600">{number(completions)} completions</span>
                    </div>
                    <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
                      {magnet.results.map((result) => {
                        const metric = magnetResults.find((item) => item.resultId === result.id);
                        return (
                          <div key={result.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <span className="block break-words text-xs leading-relaxed text-zinc-300">{result.label}</span>
                              <p className="mt-1 text-[10px] text-zinc-600">
                                {number(metric?.uniqueUsers ?? 0)} unique players
                              </p>
                            </div>
                            <div className="min-w-12 text-right">
                              <span className="block text-xs font-bold tabular-nums text-zinc-100">{number(metric?.count ?? 0)}</span>
                              <span className="mt-1 block text-[10px] tabular-nums text-zinc-500">
                                {percentage(metric?.count ?? 0, completions)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums text-zinc-100">{number(value)}</p>
    </div>
  );
}