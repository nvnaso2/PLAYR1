import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Target, 
  Trophy, 
  Zap, 
  Star, 
  ChevronRight, 
  ChevronLeft,
  GraduationCap,
  Users,
  School,
  Hash,
  Calendar,
  Crosshair,
  Flame,
  Award,
  Dumbbell,
  Pencil,
  Save,
  Plus,
  Medal,
  BarChart3,
  Trash2,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import type { CareerProfile, UserAchievement, CareerAchievement, Challenge, UserChallenge, PersonalRecord, TeamAward, Season, Game } from "@shared/schema";
import defaultPlayerImg from "@assets/default-player.jpg";
import { 
  BASKETBALL_POSITIONS, 
  BASKETBALL_ASPIRATIONS, 
  GRADE_LEVELS,
  DRILL_CATEGORIES,
  SEASON_TYPES
} from "@shared/schema";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
];

const ASPIRATION_LABELS: Record<string, string> = {
  "recreational": "Just for Fun",
  "feeder-team": "Feeder Team",
  "aau": "Play AAU",
  "middle-school": "Play for Middle School",
  "high-school": "Play for High School",
  "college": "Play in College",
  "professional-non-nba": "Play Professionally (non-NBA)",
  "nba": "Play in the NBA"
};

const GRADE_LABELS: Record<string, string> = {
  "elementary": "Elementary School",
  "6th": "6th Grade",
  "7th": "7th Grade",
  "8th": "8th Grade",
  "freshman": "High School Freshman",
  "sophomore": "High School Sophomore",
  "junior": "High School Junior",
  "senior": "High School Senior",
  "college-freshman": "College Freshman",
  "college-sophomore": "College Sophomore",
  "college-junior": "College Junior",
  "college-senior": "College Senior",
  "post-college": "Post-College"
};

const SKILL_LABELS: Record<string, { label: string; icon: any }> = {
  "ball-handling": { label: "Ball Handling", icon: Zap },
  "shooting": { label: "Shooting", icon: Target },
  "passing": { label: "Passing", icon: Users },
  "finishing": { label: "Finishing", icon: Flame },
  "defense": { label: "Defense", icon: Crosshair },
  "basketball-iq": { label: "Basketball IQ", icon: GraduationCap },
  "athletics": { label: "Athletics", icon: Dumbbell }
};

const POSITION_LABELS: Record<string, string> = {
  "PG": "Point Guard",
  "SG": "Shooting Guard",
  "SF": "Small Forward",
  "PF": "Power Forward",
  "C": "Center"
};

const SEASON_TYPE_LABELS: Record<string, string> = {
  "middle-school": "Middle School",
  "high-school": "High School",
  "aau-travel-club": "AAU / Travel / Club",
  "recreational": "Recreational"
};

const onboardingSchema = z.object({
  birthMonth: z.coerce.number().min(1).max(12).optional(),
  birthYear: z.coerce.number().min(1990).max(2025).optional(),
  gradeLevel: z.string().optional(),
  teamName: z.string().optional(),
  schoolName: z.string().optional(),
  positions: z.array(z.string()).default([]),
  jerseyNumber: z.coerce.number().min(0).max(99).optional(),
  aspiration: z.string().optional(),
  focusSkill: z.string().optional(),
  skillBallHandling: z.coerce.number().min(1).max(10).default(5),
  skillShooting: z.coerce.number().min(1).max(10).default(5),
  skillPassing: z.coerce.number().min(1).max(10).default(5),
  skillFinishing: z.coerce.number().min(1).max(10).default(5),
  skillDefense: z.coerce.number().min(1).max(10).default(5),
  skillBasketballIQ: z.coerce.number().min(1).max(10).default(5),
  skillAthletics: z.coerce.number().min(1).max(10).default(5),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const seasonSchema = z.object({
  name: z.string().min(1, "Season name is required"),
  teamName: z.string().optional(),
  seasonType: z.string().min(1, "Season type is required"),
  year: z.string().min(1, "Year is required")
});

type SeasonFormData = z.infer<typeof seasonSchema>;

const gameSchema = z.object({
  gameDate: z.string().min(1, "Game date is required"),
  opponent: z.string().optional(),
  isHome: z.boolean().default(true),
  result: z.string().optional(),
  teamScore: z.coerce.number().optional(),
  opponentScore: z.coerce.number().optional(),
  points: z.coerce.number().min(0).default(0),
  rebounds: z.coerce.number().min(0).default(0),
  assists: z.coerce.number().min(0).default(0),
  steals: z.coerce.number().min(0).default(0),
  blocks: z.coerce.number().min(0).default(0),
  turnovers: z.coerce.number().min(0).default(0),
  fouls: z.coerce.number().min(0).max(5).default(0),
  fgMade: z.coerce.number().min(0).default(0),
  fgAttempted: z.coerce.number().min(0).default(0),
  threePtMade: z.coerce.number().min(0).default(0),
  threePtAttempted: z.coerce.number().min(0).default(0),
  ftMade: z.coerce.number().min(0).default(0),
  ftAttempted: z.coerce.number().min(0).default(0),
  offensiveRebounds: z.coerce.number().min(0).default(0),
  defensiveRebounds: z.coerce.number().min(0).default(0),
  minutesPlayed: z.coerce.number().min(0).default(0),
  notes: z.string().optional()
});

type GameFormData = z.infer<typeof gameSchema>;

const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome", icon: User },
  { id: "birthdate", title: "Birth Date", icon: Calendar },
  { id: "school", title: "School & Team", icon: School },
  { id: "player", title: "Player Info", icon: Hash },
  { id: "goals", title: "Goals", icon: Target },
  { id: "skills", title: "Rate Your Skills", icon: Star },
  { id: "focus", title: "Focus Area", icon: Crosshair },
  { id: "complete", title: "Ready!", icon: Trophy }
];

function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  
  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      birthMonth: undefined,
      birthYear: undefined,
      gradeLevel: "",
      teamName: "",
      schoolName: "",
      positions: [],
      jerseyNumber: undefined,
      aspiration: "",
      focusSkill: "",
      skillBallHandling: 5,
      skillShooting: 5,
      skillPassing: 5,
      skillFinishing: 5,
      skillDefense: 5,
      skillBasketballIQ: 5,
      skillAthletics: 5,
    }
  });

  const createCareerMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const response = await apiRequest("POST", "/api/career", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
    }
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/career/complete-onboarding");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
      toast({ title: "Welcome to My Career!", description: "Your basketball journey begins now." });
      onComplete();
    }
  });

  const nextStep = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    
    if (step === ONBOARDING_STEPS.length - 2) {
      const data = form.getValues();
      try {
        await createCareerMutation.mutateAsync(data);
        setStep(step + 1);
      } catch (error) {
        toast({ title: "Error saving profile", variant: "destructive" });
      }
      return;
    }
    
    if (step === ONBOARDING_STEPS.length - 1) {
      await completeOnboardingMutation.mutateAsync();
      return;
    }
    
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const progress = ((step + 1) / ONBOARDING_STEPS.length) * 100;
  const currentStep = ONBOARDING_STEPS[step];
  const StepIcon = currentStep.icon;

  const togglePosition = (position: string) => {
    const current = form.getValues("positions");
    if (current.includes(position)) {
      form.setValue("positions", current.filter(p => p !== position));
    } else {
      form.setValue("positions", [...current, position]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <StepIcon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{currentStep.title}</CardTitle>
          <Progress value={progress} className="mt-4" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {step + 1} of {ONBOARDING_STEPS.length}
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form className="space-y-6">
              {step === 0 && (
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold">Welcome to My Career Mode</h3>
                  <p className="text-muted-foreground">
                    Track your basketball development like the pros. Build your player profile, 
                    set goals, and watch yourself level up as you train with Handlz.
                  </p>
                  <div className="flex justify-center gap-4 py-6">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Trophy className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">Earn Achievements</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Zap className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">Level Up</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Target className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">Track Progress</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground mb-6">
                    When were you born? This helps us compare you with players your age.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="birthMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <Select 
                            onValueChange={(v) => field.onChange(parseInt(v))} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-birth-month">
                                <SelectValue placeholder="Select month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MONTHS.map(m => (
                                <SelectItem key={m.value} value={m.value.toString()}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <Select 
                            onValueChange={(v) => field.onChange(parseInt(v))} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-birth-year">
                                <SelectValue placeholder="Select year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 36 }, (_, i) => 2025 - i).map(year => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="gradeLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Grade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-grade">
                              <SelectValue placeholder="What grade are you in?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GRADE_LEVELS.map(grade => (
                              <SelectItem key={grade} value={grade}>
                                {GRADE_LABELS[grade] || grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground mb-6">
                    Tell us about your team and school.
                  </p>
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Lincoln High School" 
                            {...field} 
                            data-testid="input-school-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="teamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Lincoln Lions, AAU Elite" 
                            {...field} 
                            data-testid="input-team-name"
                          />
                        </FormControl>
                        <FormDescription>
                          Your school team, AAU team, or rec league team
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <p className="text-center text-muted-foreground mb-4">
                    What position(s) do you play?
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {BASKETBALL_POSITIONS.map(pos => {
                      const isSelected = form.watch("positions").includes(pos);
                      return (
                        <div
                          key={pos}
                          onClick={() => togglePosition(pos)}
                          className={`cursor-pointer p-4 rounded-md border text-center hover-elevate ${
                            isSelected ? 'bg-primary text-primary-foreground border-primary' : ''
                          }`}
                          data-testid={`position-${pos}`}
                        >
                          <div className="font-bold text-lg">{pos}</div>
                          <div className="text-xs opacity-80">{POSITION_LABELS[pos]?.split(' ')[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                  <FormField
                    control={form.control}
                    name="jerseyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jersey Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            max={99}
                            placeholder="00"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            data-testid="input-jersey-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground mb-6">
                    What do you aspire to achieve in basketball?
                  </p>
                  <FormField
                    control={form.control}
                    name="aspiration"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid grid-cols-2 gap-3">
                          {BASKETBALL_ASPIRATIONS.map(asp => {
                            const isSelected = field.value === asp;
                            return (
                              <div
                                key={asp}
                                onClick={() => field.onChange(asp)}
                                className={`cursor-pointer p-4 rounded-md border text-center hover-elevate ${
                                  isSelected ? 'bg-primary text-primary-foreground border-primary' : ''
                                }`}
                                data-testid={`aspiration-${asp}`}
                              >
                                <div className="font-medium">{ASPIRATION_LABELS[asp]}</div>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <p className="text-center text-muted-foreground mb-4">
                    Rate your current skills (1-10) compared to others your age.
                  </p>
                  {[
                    { name: "skillBallHandling" as const, label: "Ball Handling" },
                    { name: "skillShooting" as const, label: "Shooting" },
                    { name: "skillPassing" as const, label: "Passing" },
                    { name: "skillFinishing" as const, label: "Finishing" },
                    { name: "skillDefense" as const, label: "Defense" },
                    { name: "skillBasketballIQ" as const, label: "Basketball IQ" },
                    { name: "skillAthletics" as const, label: "Athletics" }
                  ].map(skill => (
                    <FormField
                      key={skill.name}
                      control={form.control}
                      name={skill.name}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>{skill.label}</FormLabel>
                            <Badge variant="secondary">{field.value}/10</Badge>
                          </div>
                          <FormControl>
                            <Slider
                              min={1}
                              max={10}
                              step={1}
                              value={[field.value]}
                              onValueChange={(v) => field.onChange(v[0])}
                              data-testid={`slider-${skill.name}`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground mb-6">
                    Which skill do you want to focus on improving the most?
                  </p>
                  <FormField
                    control={form.control}
                    name="focusSkill"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid grid-cols-2 gap-3">
                          {DRILL_CATEGORIES.filter(cat => cat !== "film-session" && cat !== "workouts").map(cat => {
                            const isSelected = field.value === cat;
                            const skillInfo = SKILL_LABELS[cat] || { label: cat, icon: Star };
                            const Icon = skillInfo.icon;
                            return (
                              <div
                                key={cat}
                                onClick={() => field.onChange(cat)}
                                className={`cursor-pointer p-4 rounded-md border flex items-center gap-3 hover-elevate ${
                                  isSelected ? 'bg-primary text-primary-foreground border-primary' : ''
                                }`}
                                data-testid={`focus-${cat}`}
                              >
                                <Icon className="w-5 h-5" />
                                <div className="font-medium">
                                  {skillInfo.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 7 && (
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold">You're All Set!</h3>
                    <p className="text-muted-foreground mt-2">
                      Your career starts at Level 1. Complete drills, earn XP, and unlock achievements 
                      as you develop your skills. Let's get to work!
                    </p>
                  </div>
                  <div className="flex justify-center gap-8 py-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">1</div>
                      <div className="text-sm text-muted-foreground">Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">XP</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Achievements</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={step === 0}
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={createCareerMutation.isPending || completeOnboardingMutation.isPending}
                  data-testid="button-next-step"
                >
                  {step === ONBOARDING_STEPS.length - 1 ? (
                    <>
                      Start My Career
                      <Trophy className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function BaseballCard({ profile, careerStats }: { profile: CareerProfile; careerStats?: CareerStats }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const seasonBreakdown = careerStats?.seasonBreakdown || [];
  const cardW = 260;
  const cardH = 380;

  return (
    <div
      className="cursor-pointer select-none"
      style={{ perspective: "1200px", width: isFlipped ? cardH : cardW, height: isFlipped ? cardW : cardH, transition: "width 0.6s ease, height 0.6s ease" }}
      onClick={() => setIsFlipped(!isFlipped)}
      data-testid="baseball-card"
    >
      <div
        className="relative transition-all duration-600"
        style={{
          width: cardW,
          height: cardH,
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.6s ease",
        }}
      >
        {/* FRONT - Vertical (portrait) */}
        <div
          className="absolute rounded-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            width: cardW,
            height: cardH,
            border: "2px solid rgba(255,255,255,0.7)",
          }}
        >
          <div className="relative w-full h-full bg-black flex flex-col">
            <div className="absolute top-3 left-3 z-20 w-8 h-8 rounded-md bg-orange-500 flex items-center justify-center">
              <span className="text-white font-black text-xs tracking-tight">H</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <img
                src={defaultPlayerImg}
                alt="Player"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
              <p className="text-white font-bold text-lg uppercase tracking-wide leading-tight">
                {profile.schoolName || profile.teamName || "Player"}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-orange-400 text-xs uppercase tracking-wider font-medium">
                  {profile.positions?.join(" / ") || "Basketball"}
                  {profile.jerseyNumber != null ? ` #${profile.jerseyNumber}` : ""}
                </p>
                <span className="text-white/50 text-xs font-bold">
                  '{new Date().getFullYear().toString().slice(-2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK - Horizontal (landscape), rotated via CSS */}
        <div
          className="absolute rounded-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            width: cardH,
            height: cardW,
            top: (cardH - cardW) / 2,
            left: -(cardH - cardW) / 2,
            border: "2px solid rgba(255,255,255,0.7)",
          }}
        >
          <div className="w-full h-full flex flex-col bg-black text-white">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-orange-500/40">
              <div className="w-7 h-7 rounded-md bg-orange-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-[10px]">H</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm uppercase tracking-wide leading-tight truncate">
                  {profile.schoolName || profile.teamName || "Player"}
                </p>
                <p className="text-orange-400 text-[10px] uppercase tracking-wider">
                  {profile.positions?.join(" / ") || "Basketball"}
                  {profile.jerseyNumber != null ? ` #${profile.jerseyNumber}` : ""}
                </p>
              </div>
              <span className="text-white/40 text-[10px] font-medium">Tap to flip</span>
            </div>

            {/* Stats body */}
            <div className="flex-1 overflow-auto px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-orange-400 mb-1.5">
                Season Averages
              </p>

              {seasonBreakdown.length > 0 ? (
                <div>
                  <div className="grid grid-cols-8 gap-1 text-[9px] font-bold uppercase text-white/50 border-b border-white/10 pb-1 mb-1">
                    <span className="col-span-2">Season</span>
                    <span className="text-center">GP</span>
                    <span className="text-center">PPG</span>
                    <span className="text-center">RPG</span>
                    <span className="text-center">APG</span>
                    <span className="text-center">SPG</span>
                    <span className="text-center">BPG</span>
                  </div>

                  {seasonBreakdown.map((s, i) => (
                    <div key={i} className="grid grid-cols-8 gap-1 text-[10px] py-0.5 border-b border-white/5 last:border-0">
                      <span className="col-span-2 font-medium truncate text-white/80" title={s.seasonName}>
                        {SEASON_TYPE_LABELS[s.seasonType] ? SEASON_TYPE_LABELS[s.seasonType].split(" ")[0] : s.seasonType} '{s.year?.slice(-2) || ""}
                      </span>
                      <span className="text-center text-white/70">{s.gamesPlayed}</span>
                      <span className="text-center font-semibold text-orange-400">{s.avgPoints?.toFixed(1)}</span>
                      <span className="text-center text-white/70">{s.avgRebounds?.toFixed(1)}</span>
                      <span className="text-center text-white/70">{s.avgAssists?.toFixed(1)}</span>
                      <span className="text-center text-white/70">{s.avgSteals?.toFixed(1)}</span>
                      <span className="text-center text-white/70">{s.avgBlocks?.toFixed(1)}</span>
                    </div>
                  ))}

                  {careerStats && careerStats.totalGames > 0 && (
                    <div className="grid grid-cols-8 gap-1 text-[10px] py-1 mt-1 border-t border-orange-500/30 font-bold">
                      <span className="col-span-2 text-orange-400">CAREER</span>
                      <span className="text-center">{careerStats.totalGames}</span>
                      <span className="text-center text-orange-400">{careerStats.avgPoints?.toFixed(1)}</span>
                      <span className="text-center">{careerStats.avgRebounds?.toFixed(1)}</span>
                      <span className="text-center">{careerStats.avgAssists?.toFixed(1)}</span>
                      <span className="text-center">{careerStats.avgSteals?.toFixed(1)}</span>
                      <span className="text-center">{careerStats.avgBlocks?.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <BarChart3 className="w-6 h-6 text-white/20 mb-2" />
                  <p className="text-xs text-white/50">No seasons yet</p>
                  <p className="text-[10px] text-white/30 mt-1">
                    Add seasons in the Stats tab
                  </p>
                </div>
              )}

              {careerStats && careerStats.totalGames > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-orange-400 mb-1">
                    Career Totals
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="text-center">
                      <p className="text-base font-bold text-orange-400">{careerStats.totalPoints}</p>
                      <p className="text-[8px] text-white/40 uppercase">PTS</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold">{careerStats.totalRebounds}</p>
                      <p className="text-[8px] text-white/40 uppercase">REB</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold">{careerStats.totalAssists}</p>
                      <p className="text-[8px] text-white/40 uppercase">AST</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold">{careerStats.totalSteals}</p>
                      <p className="text-[8px] text-white/40 uppercase">STL</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold">{careerStats.totalBlocks}</p>
                      <p className="text-[8px] text-white/40 uppercase">BLK</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-1 border-t border-white/10 flex items-center justify-between">
              <span className="text-[9px] text-orange-400/60 uppercase tracking-widest font-bold">Handlz Training</span>
              <span className="text-[9px] text-white/30">'{new Date().getFullYear().toString().slice(-2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type UserStats = {
  totalSessions: number;
  totalMinutes: number;
  avgScore: number;
  streak: number;
};

type CareerStats = {
  totalGames: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  seasonBreakdown: Array<{
    seasonId: string;
    seasonName: string;
    seasonType: string;
    year: string;
    gamesPlayed: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgSteals: number;
    avgBlocks: number;
  }>;
};

function StatsTab() {
  const { toast } = useToast();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [showSeasonDialog, setShowSeasonDialog] = useState(false);
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  const { data: seasons = [], isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ['/api/seasons']
  });

  const { data: careerStats } = useQuery<CareerStats>({
    queryKey: ['/api/career-stats']
  });

  const { data: seasonGames, refetch: refetchSeasonGames } = useQuery<Game[]>({
    queryKey: [`/api/seasons/${selectedSeasonId}/games`],
    enabled: !!selectedSeasonId
  });

  const seasonForm = useForm<SeasonFormData>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      name: "",
      teamName: "",
      seasonType: "",
      year: new Date().getFullYear().toString()
    }
  });

  const gameForm = useForm<GameFormData>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      gameDate: new Date().toISOString().split('T')[0],
      isHome: true,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      fgMade: 0,
      fgAttempted: 0,
      threePtMade: 0,
      threePtAttempted: 0,
      ftMade: 0,
      ftAttempted: 0,
      offensiveRebounds: 0,
      defensiveRebounds: 0,
      minutesPlayed: 0
    }
  });

  const createSeasonMutation = useMutation({
    mutationFn: async (data: SeasonFormData) => {
      return apiRequest("POST", '/api/seasons', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/career-stats'] });
      setShowSeasonDialog(false);
      seasonForm.reset();
      toast({ title: "Season created successfully!" });
    }
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/seasons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/career-stats'] });
      if (selectedSeasonId === deleteSeasonMutation.variables) {
        setSelectedSeasonId(null);
      }
      toast({ title: "Season deleted" });
    }
  });

  const createGameMutation = useMutation({
    mutationFn: async (data: GameFormData & { seasonId: string }) => {
      const { seasonId, ...gameData } = data;
      return apiRequest("POST", `/api/seasons/${seasonId}/games`, gameData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${selectedSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ['/api/career-stats'] });
      setShowGameDialog(false);
      setEditingGame(null);
      gameForm.reset();
      toast({ title: "Game logged successfully!" });
    }
  });

  const updateGameMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GameFormData }) => {
      return apiRequest("PUT", `/api/games/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${selectedSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ['/api/career-stats'] });
      setShowGameDialog(false);
      setEditingGame(null);
      gameForm.reset();
      toast({ title: "Game updated successfully!" });
    }
  });

  const deleteGameMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/games/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${selectedSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ['/api/career-stats'] });
      toast({ title: "Game deleted" });
    }
  });

  const handleCreateSeason = (data: SeasonFormData) => {
    createSeasonMutation.mutate(data);
  };

  const handleCreateGame = (data: GameFormData) => {
    if (!selectedSeasonId) return;
    if (editingGame) {
      updateGameMutation.mutate({ id: editingGame.id, data });
    } else {
      createGameMutation.mutate({ ...data, seasonId: selectedSeasonId });
    }
  };

  const openGameDialog = (game?: Game) => {
    if (game) {
      setEditingGame(game);
      gameForm.reset({
        gameDate: game.gameDate ? new Date(game.gameDate).toISOString().split('T')[0] : "",
        opponent: game.opponent || "",
        isHome: game.isHome ?? true,
        result: game.result || "",
        teamScore: game.teamScore || 0,
        opponentScore: game.opponentScore || 0,
        points: game.points || 0,
        rebounds: game.rebounds || 0,
        assists: game.assists || 0,
        steals: game.steals || 0,
        blocks: game.blocks || 0,
        turnovers: game.turnovers || 0,
        fouls: game.fouls || 0,
        fgMade: game.fgMade || 0,
        fgAttempted: game.fgAttempted || 0,
        threePtMade: game.threePtMade || 0,
        threePtAttempted: game.threePtAttempted || 0,
        ftMade: game.ftMade || 0,
        ftAttempted: game.ftAttempted || 0,
        offensiveRebounds: game.offensiveRebounds || 0,
        defensiveRebounds: game.defensiveRebounds || 0,
        minutesPlayed: game.minutesPlayed || 0,
        notes: game.notes || ""
      });
    } else {
      setEditingGame(null);
      gameForm.reset();
    }
    setShowGameDialog(true);
  };

  const toggleSeasonExpand = (seasonId: string) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonId)) {
      newExpanded.delete(seasonId);
    } else {
      newExpanded.add(seasonId);
    }
    setExpandedSeasons(newExpanded);
    setSelectedSeasonId(seasonId);
  };

  if (seasonsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {careerStats && careerStats.totalGames > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Career Totals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold">{careerStats.avgPoints}</p>
                <p className="text-sm text-muted-foreground">PPG</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold">{careerStats.avgRebounds}</p>
                <p className="text-sm text-muted-foreground">RPG</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold">{careerStats.avgAssists}</p>
                <p className="text-sm text-muted-foreground">APG</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold">{careerStats.avgSteals}</p>
                <p className="text-sm text-muted-foreground">SPG</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold">{careerStats.avgBlocks}</p>
                <p className="text-sm text-muted-foreground">BPG</p>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {careerStats.totalGames} career games | {careerStats.totalPoints} total points
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Seasons
          </CardTitle>
          <Dialog open={showSeasonDialog} onOpenChange={setShowSeasonDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-season">
                <Plus className="w-4 h-4 mr-1" />
                Add Season
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Season</DialogTitle>
                <DialogDescription>
                  Add a new season to track your game statistics
                </DialogDescription>
              </DialogHeader>
              <Form {...seasonForm}>
                <form onSubmit={seasonForm.handleSubmit(handleCreateSeason)} className="space-y-4">
                  <FormField
                    control={seasonForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Season Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Freshman Season" {...field} data-testid="input-season-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={seasonForm.control}
                    name="seasonType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Season Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-season-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEASON_TYPES.map(type => (
                              <SelectItem key={type} value={type}>
                                {SEASON_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={seasonForm.control}
                    name="teamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Eagles" {...field} data-testid="input-team-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={seasonForm.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2024-25" {...field} data-testid="input-season-year" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createSeasonMutation.isPending}
                    data-testid="button-submit-season"
                  >
                    {createSeasonMutation.isPending ? "Creating..." : "Create Season"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {seasons.length === 0 ? (
            <div className="text-center p-8">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No seasons yet. Create your first season to start tracking game stats!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {seasons.map((season) => {
                const isExpanded = expandedSeasons.has(season.id);
                const seasonStats = careerStats?.seasonBreakdown.find(s => s.seasonId === season.id);
                
                return (
                  <div key={season.id} className="border rounded-lg" data-testid={`season-item-${season.id}`}>
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover-elevate"
                      onClick={() => toggleSeasonExpand(season.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <School className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{season.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {SEASON_TYPE_LABELS[season.seasonType]}
                            </Badge>
                            <span>{season.year}</span>
                            {season.teamName && <span>• {season.teamName}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {seasonStats && (
                          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{seasonStats.gamesPlayed} GP</span>
                            <span>{seasonStats.avgPoints} PPG</span>
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this season and all its games?')) {
                              deleteSeasonMutation.mutate(season.id);
                            }
                          }}
                          data-testid={`button-delete-season-${season.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t p-4 space-y-4">
                        {seasonStats && (
                          <div className="grid grid-cols-5 gap-2 text-center">
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-lg font-semibold">{seasonStats.avgPoints}</p>
                              <p className="text-xs text-muted-foreground">PPG</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-lg font-semibold">{seasonStats.avgRebounds}</p>
                              <p className="text-xs text-muted-foreground">RPG</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-lg font-semibold">{seasonStats.avgAssists}</p>
                              <p className="text-xs text-muted-foreground">APG</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-lg font-semibold">{seasonStats.avgSteals}</p>
                              <p className="text-xs text-muted-foreground">SPG</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-lg font-semibold">{seasonStats.avgBlocks}</p>
                              <p className="text-xs text-muted-foreground">BPG</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Game Log</h4>
                          <Button 
                            size="sm" 
                            onClick={() => openGameDialog()}
                            data-testid="button-add-game"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Log Game
                          </Button>
                        </div>

                        {selectedSeasonId === season.id && seasonGames && seasonGames.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-2">Date</th>
                                  <th className="text-left py-2 px-2">Opponent</th>
                                  <th className="text-center py-2 px-2">Result</th>
                                  <th className="text-center py-2 px-2">PTS</th>
                                  <th className="text-center py-2 px-2">REB</th>
                                  <th className="text-center py-2 px-2">AST</th>
                                  <th className="text-center py-2 px-2">STL</th>
                                  <th className="text-center py-2 px-2">BLK</th>
                                  <th className="text-center py-2 px-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {seasonGames.map((game) => (
                                  <tr key={game.id} className="border-b hover:bg-muted/30" data-testid={`game-row-${game.id}`}>
                                    <td className="py-2 px-2">
                                      {game.gameDate ? new Date(new Date(game.gameDate).toISOString().split('T')[0] + 'T12:00:00').toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-2 px-2">
                                      {game.isHome ? 'vs' : '@'} {game.opponent || 'TBD'}
                                    </td>
                                    <td className="text-center py-2 px-2">
                                      {game.result && (
                                        <Badge variant={game.result === 'W' ? 'default' : 'secondary'}>
                                          {game.result} {game.teamScore}-{game.opponentScore}
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="text-center py-2 px-2 font-medium">{game.points}</td>
                                    <td className="text-center py-2 px-2">{game.rebounds}</td>
                                    <td className="text-center py-2 px-2">{game.assists}</td>
                                    <td className="text-center py-2 px-2">{game.steals}</td>
                                    <td className="text-center py-2 px-2">{game.blocks}</td>
                                    <td className="text-center py-2 px-2">
                                      <div className="flex items-center justify-center gap-1">
                                        <Button 
                                          size="icon" 
                                          variant="ghost"
                                          onClick={() => openGameDialog(game)}
                                          data-testid={`button-edit-game-${game.id}`}
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                          size="icon" 
                                          variant="ghost"
                                          onClick={() => {
                                            if (confirm('Delete this game?')) {
                                              deleteGameMutation.mutate(game.id);
                                            }
                                          }}
                                          data-testid={`button-delete-game-${game.id}`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : selectedSeasonId === season.id ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No games logged yet. Add your first game!
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showGameDialog} onOpenChange={(open) => {
        setShowGameDialog(open);
        if (!open) {
          setEditingGame(null);
          gameForm.reset();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGame ? 'Edit Game' : 'Log New Game'}</DialogTitle>
            <DialogDescription>
              Enter your stats for this game
            </DialogDescription>
          </DialogHeader>
          <Form {...gameForm}>
            <form onSubmit={gameForm.handleSubmit(handleCreateGame)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={gameForm.control}
                  name="gameDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-game-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={gameForm.control}
                  name="opponent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opponent</FormLabel>
                      <FormControl>
                        <Input placeholder="Team name" {...field} data-testid="input-opponent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={gameForm.control}
                  name="isHome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'}>
                        <FormControl>
                          <SelectTrigger data-testid="select-home-away">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Home</SelectItem>
                          <SelectItem value="false">Away</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={gameForm.control}
                  name="result"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Result</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-result">
                            <SelectValue placeholder="W/L" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="W">Win</SelectItem>
                          <SelectItem value="L">Loss</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={gameForm.control}
                    name="teamScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Us</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-team-score" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gameForm.control}
                    name="opponentScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Them</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-opponent-score" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Basic Stats</h4>
                <div className="grid grid-cols-4 gap-3">
                  <FormField
                    control={gameForm.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PTS</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-points" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gameForm.control}
                    name="rebounds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>REB</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-rebounds" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gameForm.control}
                    name="assists"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AST</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-assists" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gameForm.control}
                    name="steals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>STL</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-steals" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gameForm.control}
                    name="blocks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BLK</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-blocks" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gameForm.control}
                    name="turnovers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TO</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-turnovers" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gameForm.control}
                    name="fouls"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PF</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={5} {...field} data-testid="input-fouls" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gameForm.control}
                    name="minutesPlayed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MIN</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} data-testid="input-minutes" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Shooting Stats</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Field Goals</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={gameForm.control}
                        name="fgMade"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" min={0} placeholder="Made" {...field} data-testid="input-fg-made" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gameForm.control}
                        name="fgAttempted"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" min={0} placeholder="Att" {...field} data-testid="input-fg-attempted" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">3-Pointers</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={gameForm.control}
                        name="threePtMade"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" min={0} placeholder="Made" {...field} data-testid="input-3pt-made" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gameForm.control}
                        name="threePtAttempted"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" min={0} placeholder="Att" {...field} data-testid="input-3pt-attempted" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Free Throws</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={gameForm.control}
                        name="ftMade"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" min={0} placeholder="Made" {...field} data-testid="input-ft-made" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gameForm.control}
                        name="ftAttempted"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" min={0} placeholder="Att" {...field} data-testid="input-ft-attempted" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <FormField
                control={gameForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any notes about this game..." 
                        className="resize-none" 
                        {...field} 
                        data-testid="input-game-notes"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createGameMutation.isPending || updateGameMutation.isPending}
                data-testid="button-submit-game"
              >
                {createGameMutation.isPending || updateGameMutation.isPending 
                  ? "Saving..." 
                  : editingGame ? "Update Game" : "Log Game"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CareerDashboard({ profile }: { profile: CareerProfile }) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    jerseyNumber: profile.jerseyNumber || 0,
    positions: profile.positions || [],
    gradeLevel: profile.gradeLevel || "",
    schoolName: profile.schoolName || "",
    teamName: profile.teamName || "",
    aspiration: profile.aspiration || "",
  });
  const { data: userStats } = useQuery<UserStats>({
    queryKey: ['/api/stats/overview']
  });

  const { data: careerStats } = useQuery<CareerStats>({
    queryKey: ['/api/career-stats']
  });

  const { data: achievements } = useQuery<Array<UserAchievement & { achievement: CareerAchievement }>>({
    queryKey: ['/api/achievements/unlocked']
  });

  const { data: userChallenges } = useQuery<Array<UserChallenge & { challenge: Challenge }>>({
    queryKey: ['/api/challenges/my-challenges']
  });

  const { data: personalRecords } = useQuery<Array<PersonalRecord & { drill: { title: string } }>>({
    queryKey: ['/api/personal-records']
  });

  const { data: teamAwards } = useQuery<TeamAward[]>({
    queryKey: ['/api/team-awards']
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof editFormData) => {
      return await apiRequest("PUT", "/api/career", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Profile Updated",
        description: "Your player info has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditSubmit = () => {
    updateProfileMutation.mutate(editFormData);
  };

  const toggleEditPosition = (pos: string) => {
    setEditFormData(prev => ({
      ...prev,
      positions: prev.positions.includes(pos)
        ? prev.positions.filter(p => p !== pos)
        : [...prev.positions, pos]
    }));
  };

  const xpForNextLevel = (profile.level || 1) * 100 + 50;
  const xpProgress = ((profile.xp || 0) / xpForNextLevel) * 100;

  const overallRating = Math.round(
    ((profile.skillBallHandling || 5) +
    (profile.skillShooting || 5) +
    (profile.skillPassing || 5) +
    (profile.skillFinishing || 5) +
    (profile.skillDefense || 5) +
    (profile.skillBasketballIQ || 5) +
    (profile.skillAthletics || 5)) / 7
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">My Career</h1>
        <BaseballCard profile={profile} careerStats={careerStats} />
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Badge variant="secondary" className="text-base sm:text-lg px-3 py-1">
            Level {profile.level || 1}
          </Badge>
          <span className="text-muted-foreground text-sm sm:text-base">
            {profile.totalXp || 0} Total XP
          </span>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="trophy-room" data-testid="tab-trophy-room">
            <Trophy className="w-4 h-4 mr-2" />
            Trophy Room
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats">
            <BarChart3 className="w-4 h-4 mr-2" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Experience Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Level {profile.level || 1}</span>
              <span>Level {(profile.level || 1) + 1}</span>
            </div>
            <Progress value={xpProgress} />
            <p className="text-sm text-muted-foreground text-center">
              {profile.xp || 0} / {xpForNextLevel} XP to next level
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Player Info
            </CardTitle>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => {
                setEditFormData({
                  jerseyNumber: profile.jerseyNumber || 0,
                  positions: profile.positions || [],
                  gradeLevel: profile.gradeLevel || "",
                  schoolName: profile.schoolName || "",
                  teamName: profile.teamName || "",
                  aspiration: profile.aspiration || "",
                });
                setIsEditDialogOpen(true);
              }}
              data-testid="button-edit-player-info"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-4xl font-bold text-primary-foreground">
                {overallRating}
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">Overall Rating</p>
            
            <div className="space-y-2 pt-4">
              {profile.positions && profile.positions.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position(s)</span>
                  <div className="flex gap-1">
                    {profile.positions.map(pos => (
                      <Badge key={pos} variant="outline">{pos}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.jerseyNumber !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jersey Number</span>
                  <span className="font-medium">#{profile.jerseyNumber}</span>
                </div>
              )}
              {profile.schoolName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">School</span>
                  <span className="font-medium">{profile.schoolName}</span>
                </div>
              )}
              {profile.teamName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team</span>
                  <span className="font-medium">{profile.teamName}</span>
                </div>
              )}
              {profile.gradeLevel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grade</span>
                  <span className="font-medium">{GRADE_LABELS[profile.gradeLevel] || profile.gradeLevel}</span>
                </div>
              )}
              {profile.aspiration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Goal</span>
                  <span className="font-medium">{ASPIRATION_LABELS[profile.aspiration]}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Skill Ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "skillBallHandling", label: "Ball Handling", value: profile.skillBallHandling },
              { key: "skillShooting", label: "Shooting", value: profile.skillShooting },
              { key: "skillPassing", label: "Passing", value: profile.skillPassing },
              { key: "skillFinishing", label: "Finishing", value: profile.skillFinishing },
              { key: "skillDefense", label: "Defense", value: profile.skillDefense },
              { key: "skillBasketballIQ", label: "Basketball IQ", value: profile.skillBasketballIQ },
              { key: "skillAthletics", label: "Athletics", value: profile.skillAthletics }
            ].map(skill => (
              <div key={skill.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{skill.label}</span>
                  <span className="font-medium">{skill.value || 5}</span>
                </div>
                <Progress value={(skill.value || 5) * 10} className="h-2" />
              </div>
            ))}
            {profile.focusSkill && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Focus: <span className="text-primary font-medium">
                    {SKILL_LABELS[profile.focusSkill]?.label || profile.focusSkill}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {userStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Training Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-md bg-muted/50">
                <div className="text-2xl font-bold text-primary">{userStats.totalSessions}</div>
                <div className="text-sm text-muted-foreground">Sessions</div>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <div className="text-2xl font-bold text-primary">{userStats.totalMinutes}</div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <div className="text-2xl font-bold text-primary">{userStats.avgScore}</div>
                <div className="text-sm text-muted-foreground">Avg Score</div>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <div className="text-2xl font-bold text-primary">{userStats.streak}</div>
                <div className="text-sm text-muted-foreground">Day Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="trophy-room" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Achievements
              </CardTitle>
              <CardDescription>
                {achievements?.length || 0} unlocked
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!achievements || achievements.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    No achievements yet. Start training to unlock your first badge!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {achievements.map(ua => (
                    <div 
                      key={ua.id} 
                      className="text-center p-4 rounded-md bg-muted/50"
                      data-testid={`achievement-item-${ua.id}`}
                    >
                      <div className="text-3xl mb-2">{ua.achievement.icon || ""}</div>
                      <div className="font-medium text-sm">{ua.achievement.name}</div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        +{ua.achievement.xpReward} XP
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                Completed Challenges
              </CardTitle>
              <CardDescription>
                Challenges you've conquered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const completedChallenges = userChallenges?.filter(uc => uc.isCompleted) || [];
                return completedChallenges.length > 0 ? (
                  <div className="space-y-3">
                    {completedChallenges.map((uc) => (
                      <div 
                        key={uc.id} 
                        className="p-3 border rounded-lg flex items-center justify-between"
                        data-testid={`completed-challenge-${uc.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">{uc.challenge.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {uc.challenge.targetValue} {uc.challenge.metric} {uc.completedAt ? `completed ${new Date(uc.completedAt).toLocaleDateString()}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-600">Completed</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Complete challenges from Training Log to see them here!</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                Personal Records (PRs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {personalRecords && personalRecords.length > 0 ? (
                <div className="space-y-3">
                  {personalRecords.map((pr) => (
                    <div 
                      key={pr.id} 
                      className="p-3 border rounded-lg flex items-center justify-between"
                      data-testid={`pr-item-${pr.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Star className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-medium">{pr.drill.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {pr.metricName}: {pr.previousValue} → {pr.newValue}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                        +{(Number(pr.newValue) - Number(pr.previousValue)).toFixed(0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Medal className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Beat your previous records to earn PR badges!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamAwards && teamAwards.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {teamAwards.map((award) => (
                    <div 
                      key={award.id} 
                      className="p-4 border rounded-lg text-center"
                      data-testid={`award-item-${award.id}`}
                    >
                      <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                      <p className="font-medium">{award.awardName}</p>
                      <p className="text-sm text-muted-foreground">{award.teamName}</p>
                      {award.season && (
                        <Badge variant="outline" className="mt-2">{award.season}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Awards you earn will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <StatsTab />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Player Info</DialogTitle>
            <DialogDescription>Update your player profile details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Jersey Number</Label>
              <Input
                type="number"
                min={0}
                max={99}
                value={editFormData.jerseyNumber}
                onChange={(e) => setEditFormData(prev => ({
                  ...prev,
                  jerseyNumber: parseInt(e.target.value) || 0
                }))}
                data-testid="input-edit-jersey-number"
              />
            </div>

            <div>
              <Label>Position(s)</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {BASKETBALL_POSITIONS.map(pos => {
                  const isSelected = editFormData.positions.includes(pos);
                  return (
                    <div
                      key={pos}
                      onClick={() => toggleEditPosition(pos)}
                      className={`cursor-pointer p-2 rounded-md border text-center text-sm hover-elevate ${
                        isSelected ? 'bg-primary text-primary-foreground border-primary' : ''
                      }`}
                      data-testid={`edit-position-${pos}`}
                    >
                      {pos}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Grade Level</Label>
              <Select 
                value={editFormData.gradeLevel} 
                onValueChange={(v) => setEditFormData(prev => ({ ...prev, gradeLevel: v }))}
              >
                <SelectTrigger data-testid="select-edit-grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map(grade => (
                    <SelectItem key={grade} value={grade}>
                      {GRADE_LABELS[grade] || grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>School Name</Label>
              <Input
                value={editFormData.schoolName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                placeholder="e.g., Lincoln High School"
                data-testid="input-edit-school"
              />
            </div>

            <div>
              <Label>Team Name</Label>
              <Input
                value={editFormData.teamName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, teamName: e.target.value }))}
                placeholder="e.g., Lincoln Lions, AAU Elite"
                data-testid="input-edit-team"
              />
            </div>

            <div>
              <Label>Basketball Goal</Label>
              <Select 
                value={editFormData.aspiration} 
                onValueChange={(v) => setEditFormData(prev => ({ ...prev, aspiration: v }))}
              >
                <SelectTrigger data-testid="select-edit-aspiration">
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  {BASKETBALL_ASPIRATIONS.map(asp => (
                    <SelectItem key={asp} value={asp}>
                      {ASPIRATION_LABELS[asp]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit} 
              disabled={updateProfileMutation.isPending}
              className="gap-2"
              data-testid="button-save-player-info"
            >
              <Save className="w-4 h-4" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CareerPage() {
  const { data: careerProfile, isLoading, refetch } = useQuery<CareerProfile | null>({
    queryKey: ['/api/career']
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!careerProfile || !careerProfile.onboardingCompleted) {
    return <OnboardingWizard onComplete={() => refetch()} />;
  }

  return <CareerDashboard profile={careerProfile} />;
}
