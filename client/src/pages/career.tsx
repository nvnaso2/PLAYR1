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
  size = "md",
  seed
}: { 
  skinTone?: string;
  hairStyle?: string;
  hairColor?: string;
  jerseyNumber?: number;
  size?: "sm" | "md" | "lg" | "xl";
  seed?: string;
}) {
  const sizes = {
    sm: { container: "w-24 h-32", avatar: 80 },
    md: { container: "w-32 h-44", avatar: 100 },
    lg: { container: "w-44 h-56", avatar: 140 },
    xl: { container: "w-56 h-72", avatar: 180 }
  };

  const skinToneMap: Record<string, string> = {
    "light": "f2d3b1",
    "medium-light": "ecad80",
    "medium": "d08b5b",
    "medium-dark": "ae5d29",
    "dark": "614335"
  };

  const hairColorMap: Record<string, string> = {
    "black": "0e0e0e",
    "brown": "6a4e35",
    "blonde": "cabfad",
    "red": "b55239",
    "gray": "6d6d6d"
  };

  const sizeConfig = sizes[size];
  const avatarSeed = seed || `player-${jerseyNumber || 0}`;
  const skinColor = skinToneMap[skinTone || "medium"];
  const hairColorHex = hairColorMap[hairColor || "black"];

  // Use DiceBear's "lorelei" style for a hand-drawn realistic look
  const avatarUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(avatarSeed)}&skinColor=${skinColor}&hair=${hairStyle === "bald" ? "variant01" : "variant02,variant03,variant04"}&hairColor=${hairColorHex}&backgroundColor=transparent&size=${sizeConfig.avatar}`;

  return (
    <div className={`${sizeConfig.container} relative flex flex-col items-center`}>
      {/* Avatar head from DiceBear */}
      <div className="relative z-10 -mb-4">
        <img 
          src={avatarUrl} 
          alt="Player Avatar" 
          className="w-full h-auto"
          style={{ maxWidth: sizeConfig.avatar, maxHeight: sizeConfig.avatar }}
        />
      </div>
      
      {/* Basketball Jersey SVG */}
      <svg viewBox="0 0 120 70" className="w-full" style={{ marginTop: '-8px' }}>
        <defs>
          <linearGradient id="jerseyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>
        
        {/* Jersey body - sleeveless tank top */}
        <path d="M15 5 Q0 8 0 25 L0 70 L120 70 L120 25 Q120 8 105 5 L75 5 Q60 15 60 15 Q60 15 45 5 Z" 
              fill="url(#jerseyGrad)" />
        
        {/* V-neck collar with white trim */}
        <path d="M45 5 Q60 20 75 5" fill="#c2410c" />
        <path d="M46 6 Q60 18 74 6" stroke="white" strokeWidth="3" fill="none" />
        
        {/* Arm holes with white trim */}
        <path d="M15 5 Q5 10 2 25" stroke="white" strokeWidth="3" fill="none" />
        <path d="M105 5 Q115 10 118 25" stroke="white" strokeWidth="3" fill="none" />
        
        {/* Side stripes */}
        <path d="M3 30 L3 70" stroke="white" strokeWidth="2" opacity="0.5" />
        <path d="M117 30 L117 70" stroke="white" strokeWidth="2" opacity="0.5" />
        
        {/* Jersey number */}
        <text x="60" y="52" textAnchor="middle" fill="white" fontSize="26" fontWeight="bold" 
              fontFamily="Arial Black, Impact, sans-serif">
          {jerseyNumber !== undefined ? String(jerseyNumber).padStart(2, '0') : "00"}
        </text>
        
        {/* Fabric fold shadows */}
        <path d="M30 20 Q35 40 32 70" stroke="#9a3412" strokeWidth="1.5" fill="none" opacity="0.25" />
        <path d="M90 20 Q85 40 88 70" stroke="#9a3412" strokeWidth="1.5" fill="none" opacity="0.25" />
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
          seed={profile.id}
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
