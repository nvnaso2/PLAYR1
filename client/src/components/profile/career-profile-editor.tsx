import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BASKETBALL_ASPIRATIONS, BASKETBALL_POSITIONS, GRADE_LEVELS } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, UserRound } from "lucide-react";

type CareerForm = {
  jerseyNumber: number;
  positions: string[];
  gradeLevel: string;
  teamName: string;
  aspiration: string;
  headline: string;
  bio: string;
};

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
  teamName: "",
  aspiration: "",
  headline: "",
  bio: "",
};

function makeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "player";
}

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
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery<any>({ queryKey: ["/api/career"] });
  const { data: playerProfile, isLoading: isPlayerProfileLoading } = useQuery<any>({ queryKey: ["/api/player-profile"] });
  const [form, setForm] = useState<CareerForm>(emptyForm);

  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
      ...current,
      jerseyNumber: profile.jerseyNumber ?? 0,
      positions: profile.positions ?? [],
      gradeLevel: profile.gradeLevel ?? "",
      teamName: profile.teamName ?? "",
      aspiration: profile.aspiration ?? "",
    }));
  }, [profile]);

  useEffect(() => {
    if (!playerProfile) return;
    setForm((current) => ({
      ...current,
      headline: playerProfile.headline ?? "",
      bio: playerProfile.bio ?? "",
    }));
  }, [playerProfile]);

  const updateCareer = useMutation({
    mutationFn: async () => {
      const { headline, bio, ...careerFields } = form;
      await apiRequest("PUT", "/api/career", careerFields);

      const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
        || user?.email?.split("@")[0]
        || "player";
      const slug = playerProfile?.slug
        || `${makeSlug(displayName)}${user?.id ? `-${user.id.slice(-5)}` : ""}`;

      await apiRequest("PUT", "/api/player-profile", {
        slug,
        headline: headline || null,
        bio: bio || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/career"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player-profile"] });
      toast({ title: "Player details saved", description: "Your player information and About section were updated." });
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

  if (isLoading || isPlayerProfileLoading) {
    return <Card className="border-zinc-800 bg-zinc-900/60"><CardContent className="p-6 text-sm text-zinc-400">Loading player details…</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-zinc-800/70 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4 text-orange-400" />Player Info</CardTitle>
          <CardDescription>Basketball details and a short introduction.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Position(s)</legend>
            <div className="flex flex-wrap gap-1.5">
              {BASKETBALL_POSITIONS.map((position) => {
                const selected = form.positions.includes(position);
                return (
                  <button
                    key={position}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => togglePosition(position)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
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

          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">About</p>
            <div className="space-y-1.5">
              <Label htmlFor="career-headline">Headline</Label>
              <Input
                id="career-headline"
                maxLength={120}
                value={form.headline}
                onChange={(event) => setField("headline", event.target.value)}
                placeholder="A quick introduction"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="career-bio">Bio</Label>
              <Textarea
                id="career-bio"
                maxLength={1000}
                rows={3}
                className="min-h-[76px] resize-y"
                value={form.bio}
                onChange={(event) => setField("bio", event.target.value)}
                placeholder="A few lines about your game and goals"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-zinc-800 pt-3">
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