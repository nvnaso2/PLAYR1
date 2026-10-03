import { useState, useRef, useEffect } from "react";
import logoLandscape from "@assets/PNG_image_auth_trimmed.png";
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
import { Switch } from "@/components/ui/switch";
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
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { queryClient, apiRequest, nativeFetch, getObjectUrl } from "@/lib/queryClient";
import { track } from "@/lib/track";
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
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  GripVertical,
  BarChart,
  Camera,
  RefreshCw,
  Share2,
  Loader2,
  Play,
  HandMetal,
  Shield,
  Brain,
  Upload,
  MapPin,
  ArrowLeftRight,
  Video,
  CheckCircle2,
  Pen,
  Sparkles,
  MessageSquare,
  Fingerprint,
  Bell,
} from "lucide-react";
import type { CareerProfile, UserAchievement, CareerAchievement, Challenge, UserChallenge, PersonalRecord, TeamAward, Season, Game, InsertTeamAward, InsertChallenge, PlayerProfile, PlayerCardCareerStatKey } from "@shared/schema";
import { insertTeamAwardSchema, insertChallengeSchema } from "@shared/schema";
import defaultPlayerImg from "@assets/default-player.jpg";
import { 
  BASKETBALL_POSITIONS, 
  BASKETBALL_ASPIRATIONS, 
  GRADE_LEVELS,
  DRILL_CATEGORIES,
  SEASON_TYPES,
  CHALLENGE_CATEGORIES,
  CHALLENGE_METRICS,
  CHALLENGE_GOAL_TYPES,
  COUNTRIES,
  CANADIAN_PROVINCES,
} from "@shared/schema";
import { ShareCardDialog } from "@/components/share-card";
import { WorkoutShareDialog } from "@/components/workout-share-dialog";
import CsvImportDialog from "@/components/csv-import-dialog";
import { PlayerProfileSection } from "@/pages/player-profile";
import { Link, useLocation } from "wouter";

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

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
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

type OnboardingTeam = {
  name: string;
  type: "school" | "club" | "rec" | "intramural";
  inSeason: boolean;
  seasonStartMonth?: number;
};

const NON_SCHOOL_TEAM_TYPES = [
  { value: "club", label: "Club / Travel / AAU" },
  { value: "rec", label: "Recreational" },
  { value: "intramural", label: "Intramural" },
] as const;

const INTEREST_OPTIONS = [
  { value: "game-stats", label: "Track Game Stats", icon: BarChart3, description: "Log games and track your stats" },
  { value: "skill-development", label: "Player / Skill Development", icon: Target, description: "Improve your skills with drills" },
  { value: "find-trainer", label: "Find a Trainer", icon: Users, description: "Connect with a trainer" },
  { value: "find-team", label: "Find a Team", icon: Award, description: "Find a team to play on" },
] as const;

const TRAINER_SPECIALTIES = [
  { value: "ball-handling", label: "Ball Handling", icon: HandMetal },
  { value: "shooting", label: "Shooting", icon: Target },
  { value: "defense", label: "Defense", icon: Shield },
  { value: "strength-conditioning", label: "Strength & Conditioning", icon: Dumbbell },
  { value: "basketball-iq", label: "Basketball IQ / Film", icon: Brain },
  { value: "finishing", label: "Finishing", icon: Flame },
  { value: "passing", label: "Passing", icon: Crosshair },
] as const;

const seasonSchema = z.object({
  name: z.string().min(1, "Season name is required"),
  teamName: z.string().optional(),
  seasonType: z.string().min(1, "Season type is required"),
  year: z.string().min(1, "Year is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  teamGoal: z.string().optional(),
});

type SeasonFormData = z.infer<typeof seasonSchema>;

const gameSchema = z.object({
  gameDate: z.string().min(1, "Game date is required"),
  tipoffTime: z.string().optional(),
  eventType: z.string().optional(),
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

const TUTORIAL_SLIDES = {
  "log-training": [
    {
      title: "Step 1: Find a Drill",
      icon: Target,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      content: [
        { heading: "Go to the Drill Library", text: "Open the sidebar and tap \"Drills\" to browse the full library." },
        { heading: "Browse or Search", text: "Use the tabs to switch between PLAYR1 (pro drills), Community drills, or your own. Filter by category (Ball Handling, Shooting, etc.) and difficulty level." },
        { heading: "Pick a Drill", text: "Tap any drill to see the details — watch the video, read pro tips, and check the equipment needed." },
      ],
      tip: "Start with a drill in the category you want to improve most.",
    },
    {
      title: "Step 2: Log the Drill",
      icon: Flame,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
      content: [
        { heading: "Start a Session", text: "From any drill's detail page, tap \"Log Training Session.\" This takes you to the Training Log with that drill pre-loaded." },
        { heading: "Track Your Reps", text: "Enter your metrics — makes, attempts, time, or whatever the drill requires. For shooting drills, use the half-court map to log shot locations." },
        { heading: "Use the Timer", text: "Hit the play button to start a live timer so your duration is tracked automatically. Stop it when you're done." },
        { heading: "Rate & Save", text: "Give yourself a score (1-10), add any notes, then save your session." },
      ],
      tip: "You can also log drills from the Training Log page directly — just tap the \"+\" to add drills to your workout.",
    },
    {
      title: "Step 3: View Your History",
      icon: Calendar,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      content: [
        { heading: "Training Log History", text: "Go to the Training Log page and switch to the \"History\" tab to see all your past sessions in order." },
        { heading: "Drill Details", text: "Each log shows the drill name, duration, your score, and the metrics you entered." },
        { heading: "Track Improvement", text: "Come back to the same drill regularly — you'll see how your numbers improve over time." },
      ],
      tip: "Consistency is key. Even 15 minutes of focused work moves the needle.",
    },
    {
      title: "Step 4: See Your Progress",
      icon: BarChart3,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
      content: [
        { heading: "Dashboard", text: "Your home dashboard shows total sessions, hours trained, and your current streak. Check the category breakdown to see where you're spending your time." },
        { heading: "Progress Page", text: "Dive deeper on the Progress page — see your shooting heatmap, skill breakdown charts, and weekly activity." },
        { heading: "Career & Trophy Room", text: "Hit milestones to unlock achievements and track personal records in your Trophy Room." },
        { heading: "Challenges", text: "Set goals like \"Make 500 shots\" or \"Train 30 days in a row.\" Your drill logs automatically count toward active challenges." },
      ],
      tip: "Your stats show up on your Player Profile too — great for recruiting and showcasing your work ethic.",
    },
  ],
  "create-drill": [
    {
      title: "Step 1: Start Creating",
      icon: Plus,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      content: [
        { heading: "Go to Drills", text: "Open the sidebar and tap \"Drills\" to go to the Drill Library." },
        { heading: "Tap Create", text: "Switch to the \"Mine\" tab and tap \"Create Drill\" to open the drill builder." },
        { heading: "Name & Describe", text: "Give your drill a clear name and description so you (and others) know exactly what it covers." },
      ],
      tip: "Think about what skill gap you want to fill — then build a drill around it.",
    },
    {
      title: "Step 2: Set It Up",
      icon: Target,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
      content: [
        { heading: "Pick Category & Difficulty", text: "Choose a category (Ball Handling, Shooting, etc.) and set the difficulty level." },
        { heading: "Add Metrics", text: "Define what you want to track — makes, attempts, time, or custom metrics. These show up when you log the drill." },
        { heading: "Add Video & Tips", text: "Upload a video demo and write pro tips or equipment notes to make the drill complete." },
      ],
      tip: "Adding metrics makes your drill trackable — you'll see your improvement over time.",
    },
    {
      title: "Step 3: Use & Share",
      icon: Users,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      content: [
        { heading: "Log It", text: "Your new drill appears in your \"Mine\" tab. Tap it and hit \"Log Training Session\" to start using it." },
        { heading: "Share It", text: "Toggle sharing on to make your drill available in the Community tab for other players to use." },
        { heading: "Iterate", text: "Edit your drill anytime to refine the metrics, tips, or video as you improve the routine." },
      ],
      tip: "Great drills get used by the community — build something you'd want to find.",
    },
  ],
};

function TutorialVideoStep({
  tutorialKey,
  title,
  description,
  onBack,
  onDone,
  onGoToDrills,
}: {
  tutorialKey: string;
  title: string;
  description: string;
  onBack: () => void;
  onDone: () => Promise<void>;
  onGoToDrills: () => Promise<void>;
}) {
  const { data: tutorial, isLoading } = useQuery<{ id: string; key: string; title: string; description: string | null; videoUrl: string }>({
    queryKey: ["/api/tutorial-videos", tutorialKey],
  });
  const [finishing, setFinishing] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  const hasVideo = !isLoading && tutorial?.videoUrl;
  const slides = TUTORIAL_SLIDES[tutorialKey as keyof typeof TUTORIAL_SLIDES] || TUTORIAL_SLIDES["log-training"];
  const slide = slides[slideIdx];
  const SlideIcon = slide.icon;
  const isLastSlide = slideIdx === slides.length - 1;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasVideo) {
    return (
      <div className="min-h-screen flex items-start justify-center p-4 py-8 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold">{title}</CardTitle>
              </div>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={getObjectUrl(tutorial!.videoUrl)}
                controls
                className="w-full h-full"
                data-testid="tutorial-video-player"
              />
            </div>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={onBack} data-testid="button-tutorial-back">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={finishing}
                  onClick={async () => { setFinishing(true); await onDone(); setFinishing(false); }}
                  data-testid="button-tutorial-finish">
                  {finishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Done
                </Button>
                <Button type="button" disabled={finishing}
                  onClick={async () => { setFinishing(true); await onGoToDrills(); setFinishing(false); }}
                  data-testid="button-tutorial-go-drills">
                  Go to Drills <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full ${slide.iconBg} flex items-center justify-center shrink-0`}>
              <SlideIcon className={`w-5 h-5 ${slide.iconColor}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-bold">{slide.title}</CardTitle>
            </div>
          </div>
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= slideIdx ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{slideIdx + 1} of {slides.length}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {slide.content.map((item, idx) => (
              <div key={idx} className="flex gap-3" data-testid={`tutorial-item-${slideIdx}-${idx}`}>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{idx + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.heading}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          {slide.tip && (
            <div className="flex gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Tip:</span> {slide.tip}</p>
            </div>
          )}

          <div className="flex justify-between pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => slideIdx === 0 ? onBack() : setSlideIdx(prev => prev - 1)}
              data-testid="button-tutorial-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {isLastSlide ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={finishing}
                  onClick={async () => { setFinishing(true); await onDone(); setFinishing(false); }}
                  data-testid="button-tutorial-finish">
                  {finishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Done
                </Button>
                <Button type="button" disabled={finishing}
                  onClick={async () => { setFinishing(true); await onGoToDrills(); setFinishing(false); }}
                  data-testid="button-tutorial-go-drills">
                  Go to Drills <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={() => setSlideIdx(prev => prev + 1)} data-testid="button-tutorial-next">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OnboardingWizard({ onComplete, previewMode = false }: { onComplete: () => void; previewMode?: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<"manifesto" | "role" | "profile" | "parent-email" | "basketball-life" | "playr1-moment" | "thirty-day-focus" | "select-teams" | "ai-interview" | "meet-coach" | "trainer-profile" | "trainer-specialties" | "trainer-begin">("manifesto");
  const [selectedRole, setSelectedRole] = useState<"player" | "trainer" | "player_trainer" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [birthMonth, setBirthMonth] = useState<number | undefined>();
  const [birthYear, setBirthYear] = useState<number | undefined>();
  const [gradeLevel, setGradeLevel] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [jerseyNumber, setJerseyNumber] = useState<number | undefined>();
  const [aspiration, setAspiration] = useState("");
  const [country, setCountry] = useState("USA");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [teams, setTeams] = useState<OnboardingTeam[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamType, setNewTeamType] = useState<"school" | "club" | "rec" | "intramural">("school");
  const [rankedInterests, setRankedInterests] = useState(INTEREST_OPTIONS.map(o => o.value));
  const [draggedInterestIdx, setDraggedInterestIdx] = useState<number | null>(null);
  const [overInterestIdx, setOverInterestIdx] = useState<number | null>(null);
  const interestDragging = useRef(false);

  const [parentEmail, setParentEmail] = useState("");

  const [cardPhotoFile, setCardPhotoFile] = useState<File | null>(null);
  const [cardPhotoPreview, setCardPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [devPriority, setDevPriority] = useState<"log-training" | "drill-library" | "create-drills" | null>(null);
  const [wantAiSuggestions, setWantAiSuggestions] = useState<boolean | null>(null);
  const [tutorialSlide, setTutorialSlide] = useState(0);
  const [basketballLifestyle, setBasketballLifestyle] = useState<string[]>([]);
  const [playr1Moment, setPlayr1Moment] = useState("");
  const [customPlayr1Moment, setCustomPlayr1Moment] = useState("");
  const [showCustomMoment, setShowCustomMoment] = useState(false);
  const [focusSkill, setFocusSkill] = useState("");

  // AI Interview state
  const [interviewMessages, setInterviewMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [interviewInput, setInterviewInput] = useState("");
  const [interviewDone, setInterviewDone] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const [trainerSpecialties, setTrainerSpecialties] = useState(TRAINER_SPECIALTIES.map(s => s.value));
  const [draggedSpecIdx, setDraggedSpecIdx] = useState<number | null>(null);
  const [overSpecIdx, setOverSpecIdx] = useState<number | null>(null);
  const specDragging = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [trainerAlsoCoaches, setTrainerAlsoCoaches] = useState(false);
  const [trainerTeamName, setTrainerTeamName] = useState("");

  const [gameStatsTeams, setGameStatsTeams] = useState<string[]>([]);
  const [logPastGames, setLogPastGames] = useState<boolean | null>(null);
  const [seasonStartMonths, setSeasonStartMonths] = useState<Record<string, number>>({});
  const [wantReminders, setWantReminders] = useState<boolean | null>(null);

  const [currentGameTeamIdx, setCurrentGameTeamIdx] = useState(0);
  const [createdSeasonIds, setCreatedSeasonIds] = useState<Record<string, string>>({});

  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [result, setResult] = useState("");
  const [teamScore, setTeamScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [rebounds, setRebounds] = useState(0);
  const [assists, setAssists] = useState(0);
  const [steals, setSteals] = useState(0);
  const [blocks, setBlocks] = useState(0);
  const [turnovers, setTurnovers] = useState(0);
  const [fouls, setFouls] = useState(0);
  const [fgMade, setFgMade] = useState(0);
  const [fgAttempted, setFgAttempted] = useState(0);
  const [threePtMade, setThreePtMade] = useState(0);
  const [threePtAttempted, setThreePtAttempted] = useState(0);
  const [ftMade, setFtMade] = useState(0);
  const [ftAttempted, setFtAttempted] = useState(0);
  const [minutesPlayed, setMinutesPlayed] = useState(0);

  const resetGameForm = () => {
    setGameDate(new Date().toISOString().split('T')[0]);
    setOpponent("");
    setIsHome(true);
    setResult("");
    setTeamScore(0);
    setOpponentScore(0);
    setPoints(0);
    setRebounds(0);
    setAssists(0);
    setSteals(0);
    setBlocks(0);
    setTurnovers(0);
    setFouls(0);
    setFgMade(0);
    setFgAttempted(0);
    setThreePtMade(0);
    setThreePtAttempted(0);
    setFtMade(0);
    setFtAttempted(0);
    setMinutesPlayed(0);
  };

  const handleCardPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
    const fileType = file.type || "image/jpeg";
    if (file.type && !allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, GIF, WebP, or HEIC image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }
    setCardPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCardPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadCardPhoto = async (): Promise<string | null> => {
    if (!cardPhotoFile) return null;
    setUploadingPhoto(true);
    const contentType = cardPhotoFile.type || "image/jpeg";
    const fileName = cardPhotoFile.name || "photo.jpg";
    try {
      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", {
        name: fileName,
        size: cardPhotoFile.size,
        contentType,
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: cardPhotoFile,
      });
      return objectPath;
    } catch {
      toast({ title: "Photo upload failed", variant: "destructive" });
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const togglePosition = (pos: string) => {
    setPositions(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  };

  const addTeam = () => {
    if (!newTeamName.trim()) return;
    setTeams(prev => [...prev, { name: newTeamName.trim(), type: newTeamType, inSeason: false }]);
    setNewTeamName("");
    setNewTeamType("school");
  };

  const removeTeam = (idx: number) => {
    setTeams(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleTeamInSeason = (idx: number) => {
    setTeams(prev => prev.map((t, i) => i === idx ? { ...t, inSeason: !t.inSeason } : t));
  };

  const teamTypeLabel = (type: string) => {
    if (type === "school") return "School";
    return NON_SCHOOL_TEAM_TYPES.find(t => t.value === type)?.label || type;
  };

  const saveProfile = async () => {
    if (previewMode) return;
    setIsSaving(true);
    try {
      await apiRequest("PUT", "/api/user/name", { firstName, lastName });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      let cardPhotoUrl: string | undefined;
      if (cardPhotoFile) {
        const path = await uploadCardPhoto();
        if (path) cardPhotoUrl = path;
      }

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const playerIsMinor = birthYear ? (currentYear - birthYear < 18 || (currentYear - birthYear === 18 && birthMonth !== undefined && birthMonth > currentMonth)) : false;

      const profileData: Record<string, any> = {
        birthMonth,
        birthYear,
        gradeLevel: gradeLevel || undefined,
        schoolName: teams.filter(t => t.type === "school").map(t => t.name).join(", ") || undefined,
        teamName: teams.filter(t => t.type !== "school").map(t => t.name).join(", ") || undefined,
        positions,
        jerseyNumber,
        aspiration: aspiration || undefined,
        onboardingTeams: JSON.stringify(teams),
        staffRole: selectedRole === "player" ? null : selectedRole,
        isMinor: playerIsMinor,
        parentEmail: playerIsMinor && parentEmail ? parentEmail : undefined,
      };
      if (cardPhotoUrl) profileData.cardPhotoUrl = cardPhotoUrl;

      if (city || stateName || zipCode || country) {
        await apiRequest("PUT", "/api/profile", {
          city: city || undefined,
          state: stateName || undefined,
          zipCode: zipCode || undefined,
          country: country || "USA",
        });
      }

      const existing = await nativeFetch("/api/career").then(r => r.ok ? r.json() : null);
      if (existing) {
        await apiRequest("PUT", "/api/career", profileData);
      } else {
        await apiRequest("POST", "/api/career", profileData);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/location'] });
    } catch (error) {
      toast({ title: "Error saving profile", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getOrCreateSeason = async (teamName: string): Promise<string> => {
    if (createdSeasonIds[teamName]) return createdSeasonIds[teamName];
    const team = teams.find(t => t.name === teamName);
    const typeMap: Record<string, string> = { school: "high-school", club: "aau-travel-club", rec: "recreational", intramural: "recreational" };
    const seasonType = typeMap[team?.type || "school"] || "high-school";
    const resp = await apiRequest("POST", "/api/seasons", {
      name: `${teamName} ${new Date().getFullYear()}`,
      teamName,
      seasonType,
      year: new Date().getFullYear().toString(),
    });
    const season = await resp.json();
    setCreatedSeasonIds(prev => ({ ...prev, [teamName]: season.id }));
    return season.id;
  };

  const submitGame = async () => {
    const teamName = gameStatsTeams[currentGameTeamIdx];
    if (!teamName) return;
    setIsSaving(true);
    try {
      const seasonId = await getOrCreateSeason(teamName);
      await apiRequest("POST", `/api/seasons/${seasonId}/games`, {
        gameDate,
        opponent,
        isHome,
        result,
        teamScore,
        opponentScore,
        points,
        rebounds,
        assists,
        steals,
        blocks,
        turnovers,
        fouls,
        fgMade,
        fgAttempted,
        threePtMade,
        threePtAttempted,
        ftMade,
        ftAttempted,
        minutesPlayed,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
      toast({ title: "Game logged!" });
      resetGameForm();

      if (currentGameTeamIdx < gameStatsTeams.length - 1) {
        setCurrentGameTeamIdx(prev => prev + 1);
      } else {
        await completeOnboarding();
      }
    } catch (error) {
      toast({ title: "Error logging game", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const completeOnboarding = async () => {
    if (previewMode) { onComplete(); return; }
    try {
      await apiRequest("POST", "/api/career/complete-onboarding");
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
      track("onboarding_completed", { role: selectedRole ?? "player" });
      toast({ title: "Welcome to PLAYR1!", description: "Your basketball journey begins now." });
      onComplete();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleRoleSelect = (role: "player" | "trainer" | "player_trainer") => {
    setSelectedRole(role);
    if (role === "trainer" || role === "player_trainer") {
      setStep("trainer-profile");
    } else {
      setStep("profile");
    }
  };

  const handleProfileNext = async () => {
    if (!firstName.trim()) {
      toast({ title: "Please enter your first name", variant: "destructive" });
      return;
    }
    if (!country.trim()) {
      toast({ title: "Please select your country", variant: "destructive" });
      return;
    }
    if (!city.trim()) {
      toast({ title: "Please enter your city", variant: "destructive" });
      return;
    }
    if (country === "USA" && !stateName.trim()) {
      toast({ title: "Please select your state", variant: "destructive" });
      return;
    }
    if (country === "CAN" && !stateName.trim()) {
      toast({ title: "Please select your province", variant: "destructive" });
      return;
    }
    if (country === "USA" && !zipCode.trim()) {
      toast({ title: "Please enter your zip code", variant: "destructive" });
      return;
    }
    await saveProfile();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const playerIsMinor = birthYear ? (currentYear - birthYear < 18 || (currentYear - birthYear === 18 && birthMonth !== undefined && birthMonth > currentMonth)) : false;
    setStep("basketball-life");
  };

  const commitSpecReorder = (from: number, to: number) => {
    setTrainerSpecialties(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  };

  const handleTrainerProfileNext = async () => {
    if (!firstName.trim()) {
      toast({ title: "Please enter your first name", variant: "destructive" });
      return;
    }
    if (!country.trim()) {
      toast({ title: "Please select your country", variant: "destructive" });
      return;
    }
    if (!city.trim()) {
      toast({ title: "Please enter your city", variant: "destructive" });
      return;
    }
    if (country === "USA" && !stateName.trim()) {
      toast({ title: "Please select your state", variant: "destructive" });
      return;
    }
    if (country === "CAN" && !stateName.trim()) {
      toast({ title: "Please select your province", variant: "destructive" });
      return;
    }
    if (country === "USA" && !zipCode.trim()) {
      toast({ title: "Please enter your zip code", variant: "destructive" });
      return;
    }
    if (trainerAlsoCoaches && !trainerTeamName.trim()) {
      toast({ title: "Please enter your team name", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await apiRequest("PUT", "/api/user/name", { firstName, lastName });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      let cardPhotoUrl: string | undefined;
      if (cardPhotoFile) {
        const path = await uploadCardPhoto();
        if (path) cardPhotoUrl = path;
      }

      if (city || stateName || zipCode) {
        await apiRequest("PUT", "/api/profile", {
          city: city || undefined,
          state: stateName || undefined,
          zipCode: zipCode || undefined,
        });
      }

      const profileData: Record<string, any> = {
        staffRole: trainerAlsoCoaches ? "both" : "trainer",
        alsoPlayer: selectedRole === "player_trainer",
        trainerAlsoCoaches,
        trainerTeamName: trainerAlsoCoaches ? trainerTeamName : null,
      };
      if (cardPhotoUrl) profileData.cardPhotoUrl = cardPhotoUrl;

      const existing = await nativeFetch("/api/career").then(r => r.ok ? r.json() : null);
      if (existing) {
        await apiRequest("PUT", "/api/career", profileData);
      } else {
        await apiRequest("POST", "/api/career", profileData);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/location'] });
      setStep("trainer-specialties");
    } catch (error) {
      toast({ title: "Failed to save profile", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrainerSpecialtiesNext = async () => {
    if (!previewMode) {
      const rankedJson = JSON.stringify(trainerSpecialties);
      await apiRequest("PUT", "/api/career", { trainerSpecialties: rankedJson });
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
    }
    setStep("trainer-begin");
  };

  const handleTrainerBeginChoice = async (choice: "create-drill" | "invite-players" | "upload-content") => {
    await completeOnboarding();
    if (previewMode) return;
    if (choice === "create-drill") {
      window.location.href = "/trainer/drills";
    } else if (choice === "invite-players") {
      window.location.href = "/trainer/roster";
    } else {
      window.location.href = "/trainer/videos";
    }
  };

  const handleBasketballLifeNext = () => {
    if (basketballLifestyle.length === 0) {
      toast({ title: "Pick at least one that fits you", variant: "destructive" });
      return;
    }
    setStep("playr1-moment");
  };

  const handlePlayr1MomentNext = () => {
    const finalMoment = showCustomMoment ? customPlayr1Moment.trim() : playr1Moment;
    if (!finalMoment) {
      toast({ title: "Tell us your PLAYR1 moment", variant: "destructive" });
      return;
    }
    if (showCustomMoment) setPlayr1Moment(finalMoment);
    setStep("thirty-day-focus");
  };

  const handleThirtyDayFocusNext = async () => {
    if (!focusSkill) {
      toast({ title: "Pick a skill to focus on", variant: "destructive" });
      return;
    }
    if (!previewMode) {
      const finalMoment = showCustomMoment ? customPlayr1Moment.trim() : playr1Moment;
      await apiRequest("PUT", "/api/career", {
        focusSkill: focusSkill || undefined,
        basketballLifestyle: basketballLifestyle.length > 0 ? basketballLifestyle : undefined,
        playr1Moment: finalMoment || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
    }
    setStep("select-teams");
  };

  const handleTeamsSelected = () => {
    setStep("ai-interview");
  };

  const sendInterviewMessage = async (userMessage?: string) => {
    if (isAiThinking) return;
    setIsAiThinking(true);
    const newMessages: {role: 'user' | 'assistant', content: string}[] = userMessage
      ? [...interviewMessages, { role: 'user', content: userMessage }]
      : interviewMessages;
    if (userMessage) {
      setInterviewMessages(newMessages);
      setInterviewInput("");
    }
    try {
      const res = await apiRequest("POST", "/api/ai/onboarding-chat", {
        messages: newMessages,
        playerContext: {
          aspiration, positions, gradeLevel, focusSkill,
          basketballLifestyle,
          playr1Moment: showCustomMoment ? customPlayr1Moment : playr1Moment,
          teams,
        },
      });
      const data = await res.json();
      const cleanMessage = (data.message as string).replace('[READY_TO_BUILD]', '').trim();
      setInterviewMessages(prev => [...prev, { role: 'assistant', content: cleanMessage }]);
      if (data.isDone) setInterviewDone(true);
    } catch {
      toast({ title: "Couldn't reach the AI coach right now. Try again.", variant: "destructive" });
    } finally {
      setIsAiThinking(false);
    }
  };

  const completeInterview = async () => {
    setIsSaving(true);
    try {
      if (!previewMode) {
        await apiRequest("PUT", "/api/career", {
          aiInterviewData: { messages: interviewMessages, completedAt: new Date().toISOString() },
        });
        queryClient.invalidateQueries({ queryKey: ['/api/career'] });
      }
      setStep("meet-coach");
    } catch {
      toast({ title: "Error saving interview", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (step === "ai-interview" && interviewMessages.length === 0 && !isAiThinking) {
      sendInterviewMessage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interviewMessages, isAiThinking]);

  if (step === "manifesto") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #f97316 0%, transparent 50%), radial-gradient(circle at 70% 80%, #f97316 0%, transparent 50%)' }} />
        <div className="relative z-10 w-full max-w-md px-6 py-12 text-center flex flex-col items-center gap-8">
          {/* Logo */}
          <img
            src={logoLandscape}
            alt="PLAYR1"
            className="h-12 w-[180px] object-contain dark:invert-0 dark:hue-rotate-0 invert hue-rotate-180"
          />
          {/* Main statement */}
          <div className="space-y-4">
            <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase">Your journey starts here</p>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              Every player has a<br />
              <span className="text-orange-400">PLAYR1 version</span><br />
              of themselves.
            </h1>
            <div className="w-12 h-0.5 bg-orange-500 mx-auto" />
            <p className="text-zinc-400 text-lg leading-relaxed">
              This is how you get there.
            </p>
          </div>
          {/* CTA */}
          <Button
            onClick={() => setStep("role")}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold h-14 text-lg rounded-xl mt-4"
            data-testid="button-begin-journey"
          >
            Begin Your Journey
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="text-zinc-600 text-xs">Takes about 2 minutes</p>
        </div>
      </div>
    );
  }

  if (step === "role") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase">Step 1</p>
            <h2 className="text-2xl font-black text-white">How are you showing up?</h2>
            <p className="text-zinc-400 text-sm">This shapes your entire PLAYR1 experience.</p>
          </div>
          <div className="space-y-3">
            {[
              { value: "player" as const, label: "I'm a Player", desc: "Track my development, skills, and stats", icon: User },
              { value: "trainer" as const, label: "I'm a Trainer / Coach", desc: "Develop players and manage my program", icon: Dumbbell },
              { value: "player_trainer" as const, label: "Both — Player & Trainer", desc: "I coach and compete at the same time", icon: ArrowLeftRight },
            ].map(role => {
              const Icon = role.icon;
              return (
                <div
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className={`cursor-pointer p-5 rounded-xl border-2 flex items-center gap-4 transition-all ${
                    selectedRole === role.value
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
                  }`}
                  data-testid={`role-${role.value}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedRole === role.value ? 'bg-orange-500/20' : 'bg-zinc-800'}`}>
                    <Icon className={`w-6 h-6 ${selectedRole === role.value ? 'text-orange-400' : 'text-zinc-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base ${selectedRole === role.value ? 'text-white' : 'text-zinc-200'}`}>{role.label}</p>
                    <p className="text-sm text-zinc-500">{role.desc}</p>
                  </div>
                  {selectedRole === role.value && <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0" />}
                </div>
              );
            })}
          </div>
          <button onClick={() => setStep("manifesto")} className="text-zinc-600 text-sm w-full text-center hover:text-zinc-400 transition-colors" data-testid="button-back-manifesto">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen flex items-start justify-center p-4 py-8 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold">Build Your Player Profile</CardTitle>
            <CardDescription>Tell us about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col items-center">
              <Label className="text-sm font-medium mb-2">Card Photo <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <div className="relative group">
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/30 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('onboarding-card-photo')?.click()}
                  data-testid="button-upload-card-photo"
                >
                  {cardPhotoPreview ? (
                    <img src={cardPhotoPreview} alt="Card photo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2">
                      <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">Upload photo</p>
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                {cardPhotoPreview && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCardPhotoFile(null); setCardPhotoPreview(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                    data-testid="button-remove-card-photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <input
                id="onboarding-card-photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCardPhotoSelect}
                data-testid="input-card-photo"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">This will be the front of your basketball card</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">First Name *</Label>
                <Input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  data-testid="input-first-name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  data-testid="input-last-name"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Birth Month</Label>
                <Select onValueChange={v => setBirthMonth(parseInt(v))} value={birthMonth?.toString()}>
                  <SelectTrigger data-testid="select-birth-month" className="mt-1.5">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Birth Year</Label>
                <Select onValueChange={v => setBirthYear(parseInt(v))} value={birthYear?.toString()}>
                  <SelectTrigger data-testid="select-birth-year" className="mt-1.5">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 36 }, (_, i) => 2026 - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Grade</Label>
              <Select onValueChange={setGradeLevel} value={gradeLevel}>
                <SelectTrigger data-testid="select-grade" className="mt-1.5">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map(grade => (
                    <SelectItem key={grade} value={grade}>{GRADE_LABELS[grade] || grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Country *</Label>
              <Select onValueChange={v => { setCountry(v); setStateName(""); }} value={country}>
                <SelectTrigger data-testid="select-country" className="mt-1.5">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm font-medium">City *</Label>
                <Input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City"
                  data-testid="input-city"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  {country === "USA" ? "State *" : country === "CAN" ? "Province *" : "Region"}
                </Label>
                {country === "USA" ? (
                  <Select onValueChange={setStateName} value={stateName}>
                    <SelectTrigger data-testid="select-state" className="mt-1.5">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : country === "CAN" ? (
                  <Select onValueChange={setStateName} value={stateName}>
                    <SelectTrigger data-testid="select-province" className="mt-1.5">
                      <SelectValue placeholder="Province" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANADIAN_PROVINCES.map(p => (
                        <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={stateName}
                    onChange={e => setStateName(e.target.value)}
                    placeholder="Region / Province"
                    data-testid="input-region"
                    className="mt-1.5"
                  />
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">{country === "USA" ? "Zip *" : "Postal"}</Label>
                <Input
                  value={zipCode}
                  onChange={e => setZipCode(country === "USA" ? e.target.value.replace(/[^0-9]/g, '').slice(0, 5) : e.target.value)}
                  placeholder={country === "USA" ? "Zip" : "Postal code"}
                  inputMode={country === "USA" ? "numeric" : "text"}
                  data-testid="input-zip"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Your Teams</Label>
              <p className="text-xs text-muted-foreground mb-2">Add all the teams you play on</p>
              <div className="space-y-2 mb-2">
                <div className="flex gap-2">
                  <Input
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="Team name"
                    className="flex-1 min-w-0"
                    data-testid="input-new-team-name"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTeam(); } }}
                  />
                  <Button type="button" size="sm" onClick={addTeam} data-testid="button-add-team" className="shrink-0 h-9">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <Select onValueChange={v => setNewTeamType(v as any)} value={newTeamType}>
                  <SelectTrigger className="w-full" data-testid="select-team-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    {NON_SCHOOL_TEAM_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {teams.length > 0 && (
                <div className="space-y-2">
                  {teams.map((team, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/30" data-testid={`team-row-${idx}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{team.name}</p>
                        <p className="text-xs text-muted-foreground">{teamTypeLabel(team.type)}</p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
                        <Checkbox
                          checked={team.inSeason}
                          onCheckedChange={() => toggleTeamInSeason(idx)}
                          data-testid={`checkbox-in-season-${idx}`}
                        />
                        In Season
                      </label>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeTeam(idx)} className="h-9 w-9 shrink-0" data-testid={`button-remove-team-${idx}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Position(s)</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1.5">
                {BASKETBALL_POSITIONS.map(pos => (
                  <div
                    key={pos}
                    onClick={() => togglePosition(pos)}
                    className={`cursor-pointer p-2.5 rounded-md border text-center transition-all ${
                      positions.includes(pos) ? 'bg-primary text-primary-foreground border-primary' : 'hover:border-primary/50'
                    }`}
                    data-testid={`position-${pos}`}
                  >
                    <div className="font-bold text-sm">{pos}</div>
                    <div className="text-[10px] opacity-80">{POSITION_LABELS[pos]?.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Jersey Number</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={jerseyNumber ?? ""}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setJerseyNumber(val ? Math.min(parseInt(val), 99) : undefined);
                }}
                placeholder="00"
                className="mt-1.5 w-24"
                data-testid="input-jersey-number"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Aspiration</Label>
              <p className="text-xs text-muted-foreground mb-2">What do you aspire to achieve in basketball?</p>
              <div className="grid grid-cols-2 gap-2">
                {BASKETBALL_ASPIRATIONS.map(asp => (
                  <div
                    key={asp}
                    onClick={() => setAspiration(asp)}
                    className={`cursor-pointer p-3 rounded-md border text-center text-sm transition-all ${
                      aspiration === asp ? 'bg-primary text-primary-foreground border-primary' : 'hover:border-primary/50'
                    }`}
                    data-testid={`aspiration-${asp}`}
                  >
                    {ASPIRATION_LABELS[asp]}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => { setSelectedRole(null); setStep("role"); }} data-testid="button-back-role">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={handleProfileNext} disabled={isSaving} data-testid="button-next-profile">
                {isSaving ? "Saving..." : "Next"}
                {!isSaving && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "parent-email") {
    const handleParentEmailNext = async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (parentEmail.trim() && !emailRegex.test(parentEmail.trim())) {
        toast({ title: "Please enter a valid email address", variant: "destructive" });
        return;
      }
      setIsSaving(true);
      try {
        await apiRequest("PUT", "/api/career", {
          isMinor: true,
          parentEmail: parentEmail.trim() || undefined,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/career'] });
        setStep("basketball-life");
      } catch {
        toast({ title: "Failed to save", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    };

    const handleSkip = async () => {
      setIsSaving(true);
      try {
        await apiRequest("PUT", "/api/career", { isMinor: true });
        queryClient.invalidateQueries({ queryKey: ['/api/career'] });
        setStep("basketball-life");
      } catch {
        toast({ title: "Failed to save", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Parent / Guardian Access</CardTitle>
            <CardDescription>Optionally let a parent or guardian follow your training — completely up to you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Parent/Guardian Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="email"
                value={parentEmail}
                onChange={e => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                data-testid="input-parent-email"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                After setup, you'll get a unique invite code in your Profile to share with them. They create their own PLAYR1 account and use the code to connect.
              </p>
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("profile")} data-testid="button-back-profile">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleSkip} disabled={isSaving} data-testid="button-skip-parent-email">
                  Skip for now
                </Button>
                <Button type="button" onClick={handleParentEmailNext} disabled={isSaving} data-testid="button-next-parent-email">
                  {isSaving ? "Saving..." : "Next"}
                  {!isSaving && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "basketball-life") {
    const lifestyleOptions = [
      { value: "solo-grinder", label: "Solo Grinder", desc: "I train alone, focused on skill work", icon: Dumbbell },
      { value: "team-player", label: "Team Player", desc: "I'm on an organized team, games are my focus", icon: Users },
      { value: "content-creator", label: "Content Creator", desc: "I film, post, and inspire through my game", icon: Video },
      { value: "trainer-led", label: "Working with a Trainer", desc: "A coach is guiding my development", icon: GraduationCap },
      { value: "tournament-pickup", label: "Tournament & Pickup", desc: "AAU circuits and pickup courts are my scene", icon: Zap },
      { value: "just-starting", label: "Just Getting Started", desc: "New to serious training, here to learn", icon: Star },
    ];
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase">Step 2 of 4</p>
            <h2 className="text-2xl font-black text-white">Your Basketball Life</h2>
            <p className="text-zinc-400 text-sm">How do you show up to the game? Select all that apply.</p>
          </div>
          <div className="space-y-2">
            {lifestyleOptions.map(opt => {
              const Icon = opt.icon;
              const selected = basketballLifestyle.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => setBasketballLifestyle(prev => selected ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                  className={`cursor-pointer p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    selected ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
                  }`}
                  data-testid={`lifestyle-${opt.value}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-orange-500/20' : 'bg-zinc-800'}`}>
                    <Icon className={`w-5 h-5 ${selected ? 'text-orange-400' : 'text-zinc-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${selected ? 'text-white' : 'text-zinc-300'}`}>{opt.label}</p>
                    <p className="text-xs text-zinc-500">{opt.desc}</p>
                  </div>
                  {selected && <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("profile")} className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors px-2" data-testid="button-back-profile">
              ← Back
            </button>
            <Button onClick={handleBasketballLifeNext} className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-6" data-testid="button-next-basketball-life">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "playr1-moment") {
    const momentPresets = [
      "Making the varsity roster",
      "Earning a scholarship offer",
      "Being the best player in my gym",
      "Going viral for my skills",
      "Playing at the next level",
      "Dominating my league",
      "Inspiring others through my game",
      "Becoming my team's best player",
    ];
    const selectedMoment = showCustomMoment ? customPlayr1Moment : playr1Moment;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase">Step 3 of 4</p>
            <h2 className="text-2xl font-black text-white">Your PLAYR1 Moment</h2>
            <p className="text-zinc-400 text-sm">What does it look like when you become your best PLAYR1 self?</p>
          </div>
          <div className="space-y-2">
            {momentPresets.map(preset => {
              const selected = !showCustomMoment && playr1Moment === preset;
              return (
                <div
                  key={preset}
                  onClick={() => { setShowCustomMoment(false); setPlayr1Moment(preset); }}
                  className={`cursor-pointer p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    selected ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
                  }`}
                  data-testid={`moment-preset-${preset.slice(0, 10).replace(/\s/g, '-').toLowerCase()}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? 'border-orange-500 bg-orange-500' : 'border-zinc-600'}`}>
                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <p className={`text-sm font-medium ${selected ? 'text-white' : 'text-zinc-300'}`}>{preset}</p>
                </div>
              );
            })}
            {/* Write your own */}
            <div
              onClick={() => { setShowCustomMoment(true); setPlayr1Moment(""); }}
              className={`cursor-pointer p-4 rounded-xl border-2 flex items-start gap-3 transition-all ${
                showCustomMoment ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
              }`}
              data-testid="moment-custom"
            >
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 ${showCustomMoment ? 'border-orange-500 bg-orange-500' : 'border-zinc-600'}`}>
                {showCustomMoment && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium mb-2 ${showCustomMoment ? 'text-white' : 'text-zinc-300'}`}>
                  <Pen className="w-3.5 h-3.5 inline mr-1.5 opacity-70" />
                  Write your own...
                </p>
                {showCustomMoment && (
                  <Textarea
                    value={customPlayr1Moment}
                    onChange={e => setCustomPlayr1Moment(e.target.value)}
                    placeholder="Describe your PLAYR1 moment in your own words..."
                    className="bg-zinc-800 border-zinc-700 text-white text-sm resize-none min-h-[80px]"
                    onClick={e => e.stopPropagation()}
                    data-testid="input-custom-moment"
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("basketball-life")} className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors px-2" data-testid="button-back-basketball-life">
              ← Back
            </button>
            <Button onClick={handlePlayr1MomentNext} className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-6" data-testid="button-next-playr1-moment">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "thirty-day-focus") {
    const skillOptions = [
      { value: "ball-handling", label: "Ball Handling", desc: "Dribbling, handles, and ball control", icon: HandMetal },
      { value: "shooting", label: "Shooting", desc: "Catch-and-shoot, pull-up, three-point range", icon: Target },
      { value: "passing", label: "Passing", desc: "Vision, delivery, and court awareness", icon: Crosshair },
      { value: "finishing", label: "Finishing", desc: "Layups, contact, and rim attacks", icon: Flame },
      { value: "defense", label: "Defense", desc: "On-ball, off-ball, rotations, and IQ", icon: Shield },
      { value: "workouts", label: "Athleticism", desc: "Speed, strength, conditioning, and agility", icon: Zap },
      { value: "film-session", label: "Film & IQ", desc: "Study the game and sharpen your basketball mind", icon: Brain },
    ];
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase">Step 4 of 4</p>
            <h2 className="text-2xl font-black text-white">Your 30-Day Focus</h2>
            <p className="text-zinc-400 text-sm">What do you want to be noticeably better at in 30 days?</p>
          </div>
          <div className="space-y-2">
            {skillOptions.map(opt => {
              const Icon = opt.icon;
              const selected = focusSkill === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setFocusSkill(opt.value)}
                  className={`cursor-pointer p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    selected ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
                  }`}
                  data-testid={`skill-${opt.value}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-orange-500/20' : 'bg-zinc-800'}`}>
                    <Icon className={`w-5 h-5 ${selected ? 'text-orange-400' : 'text-zinc-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${selected ? 'text-white' : 'text-zinc-300'}`}>{opt.label}</p>
                    <p className="text-xs text-zinc-500">{opt.desc}</p>
                  </div>
                  {selected && <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("playr1-moment")} className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors px-2" data-testid="button-back-playr1-moment">
              ← Back
            </button>
            <Button onClick={handleThirtyDayFocusNext} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-6" data-testid="button-next-thirty-day-focus">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ai-interview") {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950" data-testid="ai-interview-step">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-zinc-800/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-orange-400 text-base font-bold">P1</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">PLAYR1 Coach</p>
            <p className="text-zinc-500 text-xs">Building your personalized plan</p>
          </div>
          <div className="text-xs text-zinc-600 shrink-0">Step 5 of 5</div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {interviewMessages.length === 0 && isAiThinking && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {interviewMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`interview-message-${i}`}>
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-orange-500 text-black font-medium rounded-br-sm'
                  : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {interviewMessages.length > 0 && isAiThinking && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input or CTA */}
        {interviewDone ? (
          <div className="shrink-0 px-4 py-4 border-t border-zinc-800/60 space-y-2">
            <Button
              onClick={completeInterview}
              disabled={isSaving}
              className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold h-14 text-base rounded-xl"
              data-testid="button-build-plan"
            >
              {isSaving && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
              Let's Build My Plan
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="shrink-0 px-4 py-4 border-t border-zinc-800/60">
            <div className="flex gap-2">
              <input
                value={interviewInput}
                onChange={e => setInterviewInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && interviewInput.trim() && !isAiThinking) {
                    e.preventDefault();
                    sendInterviewMessage(interviewInput.trim());
                  }
                }}
                placeholder={isAiThinking ? "Coach is thinking..." : "Type your response..."}
                disabled={isAiThinking}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 disabled:opacity-50"
                data-testid="input-interview-message"
              />
              <Button
                onClick={() => { if (interviewInput.trim() && !isAiThinking) sendInterviewMessage(interviewInput.trim()); }}
                disabled={isAiThinking || !interviewInput.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-black rounded-xl px-4 shrink-0"
                data-testid="button-send-interview"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === "meet-coach") {
    const lifestyleLabels: Record<string, string> = {
      "solo-grinder": "Solo Grinder", "team-player": "Team Player",
      "content-creator": "Content Creator", "trainer-led": "working with a trainer",
      "tournament-pickup": "tournament & pickup player", "just-starting": "player just getting started",
    };
    const skillLabels: Record<string, string> = {
      "ball-handling": "ball handling", "shooting": "shooting", "passing": "passing",
      "finishing": "finishing at the rim", "defense": "defense", "workouts": "athleticism", "film-session": "film & IQ",
    };
    const finalMoment = showCustomMoment ? customPlayr1Moment : playr1Moment;
    const lifestyleText = basketballLifestyle.length > 0
      ? basketballLifestyle.slice(0, 2).map(v => lifestyleLabels[v] || v).join(" and ")
      : "dedicated player";
    const skillText = skillLabels[focusSkill] || focusSkill;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Coach intro card */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-orange-400" />
            </div>
            <div>
              <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase mb-1">Meet Your AI Coach</p>
              <h2 className="text-2xl font-black text-white">Your PLAYR1 journey is set.</h2>
            </div>
          </div>
          {/* Personalized message */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">PLAYR1 Coach</p>
                <p className="text-zinc-500 text-xs">AI-powered, built for your game</p>
              </div>
            </div>
            <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
              <p>
                I see you — a {lifestyleText} with your eyes locked on{" "}
                <span className="text-orange-400 font-semibold">"{finalMoment || "your PLAYR1 self"}"</span>.
              </p>
              <p>
                Your first focus is{" "}
                <span className="text-white font-semibold">{skillText}</span>.
                {" "}We're going to build that into everything — drills, challenges, and your daily routine.
              </p>
              <p>
                Every rep you log brings you closer. Let's get to work.
              </p>
            </div>
          </div>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-2">
            {basketballLifestyle.map(v => (
              <span key={v} className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700">
                {lifestyleLabels[v] || v}
              </span>
            ))}
            {focusSkill && (
              <span className="px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 text-xs font-medium border border-orange-500/30">
                30-day: {skillLabels[focusSkill] || focusSkill}
              </span>
            )}
          </div>
          <Button
            onClick={completeOnboarding}
            disabled={isSaving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold h-14 text-base rounded-xl"
            data-testid="button-complete-onboarding"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Let's Get Started
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "trainer-profile") {
    return (
      <div className="min-h-screen flex items-start justify-center p-4 py-8 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold">Trainer Profile</CardTitle>
            <CardDescription>Tell us about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                  {cardPhotoPreview ? (
                    <img src={cardPhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCardPhotoFile(file);
                        setCardPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                    data-testid="input-trainer-photo"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">First Name *</Label>
                <Input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  data-testid="input-trainer-first-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  data-testid="input-trainer-last-name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Country *</Label>
              <Select onValueChange={v => { setCountry(v); setStateName(""); }} value={country}>
                <SelectTrigger data-testid="select-trainer-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">City *</Label>
                <Input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City"
                  data-testid="input-trainer-city"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {country === "USA" ? "State *" : country === "CAN" ? "Province *" : "Region"}
                </Label>
                {country === "USA" ? (
                  <Select onValueChange={setStateName} value={stateName}>
                    <SelectTrigger data-testid="select-trainer-state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : country === "CAN" ? (
                  <Select onValueChange={setStateName} value={stateName}>
                    <SelectTrigger data-testid="select-trainer-province">
                      <SelectValue placeholder="Province" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANADIAN_PROVINCES.map(p => (
                        <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={stateName}
                    onChange={e => setStateName(e.target.value)}
                    placeholder="Region / Province"
                    data-testid="input-trainer-region"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{country === "USA" ? "Zip *" : "Postal"}</Label>
                <Input
                  value={zipCode}
                  onChange={e => setZipCode(country === "USA" ? e.target.value.replace(/[^0-9]/g, '').slice(0, 5) : e.target.value)}
                  placeholder={country === "USA" ? "Zip" : "Postal code"}
                  inputMode={country === "USA" ? "numeric" : "text"}
                  data-testid="input-trainer-zip"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-border">
                <div>
                  <p className="font-medium text-sm">Do you also coach a team?</p>
                  <p className="text-xs text-muted-foreground">We'll set you up with coach tools too</p>
                </div>
                <Switch
                  checked={trainerAlsoCoaches}
                  onCheckedChange={setTrainerAlsoCoaches}
                  data-testid="switch-also-coaches"
                />
              </div>
              {trainerAlsoCoaches && (
                <div className="space-y-1.5 pl-2 animate-in slide-in-from-top-2">
                  <Label className="text-sm font-medium">Team Name *</Label>
                  <Input
                    value={trainerTeamName}
                    onChange={e => setTrainerTeamName(e.target.value)}
                    placeholder="e.g., West Side Warriors"
                    data-testid="input-trainer-team-name"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => { setSelectedRole(null); setStep("role"); }} data-testid="button-back-role">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={handleTrainerProfileNext} disabled={isSaving} data-testid="button-next-trainer-profile">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "trainer-specialties") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Rank Your Specialties</CardTitle>
            <CardDescription>Drag to rank from strongest to developing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {trainerSpecialties.map((specValue, index) => {
                const spec = TRAINER_SPECIALTIES.find(s => s.value === specValue)!;
                const Icon = spec.icon;
                return (
                  <div
                    key={spec.value}
                    data-spec-idx={index}
                    className={`p-4 rounded-lg border-2 flex items-center gap-3 select-none transition-all ${
                      draggedSpecIdx === index ? 'opacity-50 scale-[0.98] border-primary' : ''
                    } ${
                      overSpecIdx === index && draggedSpecIdx !== null && draggedSpecIdx !== index
                        ? 'border-primary/50 bg-primary/5' : 'border-border'
                    }`}
                    data-testid={`specialty-${spec.value}`}
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div
                      className="cursor-grab active:cursor-grabbing touch-none p-1"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                        setDraggedSpecIdx(index);
                        specDragging.current = true;
                      }}
                      onPointerMove={(e) => {
                        if (!specDragging.current || draggedSpecIdx === null) return;
                        const elements = document.elementsFromPoint(e.clientX, e.clientY);
                        const target = elements.find(el => el.getAttribute('data-spec-idx') !== null);
                        if (target) {
                          const idx = parseInt(target.getAttribute('data-spec-idx')!);
                          setOverSpecIdx(idx);
                        }
                      }}
                      onPointerUp={() => {
                        if (draggedSpecIdx !== null && overSpecIdx !== null && draggedSpecIdx !== overSpecIdx) {
                          commitSpecReorder(draggedSpecIdx, overSpecIdx);
                        }
                        setDraggedSpecIdx(null);
                        setOverSpecIdx(null);
                        specDragging.current = false;
                      }}
                      onPointerCancel={() => {
                        setDraggedSpecIdx(null);
                        setOverSpecIdx(null);
                        specDragging.current = false;
                      }}
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{spec.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("trainer-profile")} data-testid="button-back-trainer-profile">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={handleTrainerSpecialtiesNext} data-testid="button-next-specialties">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "trainer-begin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Where Do You Want to Begin?</CardTitle>
            <CardDescription>Pick one to get started — you can do everything else later</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: "create-drill" as const, label: "Create a Drill or Workout", desc: "Build custom drills for your players", icon: Plus },
              { value: "invite-players" as const, label: "Create Trainee Roster / Invite Players", desc: "Set up your roster and share a join code", icon: Users },
              { value: "upload-content" as const, label: "Upload Your Own Content", desc: "Add videos, drills, or resources", icon: Upload },
            ].map(opt => {
              const Icon = opt.icon;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleTrainerBeginChoice(opt.value)}
                  className="cursor-pointer p-5 rounded-lg border-2 border-border flex items-center gap-4 transition-all hover:border-primary/50 hover:bg-muted/30"
                  data-testid={`trainer-begin-${opt.value}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </div>
                </div>
              );
            })}
            <div className="pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("trainer-specialties")} data-testid="button-back-specialties">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "select-teams") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Track Game Stats</CardTitle>
            <CardDescription>Which team(s) do you want to track stats for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teams.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-muted-foreground">You haven't added any teams yet.</p>
                <p className="text-sm text-muted-foreground">Go back to your profile to add a team, or skip ahead to start tracking stats later.</p>
              </div>
            ) : (
              teams.map((team, idx) => {
                const isSelected = gameStatsTeams.includes(team.name);
                return (
                  <div
                    key={idx}
                    onClick={() => setGameStatsTeams(prev => isSelected ? prev.filter(n => n !== team.name) : [...prev, team.name])}
                    className={`cursor-pointer p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    data-testid={`select-team-${idx}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                      {isSelected && <CheckCircle className="w-4 h-4 text-primary-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{team.name}</p>
                      <p className="text-xs text-muted-foreground">{teamTypeLabel(team.type)} {team.inSeason ? "· In Season" : ""}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("thirty-day-focus")} data-testid="button-back-thirty-day-focus">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={handleTeamsSelected} data-testid="button-next-teams">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

const DEFAULT_PLAYER_CARD_STATS: PlayerCardCareerStatKey[] = ["ppg", "rpg", "apg"];

const PLAYER_CARD_STAT_LABELS: Record<PlayerCardCareerStatKey, string> = {
  ppg: "PPG",
  rpg: "RPG",
  apg: "APG",
  spg: "SPG",
  bpg: "BPG",
  games: "GP",
  record: "W-L",
};

function formatPlayerCardLocation(userProfile: any): string {
  const city = typeof userProfile?.city === "string" ? userProfile.city.trim() : "";
  const state = typeof userProfile?.state === "string" ? userProfile.state.trim() : "";
  if (!city && !state) return "";
  const countryCode = typeof userProfile?.country === "string" ? userProfile.country : "USA";
  const country = COUNTRIES.find((item) => item.code === countryCode || item.name === countryCode);
  const isUnitedStates = country?.code === "USA" || countryCode === "US" || countryCode === "USA";
  return [
    city,
    state,
    isUnitedStates ? null : country?.name ?? countryCode,
  ].filter(Boolean).join(", ");
}

function PlayerCardBack({
  profile,
  careerStats,
  playerProfile,
  userProfile,
  userName,
  positionsText,
  teamLabel,
  location,
  physicalDetails,
  academicDetails,
  selectedCardStats,
  cardStatValues,
}: {
  profile: CareerProfile;
  careerStats?: CareerStats;
  playerProfile?: PlayerProfile | null;
  userProfile?: any;
  userName?: string;
  positionsText: string;
  teamLabel: string;
  location: string;
  physicalDetails: (string | null)[];
  academicDetails: (string | null)[];
  selectedCardStats: PlayerCardCareerStatKey[];
  cardStatValues: Record<PlayerCardCareerStatKey, string>;
}) {
  const portraitPath = userProfile?.profilePhotoUrl || userProfile?.profileImageUrl || profile.cardPhotoUrl;
  const portraitSrc = getObjectUrl(portraitPath) ?? defaultPlayerImg;

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      <div className="flex items-center justify-between border-b border-orange-400/70 px-2.5 py-1.5">
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-orange-300">Player profile</span>
        {profile.jerseyNumber != null && (
          <span className="text-[9px] font-black text-orange-300">#{profile.jerseyNumber}</span>
        )}
      </div>

      <div className="flex items-start gap-2.5 px-2.5 pt-2">
        <img
          src={portraitSrc}
          alt={`${userProfile?.displayName || userName || "Player"} profile`}
          className="h-12 w-12 shrink-0 rounded-full border-2 border-orange-400 object-cover shadow-[0_0_12px_rgba(249,115,22,0.22)]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black uppercase tracking-wide text-white">
            {userProfile?.displayName || userName || teamLabel || "Player"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-tight text-orange-200">
            {playerProfile?.headline || [positionsText, teamLabel].filter(Boolean).join(" — ") || "Player"}
          </p>
          {location && (
            <p className="mt-1 flex items-center gap-1 truncate text-[8px] text-white/55">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-orange-300" />
              {location}
            </p>
          )}
        </div>
      </div>

      <p className="mx-2.5 mt-1.5 line-clamp-2 min-h-[22px] text-[8px] leading-[1.35] text-white/70">
        {playerProfile?.bio?.trim() || "Add a short bio in Player Details."}
      </p>

      <div className="mx-2.5 mt-1.5 border-y border-white/10 py-1.5">
        <div className="min-w-0">
          <p className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.16em] text-white/35">Measurements</p>
          <p className="line-clamp-2 text-[8px] font-semibold leading-snug text-white/80">
            {physicalDetails.length ? physicalDetails.join(" · ") : "Not added"}
          </p>
        </div>
      </div>

      <div className="mx-2.5 mt-1.5 min-w-0 border-b border-white/10 pb-1.5" data-testid="player-card-academics">
        <p className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.16em] text-white/35">Academics</p>
        <div className="space-y-0.5 text-[8px] font-semibold leading-snug text-white/80">
          {academicDetails.length ? academicDetails.map((detail, index) => (
            <p key={`${index}-${detail}`} className="truncate">{detail}</p>
          )) : <p>Not added</p>}
        </div>
      </div>

      <div className="mt-auto px-2.5 pb-1.5 pt-1.5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-white/40">Career highlights</p>
          <span className="text-[7px] text-white/25">{careerStats?.totalGames || 0} games</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${selectedCardStats.length}, minmax(0, 1fr))` }}>
          {selectedCardStats.map((key) => (
            <div key={key} className="rounded-sm border border-orange-400/25 bg-orange-400/[0.07] px-1.5 py-1 text-center">
              <p className="text-[13px] font-black leading-none text-orange-300">
                {cardStatValues[key]}
              </p>
              <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.12em] text-white/45">
                {PLAYER_CARD_STAT_LABELS[key]}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[7px] text-white/25">
          <span>{teamLabel}</span>
          <span>Tap to flip</span>
        </div>
      </div>
    </div>
  );
}

export function BaseballCard({
  profile,
  careerStats,
  onPhotoUpdated,
  userName,
  playerProfile,
  userProfile,
}: {
  profile: CareerProfile;
  careerStats?: CareerStats;
  onPhotoUpdated?: () => void;
  userName?: string;
  playerProfile?: PlayerProfile | null;
  userProfile?: any;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { data: queriedPlayerProfile } = useQuery<PlayerProfile | null>({
    queryKey: ["/api/player-profile"],
    enabled: playerProfile === undefined,
  });
  const { data: queriedUserProfile } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: userProfile === undefined,
  });
  const cardPlayerProfile = playerProfile !== undefined ? playerProfile : queriedPlayerProfile;
  const cardUserProfile = userProfile !== undefined ? userProfile : queriedUserProfile;

  const frontW = 240;
  const frontH = 340;
  const backW = frontW;
  const backH = frontH;

  const photoSrc = profile.cardPhotoUrl
    ? (getObjectUrl(profile.cardPhotoUrl) ?? defaultPlayerImg)
    : defaultPlayerImg;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
    const contentType = file.type || "image/jpeg";
    const fileName = file.name || "photo.jpg";
    if (file.type && !allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, GIF, WebP, or HEIC image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", {
        name: fileName,
        size: file.size,
        contentType,
      });
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });

      await apiRequest("PUT", "/api/career", { cardPhotoUrl: objectPath });
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      onPhotoUpdated?.();
      toast({ title: "Photo updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: "Could not upload photo. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const positionsText = profile.positions && profile.positions.length > 0 ? profile.positions.join(" / ") : "";
  const teamLabel = profile.teamName || profile.schoolName || "";
  const location = formatPlayerCardLocation(cardUserProfile);
  const height = cardPlayerProfile?.heightFeet
    ? `${cardPlayerProfile.heightFeet}'${cardPlayerProfile.heightInches ?? 0}"`
    : null;
  const physicalDetails = [
    height,
    cardPlayerProfile?.weight ? `${cardPlayerProfile.weight} lb` : null,
    cardPlayerProfile?.wingspan ? `${cardPlayerProfile.wingspan} span` : null,
  ].filter(Boolean);
  const academicDetails = [
    cardPlayerProfile?.schoolName || profile.schoolName || null,
    cardPlayerProfile?.gradYear ? `Class of ${cardPlayerProfile.gradYear}` : null,
    cardPlayerProfile?.gpa ? `GPA ${cardPlayerProfile.gpa}` : null,
  ].filter(Boolean);
  const savedCardStats = Array.isArray(cardPlayerProfile?.cardCareerStats)
    ? cardPlayerProfile.cardCareerStats.filter((key): key is PlayerCardCareerStatKey =>
        Object.prototype.hasOwnProperty.call(PLAYER_CARD_STAT_LABELS, key),
      ).slice(0, 3)
    : [];
  const selectedCardStats = savedCardStats.length ? savedCardStats : DEFAULT_PLAYER_CARD_STATS;
  const avgValue = (value: number | undefined) =>
    careerStats?.totalGames && Number.isFinite(value) ? value!.toFixed(1) : "—";
  const cardStatValues: Record<PlayerCardCareerStatKey, string> = {
    ppg: avgValue(careerStats?.avgPoints),
    rpg: avgValue(careerStats?.avgRebounds),
    apg: avgValue(careerStats?.avgAssists),
    spg: avgValue(careerStats?.avgSteals),
    bpg: avgValue(careerStats?.avgBlocks),
    games: careerStats?.totalGames ? String(careerStats.totalGames) : "—",
    record: careerStats && careerStats.wins + careerStats.losses > 0
      ? `${careerStats.wins}–${careerStats.losses}`
      : "—",
  };

  const stageW = 320;
  const maxW = Math.max(stageW, frontW, backW);
  const maxH = Math.max(frontH, backH);

  return (
    <div
      className="cursor-pointer select-none relative"
      style={{
        perspective: "1200px",
        width: maxW,
        height: maxH,
      }}
      onClick={() => setIsFlipped(!isFlipped)}
      data-testid="baseball-card"
    >
      <div
        className="absolute"
        style={{
          width: maxW,
          height: maxH,
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.6s ease",
        }}
      >
        {/* FRONT - Portrait */}
        <div
          className="absolute rounded-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            width: frontW,
            height: frontH,
            left: (maxW - frontW) / 2,
            top: 0,
            border: "3px solid #ff8a24",
            boxShadow: "0 0 16px rgba(249, 115, 22, 0.26), inset 0 0 0 1px rgba(255, 188, 112, 0.24)",
          }}
        >
          <div className="relative w-full h-full bg-black">
            <img
              src={photoSrc}
              alt="Player"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {profile.jerseyNumber != null && (
              <div
                className="absolute top-0 left-0 flex items-center justify-center bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.38)]"
                style={{ width: 34, height: 34 }}
              >
                <span className="text-black font-black text-sm leading-none">
                  {profile.jerseyNumber}
                </span>
              </div>
            )}

            <label
              className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              data-testid="button-upload-card-photo"
            >
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>

            <div className="absolute bottom-0 left-0 right-0">
              <div className="px-3 py-2 text-left" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 60%, rgba(0,0,0,0.7) 85%, transparent 100%)" }}>
                {userName && (
                  <p className="text-gray-300 font-semibold text-base uppercase tracking-wider leading-none truncate" data-testid="text-card-player-name">
                    {userName}
                  </p>
                )}
                {(profile.schoolName || profile.teamName || positionsText) && (
                  <p className="text-orange-300 font-semibold text-[11px] uppercase tracking-wider leading-none mt-1 truncate [text-shadow:0_0_10px_rgba(249,115,22,0.45)]">
                {[positionsText, teamLabel].filter(Boolean).join(" — ")}
                  </p>
                )}
              </div>
            </div>

            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-xs font-medium">Uploading...</div>
              </div>
            )}
          </div>
        </div>

        {/* BACK - Portrait, matching the front dimensions */}
        <div
          className="absolute rounded-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            width: backW,
            height: backH,
            top: (maxH - backH) / 2,
            left: (maxW - backW) / 2,
            border: "3px solid #ff8a24",
            boxShadow: "0 0 16px rgba(249, 115, 22, 0.26), inset 0 0 0 1px rgba(255, 188, 112, 0.24)",
          }}
        >
          <PlayerCardBack
            profile={profile}
            careerStats={careerStats}
            playerProfile={cardPlayerProfile}
            userProfile={cardUserProfile}
            userName={userName}
            positionsText={positionsText}
            teamLabel={teamLabel}
            location={location}
            physicalDetails={physicalDetails}
            academicDetails={academicDetails}
            selectedCardStats={selectedCardStats}
            cardStatValues={cardStatValues}
          />
        </div>
      </div>
    </div>
  );
}

type CareerStats = {
  totalGames: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;
  totalFgMade: number;
  totalFgAttempted: number;
  totalThreePtMade: number;
  totalThreePtAttempted: number;
  totalFtMade: number;
  totalFtAttempted: number;
  wins: number;
  losses: number;
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
    totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
    totalSteals: number;
    totalBlocks: number;
    totalFgMade: number;
    totalFgAttempted: number;
    totalThreePtMade: number;
    totalThreePtAttempted: number;
    totalFtMade: number;
    totalFtAttempted: number;
    wins: number;
    losses: number;
  }>;
};

function fmtPct(made: number, attempted: number): string {
  if (attempted === 0) return "-";
  return ((made / attempted) * 100).toFixed(1) + "%";
}

function StatsOverviewCard({
  careerStats,
  seasons,
  statsScope,
  selectedSeasonId,
  readOnly,
  onScopeChange,
  onSeasonChange,
  seasonGames,
  seasonGamesLoading,
  onCreateSeason,
  onLogGame,
  onShareGame,
  onEditGame,
  onDeleteGame,
}: {
  careerStats?: CareerStats;
  seasons: Season[];
  statsScope: "career" | "season";
  selectedSeasonId: string;
  readOnly: boolean;
  onScopeChange: (scope: "career" | "season") => void;
  onSeasonChange: (seasonId: string) => void;
  seasonGames?: Game[];
  seasonGamesLoading: boolean;
  onCreateSeason: () => void;
  onLogGame: () => void;
  onShareGame: (gameId: string) => void;
  onEditGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
}) {
  const [statsView, setStatsView] = useState<"averages" | "totals">("averages");
  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId);
  const seasonStats = careerStats?.seasonBreakdown?.find((season) => season.seasonId === selectedSeasonId);
  const totals = statsScope === "career" ? {
    games: careerStats?.totalGames ?? 0,
    points: careerStats?.totalPoints ?? 0,
    rebounds: careerStats?.totalRebounds ?? 0,
    assists: careerStats?.totalAssists ?? 0,
    steals: careerStats?.totalSteals ?? 0,
    blocks: careerStats?.totalBlocks ?? 0,
    fgMade: careerStats?.totalFgMade ?? 0,
    fgAttempted: careerStats?.totalFgAttempted ?? 0,
    threeMade: careerStats?.totalThreePtMade ?? 0,
    threeAttempted: careerStats?.totalThreePtAttempted ?? 0,
    ftMade: careerStats?.totalFtMade ?? 0,
    ftAttempted: careerStats?.totalFtAttempted ?? 0,
    wins: careerStats?.wins ?? 0,
    losses: careerStats?.losses ?? 0,
  } : {
    games: seasonStats?.gamesPlayed ?? 0,
    points: seasonStats?.totalPoints ?? 0,
    rebounds: seasonStats?.totalRebounds ?? 0,
    assists: seasonStats?.totalAssists ?? 0,
    steals: seasonStats?.totalSteals ?? 0,
    blocks: seasonStats?.totalBlocks ?? 0,
    fgMade: seasonStats?.totalFgMade ?? 0,
    fgAttempted: seasonStats?.totalFgAttempted ?? 0,
    threeMade: seasonStats?.totalThreePtMade ?? 0,
    threeAttempted: seasonStats?.totalThreePtAttempted ?? 0,
    ftMade: seasonStats?.totalFtMade ?? 0,
    ftAttempted: seasonStats?.totalFtAttempted ?? 0,
    wins: seasonStats?.wins ?? 0,
    losses: seasonStats?.losses ?? 0,
  };
  const statItems = statsView === "averages" ? [
    { label: "PPG", value: totals.games ? (totals.points / totals.games).toFixed(1) : "0.0", highlight: true },
    { label: "RPG", value: totals.games ? (totals.rebounds / totals.games).toFixed(1) : "0.0" },
    { label: "APG", value: totals.games ? (totals.assists / totals.games).toFixed(1) : "0.0" },
    { label: "SPG", value: totals.games ? (totals.steals / totals.games).toFixed(1) : "0.0" },
    { label: "BPG", value: totals.games ? (totals.blocks / totals.games).toFixed(1) : "0.0" },
  ] : [
    { label: "PTS", value: totals.points.toString(), highlight: true },
    { label: "REB", value: totals.rebounds.toString() },
    { label: "AST", value: totals.assists.toString() },
    { label: "STL", value: totals.steals.toString() },
    { label: "BLK", value: totals.blocks.toString() },
  ];
  const hasShootingData = totals.fgAttempted > 0 || totals.threeAttempted > 0 || totals.ftAttempted > 0;
  const recordCount = totals.wins + totals.losses;

  return (
    <Card className="overflow-hidden border-white/[0.08] bg-[#141414] text-zinc-100">
      <CardContent className="space-y-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-400/[0.08] text-orange-300">
              <BarChart className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Stats</p>
              <p className="text-xs font-semibold capitalize text-zinc-300">
                {statsScope === "career" ? `Career ${statsView}` : `${selectedSeason?.name || "Season"} ${statsView}`}
              </p>
            </div>
          </div>
          <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:gap-2">
            <div className="w-[84px] shrink-0 sm:w-48">
              {statsScope === "season" ? (
                <Select value={selectedSeasonId} onValueChange={onSeasonChange} disabled={seasons.length === 0}>
                  <SelectTrigger className="h-9 w-full min-w-0 border-white/10 bg-black/25 px-2 text-[11px] text-zinc-200 sm:px-3 sm:text-xs" data-testid="select-stats-season" aria-label="Choose season stats">
                    <SelectValue className="truncate" placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => <SelectItem key={season.id} value={season.id}>{season.name} ({season.year})</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 w-full" aria-hidden="true" />
              )}
            </div>
            <div className="grid shrink-0 grid-cols-2 rounded-lg border border-white/[0.08] bg-black/30 p-0.5" role="group" aria-label="Choose stats period">
              <Button type="button" size="sm" variant="ghost" aria-pressed={statsScope === "career"} className={`h-8 px-1.5 text-xs ${statsScope === "career" ? "bg-orange-500 font-bold text-zinc-950 hover:bg-orange-400 hover:text-zinc-950" : "text-zinc-400 hover:text-white"}`} onClick={() => onScopeChange("career")} data-testid="button-stats-career">Career</Button>
              <Button type="button" size="sm" variant="ghost" aria-pressed={statsScope === "season"} className={`h-8 px-1.5 text-xs ${statsScope === "season" ? "bg-orange-500 font-bold text-zinc-950 hover:bg-orange-400 hover:text-zinc-950" : "text-zinc-400 hover:text-white"}`} onClick={() => onScopeChange("season")} data-testid="button-stats-season">Season</Button>
            </div>
            <div className="flex shrink-0 gap-0" role="group" aria-label="Choose stat display">
              <Button type="button" size="sm" variant="ghost" onClick={() => setStatsView("averages")} aria-pressed={statsView === "averages"} className={`h-8 px-1.5 text-[11px] ${statsView === "averages" ? "text-orange-300" : "text-zinc-500"}`} data-testid="btn-stats-averages">Averages</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setStatsView("totals")} aria-pressed={statsView === "totals"} className={`h-8 px-1.5 text-[11px] ${statsView === "totals" ? "text-orange-300" : "text-zinc-500"}`} data-testid="btn-stats-totals">Totals</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[
            { label: "Games", value: totals.games, tone: "text-zinc-100" },
            { label: "Wins", value: totals.wins, tone: "text-emerald-400" },
            { label: "Losses", value: totals.losses, tone: "text-zinc-400" },
            { label: "Win rate", value: recordCount ? `${((totals.wins / recordCount) * 100).toFixed(0)}%` : "—", tone: "text-orange-300" },
          ].map((item, index) => (
            <div key={item.label} className={`rounded-lg border border-white/[0.05] bg-black/20 px-2 py-2 text-center ${index === 3 ? "col-span-3 sm:col-span-1" : ""}`}>
              <p className={`font-display text-xl font-black leading-none tabular-nums sm:text-2xl ${item.tone}`}>{item.value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {statItems.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/[0.05] bg-[#1a1a1a] px-1.5 py-2.5 text-center sm:py-3">
              <p className={`font-display text-lg font-black leading-none tabular-nums sm:text-2xl ${item.highlight ? "text-orange-400" : "text-zinc-100"}`}>{item.value}</p>
              <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600">{item.label}</p>
            </div>
          ))}
        </div>
        {hasShootingData && (
          <div className="grid grid-cols-3 divide-x divide-white/[0.07] rounded-lg border border-white/[0.06] bg-black/15 py-2">
            {[
              { label: "FG", value: fmtPct(totals.fgMade, totals.fgAttempted), detail: `${totals.fgMade}/${totals.fgAttempted}` },
              { label: "3PT", value: fmtPct(totals.threeMade, totals.threeAttempted), detail: `${totals.threeMade}/${totals.threeAttempted}` },
              { label: "FT", value: fmtPct(totals.ftMade, totals.ftAttempted), detail: `${totals.ftMade}/${totals.ftAttempted}` },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-sm font-bold tabular-nums text-orange-300">{item.value}</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">{item.label} · {item.detail}</p>
              </div>
            ))}
          </div>
        )}
        {totals.games === 0 && (
          <p className="rounded-lg border border-dashed border-white/[0.08] bg-black/10 px-3 py-2 text-center text-xs text-zinc-500">
            {statsScope === "season" && !selectedSeason
              ? seasons.length > 0
                ? "Choose a season to see its stats."
                : "No season stats available yet."
              : readOnly
                ? "No games logged yet."
                : "No games logged yet. Create a season and log your first game."}
          </p>
        )}
        {statsScope === "season" && selectedSeason && (
          <section aria-labelledby="stats-game-log-heading" className="border-t border-white/[0.07] pt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 id="stats-game-log-heading" className="text-xs font-bold text-zinc-200">Game log</h3>
                <p className="mt-0.5 text-[10px] text-zinc-600">{selectedSeason.name} · {seasonGames?.length ?? 0} games</p>
              </div>
              {!readOnly && (
                <Button type="button" size="sm" onClick={onLogGame} className="h-8 bg-orange-500 px-3 text-xs font-bold text-zinc-950 hover:bg-orange-400" data-testid="button-add-game-overview">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Log Game
                </Button>
              )}
            </div>
            {seasonGamesLoading ? (
              <div className="space-y-2" aria-label="Loading game log">
                <Skeleton className="h-12 rounded-lg bg-zinc-800" />
                <Skeleton className="h-12 rounded-lg bg-zinc-800" />
              </div>
            ) : seasonGames && seasonGames.length > 0 ? (
              <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
                {seasonGames.map((game) => {
                  const date = game.gameDate ? new Date(new Date(game.gameDate).toISOString().split("T")[0] + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
                  return (
                    <article key={game.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2" data-testid={`game-overview-${game.id}`}>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-200">{game.isHome ? "vs" : "@"} {game.opponent || "TBD"}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-600">{date}{game.result ? ` · ${game.result} ${game.teamScore}-${game.opponentScore}` : ""}</p>
                      </div>
                      <p className="text-right text-[10px] font-bold tabular-nums text-zinc-300 sm:text-xs"><span className="text-orange-300">{game.points}</span> PTS<span className="ml-1.5 text-zinc-500">{game.rebounds} REB · {game.assists} AST · {game.steals} STL · {game.blocks} BLK</span></p>
                      <div className="col-span-2 flex justify-end gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-zinc-100" aria-label={`Share stats for ${game.opponent || "game"} on ${date}`} title="Share game stats" onClick={() => onShareGame(game.id)} data-testid={`button-share-game-overview-${game.id}`}><Share2 className="h-3.5 w-3.5" /></Button>
                        {!readOnly && (
                          <>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-zinc-100" aria-label={`Edit game against ${game.opponent || "opponent"}`} title="Edit game" onClick={() => onEditGame(game)} data-testid={`button-edit-game-overview-${game.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-red-300" aria-label={`Delete game against ${game.opponent || "opponent"}`} title="Delete game" onClick={() => onDeleteGame(game.id)} data-testid={`button-delete-game-overview-${game.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-center text-xs text-zinc-500">
                {readOnly ? "No games logged for this season yet." : "No games logged yet. Log the first game for this season."}
              </p>
            )}
          </section>
        )}
        <div className={`flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3 ${readOnly ? "justify-start" : "justify-between"}`}>
          <p className="text-[10px] text-zinc-600">{statsScope === "career" ? "All recorded seasons" : selectedSeason ? `${selectedSeason.year}${selectedSeason.teamName ? ` · ${selectedSeason.teamName}` : ""}` : "Season totals"}</p>
          {!readOnly && (
            <Button type="button" size="sm" variant="outline" onClick={onCreateSeason} className="h-8 border-orange-400/25 bg-orange-400/[0.04] px-3 text-xs text-orange-200 hover:bg-orange-400/10 hover:text-orange-100" data-testid="button-create-season-overview"><Plus className="mr-1.5 h-3.5 w-3.5" />Create Season</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsTab({
  readOnly = false,
  showManagementAtBottom = false,
}: {
  readOnly?: boolean;
  showManagementAtBottom?: boolean;
} = {}) {
  const canManage = !readOnly || showManagementAtBottom;
  const overviewReadOnly = readOnly || showManagementAtBottom;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [statsScope, setStatsScope] = useState<"career" | "season">("career");
  const [statsSeasonId, setStatsSeasonId] = useState<string>("");
  const [showSeasonDialog, setShowSeasonDialog] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [shareGameId, setShareGameId] = useState<string | null>(null);
  const [shareSeasonId, setShareSeasonId] = useState<string | null>(null);
  const [showSeasonShareDialog, setShowSeasonShareDialog] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [postJournalGameId, setPostJournalGameId] = useState<string | null>(null);

  const { data: seasons = [], isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ['/api/seasons']
  });

  const { data: careerStats } = useQuery<CareerStats>({
    queryKey: ['/api/stats/career']
  });

  const { data: statsSeasonGames, isLoading: statsSeasonGamesLoading } = useQuery<Game[]>({
    queryKey: [`/api/seasons/${statsSeasonId}/games`],
    enabled: statsScope === "season" && !!statsSeasonId
  });

  useEffect(() => {
    if (statsSeasonId || seasonsLoading || seasons.length === 0) return;
    const season = seasons.find((entry) => entry.isActive !== false) ?? seasons[0];
    setStatsSeasonId(season.id);
  }, [statsSeasonId, seasons, seasonsLoading]);

  const seasonForm = useForm<SeasonFormData>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      name: "",
      teamName: "",
      seasonType: "",
      year: new Date().getFullYear().toString(),
      startDate: "",
      endDate: "",
      teamGoal: "",
    }
  });

  const gameForm = useForm<GameFormData>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      gameDate: new Date().toISOString().split('T')[0],
      tipoffTime: "",
      eventType: "game",
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
      setShowSeasonDialog(false);
      setEditingSeason(null);
      seasonForm.reset();
      toast({ title: "Season created successfully!" });
    }
  });

  const updateSeasonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SeasonFormData }) => {
      return apiRequest("PUT", `/api/seasons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
      setShowSeasonDialog(false);
      setEditingSeason(null);
      seasonForm.reset();
      toast({ title: "Season updated!" });
    }
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/seasons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
      if (statsSeasonId === deleteSeasonMutation.variables) {
        setStatsSeasonId("");
        setStatsScope("career");
      }
      toast({ title: "Season deleted" });
    }
  });

  const toggleSeasonActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PUT", `/api/seasons/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] });
      toast({ title: "Season updated" });
    }
  });

  const createGameMutation = useMutation({
    mutationFn: async (data: GameFormData & { seasonId: string }) => {
      const { seasonId, ...gameData } = data;
      return apiRequest("POST", `/api/seasons/${seasonId}/games`, gameData);
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${statsSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
      setShowGameDialog(false);
      setEditingGame(null);
      gameForm.reset();
      toast({ title: "Game logged successfully!" });
      const game = await response.json().catch(() => null);
      if (game?.id) setPostJournalGameId(game.id);
    }
  });

  const updateGameMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GameFormData }) => {
      return apiRequest("PUT", `/api/games/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${statsSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${statsSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
      toast({ title: "Game deleted" });
    }
  });

  const handleCreateSeason = (data: SeasonFormData) => {
    if (editingSeason) {
      updateSeasonMutation.mutate({ id: editingSeason.id, data });
    } else {
      createSeasonMutation.mutate(data);
    }
  };

  const openSeasonDialog = (season?: Season) => {
    if (season) {
      setEditingSeason(season);
      seasonForm.reset({
        name: season.name,
        teamName: season.teamName || "",
        seasonType: season.seasonType,
        year: season.year,
        startDate: season.startDate ? new Date(season.startDate).toISOString().split("T")[0] : "",
        endDate: season.endDate ? new Date(season.endDate).toISOString().split("T")[0] : "",
        teamGoal: season.teamGoal || "",
      });
    } else {
      setEditingSeason(null);
      seasonForm.reset({
        name: "",
        teamName: "",
        seasonType: "",
        year: new Date().getFullYear().toString(),
        startDate: "",
        endDate: "",
        teamGoal: "",
      });
    }
    setShowSeasonDialog(true);
  };

  const handleCreateGame = (data: GameFormData) => {
    if (!statsSeasonId) return;
    if (editingGame) {
      updateGameMutation.mutate({ id: editingGame.id, data });
    } else {
      createGameMutation.mutate({ ...data, seasonId: statsSeasonId });
    }
  };

  const openGameDialog = (game?: Game, seasonId?: string) => {
    if (seasonId) {
      setStatsSeasonId(seasonId);
      setStatsScope("season");
    }
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
      {postJournalGameId && (
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-medium">Want to process that game while it is fresh?</p>
              <p className="text-sm text-muted-foreground">Capture the moments, emotions, and next adjustment in your Journal.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setLocation(`/journal?type=post-game&gameId=${postJournalGameId}`); setPostJournalGameId(null); }} data-testid="button-reflect-after-game">Reflect now</Button>
              <Button variant="ghost" onClick={() => setPostJournalGameId(null)} data-testid="button-dismiss-game-reflection">Later</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <StatsOverviewCard
        careerStats={careerStats}
        seasons={seasons}
        statsScope={statsScope}
        selectedSeasonId={statsSeasonId}
        readOnly={overviewReadOnly}
        onScopeChange={(scope) => {
          setStatsScope(scope);
          if (scope === "season" && !statsSeasonId) {
            const season = seasons.find((entry) => entry.isActive !== false) ?? seasons[0];
            if (season) {
              setStatsSeasonId(season.id);
            }
          }
        }}
        onSeasonChange={(seasonId) => {
          setStatsSeasonId(seasonId);
        }}
        seasonGames={statsSeasonGames}
        seasonGamesLoading={statsSeasonGamesLoading}
        onCreateSeason={() => openSeasonDialog()}
        onLogGame={() => {
          if (!statsSeasonId) return;
          openGameDialog();
        }}
        onShareGame={setShareGameId}
        onEditGame={(game) => openGameDialog(game)}
        onDeleteGame={(gameId) => {
          if (confirm('Delete this game?')) {
            deleteGameMutation.mutate(gameId);
          }
        }}
      />

      {canManage && <details className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414]" data-testid="details-season-management">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-400" />
            Season &amp; game management
            <span className="text-[10px] font-medium text-zinc-600">({seasons.length})</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
        </summary>
        <Card className="rounded-none border-0 border-t border-white/[0.07] bg-transparent text-zinc-100 shadow-none">
        <CardHeader className="flex flex-row items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCsvImport(true)} aria-label="Import stats from CSV" data-testid="button-import-csv">
              <Upload className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Dialog open={showSeasonDialog} onOpenChange={(open) => {
              setShowSeasonDialog(open);
              if (!open) { setEditingSeason(null); seasonForm.reset(); }
            }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openSeasonDialog()} aria-label="Add season" data-testid="button-create-season">
                <Plus className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Add Season</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSeason ? "Edit Season" : "Create New Season"}</DialogTitle>
                <DialogDescription>
                  {editingSeason ? "Update your season details" : "Add a new season to track your game statistics"}
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
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField
                       control={seasonForm.control}
                       name="startDate"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Season Start</FormLabel>
                           <FormControl>
                             <Input type="date" {...field} data-testid="input-season-start-date" />
                           </FormControl>
                           <FormDescription>Used to determine In Season mode.</FormDescription>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                     <FormField
                       control={seasonForm.control}
                       name="endDate"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Season End</FormLabel>
                           <FormControl>
                             <Input type="date" {...field} data-testid="input-season-end-date" />
                           </FormControl>
                           <FormDescription>After this date, PLAYR1 returns to Off Season.</FormDescription>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>
                   <FormField
                     control={seasonForm.control}
                     name="teamGoal"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>What does success look like for this team?</FormLabel>
                         <FormControl>
                           <Textarea placeholder="e.g., Win the league and become a reliable two-way starter" {...field} data-testid="input-team-goal" />
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
                    disabled={createSeasonMutation.isPending || updateSeasonMutation.isPending}
                    data-testid="button-submit-season"
                  >
                    {(createSeasonMutation.isPending || updateSeasonMutation.isPending)
                      ? (editingSeason ? "Saving..." : "Creating...")
                      : (editingSeason ? "Save Changes" : "Create Season")}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs leading-relaxed text-zinc-500">
            Add seasons and log games here. Select a season above to view its stats and read-only game log.
          </p>
          {seasons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.08] px-4 py-6 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-300">No seasons yet</p>
              <p className="mt-1 text-xs text-zinc-500">Create a season to start tracking game stats.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...seasons]
                .sort((a, b) => (a.isActive === false ? 1 : 0) - (b.isActive === false ? 1 : 0))
                .map((season) => {
                  const isActive = season.isActive !== false;
                  return (
                    <article
                      key={season.id}
                      className={`flex flex-col gap-3 rounded-lg border border-white/[0.07] bg-black/15 p-3 sm:flex-row sm:items-center sm:justify-between ${!isActive ? "opacity-75" : ""}`}
                      data-testid={`season-item-${season.id}`}
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="truncate text-left text-sm font-bold text-zinc-100 transition hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                          onClick={() => {
                            setStatsSeasonId(season.id);
                            setStatsScope("season");
                          }}
                          aria-label={`View ${season.name} stats`}
                        >
                          {season.name}
                        </button>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                          <Badge variant="outline" className="h-5 border-white/10 px-1.5 text-[10px]">
                            {SEASON_TYPE_LABELS[season.seasonType]}
                          </Badge>
                          <Badge variant={isActive ? "default" : "secondary"} className="h-5 px-1.5 text-[10px]">
                            {isActive ? "Active" : "Completed"}
                          </Badge>
                          <span>{season.year}</span>
                          {season.teamName && <span>· {season.teamName}</span>}
                          {season.startDate && season.endDate && (
                            <span>
                              · {new Date(season.startDate).toLocaleDateString()} – {new Date(season.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 self-end sm:self-auto">
                        {showManagementAtBottom && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-orange-400/20 px-2 text-[11px] text-orange-200 hover:bg-orange-400/10 hover:text-orange-100"
                            onClick={() => openGameDialog(undefined, season.id)}
                            aria-label={`Add game to ${season.name}`}
                            data-testid={`button-add-game-to-season-${season.id}`}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add Game
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => toggleSeasonActiveMutation.mutate({ id: season.id, isActive: !isActive })}
                          title={isActive ? "Mark as Completed" : "Mark as Active"}
                          aria-label={isActive ? `Mark ${season.name} as completed` : `Mark ${season.name} as active`}
                          data-testid={`button-toggle-season-${season.id}`}
                        >
                          {isActive ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-zinc-500" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openSeasonDialog(season)}
                          title="Edit season"
                          aria-label={`Edit ${season.name}`}
                          data-testid={`button-edit-season-${season.id}`}
                        >
                          <Pencil className="h-4 w-4 text-zinc-400" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setShareSeasonId(season.id);
                            setShowSeasonShareDialog(true);
                          }}
                          title="Share season stats"
                          aria-label={`Share ${season.name} stats`}
                          data-testid={`button-share-season-${season.id}`}
                        >
                          <Share2 className="h-4 w-4 text-zinc-400" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:text-red-300"
                          onClick={() => {
                            if (confirm("Delete this season and all its games?")) {
                              deleteSeasonMutation.mutate(season.id);
                            }
                          }}
                          title="Delete season"
                          aria-label={`Delete ${season.name}`}
                          data-testid={`button-delete-season-${season.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-zinc-400" />
                        </Button>
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </CardContent>
        </Card>
      </details>}

      {canManage && (
      <>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      <CsvImportDialog open={showCsvImport} onOpenChange={setShowCsvImport} />

      <WorkoutShareDialog
        open={showSeasonShareDialog}
        onOpenChange={(open) => {
          setShowSeasonShareDialog(open);
          if (!open) setShareSeasonId(null);
        }}
        seasonId={shareSeasonId}
        defaultTab="season"
      />
      </>
      )}

      {shareGameId && (
        <ShareCardDialog
          open={!!shareGameId}
          onOpenChange={(open) => { if (!open) setShareGameId(null); }}
          gameId={shareGameId}
        />
      )}
    </div>
  );
}

type TrophySection = "achievements" | "challenges" | "prs" | "awards";
// Achievements hidden until achievement definitions are seeded

export function TrophyRoomTab({
  achievements, 
  userChallenges, 
  personalRecords, 
  teamAwards,
  profile
}: { 
  achievements?: Array<UserAchievement & { achievement: CareerAchievement }>;
  userChallenges?: Array<UserChallenge & { challenge: Challenge }>;
  personalRecords?: Array<PersonalRecord & { drill: { title: string } }>;
  teamAwards?: TeamAward[];
  profile: CareerProfile;
}) {
  const { toast } = useToast();
  const defaultOrder: TrophySection[] = ["challenges", "prs", "awards"];
  if (!profile) return null;
  const savedOrder = profile.trophyRoomOrder as TrophySection[] | null;
  const initialOrder = savedOrder && savedOrder.length === defaultOrder.length && savedOrder.every(s => defaultOrder.includes(s))
    ? savedOrder
    : defaultOrder;
  const [sectionOrder, setSectionOrder] = useState<TrophySection[]>(initialOrder);
  const [collapsedSections, setCollapsedSections] = useState<Set<TrophySection>>(new Set());
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [editingAward, setEditingAward] = useState<TeamAward | null>(null);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);

  const awardFormSchema = insertTeamAwardSchema.pick({
    awardName: true,
    teamName: true,
    awardType: true,
    season: true,
    description: true,
  }).extend({
    awardName: z.string().min(1, "Award name is required"),
    teamName: z.string().min(1, "Team name is required"),
    awardType: z.string().default("team"),
    season: z.string().optional(),
    description: z.string().optional(),
  });

  const awardForm = useForm<z.infer<typeof awardFormSchema>>({
    resolver: zodResolver(awardFormSchema),
    defaultValues: { awardName: "", teamName: "", awardType: "team", season: "", description: "" },
  });

  const challengeFormSchema = insertChallengeSchema.pick({
    name: true,
    description: true,
    category: true,
    metric: true,
    goalType: true,
    targetValue: true,
    timeLimit: true,
  }).extend({
    name: z.string().min(1, "Challenge name is required"),
    description: z.string().optional(),
    targetValue: z.coerce.number().min(1, "Target must be at least 1"),
    timeLimit: z.coerce.number().optional(),
  });

  const challengeFormHook = useForm<z.infer<typeof challengeFormSchema>>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: { name: "", description: "", category: "shooting", metric: "makes", goalType: "total", targetValue: 100, timeLimit: undefined },
  });

  const createAwardMutation = useMutation({
    mutationFn: async (data: z.infer<typeof awardFormSchema>) => {
      return apiRequest("POST", "/api/team-awards", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-awards'] });
      setShowAwardDialog(false);
      awardForm.reset();
      toast({ title: "Award Added", description: "Your award has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add award.", variant: "destructive" });
    }
  });

  const updateAwardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof awardFormSchema> }) => {
      return apiRequest("PUT", `/api/team-awards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-awards'] });
      setShowAwardDialog(false);
      setEditingAward(null);
      awardForm.reset();
      toast({ title: "Award Updated", description: "Your award has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update award.", variant: "destructive" });
    }
  });

  const deleteAwardMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/team-awards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-awards'] });
      toast({ title: "Award Deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete award.", variant: "destructive" });
    }
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof challengeFormSchema>) => {
      const payload: any = { ...data };
      if (!data.timeLimit || data.timeLimit <= 0) delete payload.timeLimit;
      return apiRequest("POST", "/api/challenges", payload);
    },
    onSuccess: async (res) => {
      const challenge = await res.json();
      await apiRequest("POST", `/api/challenges/${challenge.id}/start`);
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      setShowChallengeDialog(false);
      challengeFormHook.reset();
      toast({ title: "Challenge Created", description: "Your challenge is now active!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create challenge.", variant: "destructive" });
    }
  });

  const openEditAward = (award: TeamAward) => {
    setEditingAward(award);
    awardForm.reset({
      awardName: award.awardName,
      teamName: award.teamName,
      awardType: award.awardType || "team",
      season: award.season || "",
      description: award.description || ""
    });
    setShowAwardDialog(true);
  };

  const openNewAward = () => {
    setEditingAward(null);
    awardForm.reset({ awardName: "", teamName: "", awardType: "team", season: "", description: "" });
    setShowAwardDialog(true);
  };

  const handleAwardSubmit = awardForm.handleSubmit((data) => {
    if (editingAward) {
      updateAwardMutation.mutate({ id: editingAward.id, data });
    } else {
      createAwardMutation.mutate(data);
    }
  });

  const handleChallengeSubmit = challengeFormHook.handleSubmit((data) => {
    createChallengeMutation.mutate(data);
  });

  const getItemElements = (): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.children) as HTMLElement[];
  };

  const getIndexAtY = (clientY: number): number | null => {
    const items = getItemElements();
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    return null;
  };

  const commitReorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const newOrder = [...sectionOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setSectionOrder(newOrder);
    apiRequest("PUT", "/api/career", { trophyRoomOrder: newOrder }).catch(() => {});
  };

  const onPointerDown = (idx: number) => (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("select")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDragging.current = false;
    setDraggedIdx(idx);
    setOverIdx(idx);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (draggedIdx === null) return;
    isDragging.current = true;
    const hit = getIndexAtY(e.clientY);
    if (hit !== null && hit !== overIdx) setOverIdx(hit);
  };

  const onPointerUp = () => {
    if (draggedIdx !== null && overIdx !== null && isDragging.current) {
      commitReorder(draggedIdx, overIdx);
    }
    setDraggedIdx(null);
    setOverIdx(null);
    isDragging.current = false;
  };

  const toggleSection = (section: TrophySection) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const renderSectionHeader = (section: TrophySection, icon: React.ReactNode, title: string, action?: React.ReactNode) => {
    const isCollapsed = collapsedSections.has(section);
    return (
      <CardHeader
        className="cursor-pointer select-none"
        onClick={(e) => {
          if (!isDragging.current) toggleSection(section);
        }}
        data-testid={`section-header-${section}`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            {icon}
            {title}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
          </CardTitle>
          <div className="flex items-center gap-2">
            {action}
            <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
          </div>
        </div>
      </CardHeader>
    );
  };

  const renderSection = (section: TrophySection, index: number) => {
    switch (section) {
      case "achievements":
        return null; // Hidden until achievement definitions are seeded

      case "challenges":
        return (
          <Card key="challenges">
            {renderSectionHeader("challenges", <Target className="w-5 h-5 text-green-500" />, "Challenges", 
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {userChallenges?.some(uc => !uc.isCompleted) && (
                  <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">Active</Badge>
                )}
                <Button size="sm" onClick={() => setShowChallengeDialog(true)} data-testid="button-create-challenge">
                  <Plus className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Create Challenge</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            )}
            {!collapsedSections.has("challenges") && <CardContent>
              {(() => {
                const activeChallenges = userChallenges?.filter(uc => !uc.isCompleted) || [];
                const completedChallenges = userChallenges?.filter(uc => uc.isCompleted) || [];
                const hasChallenges = activeChallenges.length > 0 || completedChallenges.length > 0;
                return hasChallenges ? (
                  <div className="space-y-3">
                    {activeChallenges.map((uc) => (
                      <div key={uc.id} className="p-3 border rounded-lg flex items-center justify-between gap-2 flex-wrap" data-testid={`active-challenge-${uc.id}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5 text-orange-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{uc.challenge.name}</p>
                              <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30 shrink-0">Active</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {uc.currentValue || 0} / {uc.challenge.targetValue} {uc.challenge.metric}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {completedChallenges.map((uc) => (
                      <div key={uc.id} className="p-3 border rounded-lg flex items-center justify-between gap-2 flex-wrap" data-testid={`completed-challenge-${uc.id}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                            <Trophy className="w-5 h-5 text-green-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{uc.challenge.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {uc.challenge.targetValue} {uc.challenge.metric} {uc.completedAt ? `completed ${new Date(uc.completedAt).toLocaleDateString()}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-600 shrink-0">Completed</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Start challenges from Training Log to see them here!</p>
                  </div>
                );
              })()}
            </CardContent>}
          </Card>
        );

      case "prs":
        return (
          <Card key="prs">
            {renderSectionHeader("prs", <Medal className="w-5 h-5 text-amber-500" />, "Personal Records (PRs)")}
            {!collapsedSections.has("prs") && <CardContent>
              {personalRecords && personalRecords.length > 0 ? (() => {
                const bestByMetric = new Map<string, { value: number; source: string; metricName: string; achievedAt: Date | string | null }>();
                personalRecords.forEach((pr) => {
                  const key = pr.metricName;
                  const val = Number(pr.newValue);
                  const existing = bestByMetric.get(key);
                  if (!existing || val > existing.value) {
                    bestByMetric.set(key, { value: val, source: pr.source || "drill", metricName: pr.metricName, achievedAt: pr.achievedAt });
                  }
                });

                const PR_DISPLAY: Record<string, { label: string; suffix?: string }> = {
                  "Points": { label: "Single Game Points" },
                  "Assists": { label: "Single Game Assists" },
                  "Rebounds": { label: "Single Game Rebounds" },
                  "Steals": { label: "Single Game Steals" },
                  "Blocks": { label: "Single Game Blocks" },
                  "3PT Made": { label: "Single Game 3-Pointers" },
                  "FG Made": { label: "Single Game FG Made" },
                  "FT Made": { label: "Single Game Free Throws" },
                  "Shooting %": { label: "Best Shooting %", suffix: "%" },
                  "Score": { label: "Best Drill Score" },
                  "Shots Made": { label: "Best Shots Made" },
                  "Duration": { label: "Longest Session", suffix: "min" },
                  "Reps": { label: "Most Reps" },
                };

                const entries = Array.from(bestByMetric.entries()).map(([key, data]) => ({
                  key,
                  ...data,
                  display: PR_DISPLAY[key] || { label: key },
                }));

                const categoryStyles: Record<string, { border: string; bg: string; leftBorder: string; badgeBorder: string; badgeText: string; label: string; icon: string }> = {
                  game: { border: "border-green-500/20", bg: "bg-green-500/5", leftBorder: "border-l-green-500", badgeBorder: "border-green-500/40", badgeText: "text-green-600 dark:text-green-400", label: "Game", icon: "🏀" },
                  season: { border: "border-blue-500/20", bg: "bg-blue-500/5", leftBorder: "border-l-blue-500", badgeBorder: "border-blue-500/40", badgeText: "text-blue-600 dark:text-blue-400", label: "Season", icon: "📅" },
                  drill: { border: "border-orange-500/20", bg: "bg-orange-500/5", leftBorder: "border-l-orange-500", badgeBorder: "border-orange-500/40", badgeText: "text-orange-600 dark:text-orange-400", label: "Training", icon: "🎯" },
                };

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {entries.map((entry) => {
                      const cat = categoryStyles[entry.source] || categoryStyles.drill;
                      const formattedVal = entry.value % 1 === 0 ? entry.value.toString() : entry.value.toFixed(1);
                      const dateStr = entry.achievedAt ? new Date(entry.achievedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
                      return (
                        <div
                          key={entry.key}
                          className={`text-center px-3 py-2 rounded-md border border-l-4 ${cat.border} ${cat.bg} ${cat.leftBorder}`}
                          data-testid={`pr-card-${entry.key.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <p className="text-2xl font-bold">
                            {formattedVal}{entry.display.suffix || ""}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 leading-tight">{entry.display.label}</p>
                          <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cat.badgeBorder} ${cat.badgeText}`}>
                              {cat.label}
                            </Badge>
                            {dateStr && (
                              <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
                <div className="text-center p-8">
                  <Medal className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Beat your previous records to earn PR badges!</p>
                </div>
              )}
            </CardContent>}
          </Card>
        );

      case "awards":
        return (
          <Card key="awards">
            {renderSectionHeader("awards", <Trophy className="w-5 h-5 text-yellow-500" />, "Awards", 
              <div onClick={(e) => e.stopPropagation()}>
                <Button size="sm" onClick={openNewAward} data-testid="button-add-award">
                  <Plus className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Add Award</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            )}
            {!collapsedSections.has("awards") && <CardContent>
              {teamAwards && teamAwards.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {teamAwards.map((award) => (
                    <div key={award.id} className="p-4 border rounded-lg text-center relative group" data-testid={`award-item-${award.id}`}>
                      <div className="absolute top-2 right-2 flex gap-1 invisible group-hover:visible">
                        <Button size="icon" variant="ghost" onClick={() => openEditAward(award)} data-testid={`button-edit-award-${award.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteAwardMutation.mutate(award.id)} data-testid={`button-delete-award-${award.id}`}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                      <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                      <p className="font-medium">{award.awardName}</p>
                      <p className="text-sm text-muted-foreground">{award.teamName}</p>
                      <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${award.awardType === "personal" ? "border-purple-500/40 text-purple-600 dark:text-purple-400" : "border-blue-500/40 text-blue-600 dark:text-blue-400"}`}>
                          {award.awardType === "personal" ? "Personal" : "Team"}
                        </Badge>
                        {award.season && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{award.season}</Badge>}
                      </div>
                      {award.description && <p className="text-xs text-muted-foreground mt-1">{award.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No awards yet. Add your team awards and achievements!</p>
                </div>
              )}
            </CardContent>}
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-6" ref={containerRef}>
        {sectionOrder.map((section, index) => (
          <div
            key={section}
            onPointerDown={onPointerDown(index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`transition-all duration-200 ${
              draggedIdx === index ? "opacity-50 scale-[0.98]" : ""
            } ${
              overIdx === index && draggedIdx !== null && draggedIdx !== index
                ? "ring-2 ring-primary ring-offset-2 rounded-xl"
                : ""
            }`}
            data-testid={`draggable-section-${section}`}
          >
            {renderSection(section, index)}
          </div>
        ))}
      </div>

      <Dialog open={showAwardDialog} onOpenChange={(open) => { setShowAwardDialog(open); if (!open) { setEditingAward(null); awardForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAward ? "Edit Award" : "Add Award"}</DialogTitle>
            <DialogDescription>
              {editingAward ? "Update your award details." : "Add a team award or achievement you've earned."}
            </DialogDescription>
          </DialogHeader>
          <Form {...awardForm}>
            <form onSubmit={handleAwardSubmit} className="space-y-4">
              <FormField
                control={awardForm.control}
                name="awardName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Award Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Most Valuable Player" {...field} data-testid="input-award-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={awardForm.control}
                name="awardType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Award Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "team"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-award-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={awardForm.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Eagles Basketball" {...field} data-testid="input-award-team" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={awardForm.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2024-25" {...field} data-testid="input-award-season" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={awardForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us about this award..." {...field} data-testid="input-award-description" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAwardDialog(false)} data-testid="button-cancel-award">Cancel</Button>
                <Button
                  type="submit"
                  disabled={createAwardMutation.isPending || updateAwardMutation.isPending}
                  data-testid="button-save-award"
                >
                  {(createAwardMutation.isPending || updateAwardMutation.isPending) ? "Saving..." : (editingAward ? "Update" : "Add Award")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showChallengeDialog} onOpenChange={(open) => { setShowChallengeDialog(open); if (!open) challengeFormHook.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Challenge</DialogTitle>
            <DialogDescription>
              Set a goal and challenge yourself to reach it.
            </DialogDescription>
          </DialogHeader>
          <Form {...challengeFormHook}>
            <form onSubmit={handleChallengeSubmit} className="space-y-4">
              <FormField
                control={challengeFormHook.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challenge Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 100 Makes Challenge" {...field} data-testid="input-challenge-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={challengeFormHook.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your challenge..." {...field} data-testid="input-challenge-description" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={challengeFormHook.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-challenge-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHALLENGE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={challengeFormHook.control}
                  name="metric"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metric</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-challenge-metric">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHALLENGE_METRICS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m.charAt(0).toUpperCase() + m.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={challengeFormHook.control}
                  name="goalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-challenge-goal-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHALLENGE_GOAL_TYPES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g.charAt(0).toUpperCase() + g.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={challengeFormHook.control}
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Value *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="e.g., 100" {...field} data-testid="input-challenge-target" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {challengeFormHook.watch("goalType") === "timed" && (
                <FormField
                  control={challengeFormHook.control}
                  name="timeLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Limit (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="e.g., 60" {...field} data-testid="input-challenge-time" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowChallengeDialog(false)} data-testid="button-cancel-challenge">Cancel</Button>
                <Button
                  type="submit"
                  disabled={createChallengeMutation.isPending}
                  data-testid="button-save-challenge"
                >
                  {createChallengeMutation.isPending ? "Creating..." : "Start Challenge"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CareerDashboard({ profile }: { profile: CareerProfile }) {
  const { user } = useAuth();
  const playerName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : undefined;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    return (tab === 'profile' || tab === 'trophy-room' || tab === 'stats') ? tab : 'profile';
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSkillDialogOpen, setIsSkillDialogOpen] = useState(false);
  const { data: userProfile } = useQuery<any>({
    queryKey: ['/api/profile'],
  });

  const [editFormData, setEditFormData] = useState({
    jerseyNumber: profile.jerseyNumber || 0,
    positions: profile.positions || [],
    gradeLevel: profile.gradeLevel || "",
    schoolName: profile.schoolName || "",
    teamName: profile.teamName || "",
    aspiration: profile.aspiration || "",
    city: "",
    state: "",
    zipCode: "",
    skillBallHandling: profile.skillBallHandling ?? 5,
    skillShooting: profile.skillShooting ?? 5,
    skillPassing: profile.skillPassing ?? 5,
    skillFinishing: profile.skillFinishing ?? 5,
    skillDefense: profile.skillDefense ?? 5,
    skillBasketballIQ: profile.skillBasketballIQ ?? 5,
    skillAthletics: profile.skillAthletics ?? 5,
    focusSkill: profile.focusSkill || "",
  });

  const { data: careerStats } = useQuery<CareerStats>({
    queryKey: ['/api/stats/career']
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
      const { city: _city, state: _state, zipCode: _zipCode, ...careerData } = data;
      await apiRequest("PUT", "/api/career", careerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/location'] });
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

  const updateSkillsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/career", {
        skillBallHandling: editFormData.skillBallHandling,
        skillShooting: editFormData.skillShooting,
        skillPassing: editFormData.skillPassing,
        skillFinishing: editFormData.skillFinishing,
        skillDefense: editFormData.skillDefense,
        skillBasketballIQ: editFormData.skillBasketballIQ,
        skillAthletics: editFormData.skillAthletics,
        focusSkill: editFormData.focusSkill,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
      setIsSkillDialogOpen(false);
      toast({
        title: "Skill Ratings Updated",
        description: "Your skill ratings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update skill ratings. Please try again.",
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

  const skillValues = [
    profile.skillBallHandling,
    profile.skillShooting,
    profile.skillPassing,
    profile.skillFinishing,
    profile.skillDefense,
    profile.skillBasketballIQ,
    profile.skillAthletics,
  ].filter((v): v is number => v != null && v > 0);
  const overallRating = skillValues.length > 0
    ? Math.round(skillValues.reduce((a, b) => a + b, 0) / skillValues.length)
    : null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-1">
        <a href="/profile-hub" onClick={(e) => { e.preventDefault(); window.history.back(); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-career-back">
          <ChevronLeft className="w-4 h-4" /> Back
        </a>
      </div>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">My Career</h1>
        <BaseballCard profile={profile} careerStats={careerStats} userName={playerName} onPhotoUpdated={() => queryClient.invalidateQueries({ queryKey: ["/api/career"] })} />
         <div className="w-full max-w-xl">
           <p className="text-xs text-muted-foreground uppercase tracking-[0.18em] font-semibold mb-2">Player Development</p>
           <div className="grid grid-cols-2 gap-3">
             <Link
               href="/archetypes"
               className="flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-3 text-sm font-bold text-orange-300 transition-colors hover:bg-orange-500/20"
               data-testid="button-career-archetype"
             >
               <Fingerprint className="w-4 h-4" />
               Archetype
             </Link>
             <Link
               href="/development"
               className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
               data-testid="button-career-development-profile"
             >
               <Target className="w-4 h-4" />
               Development Profile
             </Link>
           </div>
         </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 mb-6">
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
          {/* XP / Experience Progress card hidden — custom point system coming */}

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
                  city: userProfile?.city || "",
                  state: userProfile?.state || "",
                  zipCode: userProfile?.zipCode || "",
                  skillBallHandling: profile.skillBallHandling ?? 5,
                  skillShooting: profile.skillShooting ?? 5,
                  skillPassing: profile.skillPassing ?? 5,
                  skillFinishing: profile.skillFinishing ?? 5,
                  skillDefense: profile.skillDefense ?? 5,
                  skillBasketballIQ: profile.skillBasketballIQ ?? 5,
                  skillAthletics: profile.skillAthletics ?? 5,
                  focusSkill: profile.focusSkill || "",
                });
                setIsEditDialogOpen(true);
              }}
              data-testid="button-edit-player-info"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
                    boxShadow: '0 0 0 4px rgba(249,115,22,0.2), 0 0 30px rgba(249,115,22,0.35), 0 0 60px rgba(249,115,22,0.1)',
                  }}
                >
                  {overallRating != null ? overallRating : "—"}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {overallRating != null ? "Overall Rating" : "Not yet rated"}
              </p>
            </div>
            
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
                <div className="flex justify-between items-start gap-4">
                  <span className="text-muted-foreground shrink-0">Team</span>
                  <span className="font-medium text-right">{profile.teamName}</span>
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
              {(userProfile?.city || userProfile?.state) && (
                <div className="flex justify-between" data-testid="text-player-location">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Location
                  </span>
                  <span className="font-medium">
                    {[userProfile?.city, userProfile?.state].filter(Boolean).join(", ")}
                    {userProfile?.zipCode ? ` ${userProfile.zipCode}` : ""}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Skill Ratings
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditFormData(prev => ({
                  ...prev,
                  skillBallHandling: profile.skillBallHandling ?? 5,
                  skillShooting: profile.skillShooting ?? 5,
                  skillPassing: profile.skillPassing ?? 5,
                  skillFinishing: profile.skillFinishing ?? 5,
                  skillDefense: profile.skillDefense ?? 5,
                  skillBasketballIQ: profile.skillBasketballIQ ?? 5,
                  skillAthletics: profile.skillAthletics ?? 5,
                  focusSkill: profile.focusSkill || "",
                }));
                setIsSkillDialogOpen(true);
              }}
              data-testid="button-edit-skill-ratings"
            >
              <Pencil className="w-4 h-4" />
            </Button>
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
              <div key={skill.key} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{skill.label}</span>
                  <span className={`font-semibold tabular-nums ${skill.value == null ? "text-muted-foreground italic" : "text-primary"}`}>
                    {skill.value != null ? skill.value : "—"}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${skill.value != null ? skill.value * 10 : 0}%`,
                      background: 'linear-gradient(90deg, #c2410c, #f97316, #fb923c)',
                      boxShadow: skill.value != null && skill.value > 0 ? '0 0 8px rgba(249,115,22,0.55)' : 'none',
                    }}
                  />
                </div>
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

      <PlayerProfileSection />

        </TabsContent>

        <TabsContent value="trophy-room" className="space-y-6">
          <TrophyRoomTab 
            achievements={achievements}
            userChallenges={userChallenges}
            personalRecords={personalRecords}
            teamAwards={teamAwards}
            profile={profile}
          />
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
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
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

      <Dialog open={isSkillDialogOpen} onOpenChange={setIsSkillDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Skill Ratings</DialogTitle>
            <DialogDescription>Rate your basketball skills from 1 to 10</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {[
                { key: "skillBallHandling" as const, label: "Ball Handling" },
                { key: "skillShooting" as const, label: "Shooting" },
                { key: "skillPassing" as const, label: "Passing" },
                { key: "skillFinishing" as const, label: "Finishing" },
                { key: "skillDefense" as const, label: "Defense" },
                { key: "skillBasketballIQ" as const, label: "Basketball IQ" },
                { key: "skillAthletics" as const, label: "Athletics" },
              ].map(skill => (
                <div key={skill.key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{skill.label}</span>
                    <span className="font-medium text-primary">{editFormData[skill.key]}</span>
                  </div>
                  <Slider
                    value={[editFormData[skill.key]]}
                    onValueChange={([v]) => setEditFormData(prev => ({ ...prev, [skill.key]: v }))}
                    min={1}
                    max={10}
                    step={1}
                    data-testid={`slider-skill-${skill.key}`}
                  />
                </div>
              ))}
            </div>

            <div className="pt-2 border-t">
              <Label className="text-sm">Focus Skill</Label>
              <Select
                value={editFormData.focusSkill}
                onValueChange={(v) => setEditFormData(prev => ({ ...prev, focusSkill: v }))}
              >
                <SelectTrigger data-testid="select-skill-focus" className="mt-1">
                  <SelectValue placeholder="Select your focus skill" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSkillDialogOpen(false)} data-testid="button-cancel-skill-edit">
              Cancel
            </Button>
            <Button
              onClick={() => updateSkillsMutation.mutate()}
              disabled={updateSkillsMutation.isPending}
              className="gap-2"
              data-testid="button-save-skill-ratings"
            >
              <Save className="w-4 h-4" />
              {updateSkillsMutation.isPending ? "Saving..." : "Save Ratings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OnboardingNotificationPrompt({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const { isSupported, subscribe, isLoading } = usePushNotifications();
  const { data: preferences } = useQuery<any>({ queryKey: ["/api/notifications/preferences"] });
  const markSeen = useMutation({
    mutationFn: async (pushEnabled?: boolean) => apiRequest("PATCH", "/api/notifications/preferences", {
      ...(pushEnabled === undefined ? {} : { pushEnabled }),
      onboardingPromptSeen: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
      onClose();
    },
  });

  if (!isSupported || preferences?.onboardingPromptSeen) return null;

  const close = () => {
    setOpen(false);
    markSeen.mutate(undefined);
  };

  const enable = async () => {
    const subscribed = await subscribe();
    if (subscribed) markSeen.mutate(true);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Stay on track
          </DialogTitle>
          <DialogDescription>
            Get timely reminders for workouts, challenges, friend activity, and your weekly progress. You can customize every category later in Settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={markSeen.isPending}>Not now</Button>
          <Button onClick={enable} disabled={isLoading || markSeen.isPending}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Enable notifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CareerPage() {
  const { data: careerProfile, isLoading, refetch } = useQuery<CareerProfile | null>({
    queryKey: ['/api/career']
  });
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

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
    return <OnboardingWizard onComplete={() => { setShowNotificationPrompt(true); refetch(); }} />;
  }

  return (
    <>
      <CareerDashboard profile={careerProfile} />
      {showNotificationPrompt && <OnboardingNotificationPrompt onClose={() => setShowNotificationPrompt(false)} />}
    </>
  );
}
