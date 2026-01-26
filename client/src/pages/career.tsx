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
  Dumbbell
} from "lucide-react";
import type { CareerProfile, UserAchievement, CareerAchievement } from "@shared/schema";
import { 
  BASKETBALL_POSITIONS, 
  BASKETBALL_ASPIRATIONS, 
  GRADE_LEVELS,
  DRILL_CATEGORIES,
  AVATAR_SKIN_TONES,
  AVATAR_HAIR_STYLES,
  AVATAR_HAIR_COLORS
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
  avatarSkinTone: z.string().default("medium"),
  avatarHairStyle: z.string().default("short"),
  avatarHairColor: z.string().default("black"),
  avatarAccessory: z.string().optional()
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome", icon: User },
  { id: "birthdate", title: "Birth Date", icon: Calendar },
  { id: "school", title: "School & Team", icon: School },
  { id: "player", title: "Player Info", icon: Hash },
  { id: "goals", title: "Goals", icon: Target },
  { id: "skills", title: "Rate Your Skills", icon: Star },
  { id: "focus", title: "Focus Area", icon: Crosshair },
  { id: "avatar", title: "Create Avatar", icon: User },
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
      avatarSkinTone: "medium",
      avatarHairStyle: "short",
      avatarHairColor: "black",
      avatarAccessory: ""
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
                  <div className="grid grid-cols-5 gap-2">
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
                <div className="space-y-6">
                  <p className="text-center text-muted-foreground mb-4">
                    Customize your player avatar
                  </p>
                  
                  <div className="flex justify-center mb-6">
                    <PlayerAvatar 
                      skinTone={form.watch("avatarSkinTone")}
                      hairStyle={form.watch("avatarHairStyle")}
                      hairColor={form.watch("avatarHairColor")}
                      jerseyNumber={form.watch("jerseyNumber")}
                      size="lg"
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="avatarSkinTone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skin Tone</FormLabel>
                        <div className="flex gap-2">
                          {AVATAR_SKIN_TONES.map(tone => {
                            const colors: Record<string, string> = {
                              "light": "bg-[#FFE0BD]",
                              "medium-light": "bg-[#F1C27D]",
                              "medium": "bg-[#C68642]",
                              "medium-dark": "bg-[#8D5524]",
                              "dark": "bg-[#5C3317]"
                            };
                            return (
                              <button
                                key={tone}
                                type="button"
                                onClick={() => field.onChange(tone)}
                                className={`w-10 h-10 rounded-full ${colors[tone]} ${
                                  field.value === tone ? 'ring-2 ring-primary ring-offset-2' : ''
                                }`}
                                data-testid={`skin-${tone}`}
                              />
                            );
                          })}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avatarHairStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hair Style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-hair-style">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AVATAR_HAIR_STYLES.map(style => (
                              <SelectItem key={style} value={style}>
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avatarHairColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hair Color</FormLabel>
                        <div className="flex gap-2">
                          {AVATAR_HAIR_COLORS.map(color => {
                            const bgColors: Record<string, string> = {
                              "black": "bg-gray-900",
                              "brown": "bg-amber-800",
                              "blonde": "bg-yellow-400",
                              "red": "bg-red-600",
                              "gray": "bg-gray-400"
                            };
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => field.onChange(color)}
                                className={`w-10 h-10 rounded-full ${bgColors[color]} ${
                                  field.value === color ? 'ring-2 ring-primary ring-offset-2' : ''
                                }`}
                                data-testid={`hair-${color}`}
                              />
                            );
                          })}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 8 && (
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <PlayerAvatar 
                      skinTone={form.watch("avatarSkinTone")}
                      hairStyle={form.watch("avatarHairStyle")}
                      hairColor={form.watch("avatarHairColor")}
                      jerseyNumber={form.watch("jerseyNumber")}
                      size="xl"
                    />
                  </div>
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

function PlayerAvatar({ 
  skinTone, 
  hairStyle, 
  hairColor,
  jerseyNumber,
  size = "md" 
}: { 
  skinTone?: string;
  hairStyle?: string;
  hairColor?: string;
  jerseyNumber?: number;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "w-24 h-28",
    md: "w-32 h-40",
    lg: "w-44 h-52",
    xl: "w-56 h-68"
  };

  const skinColors: Record<string, { base: string; shadow: string; highlight: string; blush: string }> = {
    "light": { base: "#F5D6C6", shadow: "#D4B5A5", highlight: "#FFF5EE", blush: "#E8B0A0" },
    "medium-light": { base: "#E8C4A0", shadow: "#C9A580", highlight: "#F5DCC8", blush: "#D4A08A" },
    "medium": { base: "#C9A078", shadow: "#A88060", highlight: "#DDB898", blush: "#B89070" },
    "medium-dark": { base: "#8B6B4A", shadow: "#6B4B2A", highlight: "#A88B6A", blush: "#7B5B3A" },
    "dark": { base: "#5C4030", shadow: "#3C2010", highlight: "#7C6050", blush: "#4C3020" }
  };

  const hairColors: Record<string, { base: string; shadow: string; highlight: string }> = {
    "black": { base: "#1C1C1C", shadow: "#0A0A0A", highlight: "#3A3A3A" },
    "brown": { base: "#4A3728", shadow: "#2A1708", highlight: "#6A5748" },
    "blonde": { base: "#C4A35A", shadow: "#A48338", highlight: "#E4C37A" },
    "red": { base: "#8B3A2A", shadow: "#5B1A0A", highlight: "#AB5A4A" },
    "gray": { base: "#5A5A5A", shadow: "#3A3A3A", highlight: "#7A7A7A" }
  };

  const skin = skinColors[skinTone || "medium"];
  const hair = hairColors[hairColor || "black"];

  return (
    <div className={`${sizes[size]} relative`}>
      <svg viewBox="0 0 200 250" className="w-full h-full">
        <defs>
          {/* Skin gradient for face */}
          <radialGradient id="faceGradient" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor={skin.highlight} />
            <stop offset="40%" stopColor={skin.base} />
            <stop offset="100%" stopColor={skin.shadow} />
          </radialGradient>
          
          {/* Jersey gradient */}
          <linearGradient id="jerseyMainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          
          {/* Shadow for depth */}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* BODY SECTION */}
        
        {/* Shoulders - bare skin showing */}
        <ellipse cx="45" cy="195" rx="32" ry="22" fill={skin.base} />
        <ellipse cx="155" cy="195" rx="32" ry="22" fill={skin.base} />
        {/* Shoulder highlights */}
        <ellipse cx="40" cy="190" rx="18" ry="12" fill={skin.highlight} opacity="0.4" />
        <ellipse cx="160" cy="190" rx="18" ry="12" fill={skin.highlight} opacity="0.4" />
        {/* Shoulder shadows */}
        <ellipse cx="50" cy="202" rx="20" ry="12" fill={skin.shadow} opacity="0.3" />
        <ellipse cx="150" cy="202" rx="20" ry="12" fill={skin.shadow} opacity="0.3" />

        {/* Neck */}
        <path d="M78 142 L78 168 Q78 175 85 178 L115 178 Q122 175 122 168 L122 142" fill={skin.base} />
        <path d="M82 145 L82 165 Q82 170 88 172 L112 172 Q118 170 118 165 L118 145" fill={skin.shadow} opacity="0.25" />
        {/* Neck highlight */}
        <path d="M92 148 L92 162" stroke={skin.highlight} strokeWidth="6" opacity="0.3" strokeLinecap="round" />

        {/* Basketball Jersey - Sleeveless Tank Top */}
        <path d="M42 175 Q20 180 15 210 L15 250 L185 250 L185 210 Q180 180 158 175 L122 175 Q100 185 100 185 Q100 185 78 175 Z" 
              fill="url(#jerseyMainGradient)" />
        
        {/* Jersey V-neck collar */}
        <path d="M78 175 Q100 198 122 175" fill="#c2410c" />
        <path d="M80 176 Q100 196 120 176" stroke="white" strokeWidth="4" fill="none" />
        <path d="M82 178 Q100 194 118 178" stroke="white" strokeWidth="2" fill="none" opacity="0.6" />
        
        {/* Jersey arm holes with white trim */}
        <path d="M42 175 Q28 185 25 210" stroke="white" strokeWidth="5" fill="none" />
        <path d="M158 175 Q172 185 175 210" stroke="white" strokeWidth="5" fill="none" />
        
        {/* Jersey side panels/stripes */}
        <path d="M25 210 L25 250" stroke="white" strokeWidth="3" opacity="0.4" />
        <path d="M175 210 L175 250" stroke="white" strokeWidth="3" opacity="0.4" />
        
        {/* Jersey number */}
        <text x="100" y="235" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold" 
              fontFamily="Arial Black, Impact, sans-serif" style={{ letterSpacing: '2px' }}>
          {jerseyNumber !== undefined ? String(jerseyNumber).padStart(2, '0') : "00"}
        </text>
        
        {/* Jersey fabric shadows/folds */}
        <path d="M60 200 Q70 220 65 250" stroke="#9a3412" strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M140 200 Q130 220 135 250" stroke="#9a3412" strokeWidth="2" fill="none" opacity="0.3" />

        {/* HEAD SECTION */}
        
        {/* Face - realistic oval shape */}
        <ellipse cx="100" cy="82" rx="52" ry="62" fill="url(#faceGradient)" filter="url(#softShadow)" />
        
        {/* Jaw definition */}
        <path d="M55 100 Q70 135 100 142 Q130 135 145 100" fill={skin.shadow} opacity="0.15" />
        
        {/* Cheek highlights */}
        <ellipse cx="65" cy="95" rx="12" ry="8" fill={skin.highlight} opacity="0.3" />
        <ellipse cx="135" cy="95" rx="12" ry="8" fill={skin.highlight} opacity="0.3" />
        
        {/* Cheek blush */}
        <ellipse cx="62" cy="100" rx="10" ry="6" fill={skin.blush} opacity="0.2" />
        <ellipse cx="138" cy="100" rx="10" ry="6" fill={skin.blush} opacity="0.2" />

        {/* Ears */}
        <ellipse cx="48" cy="88" rx="8" ry="14" fill={skin.base} />
        <ellipse cx="48" cy="88" rx="5" ry="10" fill={skin.shadow} opacity="0.25" />
        <path d="M46 82 Q44 88 46 94" stroke={skin.shadow} strokeWidth="1.5" fill="none" opacity="0.4" />
        <ellipse cx="152" cy="88" rx="8" ry="14" fill={skin.base} />
        <ellipse cx="152" cy="88" rx="5" ry="10" fill={skin.shadow} opacity="0.25" />
        <path d="M154 82 Q156 88 154 94" stroke={skin.shadow} strokeWidth="1.5" fill="none" opacity="0.4" />

        {/* HAIR STYLES */}
        {hairStyle !== "bald" && (
          <>
            {(hairStyle === "short" || hairStyle === "buzz") && (
              <g>
                {/* Short cropped hair - buzz cut style */}
                <path d="M52 55 Q55 22 100 18 Q145 22 148 55 Q145 35 100 28 Q55 35 52 55" fill={hair.base} />
                <path d="M55 52 Q58 28 100 24 Q142 28 145 52 Q142 38 100 32 Q58 38 55 52" fill={hair.shadow} opacity="0.5" />
                {/* Hair texture - short strokes */}
                <g opacity="0.4">
                  <path d="M70 35 L72 28" stroke={hair.highlight} strokeWidth="1.5" />
                  <path d="M85 32 L87 25" stroke={hair.highlight} strokeWidth="1.5" />
                  <path d="M100 30 L100 23" stroke={hair.highlight} strokeWidth="1.5" />
                  <path d="M115 32 L113 25" stroke={hair.highlight} strokeWidth="1.5" />
                  <path d="M130 35 L128 28" stroke={hair.highlight} strokeWidth="1.5" />
                </g>
                {/* Hairline */}
                <path d="M58 48 Q80 38 100 36 Q120 38 142 48" stroke={hair.shadow} strokeWidth="1" fill="none" opacity="0.3" />
              </g>
            )}
            {hairStyle === "medium" && (
              <g>
                {/* Medium length hair with some volume */}
                <path d="M45 70 Q48 15 100 10 Q152 15 155 70 Q150 30 100 20 Q50 30 45 70" fill={hair.base} />
                <path d="M50 65 Q52 22 100 18 Q148 22 150 65 Q146 35 100 28 Q54 35 50 65" fill={hair.shadow} opacity="0.4" />
                {/* Side hair covering ears slightly */}
                <path d="M48 60 Q42 80 45 95" stroke={hair.base} strokeWidth="10" strokeLinecap="round" />
                <path d="M152 60 Q158 80 155 95" stroke={hair.base} strokeWidth="10" strokeLinecap="round" />
                {/* Hair texture */}
                <path d="M65 35 Q75 25 90 28" stroke={hair.highlight} strokeWidth="2" fill="none" opacity="0.3" />
                <path d="M110 28 Q125 25 135 35" stroke={hair.highlight} strokeWidth="2" fill="none" opacity="0.3" />
              </g>
            )}
            {hairStyle === "long" && (
              <g>
                {/* Long flowing hair */}
                <path d="M38 90 Q35 10 100 5 Q165 10 162 90 Q158 25 100 15 Q42 25 38 90" fill={hair.base} />
                <path d="M42 85 Q40 18 100 12 Q160 18 158 85 Q154 30 100 22 Q46 30 42 85" fill={hair.shadow} opacity="0.3" />
                {/* Long hair falling past shoulders */}
                <path d="M40 80 Q32 120 35 160" stroke={hair.base} strokeWidth="16" strokeLinecap="round" />
                <path d="M160 80 Q168 120 165 160" stroke={hair.base} strokeWidth="16" strokeLinecap="round" />
                {/* Hair texture */}
                <path d="M42 100 Q38 130 40 150" stroke={hair.shadow} strokeWidth="3" opacity="0.4" />
                <path d="M158 100 Q162 130 160 150" stroke={hair.shadow} strokeWidth="3" opacity="0.4" />
              </g>
            )}
            {hairStyle === "braids" && (
              <g>
                {/* Cornrow base */}
                <path d="M50 55 Q55 18 100 14 Q145 18 150 55 Q146 30 100 24 Q54 30 50 55" fill={hair.base} />
                {/* Braids falling down */}
                <path d="M55 50 L42 140" stroke={hair.base} strokeWidth="10" strokeLinecap="round" />
                <path d="M70 45 L60 130" stroke={hair.base} strokeWidth="8" strokeLinecap="round" />
                <path d="M145 50 L158 140" stroke={hair.base} strokeWidth="10" strokeLinecap="round" />
                <path d="M130 45 L140 130" stroke={hair.base} strokeWidth="8" strokeLinecap="round" />
                {/* Braid texture - small segments */}
                {[0,1,2,3,4,5].map(i => (
                  <g key={i}>
                    <ellipse cx={48 - i*1.5} cy={60 + i*14} rx="3" ry="4" fill={hair.shadow} opacity="0.4" />
                    <ellipse cx={152 + i*1.5} cy={60 + i*14} rx="3" ry="4" fill={hair.shadow} opacity="0.4" />
                  </g>
                ))}
                {/* Cornrow lines on top */}
                <path d="M60 40 Q80 25 100 22 Q120 25 140 40" stroke={hair.shadow} strokeWidth="1.5" fill="none" opacity="0.4" />
                <path d="M65 48 Q85 35 100 33 Q115 35 135 48" stroke={hair.shadow} strokeWidth="1.5" fill="none" opacity="0.4" />
              </g>
            )}
            {hairStyle === "afro" && (
              <g>
                {/* Large afro */}
                <ellipse cx="100" cy="55" rx="68" ry="55" fill={hair.base} />
                <ellipse cx="100" cy="50" rx="62" ry="48" fill={hair.shadow} opacity="0.15" />
                {/* Afro texture - curly pattern */}
                <circle cx="60" cy="30" r="12" fill={hair.shadow} opacity="0.12" />
                <circle cx="140" cy="30" r="12" fill={hair.shadow} opacity="0.12" />
                <circle cx="100" cy="18" r="15" fill={hair.shadow} opacity="0.12" />
                <circle cx="45" cy="55" r="10" fill={hair.shadow} opacity="0.12" />
                <circle cx="155" cy="55" r="10" fill={hair.shadow} opacity="0.12" />
                <circle cx="75" cy="20" r="8" fill={hair.shadow} opacity="0.1" />
                <circle cx="125" cy="20" r="8" fill={hair.shadow} opacity="0.1" />
                {/* Highlight */}
                <ellipse cx="85" cy="35" rx="15" ry="10" fill={hair.highlight} opacity="0.15" />
              </g>
            )}
          </>
        )}

        {/* FACIAL FEATURES */}
        
        {/* Eyebrows - natural curved shape */}
        <path d="M68 62 Q78 56 90 60" stroke={hair.base} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M110 60 Q122 56 132 62" stroke={hair.base} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        
        {/* Eyes - realistic with proper detail */}
        {/* Left eye */}
        <ellipse cx="78" cy="78" rx="12" ry="9" fill="white" />
        <ellipse cx="78" cy="78" rx="10" ry="7" fill="#FAFAFA" />
        <circle cx="80" cy="78" r="6" fill="#3D2820" />
        <circle cx="80" cy="78" r="3.5" fill="#1A1008" />
        <circle cx="82" cy="76" r="2" fill="white" />
        <circle cx="77" cy="80" r="1" fill="white" opacity="0.5" />
        {/* Left eyelid line */}
        <path d="M66 72 Q78 68 90 72" stroke={skin.shadow} strokeWidth="1" fill="none" opacity="0.5" />
        
        {/* Right eye */}
        <ellipse cx="122" cy="78" rx="12" ry="9" fill="white" />
        <ellipse cx="122" cy="78" rx="10" ry="7" fill="#FAFAFA" />
        <circle cx="120" cy="78" r="6" fill="#3D2820" />
        <circle cx="120" cy="78" r="3.5" fill="#1A1008" />
        <circle cx="122" cy="76" r="2" fill="white" />
        <circle cx="117" cy="80" r="1" fill="white" opacity="0.5" />
        {/* Right eyelid line */}
        <path d="M110 72 Q122 68 134 72" stroke={skin.shadow} strokeWidth="1" fill="none" opacity="0.5" />

        {/* Nose - realistic shape */}
        <path d="M97 75 Q100 88 100 98" stroke={skin.shadow} strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M103 75 Q100 88 100 98" stroke={skin.shadow} strokeWidth="1.5" fill="none" opacity="0.3" />
        <ellipse cx="100" cy="102" rx="8" ry="4" fill={skin.shadow} opacity="0.2" />
        {/* Nostrils */}
        <ellipse cx="94" cy="102" rx="3" ry="2" fill={skin.shadow} opacity="0.3" />
        <ellipse cx="106" cy="102" rx="3" ry="2" fill={skin.shadow} opacity="0.3" />
        {/* Nose highlight */}
        <path d="M98 85 L98 95" stroke={skin.highlight} strokeWidth="3" opacity="0.25" strokeLinecap="round" />

        {/* Mouth - friendly smile */}
        <path d="M82 118 Q100 130 118 118" stroke="#B86B6B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M85 118 Q100 128 115 118" fill="#D4908A" />
        {/* Upper lip definition */}
        <path d="M90 116 Q100 113 110 116" stroke="#A05A5A" strokeWidth="1" fill="none" opacity="0.4" />
        {/* Lower lip highlight */}
        <ellipse cx="100" cy="124" rx="10" ry="4" fill="#E8A8A0" opacity="0.4" />
        
        {/* Chin */}
        <ellipse cx="100" cy="138" rx="18" ry="6" fill={skin.shadow} opacity="0.1" />
      </svg>
    </div>
  );
}

type UserStats = {
  totalSessions: number;
  totalMinutes: number;
  avgScore: number;
  streak: number;
};

function CareerDashboard({ profile }: { profile: CareerProfile }) {
  const { data: userStats } = useQuery<UserStats>({
    queryKey: ['/api/stats/overview']
  });

  const { data: achievements } = useQuery<Array<UserAchievement & { achievement: CareerAchievement }>>({
    queryKey: ['/api/achievements/unlocked']
  });

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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <PlayerAvatar 
          skinTone={profile.avatarSkinTone || undefined}
          hairStyle={profile.avatarHairStyle || undefined}
          hairColor={profile.avatarHairColor || undefined}
          jerseyNumber={profile.jerseyNumber || undefined}
          size="lg"
        />
        <div>
          <h1 className="text-3xl font-bold">My Career</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Level {profile.level || 1}
            </Badge>
            <span className="text-muted-foreground">
              {profile.totalXp || 0} Total XP
            </span>
          </div>
        </div>
      </div>

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Player Info
            </CardTitle>
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
                >
                  <div className="text-3xl mb-2">{ua.achievement.icon || "🏆"}</div>
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
