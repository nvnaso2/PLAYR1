import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Sparkles,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  CalendarDays,
  Trophy,
  Trash2,
  Bot,
  Send,
  RotateCcw,
  LockKeyhole,
  ArrowRight,
} from "lucide-react";
import type { PlayerGoal, GoalClarification, GoalMilestone, GoalCheckIn, GoalProgram } from "@shared/schema";

type GoalData = {
  goal: PlayerGoal;
  clarifications: GoalClarification[];
  milestones: GoalMilestone[];
  checkIns: GoalCheckIn[];
  isPro?: boolean;
} | null;

function AiBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
        <Bot className="w-4 h-4 text-orange-400" />
      </div>
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
        <p className="text-sm text-zinc-100 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="bg-orange-500/15 border border-orange-500/30 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
        <p className="text-sm text-orange-100 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function GoalInputForm({ onCreated }: { onCreated: () => void }) {
  const [goalText, setGoalText] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/goals", { goalText: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals/active"] });
      onCreated();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message ?? "Failed to create goal", variant: "destructive" });
    },
  });

  const examples = [
    "I want to make my middle school team and feel ready for tryouts",
    "I'm not sure what my basketball project is yet — help me discover it",
    "I want to learn the fundamentals and build a basketball identity",
    "I want to play intramurals, have fun, and feel more confident",
    "I want to build a basketball content project around my journey",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 mb-2">
            <Target className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">My PLAYR1 Project</h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Your basketball journey is bigger than one skill. Tell Coach P what you want basketball to make possible, and discover the project that fits your story.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <Textarea
            data-testid="input-goal-text"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="e.g. I’m not sure what my basketball project is yet — help me figure it out..."
            className="min-h-[120px] bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 text-base resize-none focus-visible:ring-orange-500/50"
          />
          <Button
            data-testid="button-submit-goal"
            onClick={() => createMutation.mutate(goalText)}
            disabled={goalText.trim().length < 10 || createMutation.isPending}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold h-12 text-base"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Your coach is thinking...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Talk to My Coach
              </>
            )}
          </Button>
          <p className="text-center text-xs text-zinc-500">
            Your full PLAYR1 Project Builder is free. Pro unlocks the coaching and progress loop after you finish.
          </p>
        </div>

        {/* Examples */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-widest text-center">Try one of these</p>
          <div className="grid grid-cols-1 gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                data-testid={`button-example-${ex.slice(0, 20).replace(/\s/g, "-")}`}
                onClick={() => setGoalText(ex)}
                className="text-left px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 hover:bg-zinc-800/80 transition-colors text-sm text-zinc-400 hover:text-zinc-200"
              >
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClarifyingView({
  data,
  onProgramReady,
}: {
  data: GoalData;
  onProgramReady: () => void;
}) {
  const { toast } = useToast();
  const [answer, setAnswer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const goal = data!.goal;
  const clarifications = data!.clarifications;
  const answered = clarifications.filter((c) => c.answer);
  const pending = clarifications.find((c) => !c.answer);

  const answerMutation = useMutation({
    mutationFn: ({ clarificationId, answerText }: { clarificationId: string; answerText: string }) =>
      apiRequest("POST", `/api/goals/${goal.id}/answer`, { clarificationId, answer: answerText }),
    onSuccess: (res: any) => {
      setAnswer("");
      if (res.done) {
        setIsGenerating(false);
        queryClient.invalidateQueries({ queryKey: ["/api/goals/active"] });
        onProgramReady();
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/goals/active"] });
      }
    },
    onError: (err: any) => {
      setIsGenerating(false);
      toast({ title: "Error", description: err.message ?? "Failed to send answer", variant: "destructive" });
    },
  });

  function handleSubmit() {
    if (!pending || !answer.trim()) return;
    const isLast = answered.length === 4;
    if (isLast) setIsGenerating(true);
    answerMutation.mutate({ clarificationId: pending.id, answerText: answer.trim() });
  }

  const totalQuestions = 5;
  const progress = Math.round((answered.length / totalQuestions) * 100);

  if (isGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-orange-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Discovering Your Project</h2>
          <p className="text-zinc-400 max-w-xs mx-auto">
            Coach P is connecting your answers, your player profile, and your basketball story into a path that belongs to you...
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
          <Bot className="w-4 h-4" />
          AI Coach
        </div>
        <h2 className="text-xl font-bold text-white">A few quick questions</h2>
        <p className="text-zinc-400 text-sm">"{goal.goalText}"</p>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Question {answered.length + (pending ? 1 : 0)} of {totalQuestions}</span>
          <span>{progress}% complete</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-zinc-800" />
      </div>

      {/* Chat */}
      <div className="space-y-4">
        {clarifications.map((c, i) => (
          <div key={c.id} className="space-y-3">
            <AiBubble text={c.question} />
            {c.answer && <UserBubble text={c.answer} />}
            {!c.answer && c === pending && (
              <div className="space-y-3 pt-1">
                <Textarea
                  data-testid="input-clarification-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Type your answer... (Enter to send)"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none min-h-[80px] focus-visible:ring-orange-500/50"
                />
                <Button
                  data-testid="button-send-answer"
                  onClick={handleSubmit}
                  disabled={!answer.trim() || answerMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                >
                  {answerMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Thinking...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Send</>
                  )}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseCard({ phase, isExpanded, onToggle }: { phase: NonNullable<GoalProgram["phases"]>[0]; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        data-testid={`button-phase-toggle-${phase.phase}`}
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-zinc-900 hover:bg-zinc-800/80 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <span className="text-sm font-bold text-orange-400">{phase.phase}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{phase.title}</p>
            <p className="text-xs text-zinc-400">{phase.purpose}</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>

      {isExpanded && (
        <div className="px-5 pb-4 bg-zinc-900/60 space-y-2">
          <div className="h-px bg-zinc-800 mb-3" />
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Actions in this phase</p>
          {phase.actions?.map((action, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-zinc-800/70 last:border-0">
              <div className="w-16 flex-shrink-0">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-300 capitalize">{action.type}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{action.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{action.description}</p>
              </div>
              {action.estimatedMinutes && <span className="flex-shrink-0 text-xs text-zinc-400">{action.estimatedMinutes} min</span>}
            </div>
          ))}
          <div className="mt-3 rounded-lg bg-orange-500/5 border border-orange-500/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-orange-400/80">Progress signal</p>
            <p className="text-xs text-zinc-300 mt-1">{phase.progressSignal}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveGoalView({ data, onAbandoned }: { data: GoalData; onAbandoned: () => void }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);
  const [checkInText, setCheckInText] = useState("");
  const [expandedCheckIn, setExpandedCheckIn] = useState<string | null>(null);

  const goal = data!.goal;
  const milestones = data!.milestones;
  const checkIns = data!.checkIns;
  const program = goal.aiProgram as GoalProgram | null;
  const phases = program?.phases?.length
    ? program.phases
    : (program?.weeklyFocus ?? []).map((week) => ({
        phase: week.week,
        title: week.theme,
        purpose: week.focus,
        actions: (week.dailySchedule ?? []).map((day) => ({
          title: day.activity,
          description: day.details,
          type: day.activity.toLowerCase().includes("rest") ? "recover" as const : "train" as const,
          estimatedMinutes: Number.parseInt(day.duration, 10) || undefined,
        })),
        progressSignal: "Complete the focus for this phase and notice what feels more available in your game.",
      }));

  const progressPct = milestones.length
    ? Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100)
    : 0;
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const hasCheckInThisPhase = checkIns.some((c) => c.weekNumber === goal.currentWeek);

  const completeMilestoneMutation = useMutation({
    mutationFn: (milestoneId: string) =>
      apiRequest("POST", `/api/goals/${goal.id}/milestones/${milestoneId}/complete`, {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals/active"] });
      if (res.goalCompleted) {
        toast({ title: "Goal Achieved!", description: "Congratulations! You've completed all milestones." });
      } else {
        toast({ title: "Milestone Complete", description: "Keep pushing!" });
      }
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (input: string) =>
      apiRequest("POST", `/api/goals/${goal.id}/checkin`, { userInput: input, phaseNumber: goal.currentWeek }),
    onSuccess: () => {
      setCheckInText("");
      queryClient.invalidateQueries({ queryKey: ["/api/goals/active"] });
      toast({ title: "Check-in submitted!", description: "Your coach has responded." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message ?? "Failed to submit check-in", variant: "destructive" });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/goals/${goal.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals/active"] });
      onAbandoned();
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-orange-400 text-xs font-medium mb-1">
              <Target className="w-3.5 h-3.5" />
              YOUR PLAYR1 PROJECT
            </div>
            <h1 className="text-white font-semibold text-xl leading-snug">{goal.projectTitle || program?.projectTitle || "My PLAYR1 Project"}</h1>
            <p className="text-zinc-300 text-sm leading-relaxed mt-2">{goal.goalText}</p>
          </div>
          <Badge
            data-testid="badge-goal-status"
            className={goal.status === "completed"
              ? "bg-green-500/15 text-green-400 border-green-500/30"
              : "bg-orange-500/15 text-orange-400 border-orange-500/30"
            }
            variant="outline"
          >
            {goal.status === "completed" ? "Completed" : "Active"}
          </Badge>
        </div>

        {program?.coachNote && (
          <div className="bg-zinc-800/60 rounded-xl px-4 py-3 border border-zinc-700/50">
            <div className="flex gap-2 items-start">
              <Bot className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-zinc-300 italic">{program.coachNote}</p>
            </div>
          </div>
        )}

        {program?.whyItMatters && (
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/60 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Why this matters</p>
            <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{program.whyItMatters}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {goal.projectType && <Badge variant="outline" className="border-orange-500/30 text-orange-300">{goal.projectType}</Badge>}
          {program?.timelineSummary && <Badge variant="outline" className="border-zinc-700 text-zinc-400">{program.timelineSummary}</Badge>}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{program?.currentChapter ? `Current chapter: ${program.currentChapter}` : `Phase ${goal.currentWeek} of ${goal.totalWeeks}`}</span>
            <span>{completedMilestones}/{milestones.length} milestones</span>
          </div>
          <Progress value={progressPct} className="h-2 bg-zinc-800" />
        </div>

        {program && (
          <div className="pt-1">
            <h3 className="text-base font-semibold text-white">{program.projectSummary || program.programSummary}</h3>
            {program.successDefinition && <p className="text-sm text-zinc-400 mt-2"><span className="text-zinc-500">Success looks like:</span> {program.successDefinition}</p>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="program">
        <TabsList className="bg-zinc-900 border border-zinc-800 w-full">
          <TabsTrigger data-testid="tab-program" value="program" className="flex-1 data-[state=active]:bg-zinc-800">
            <CalendarDays className="w-4 h-4 mr-1.5" />
            Plan
          </TabsTrigger>
          <TabsTrigger data-testid="tab-milestones" value="milestones" className="flex-1 data-[state=active]:bg-zinc-800">
            <Trophy className="w-4 h-4 mr-1.5" />
            Milestones
          </TabsTrigger>
          <TabsTrigger data-testid="tab-checkins" value="checkins" className="flex-1 data-[state=active]:bg-zinc-800">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Check-ins
          </TabsTrigger>
        </TabsList>

        {/* Program Tab */}
        <TabsContent value="program" className="mt-4 space-y-3">
          {program?.nextAction && (
            <Card className="bg-orange-500/10 border-orange-500/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-orange-300 flex items-center gap-2"><Sparkles className="w-4 h-4" />Start here</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white font-semibold">{program.nextAction.title}</p>
                <p className="text-sm text-zinc-300 mt-1">{program.nextAction.description}</p>
              </CardContent>
            </Card>
          )}
          {program?.focusAreas?.length ? (
            <div className="flex flex-wrap gap-2">
              {program.focusAreas.map((area) => <Badge key={area} variant="outline" className="border-zinc-700 text-zinc-300">{area}</Badge>)}
            </div>
          ) : null}
          {phases.length ? (
            phases.map((phase) => (
              <PhaseCard
                key={phase.phase}
                phase={phase}
                isExpanded={expandedPhase === phase.phase}
                onToggle={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
              />
            ))
          ) : (
            <p className="text-zinc-500 text-sm text-center py-8">Your project plan is being prepared.</p>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="mt-4 space-y-3">
          {milestones.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">No milestones yet</p>
          ) : (
            milestones.map((m) => (
              <div
                key={m.id}
                data-testid={`card-milestone-${m.id}`}
                className={`border rounded-xl p-4 flex items-start gap-4 transition-colors ${
                  m.completed
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {m.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${m.completed ? "text-green-300 line-through" : "text-white"}`}>
                      {m.title}
                    </p>
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500 px-1.5 py-0 capitalize">
                      {m.milestoneType || "Progress"} · Phase {m.weekNumber}
                    </Badge>
                  </div>
                  {m.description && (
                    <p className="text-xs text-zinc-400 mt-0.5">{m.description}</p>
                  )}
                </div>
                {!m.completed && (
                  <Button
                    data-testid={`button-complete-milestone-${m.id}`}
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60 text-xs"
                    onClick={() => data?.isPro ? completeMilestoneMutation.mutate(m.id) : navigate("/subscription")}
                    disabled={completeMilestoneMutation.isPending}
                  >
                    {completeMilestoneMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : data?.isPro ? "Mark Done" : <><LockKeyhole className="w-3 h-3 mr-1" />Unlock</>}
                  </Button>
                )}
              </div>
            ))
          )}
        </TabsContent>

        {/* Check-ins Tab */}
        <TabsContent value="checkins" className="mt-4 space-y-4">
          {/* New check-in form */}
          {goal.status === "active" && !hasCheckInThisPhase && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-400" />
                  Phase {goal.currentWeek} Check-in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data?.isPro ? (
                  <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <LockKeyhole className="w-5 h-5 text-orange-300 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Your project is ready.</p>
                        <p className="text-sm text-zinc-300 mt-1">Upgrade to Pro to keep checking in with Coach P, adapt your plan, and keep building momentum.</p>
                        <Button onClick={() => navigate("/subscription")} className="mt-3 bg-orange-500 hover:bg-orange-600 text-black font-semibold">
                          Continue with Pro <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : <>
                  <p className="text-sm text-zinc-400">What have you tried, noticed, or learned in this chapter?</p>
                  <Textarea
                    data-testid="input-checkin-text"
                    value={checkInText}
                    onChange={(e) => setCheckInText(e.target.value)}
                    placeholder="Share your progress, wins, struggles, or anything on your mind..."
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px] resize-none focus-visible:ring-orange-500/50"
                  />
                  <Button
                    data-testid="button-submit-checkin"
                    onClick={() => checkInMutation.mutate(checkInText)}
                    disabled={!checkInText.trim() || checkInMutation.isPending}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                  >
                    {checkInMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Coach is responding...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Submit Check-in</>
                    )}
                  </Button>
                </>}
              </CardContent>
            </Card>
          )}

          {/* Past check-ins */}
          {checkIns.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">No check-ins yet. Submit your first one above!</p>
          ) : (
            <div className="space-y-3">
              {[...checkIns].reverse().map((ci) => (
                <div key={ci.id} data-testid={`card-checkin-${ci.id}`} className="border border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCheckIn(expandedCheckIn === ci.id ? null : ci.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">{ci.periodLabel || `Phase ${ci.weekNumber}`} Check-in</p>
                        <p className="text-xs text-zinc-500 line-clamp-1">{ci.userInput}</p>
                      </div>
                    </div>
                    {expandedCheckIn === ci.id ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                  </button>
                  {expandedCheckIn === ci.id && (
                    <div className="px-4 pb-4 bg-zinc-900/60 space-y-4 pt-2">
                      <div className="h-px bg-zinc-800" />
                      <div>
                        <p className="text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">You said</p>
                        <UserBubble text={ci.userInput} />
                      </div>
                      {ci.aiResponse && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Coach response</p>
                          <AiBubble text={ci.aiResponse} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Abandon */}
      {goal.status === "active" && (
        <div className="pt-4 border-t border-zinc-800/60">
          <Button
            data-testid="button-abandon-goal"
            variant="ghost"
            size="sm"
            className="text-zinc-600 hover:text-red-400 hover:bg-red-400/5 w-full text-xs"
            onClick={() => {
              if (confirm("Are you sure? This will clear your current goal and program.")) {
                abandonMutation.mutate();
              }
            }}
            disabled={abandonMutation.isPending}
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            Abandon Goal & Start Over
          </Button>
        </div>
      )}
    </div>
  );
}

function CompletedView({ data, onReset }: { data: GoalData; onReset: () => void }) {
  const goal = data!.goal;
  const milestones = data!.milestones;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-orange-500/15 border border-orange-500/40 flex items-center justify-center">
        <Trophy className="w-10 h-10 text-orange-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Goal Achieved!</h1>
        <p className="text-zinc-400 max-w-sm mx-auto">
          You completed all {milestones.length} milestones for:
        </p>
        <p className="text-white font-semibold">"{goal.goalText}"</p>
      </div>
      <Button
        data-testid="button-new-goal"
        onClick={onReset}
        className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-8"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Set a New Goal
      </Button>
    </div>
  );
}

export default function MyGoalPage() {
  const { user } = useAuth();
  const [forceRefresh, setForceRefresh] = useState(0);

  const { data: goalData, isLoading } = useQuery<GoalData>({
    queryKey: ["/api/goals/active", forceRefresh],
    queryFn: () =>
      fetch("/api/goals/active", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => d ?? null),
    enabled: !!user,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/goals/active"] });
    setForceRefresh((n) => n + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!goalData) {
    return <GoalInputForm onCreated={refresh} />;
  }

  const { goal } = goalData;

  if (goal.status === "completed") {
    return <CompletedView data={goalData} onReset={refresh} />;
  }

  if (goal.status === "clarifying") {
    return <ClarifyingView data={goalData} onProgramReady={refresh} />;
  }

  return <ActiveGoalView data={goalData} onAbandoned={refresh} />;
}
