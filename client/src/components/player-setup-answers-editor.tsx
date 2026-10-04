import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BASKETBALL_ASPIRATIONS, BASKETBALL_POSITIONS } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save } from "lucide-react";

const SITUATIONS = [
  "Elementary School",
  "Middle School",
  "Freshman / JV",
  "Varsity",
  "College Basketball",
  "Intramural League",
  "Adult Rec League",
  "Just Playing For Fun",
] as const;

const SKILLS = [
  "Ball Handling",
  "Shooting",
  "Finishing",
  "Passing",
  "Defense",
  "Basketball IQ",
  "Athleticism",
  "Rebounding",
] as const;

const GOALS = [
  "Make a team I'm trying out for",
  "Earn more playing time / a bigger role",
  "Play at the next level",
  "Just looking to improve in general",
  "Play for fun",
] as const;

const TEAM_ROLES = [
  "Not On A Team / Learning the game",
  "Limited Minutes / Looking to Make a Team",
  "Rotation Player",
  "Starter / 6th Man",
  "Key Player",
  "Team Leader",
] as const;

const ASPIRATION_LABELS: Record<(typeof BASKETBALL_ASPIRATIONS)[number], string> = {
  recreational: "Recreational",
  "feeder-team": "Feeder team",
  aau: "AAU",
  "middle-school": "Middle school",
  "high-school": "High school",
  college: "College",
  "professional-non-nba": "Professional",
  nba: "NBA",
};

const RANK_FIELDS = [
  { key: "best", label: "Strongest skill" },
  { key: "secondBest", label: "Second strongest" },
  { key: "worst", label: "Needs the most work" },
  { key: "improveMost", label: "Top improvement focus" },
] as const;

type SkillRankings = Record<(typeof RANK_FIELDS)[number]["key"], string>;

type SetupAnswers = {
  firstName: string;
  lastName: string;
  currentSituation: string;
  skillRoles: string[];
  skillRankings: SkillRankings;
  primaryGoal: string;
  trainingDaysPerUnit: number;
  trainingPeriodUnit: "week" | "month";
  experienceYears: number | string;
  competitiveExperienceYears: number;
  teamName: string;
  teamRole: string;
  positions: string[];
  aspiration: string;
};

type SetupResponse = { answers?: Partial<SetupAnswers>; completed?: boolean };

const defaultRankings: SkillRankings = {
  best: "Shooting",
  secondBest: "Ball Handling",
  worst: "Defense",
  improveMost: "Basketball IQ",
};

function makeUniqueRankings(value?: Partial<SkillRankings> | null): SkillRankings {
  const result = {} as SkillRankings;
  const used = new Set<string>();
  for (const field of RANK_FIELDS) {
    const candidate = value?.[field.key];
    const fallback = defaultRankings[field.key];
    const selected = typeof candidate === "string" && SKILLS.includes(candidate as (typeof SKILLS)[number]) && !used.has(candidate)
      ? candidate
      : !used.has(fallback)
        ? fallback
        : SKILLS.find((skill) => !used.has(skill))!;
    result[field.key] = selected;
    used.add(selected);
  }
  return result;
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function experienceValue(value: unknown): number | string {
  if (typeof value === "string" && ["0", "1 to 3", "4 to 6", "7 to 10", "10+"].includes(value)) return value;
  return numberValue(value, 0);
}

export function PlayerSetupAnswersEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<SetupResponse>({ queryKey: ["/api/player-setup"] });
  const { data: careerData, isLoading: isCareerLoading } = useQuery<{ aspiration?: string | null } | null>({
    queryKey: ["/api/career"],
  });
  const [draft, setDraft] = useState<SetupAnswers | null>(null);

  useEffect(() => {
    if (!data || isCareerLoading) return;
    const answers = data.answers ?? {};
    setDraft({
      firstName: answers.firstName ?? user?.firstName ?? "",
      lastName: answers.lastName ?? user?.lastName ?? "",
      currentSituation: answers.currentSituation ?? SITUATIONS[0],
      skillRankings: makeUniqueRankings(answers.skillRankings),
      skillRoles: [],
      primaryGoal: answers.primaryGoal ?? GOALS[0],
      trainingDaysPerUnit: numberValue(answers.trainingDaysPerUnit, 3),
      trainingPeriodUnit: answers.trainingPeriodUnit === "month" ? "month" : "week",
      experienceYears: experienceValue(answers.experienceYears),
      competitiveExperienceYears: numberValue(answers.competitiveExperienceYears, 0),
      teamName: answers.teamName ?? "",
      teamRole: answers.teamRole ?? TEAM_ROLES[0],
      positions: Array.isArray(answers.positions) ? answers.positions.filter((position) =>
        BASKETBALL_POSITIONS.includes(position as (typeof BASKETBALL_POSITIONS)[number])
      ) : [],
      aspiration: careerData?.aspiration ?? "",
    });
  }, [data, careerData?.aspiration, isCareerLoading, user?.firstName, user?.lastName]);

  const saveMutation = useMutation({
    mutationFn: async (answers: SetupAnswers) => {
      const skillRoles = RANK_FIELDS.map(({ key }) => answers.skillRankings[key]);
      const { aspiration, ...setupAnswers } = answers;
      const response = await apiRequest("PUT", "/api/player-setup", {
        answers: { ...setupAnswers, skillRoles },
      });
      if (aspiration) await apiRequest("PUT", "/api/career", { aspiration });
      return response.json() as Promise<SetupResponse>;
    },
    onSuccess: async (response) => {
      if (response.answers) {
        queryClient.setQueryData<SetupResponse>(["/api/player-setup"], response);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/player-setup"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/career"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
      ]);
      toast({ title: "Player setup saved", description: "Your five-step setup answers are up to date." });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save player setup",
        description: error.message || "Please check your answers and try again.",
        variant: "destructive",
      });
    },
  });

  const update = <K extends keyof SetupAnswers>(key: K, value: SetupAnswers[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      toast({ title: "Add your name", description: "First and last name are required.", variant: "destructive" });
      return;
    }
    if (new Set(Object.values(draft.skillRankings)).size !== 4) {
      toast({ title: "Choose four different skills", description: "Each skill rank must be unique.", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(draft.trainingDaysPerUnit)) {
      toast({ title: "Check your training schedule", description: "Training days must be a whole number.", variant: "destructive" });
      return;
    }
    const maxDays = draft.trainingPeriodUnit === "week" ? 7 : 31;
    if (draft.trainingDaysPerUnit > maxDays) {
      toast({
        title: "Check your training schedule",
        description: `Training days cannot exceed ${maxDays} per ${draft.trainingPeriodUnit}.`,
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate({
      ...draft,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      teamName: draft.teamName.trim(),
      skillRoles: RANK_FIELDS.map(({ key }) => draft.skillRankings[key]),
    });
  };

  return (
    <Card className="mt-6 border-zinc-800 bg-zinc-950/70" data-testid="card-player-setup-answers">
      <CardHeader>
        <CardTitle>Player setup answers</CardTitle>
        <CardDescription>
          Edit the answers from your five-step setup, including ranked skills and the player pathway used on your Hub.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !draft ? (
          <div className="space-y-3" aria-label="Loading player setup answers">
            <div className="h-10 animate-pulse rounded-lg bg-zinc-900" />
            <div className="h-10 animate-pulse rounded-lg bg-zinc-900" />
            <div className="h-10 animate-pulse rounded-lg bg-zinc-900" />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input value={draft.firstName} onChange={(event) => update("firstName", event.target.value)} maxLength={80} required />
              </Field>
              <Field label="Last name">
                <Input value={draft.lastName} onChange={(event) => update("lastName", event.target.value)} maxLength={80} required />
              </Field>
              <Field label="Where are you in basketball?">
                <Select value={draft.currentSituation} onValueChange={(value) => update("currentSituation", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SITUATIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Main goal">
                <Select value={draft.primaryGoal} onValueChange={(value) => update("primaryGoal", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GOALS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-zinc-200">Rank your skills</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {RANK_FIELDS.map(({ key, label }) => (
                  <Field key={key} label={label}>
                    <Select
                      value={draft.skillRankings[key]}
                      onValueChange={(value) => update("skillRankings", { ...draft.skillRankings, [key]: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SKILLS.map((skill) => (
                          <SelectItem
                            key={skill}
                            value={skill}
                            disabled={Object.entries(draft.skillRankings).some(([otherKey, otherValue]) =>
                              otherKey !== key && otherValue === skill
                            )}
                          >
                            {skill}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-zinc-200">Positions</legend>
              <div className="flex flex-wrap gap-2">
                {BASKETBALL_POSITIONS.map((position) => {
                  const selected = draft.positions.includes(position);
                  return (
                    <button
                      key={position}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => update(
                        "positions",
                        selected
                          ? draft.positions.filter((item) => item !== position)
                          : [...draft.positions, position].slice(0, 5),
                      )}
                      className={`rounded-lg border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                        selected
                          ? "border-orange-400 bg-orange-500/15 text-orange-200"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"
                      }`}
                      data-testid={`button-setup-position-${position.toLowerCase()}`}
                    >
                      {position}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Training days per ${draft.trainingPeriodUnit}`}>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={draft.trainingPeriodUnit === "week" ? 7 : 31}
                    step={1}
                    value={draft.trainingDaysPerUnit}
                    onChange={(event) => update("trainingDaysPerUnit", Number(event.target.value))}
                  />
                  <Select value={draft.trainingPeriodUnit} onValueChange={(value: "week" | "month") => update("trainingPeriodUnit", value)}>
                    <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">per week</SelectItem>
                      <SelectItem value="month">per month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Field>
              <Field label="Current team role">
                <Select value={draft.teamRole} onValueChange={(value) => update("teamRole", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TEAM_ROLES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Basketball pathway">
                <Select value={draft.aspiration} onValueChange={(value) => update("aspiration", value)}>
                  <SelectTrigger><SelectValue placeholder="Choose a pathway" /></SelectTrigger>
                  <SelectContent>
                    {BASKETBALL_ASPIRATIONS.map((item) => (
                      <SelectItem key={item} value={item}>{ASPIRATION_LABELS[item]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Years playing basketball">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  value={String(draft.experienceYears)}
                  onChange={(event) => {
                    const value = event.target.value;
                    const numeric = Number(value);
                    update("experienceYears", value !== "" && Number.isFinite(numeric) ? numeric : value);
                  }}
                />
              </Field>
              <Field label="Years playing competitively">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.competitiveExperienceYears}
                  onChange={(event) => update("competitiveExperienceYears", Number(event.target.value))}
                />
              </Field>
              <Field label="Team name">
                <Input value={draft.teamName} onChange={(event) => update("teamName", event.target.value)} maxLength={120} />
              </Field>
            </div>

            <div className="flex justify-end border-t border-zinc-800 pt-4">
              <Button type="submit" disabled={saveMutation.isPending} className="bg-orange-500 font-bold text-black hover:bg-orange-400">
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save setup answers"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}