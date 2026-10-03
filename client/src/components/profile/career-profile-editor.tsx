import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BASKETBALL_ASPIRATIONS, BASKETBALL_POSITIONS, GRADE_LEVELS } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Star, UserRound } from "lucide-react";

type CareerForm = {
  jerseyNumber: number;
  positions: string[];
  gradeLevel: string;
  schoolName: string;
  teamName: string;
  aspiration: string;
  skillBallHandling: number;
  skillShooting: number;
  skillPassing: number;
  skillFinishing: number;
  skillDefense: number;
  skillBasketballIQ: number;
  skillAthletics: number;
  focusSkill: string;
};

const skillFields: Array<{ key: keyof CareerForm; label: string; focusValue: string }> = [
  { key: "skillBallHandling", label: "Ball Handling", focusValue: "ball-handling" },
  { key: "skillShooting", label: "Shooting", focusValue: "shooting" },
  { key: "skillPassing", label: "Passing", focusValue: "passing" },
  { key: "skillFinishing", label: "Finishing", focusValue: "finishing" },
  { key: "skillDefense", label: "Defense", focusValue: "defense" },
  { key: "skillBasketballIQ", label: "Basketball IQ", focusValue: "basketball-iq" },
  { key: "skillAthletics", label: "Athletics", focusValue: "athletics" },
];

const aspirationLabels: Record<string, string> = {
  recreational: "Recreational",
  "feeder-team": "Feeder team",
  aau: "AAU",
  "middle-school": "Middle school",
  "high-school": "High school",
  college: "College",
  "professional-non-nba": "Professional",
  nba: "NBA",
};

const gradeLabels: Record<string, string> = {
  elementary: "Elementary",
  "6th": "6th grade",
  "7th": "7th grade",
  "8th": "8th grade",
  freshman: "High school freshman",
  sophomore: "High school sophomore",
  junior: "High school junior",
  senior: "High school senior",
  "college-freshman": "College freshman",
  "college-sophomore": "College sophomore",
  "college-junior": "College junior",
  "college-senior": "College senior",
  "post-college": "Post-college",
};

const emptyForm: CareerForm = {
  jerseyNumber: 0,
  positions: [],
  gradeLevel: "",
  schoolName: "",
  teamName: "",
  aspiration: "",
  skillBallHandling: 5,
  skillShooting: 5,
  skillPassing: 5,
  skillFinishing: 5,
  skillDefense: 5,
  skillBasketballIQ: 5,
  skillAthletics: 5,
  focusSkill: "",
};

function SelectField({
  id,
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

export function CareerProfileEditor() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<any>({ queryKey: ["/api/career"] });
  const [form, setForm] = useState<CareerForm>(emptyForm);

  useEffect(() => {
    if (!profile) return;
    setForm({
      jerseyNumber: profile.jerseyNumber ?? 0,
      positions: profile.positions ?? [],
      gradeLevel: profile.gradeLevel ?? "",
      schoolName: profile.schoolName ?? "",
      teamName: profile.teamName ?? "",
      aspiration: profile.aspiration ?? "",
      skillBallHandling: profile.skillBallHandling ?? 5,
      skillShooting: profile.skillShooting ?? 5,
      skillPassing: profile.skillPassing ?? 5,
      skillFinishing: profile.skillFinishing ?? 5,
      skillDefense: profile.skillDefense ?? 5,
      skillBasketballIQ: profile.skillBasketballIQ ?? 5,
      skillAthletics: profile.skillAthletics ?? 5,
      focusSkill: profile.focusSkill ?? "",
    });
  }, [profile]);

  const updateCareer = useMutation({
    mutationFn: async () => apiRequest("PUT", "/api/career", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/career"] });
      toast({ title: "Player profile saved", description: "Your player information and skill ratings were updated." });
    },
    onError: () => toast({
      title: "Could not save profile",
      description: "Please check your changes and try again.",
      variant: "destructive",
    }),
  });

  const togglePosition = (position: string) => {
    setForm((current) => ({
      ...current,
      positions: current.positions.includes(position)
        ? current.positions.filter((item) => item !== position)
        : [...current.positions, position],
    }));
  };

  const setField = <K extends keyof CareerForm>(key: K, value: CareerForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  if (isLoading) {
    return <Card className="border-zinc-800 bg-zinc-900/60"><CardContent className="p-6 text-sm text-zinc-400">Loading player details…</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-zinc-800/70 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4 text-orange-400" />Player Info</CardTitle>
          <CardDescription>Keep your playing details and development goal up to date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="career-jersey-number">Jersey number</Label>
              <Input id="career-jersey-number" type="number" min={0} max={99} value={form.jerseyNumber} onChange={(event) => setField("jerseyNumber", Number(event.target.value) || 0)} />
            </div>
            <SelectField
              id="career-grade"
              label="Grade level"
              value={form.gradeLevel}
              onChange={(value) => setField("gradeLevel", value)}
              placeholder="Select grade"
              options={GRADE_LEVELS.map((value) => ({ value, label: gradeLabels[value] || value }))}
            />
            <div className="space-y-2">
              <Label htmlFor="career-school">School</Label>
              <Input id="career-school" value={form.schoolName} onChange={(event) => setField("schoolName", event.target.value)} placeholder="School name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="career-team">Team</Label>
              <Input id="career-team" value={form.teamName} onChange={(event) => setField("teamName", event.target.value)} placeholder="Team name" />
            </div>
            <div className="sm:col-span-2">
              <SelectField
                id="career-aspiration"
                label="Basketball goal"
                value={form.aspiration}
                onChange={(value) => setField("aspiration", value)}
                placeholder="Select your goal"
                options={BASKETBALL_ASPIRATIONS.map((value) => ({ value, label: aspirationLabels[value] || value }))}
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Position(s)</legend>
            <div className="flex flex-wrap gap-2">
              {BASKETBALL_POSITIONS.map((position) => {
                const selected = form.positions.includes(position);
                return (
                  <button
                    key={position}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => togglePosition(position)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? "border-orange-400 bg-orange-500/15 text-orange-200"
                        : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {position}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card className="border-zinc-800/70 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4 text-orange-400" />Skill Ratings</CardTitle>
          <CardDescription>Rate each skill from 1 to 10 and choose your current focus.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {skillFields.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor={`career-${key}`}>{label}</Label>
                  <span className="text-sm font-semibold tabular-nums text-orange-300">{form[key]}</span>
                </div>
                <Input
                  id={`career-${key}`}
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={form[key]}
                  onChange={(event) => setField(key, Number(event.target.value))}
                  className="accent-orange-500"
                />
              </div>
            ))}
          </div>
          <SelectField
            id="career-focus-skill"
            label="Current focus"
            value={form.focusSkill}
            onChange={(value) => setField("focusSkill", value)}
            placeholder="Select a focus skill"
            options={skillFields.map(({ focusValue, label }) => ({ value: focusValue, label }))}
          />
          <div className="flex justify-end border-t border-zinc-800 pt-4">
            <Button type="button" onClick={() => updateCareer.mutate()} disabled={updateCareer.isPending} className="gap-2 bg-orange-500 font-bold text-black hover:bg-orange-400">
              {updateCareer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {updateCareer.isPending ? "Saving…" : "Save player details"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}