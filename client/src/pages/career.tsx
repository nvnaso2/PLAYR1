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
} from "lucide-react";
import type { CareerProfile, UserAchievement, CareerAchievement, Challenge, UserChallenge, PersonalRecord, TeamAward, Season, Game, InsertTeamAward, InsertChallenge } from "@shared/schema";
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
  CHALLENGE_GOAL_TYPES
} from "@shared/schema";
import { ShareCardDialog } from "@/components/share-card";
import { PlayerProfileSection } from "@/pages/player-profile";
import CsvImportDialog from "@/components/csv-import-dialog";

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

const TUTORIAL_SLIDES = {
  "log-training": [
    {
      title: "Step 1: Find a Drill",
      icon: Target,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      content: [
        { heading: "Go to the Drill Library", text: "Open the sidebar and tap \"Drills\" to browse the full library." },
        { heading: "Browse or Search", text: "Use the tabs to switch between Handlz (pro drills), Community drills, or your own. Filter by category (Ball Handling, Shooting, etc.) and difficulty level." },
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
                src={tutorial!.videoUrl}
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

function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<"role" | "profile" | "parent-email" | "reason" | "select-teams" | "log-game" | "no-season" | "season-start" | "dev-priority" | "dev-log-next" | "dev-create-next" | "tutorial-log" | "tutorial-create" | "trainer-profile" | "trainer-specialties" | "trainer-begin">("role");
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

  const [trainerSpecialties, setTrainerSpecialties] = useState(TRAINER_SPECIALTIES.map(s => s.value));
  const [draggedSpecIdx, setDraggedSpecIdx] = useState<number | null>(null);
  const [overSpecIdx, setOverSpecIdx] = useState<number | null>(null);
  const specDragging = useRef(false);
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
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, GIF, or WebP image.", variant: "destructive" });
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
    try {
      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", {
        name: cardPhotoFile.name,
        size: cardPhotoFile.size,
        contentType: cardPhotoFile.type,
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": cardPhotoFile.type },
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

      if (city || stateName || zipCode) {
        await apiRequest("PUT", "/api/profile", {
          city: city || undefined,
          state: stateName || undefined,
          zipCode: zipCode || undefined,
        });
      }

      const existing = await fetch("/api/career", { credentials: "include" }).then(r => r.ok ? r.json() : null);
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
    try {
      await apiRequest("POST", "/api/career/complete-onboarding");
      queryClient.invalidateQueries({ queryKey: ['/api/career'] });
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
    if (!city.trim()) {
      toast({ title: "Please enter your city", variant: "destructive" });
      return;
    }
    if (!stateName.trim()) {
      toast({ title: "Please select your state", variant: "destructive" });
      return;
    }
    if (!zipCode.trim()) {
      toast({ title: "Please enter your zip code", variant: "destructive" });
      return;
    }
    await saveProfile();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const playerIsMinor = birthYear ? (currentYear - birthYear < 18 || (currentYear - birthYear === 18 && birthMonth !== undefined && birthMonth > currentMonth)) : false;
    if (playerIsMinor) {
      setStep("parent-email");
    } else {
      setStep("reason");
    }
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
    if (!city.trim()) {
      toast({ title: "Please enter your city", variant: "destructive" });
      return;
    }
    if (!stateName.trim()) {
      toast({ title: "Please select your state", variant: "destructive" });
      return;
    }
    if (!zipCode.trim()) {
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

      const existing = await fetch("/api/career", { credentials: "include" }).then(r => r.ok ? r.json() : null);
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
    const rankedJson = JSON.stringify(trainerSpecialties);
    await apiRequest("PUT", "/api/career", { trainerSpecialties: rankedJson });
    queryClient.invalidateQueries({ queryKey: ['/api/career'] });
    setStep("trainer-begin");
  };

  const handleTrainerBeginChoice = async (choice: "create-drill" | "invite-players" | "upload-content") => {
    await completeOnboarding();
    if (choice === "create-drill") {
      window.location.href = "/trainer/drills";
    } else if (choice === "invite-players") {
      window.location.href = "/trainer/roster";
    } else {
      window.location.href = "/trainer/videos";
    }
  };

  const handleInterestRankingNext = async () => {
    const topInterest = rankedInterests[0];
    const rankedJson = JSON.stringify(rankedInterests);
    await apiRequest("PUT", "/api/career", { primaryReason: rankedJson });
    queryClient.invalidateQueries({ queryKey: ['/api/career'] });

    if (topInterest === "game-stats") {
      setStep("select-teams");
    } else if (topInterest === "skill-development") {
      setStep("dev-priority");
    } else {
      await completeOnboarding();
    }
  };

  const handleDevPriorityNext = async () => {
    if (!devPriority) {
      toast({ title: "Please select an option", variant: "destructive" });
      return;
    }
    if (devPriority === "log-training") {
      setStep("dev-log-next");
    } else if (devPriority === "drill-library") {
      await completeOnboarding();
      window.location.href = "/drills";
    } else if (devPriority === "create-drills") {
      setStep("dev-create-next");
    }
  };

  const commitInterestReorder = (fromIdx: number, toIdx: number) => {
    setRankedInterests(prev => {
      const newOrder = [...prev];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      return newOrder;
    });
  };

  const handleTeamsSelected = () => {
    if (gameStatsTeams.length === 0) {
      toast({ title: "Select at least one team", variant: "destructive" });
      return;
    }
    const selectedTeamObjects = teams.filter(t => gameStatsTeams.includes(t.name));
    const anyInSeason = selectedTeamObjects.some(t => t.inSeason);
    if (anyInSeason) {
      setCurrentGameTeamIdx(0);
      setStep("log-game");
    } else {
      setStep("no-season");
    }
  };

  const handleNoSeasonResponse = (wantToPast: boolean) => {
    setLogPastGames(wantToPast);
    if (wantToPast) {
      setCurrentGameTeamIdx(0);
      setStep("log-game");
    } else {
      setStep("season-start");
    }
  };

  const handleSeasonStartDone = async () => {
    const teamsWithMonths = teams.map(t => {
      const month = seasonStartMonths[t.name];
      return month ? { ...t, seasonStartMonth: month } : t;
    });
    await apiRequest("PUT", "/api/career", { onboardingTeams: JSON.stringify(teamsWithMonths) });
    await completeOnboarding();
  };

  if (step === "role") {
    return (
      <div className="min-h-screen flex items-start justify-center p-3 pt-6 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-md space-y-3">
          <div className="flex justify-center">
            <img
              src={logoLandscape}
              alt="PLAYR1"
              className="h-16 w-[220px] max-w-full object-contain invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0"
            />
          </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2 pt-4">
            <CardTitle className="text-2xl font-bold">Welcome to PLAYR1</CardTitle>
            <CardDescription>How will you be using the app?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: "player" as const, label: "Player", desc: "Track your development and stats", icon: User },
              { value: "trainer" as const, label: "Trainer", desc: "Manage and develop players", icon: Dumbbell },
              { value: "player_trainer" as const, label: "Player & Trainer", desc: "Train players and track your own game", icon: ArrowLeftRight },
            ].map(role => {
              const Icon = role.icon;
              return (
                <div
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className={`cursor-pointer p-4 rounded-lg border-2 flex items-center gap-4 transition-all hover:bg-muted/30 ${
                    selectedRole === role.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border'
                  }`}
                  data-testid={`role-${role.value}`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{role.label}</p>
                    <p className="text-sm text-muted-foreground">{role.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
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
                accept="image/jpeg,image/png,image/gif,image/webp"
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
                <Label className="text-sm font-medium">State *</Label>
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
              </div>
              <div>
                <Label className="text-sm font-medium">Zip *</Label>
                <Input
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                  placeholder="Zip"
                  inputMode="numeric"
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
              <Button type="button" onClick={handleProfileNext} disabled={isSaving} data-testid="button-next-reason">
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
      if (!parentEmail.trim()) {
        toast({ title: "Please enter a parent/guardian email", variant: "destructive" });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parentEmail.trim())) {
        toast({ title: "Please enter a valid email address", variant: "destructive" });
        return;
      }
      setIsSaving(true);
      try {
        await apiRequest("PUT", "/api/career", { parentEmail: parentEmail.trim(), isMinor: true });
        queryClient.invalidateQueries({ queryKey: ['/api/career'] });
        setStep("reason");
      } catch {
        toast({ title: "Failed to save parent email", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Parent / Guardian Info</CardTitle>
            <CardDescription>Since you're under 18, we need a parent or guardian's email so they can stay connected to your training.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Parent/Guardian Email *</Label>
              <Input
                type="email"
                value={parentEmail}
                onChange={e => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                data-testid="input-parent-email"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">We'll send them an invite to view your training progress.</p>
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("profile")} data-testid="button-back-profile">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={handleParentEmailNext} disabled={isSaving} data-testid="button-next-parent-email">
                {isSaving ? "Saving..." : "Next"}
                {!isSaving && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "reason") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Rank Your Interests</CardTitle>
            <CardDescription>Drag to rank from most to least important</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {rankedInterests.map((interestValue, index) => {
                const option = INTEREST_OPTIONS.find(o => o.value === interestValue)!;
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    data-interest-idx={index}
                    className={`p-4 rounded-lg border-2 flex items-center gap-3 select-none transition-all ${
                      draggedInterestIdx === index ? 'opacity-50 scale-[0.98] border-primary' : ''
                    } ${
                      overInterestIdx === index && draggedInterestIdx !== null && draggedInterestIdx !== index
                        ? 'border-primary/50 bg-primary/5' : 'border-border'
                    }`}
                    data-testid={`interest-${option.value}`}
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div
                      className="cursor-grab active:cursor-grabbing touch-none p-1"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                        setDraggedInterestIdx(index);
                        interestDragging.current = true;
                      }}
                      onPointerMove={(e) => {
                        if (!interestDragging.current || draggedInterestIdx === null) return;
                        const elements = document.elementsFromPoint(e.clientX, e.clientY);
                        const target = elements.find(el => el.getAttribute('data-interest-idx') !== null);
                        if (target) {
                          const idx = parseInt(target.getAttribute('data-interest-idx')!);
                          setOverInterestIdx(idx);
                        }
                      }}
                      onPointerUp={() => {
                        if (draggedInterestIdx !== null && overInterestIdx !== null && draggedInterestIdx !== overInterestIdx) {
                          commitInterestReorder(draggedInterestIdx, overInterestIdx);
                        }
                        setDraggedInterestIdx(null);
                        setOverInterestIdx(null);
                        interestDragging.current = false;
                      }}
                      onPointerCancel={() => {
                        setDraggedInterestIdx(null);
                        setOverInterestIdx(null);
                        interestDragging.current = false;
                      }}
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("profile")} data-testid="button-back-profile">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={handleInterestRankingNext} data-testid="button-next-interests">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "dev-priority") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Skill Development</CardTitle>
            <CardDescription>What would you like to do first?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { value: "log-training" as const, label: "Log Training Activity", desc: "Track your drills and workouts", icon: Flame },
              { value: "drill-library" as const, label: "Access Drill Library", desc: "Browse drills from PLAYR1 and the community", icon: Target },
              { value: "create-drills" as const, label: "Create Your Own", desc: "Build custom drills and workouts", icon: Plus },
            ].map(opt => {
              const Icon = opt.icon;
              return (
                <div
                  key={opt.value}
                  onClick={() => setDevPriority(opt.value)}
                  className={`cursor-pointer p-4 rounded-lg border-2 flex items-center gap-4 transition-all ${
                    devPriority === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                  data-testid={`dev-priority-${opt.value}`}
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

            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-3">Would you like PLAYR1 to suggest custom Drills and Workouts based on your goals, skill level, and age?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={wantAiSuggestions === true ? "default" : "outline"}
                  onClick={() => setWantAiSuggestions(true)}
                  className="h-auto py-3"
                  data-testid="button-ai-suggestions-yes"
                >
                  <CheckCircle className={`w-4 h-4 mr-2 ${wantAiSuggestions === true ? '' : 'text-green-500'}`} />
                  Yes, please
                </Button>
                <Button
                  type="button"
                  variant={wantAiSuggestions === false ? "default" : "outline"}
                  onClick={() => setWantAiSuggestions(false)}
                  className="h-auto py-3"
                  data-testid="button-ai-suggestions-no"
                >
                  <X className={`w-4 h-4 mr-2 ${wantAiSuggestions === false ? '' : 'text-muted-foreground'}`} />
                  No thanks
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("reason")} data-testid="button-back-reason">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={handleDevPriorityNext} data-testid="button-next-dev-priority">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "dev-log-next") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Log Training</CardTitle>
            <CardDescription>How would you like to get started?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              onClick={() => { setTutorialSlide(0); setStep("tutorial-log"); }}
              className="cursor-pointer p-5 rounded-lg border-2 border-border flex items-center gap-4 transition-all hover:border-primary/50 hover:bg-muted/30"
              data-testid="dev-log-tutorial"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold">View Tutorial</p>
                <p className="text-sm text-muted-foreground">Learn how to log drills and workouts</p>
              </div>
            </div>
            <div
              onClick={async () => {
                await completeOnboarding();
                window.location.href = "/log";
              }}
              className="cursor-pointer p-5 rounded-lg border-2 border-border flex items-center gap-4 transition-all hover:border-primary/50 hover:bg-muted/30"
              data-testid="dev-log-now"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Log a Drill Now</p>
                <p className="text-sm text-muted-foreground">Jump in and log a recent or active drill</p>
              </div>
            </div>

            <div className="pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("dev-priority")} data-testid="button-back-dev-priority">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "dev-create-next") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Create Your Own</CardTitle>
            <CardDescription>How would you like to get started?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              onClick={() => setStep("tutorial-create")}
              className="cursor-pointer p-5 rounded-lg border-2 border-border flex items-center gap-4 transition-all hover:border-primary/50 hover:bg-muted/30"
              data-testid="dev-create-tutorial"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold">View Tutorial</p>
                <p className="text-sm text-muted-foreground">Learn how to create custom drills</p>
              </div>
            </div>
            <div
              onClick={async () => {
                await completeOnboarding();
                window.location.href = "/drills";
              }}
              className="cursor-pointer p-5 rounded-lg border-2 border-border flex items-center gap-4 transition-all hover:border-primary/50 hover:bg-muted/30"
              data-testid="dev-create-now"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Create a Drill</p>
                <p className="text-sm text-muted-foreground">Start building your own drill now</p>
              </div>
            </div>

            <div className="pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("dev-priority")} data-testid="button-back-dev-priority">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "tutorial-log") {
    return <TutorialVideoStep
      tutorialKey="log-training"
      title="How to Log Training"
      description="Watch this quick walkthrough to learn how to find drills, log your sessions, view your history, and track your progress."
      onBack={() => setStep("dev-log-next")}
      onDone={async () => { await completeOnboarding(); }}
      onGoToDrills={async () => { await completeOnboarding(); window.location.href = "/drills"; }}
    />;
  }

  if (step === "tutorial-create") {
    return <TutorialVideoStep
      tutorialKey="create-drill"
      title="How to Create Your Own Drill"
      description="Watch this quick walkthrough to learn how to build custom drills with your own videos, metrics, and pro tips."
      onBack={() => setStep("dev-create-next")}
      onDone={async () => { await completeOnboarding(); }}
      onGoToDrills={async () => { await completeOnboarding(); window.location.href = "/drills"; }}
    />;
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
                <Label className="text-sm font-medium">State *</Label>
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
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Zip *</Label>
                <Input
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                  placeholder="Zip"
                  inputMode="numeric"
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
              <Button type="button" variant="outline" onClick={() => teams.length === 0 ? setStep("profile") : setStep("reason")} data-testid="button-back-reason">
                <ChevronLeft className="w-4 h-4 mr-1" />
                {teams.length === 0 ? "Add Teams" : "Back"}
              </Button>
              {teams.length === 0 ? (
                <Button type="button" onClick={async () => { await completeOnboarding(); window.location.href = "/log"; }} data-testid="button-skip-teams">
                  Skip for Now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleTeamsSelected} data-testid="button-next-teams">
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "no-season") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">No Teams In Season</CardTitle>
            <CardDescription>Would you like to log games from your most recent season?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col gap-2"
                onClick={() => handleNoSeasonResponse(true)}
                data-testid="button-log-past-yes"
              >
                <CheckCircle className="w-8 h-8 text-green-500" />
                <span className="font-semibold">Yes, log games</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col gap-2"
                onClick={() => handleNoSeasonResponse(false)}
                data-testid="button-log-past-no"
              >
                <X className="w-8 h-8 text-muted-foreground" />
                <span className="font-semibold">No, skip for now</span>
              </Button>
            </div>
            <div className="pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("select-teams")} data-testid="button-back-select-teams">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "season-start") {
    const offSeasonTeams = teams.filter(t => gameStatsTeams.includes(t.name) && !t.inSeason);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">When does the season start?</CardTitle>
            <CardDescription>We can remind you to start logging stats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {offSeasonTeams.map((team, idx) => (
              <div key={idx} className="space-y-2">
                <Label className="text-sm font-medium">{team.name}</Label>
                <Select
                  onValueChange={v => setSeasonStartMonths(prev => ({ ...prev, [team.name]: parseInt(v) }))}
                  value={seasonStartMonths[team.name]?.toString()}
                >
                  <SelectTrigger data-testid={`select-season-start-${idx}`}>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <div className="pt-2">
              <Label className="text-sm font-medium">Want a reminder when your season starts?</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  variant={wantReminders === true ? "default" : "outline"}
                  onClick={() => setWantReminders(true)}
                  data-testid="button-reminder-yes"
                >
                  Yes, remind me
                </Button>
                <Button
                  variant={wantReminders === false ? "default" : "outline"}
                  onClick={() => setWantReminders(false)}
                  data-testid="button-reminder-no"
                >
                  No thanks
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("no-season")} data-testid="button-back-no-season">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={handleSeasonStartDone} data-testid="button-finish-onboarding">
                Finish Setup
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "log-game") {
    const currentTeam = gameStatsTeams[currentGameTeamIdx];
    return (
      <div className="min-h-screen flex items-start justify-center p-4 py-8 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold">Log a Game</CardTitle>
            <CardDescription>
              {currentTeam} {gameStatsTeams.length > 1 ? `(${currentGameTeamIdx + 1} of ${gameStatsTeams.length})` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Date</Label>
                <Input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} className="mt-1" data-testid="input-game-date" />
              </div>
              <div>
                <Label className="text-sm">Opponent</Label>
                <Input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="vs." className="mt-1" data-testid="input-opponent" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-sm">Home/Away</Label>
                <Select onValueChange={v => setIsHome(v === "home")} value={isHome ? "home" : "away"}>
                  <SelectTrigger className="mt-1" data-testid="select-home-away"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Result</Label>
                <Select onValueChange={setResult} value={result}>
                  <SelectTrigger className="mt-1" data-testid="select-result"><SelectValue placeholder="W/L" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="W">Win</SelectItem>
                    <SelectItem value="L">Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Minutes</Label>
                <Input type="text" inputMode="numeric" value={minutesPlayed || ""} onChange={e => setMinutesPlayed(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="mt-1" data-testid="input-minutes" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Your Score</Label>
                <Input type="text" inputMode="numeric" value={teamScore || ""} onChange={e => setTeamScore(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="mt-1" data-testid="input-team-score" />
              </div>
              <div>
                <Label className="text-sm">Opponent Score</Label>
                <Input type="text" inputMode="numeric" value={opponentScore || ""} onChange={e => setOpponentScore(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="mt-1" data-testid="input-opponent-score" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Your Stats</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[
                  { label: "PTS", value: points, set: setPoints },
                  { label: "REB", value: rebounds, set: setRebounds },
                  { label: "AST", value: assists, set: setAssists },
                  { label: "STL", value: steals, set: setSteals },
                  { label: "BLK", value: blocks, set: setBlocks },
                  { label: "TO", value: turnovers, set: setTurnovers },
                  { label: "PF", value: fouls, set: setFouls },
                ].map(stat => (
                  <div key={stat.label}>
                    <Label className="text-xs text-muted-foreground">{stat.label}</Label>
                    <Input type="text" inputMode="numeric" value={stat.value || ""} onChange={e => stat.set(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="mt-0.5 h-9 text-center" data-testid={`input-stat-${stat.label.toLowerCase()}`} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Shooting</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">FG</Label>
                  <div className="flex gap-1 mt-0.5">
                    <Input type="text" inputMode="numeric" value={fgMade || ""} onChange={e => setFgMade(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="M" className="h-9 text-center" data-testid="input-fg-made" />
                    <span className="flex items-center text-muted-foreground text-xs">/</span>
                    <Input type="text" inputMode="numeric" value={fgAttempted || ""} onChange={e => setFgAttempted(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="A" className="h-9 text-center" data-testid="input-fg-attempted" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">3PT</Label>
                  <div className="flex gap-1 mt-0.5">
                    <Input type="text" inputMode="numeric" value={threePtMade || ""} onChange={e => setThreePtMade(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="M" className="h-9 text-center" data-testid="input-3pt-made" />
                    <span className="flex items-center text-muted-foreground text-xs">/</span>
                    <Input type="text" inputMode="numeric" value={threePtAttempted || ""} onChange={e => setThreePtAttempted(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="A" className="h-9 text-center" data-testid="input-3pt-attempted" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">FT</Label>
                  <div className="flex gap-1 mt-0.5">
                    <Input type="text" inputMode="numeric" value={ftMade || ""} onChange={e => setFtMade(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="M" className="h-9 text-center" data-testid="input-ft-made" />
                    <span className="flex items-center text-muted-foreground text-xs">/</span>
                    <Input type="text" inputMode="numeric" value={ftAttempted || ""} onChange={e => setFtAttempted(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="A" className="h-9 text-center" data-testid="input-ft-attempted" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("select-teams")} data-testid="button-back-log-game">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={submitGame} disabled={isSaving} data-testid="button-submit-game">
                {isSaving ? "Saving..." : (currentGameTeamIdx < gameStatsTeams.length - 1 ? "Save & Next Team" : "Save & Finish")}
                {!isSaving && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

function BaseballCard({ profile, careerStats, onPhotoUpdated, userName }: { profile: CareerProfile; careerStats?: CareerStats; onPhotoUpdated?: () => void; userName?: string }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const allSeasons = careerStats?.seasonBreakdown || [];
  const seasonBreakdown = seasonFilter === "all"
    ? allSeasons
    : allSeasons.filter(s => s.seasonType === seasonFilter);
  const frontW = 240;
  const frontH = 340;
  const backW = 320;
  const backH = 240;

  const photoSrc = profile.cardPhotoUrl
    ? (profile.cardPhotoUrl.startsWith("/") ? profile.cardPhotoUrl : `/objects/${profile.cardPhotoUrl}`)
    : defaultPlayerImg;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, GIF, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", {
        name: file.name,
        size: file.size,
        contentType: file.type,
      });
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
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

  const maxW = Math.max(frontW, backW);
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
            border: "3px solid #f97316",
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
                className="absolute top-0 left-0 flex items-center justify-center bg-orange-500"
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
                accept="image/jpeg,image/png,image/gif,image/webp"
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
                  <p className="text-orange-400 font-semibold text-[11px] uppercase tracking-wider leading-none mt-1 truncate">
                    {[profile.schoolName || profile.teamName, positionsText].filter(Boolean).join(" \u00B7 ")}
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

        {/* BACK - Landscape (horizontal) */}
        <div
          className="absolute rounded-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            width: backW,
            height: backH,
            top: (maxH - backH) / 2,
            left: (maxW - backW) / 2,
            border: "3px solid #f97316",
          }}
        >
          <div className="w-full h-full flex flex-col bg-black text-white">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-orange-500/40">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-white font-bold text-xs uppercase tracking-wide leading-tight truncate">
                  {userName || profile.schoolName || profile.teamName || "Player"}
                </p>
                {profile.jerseyNumber != null && (
                  <span className="text-orange-400 font-black text-xs">#{profile.jerseyNumber}</span>
                )}
                {positionsText && (
                  <span className="text-white/50 text-[10px] uppercase tracking-wider">
                    {positionsText}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {[
                    { key: "all", label: "ALL" },
                    { key: "aau-travel-club", label: "AAU" },
                    { key: "high-school", label: "SCH" },
                    { key: "recreational", label: "REC" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      data-testid={`filter-${f.key}`}
                      className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-sm transition-colors ${
                        seasonFilter === f.key
                          ? "bg-orange-500 text-white"
                          : "bg-white/10 text-white/50 hover:bg-white/20"
                      }`}
                      onClick={(e) => { e.stopPropagation(); setSeasonFilter(f.key); }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="text-white/30 text-[9px]">Tap to flip</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-3 py-1.5">
              <div>
                <div className="grid gap-0.5 text-[8px] font-bold uppercase text-white/40 border-b border-white/10 pb-1 mb-0.5"
                  style={{ gridTemplateColumns: "minmax(50px, 1.2fr) 28px repeat(5, 1fr) repeat(5, 1fr)" }}>
                  <span>Season</span>
                  <span className="text-center">GP</span>
                  <span className="text-center text-orange-400/70">PTS</span>
                  <span className="text-center text-orange-400/70">REB</span>
                  <span className="text-center text-orange-400/70">AST</span>
                  <span className="text-center text-orange-400/70">STL</span>
                  <span className="text-center text-orange-400/70">BLK</span>
                  <span className="text-center">PTS</span>
                  <span className="text-center">REB</span>
                  <span className="text-center">AST</span>
                  <span className="text-center">STL</span>
                  <span className="text-center">BLK</span>
                </div>
                <div className="grid gap-0.5 text-[7px] uppercase text-white/25 mb-0.5"
                  style={{ gridTemplateColumns: "minmax(50px, 1.2fr) 28px repeat(5, 1fr) repeat(5, 1fr)" }}>
                  <span></span>
                  <span></span>
                  <span className="text-center col-span-5 border-b border-orange-500/20 pb-0.5">Averages</span>
                  <span className="text-center col-span-5 border-b border-white/10 pb-0.5">Totals</span>
                </div>

                {seasonBreakdown.length > 0 ? (
                  <>
                    {seasonBreakdown.map((s, i) => (
                      <div key={i} className="grid gap-0.5 text-[9px] py-0.5 border-b border-white/5 last:border-0"
                        style={{ gridTemplateColumns: "minmax(50px, 1.2fr) 28px repeat(5, 1fr) repeat(5, 1fr)" }}>
                        <span className="font-medium truncate text-white/70" title={s.seasonName}>
                          {SEASON_TYPE_LABELS[s.seasonType] ? SEASON_TYPE_LABELS[s.seasonType].split(" ")[0] : s.seasonType} '{s.year?.slice(-2) || ""}
                        </span>
                        <span className="text-center text-white/60">{s.gamesPlayed}</span>
                        <span className="text-center font-semibold text-orange-400">{s.avgPoints?.toFixed(1)}</span>
                        <span className="text-center text-white/60">{s.avgRebounds?.toFixed(1)}</span>
                        <span className="text-center text-white/60">{s.avgAssists?.toFixed(1)}</span>
                        <span className="text-center text-white/60">{s.avgSteals?.toFixed(1)}</span>
                        <span className="text-center text-white/60">{s.avgBlocks?.toFixed(1)}</span>
                        <span className="text-center text-white/50">{s.totalPoints}</span>
                        <span className="text-center text-white/50">{s.totalRebounds}</span>
                        <span className="text-center text-white/50">{s.totalAssists}</span>
                        <span className="text-center text-white/50">{s.totalSteals}</span>
                        <span className="text-center text-white/50">{s.totalBlocks}</span>
                      </div>
                    ))}

                    {(() => {
                      const filteredGames = seasonBreakdown.reduce((sum, s) => sum + s.gamesPlayed, 0);
                      const filteredTotalPts = seasonBreakdown.reduce((sum, s) => sum + s.totalPoints, 0);
                      const filteredTotalReb = seasonBreakdown.reduce((sum, s) => sum + s.totalRebounds, 0);
                      const filteredTotalAst = seasonBreakdown.reduce((sum, s) => sum + s.totalAssists, 0);
                      const filteredTotalStl = seasonBreakdown.reduce((sum, s) => sum + s.totalSteals, 0);
                      const filteredTotalBlk = seasonBreakdown.reduce((sum, s) => sum + s.totalBlocks, 0);
                      if (filteredGames === 0) return null;
                      return (
                        <div className="grid gap-0.5 text-[9px] py-1 mt-0.5 border-t-2 border-orange-500/50 font-bold"
                          style={{ gridTemplateColumns: "minmax(50px, 1.2fr) 28px repeat(5, 1fr) repeat(5, 1fr)" }}>
                          <span className="text-orange-400 uppercase">Total</span>
                          <span className="text-center">{filteredGames}</span>
                          <span className="text-center text-orange-400">{filteredGames > 0 ? (filteredTotalPts / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredGames > 0 ? (filteredTotalReb / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredGames > 0 ? (filteredTotalAst / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredGames > 0 ? (filteredTotalStl / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredGames > 0 ? (filteredTotalBlk / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredTotalPts}</span>
                          <span className="text-center">{filteredTotalReb}</span>
                          <span className="text-center">{filteredTotalAst}</span>
                          <span className="text-center">{filteredTotalStl}</span>
                          <span className="text-center">{filteredTotalBlk}</span>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <BarChart3 className="w-5 h-5 text-white/20 mb-1" />
                    <p className="text-[10px] text-white/40">No seasons yet -- add seasons in the Stats tab</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3 py-1.5 bg-neutral-900 border-t border-white/10 flex items-center justify-between">
              <span className="text-[9px] text-white/30">
                {profile.schoolName || profile.teamName || ""}
              </span>
              <span className="text-[9px] text-white/30">'{new Date().getFullYear().toString().slice(-2)}</span>
            </div>
          </div>
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
    wins: number;
    losses: number;
  }>;
};

function StatsOverviewCard({ careerStats }: { careerStats?: CareerStats }) {
  const [statsView, setStatsView] = useState<"averages" | "totals">("averages");
  const [statsPeriod, setStatsPeriod] = useState<"career" | "current">("career");

  if (!careerStats || careerStats.totalGames === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-blue-500" />
            Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <BarChart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No game stats yet. Add seasons and games below!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const breakdown = careerStats.seasonBreakdown;
  const currentSeason = breakdown.length > 0 ? breakdown[breakdown.length - 1] : null;
  const displaySeasons = statsPeriod === "current" && currentSeason ? [currentSeason] : breakdown;

  const totalGames = displaySeasons.reduce((s, ss) => s + ss.gamesPlayed, 0);
  const totalPts = displaySeasons.reduce((s, ss) => s + ss.totalPoints, 0);
  const totalReb = displaySeasons.reduce((s, ss) => s + ss.totalRebounds, 0);
  const totalAst = displaySeasons.reduce((s, ss) => s + ss.totalAssists, 0);
  const totalStl = displaySeasons.reduce((s, ss) => s + ss.totalSteals, 0);
  const totalBlk = displaySeasons.reduce((s, ss) => s + ss.totalBlocks, 0);
  const displayWins = statsPeriod === "current" && currentSeason ? currentSeason.wins : (careerStats.wins ?? 0);
  const displayLosses = statsPeriod === "current" && currentSeason ? currentSeason.losses : (careerStats.losses ?? 0);

  const statItems = statsView === "averages" ? [
    { label: "PPG", value: totalGames > 0 ? (totalPts / totalGames).toFixed(1) : "0.0", highlight: true },
    { label: "RPG", value: totalGames > 0 ? (totalReb / totalGames).toFixed(1) : "0.0" },
    { label: "APG", value: totalGames > 0 ? (totalAst / totalGames).toFixed(1) : "0.0" },
    { label: "SPG", value: totalGames > 0 ? (totalStl / totalGames).toFixed(1) : "0.0" },
    { label: "BPG", value: totalGames > 0 ? (totalBlk / totalGames).toFixed(1) : "0.0" },
  ] : [
    { label: "PTS", value: totalPts.toString(), highlight: true },
    { label: "REB", value: totalReb.toString() },
    { label: "AST", value: totalAst.toString() },
    { label: "STL", value: totalStl.toString() },
    { label: "BLK", value: totalBlk.toString() },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="w-5 h-5 text-blue-500" />
          Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex gap-1">
            <Button size="sm" variant={statsView === "averages" ? "default" : "outline"} onClick={() => setStatsView("averages")} data-testid="btn-stats-averages">
              Averages
            </Button>
            <Button size="sm" variant={statsView === "totals" ? "default" : "outline"} onClick={() => setStatsView("totals")} data-testid="btn-stats-totals">
              Totals
            </Button>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={statsPeriod === "career" ? "default" : "outline"} onClick={() => setStatsPeriod("career")} data-testid="btn-stats-career">
              Career
            </Button>
            <Button size="sm" variant={statsPeriod === "current" ? "default" : "outline"} onClick={() => setStatsPeriod("current")} data-testid="btn-stats-current">
              <span className="hidden sm:inline">Current Season</span>
              <span className="sm:hidden">Season</span>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`grid gap-2 sm:gap-3 ${(displayWins + displayLosses) > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div className="text-center p-2 sm:p-3 rounded-md bg-muted/50">
              <p className="text-lg sm:text-2xl font-bold">{totalGames}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">GP</p>
            </div>
            <div className="text-center p-2 sm:p-3 rounded-md bg-muted/50">
              <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{displayWins}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Wins</p>
            </div>
            <div className="text-center p-2 sm:p-3 rounded-md bg-muted/50">
              <p className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{displayLosses}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Losses</p>
            </div>
            {(displayWins + displayLosses) > 0 && (
              <div className="text-center p-2 sm:p-3 rounded-md bg-muted/50">
                <p className="text-lg sm:text-2xl font-bold">{((displayWins / (displayWins + displayLosses)) * 100).toFixed(0)}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Win %</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {statItems.map((item) => (
              <div key={item.label} className="text-center p-2 sm:p-3 rounded-md bg-muted/50">
                <p className={`text-lg sm:text-2xl font-bold ${item.highlight ? 'text-primary' : ''}`}>{item.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {statsPeriod === "career" && breakdown.length > 1 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Season Breakdown</p>
              <div className="space-y-2">
                {breakdown.map((s, i) => (
                  <div key={i} className="p-2 rounded-md bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-xs sm:text-sm">
                        {SEASON_TYPE_LABELS[s.seasonType]?.split(" ")[0] || s.seasonType} '{s.year?.slice(-2) || ""}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.gamesPlayed} GP</span>
                    </div>
                    <div className="flex gap-2 sm:gap-3 text-muted-foreground text-xs flex-wrap">
                      {statsView === "averages" ? (
                        <>
                          <span className="font-semibold text-foreground">{s.avgPoints.toFixed(1)} PPG</span>
                          <span>{s.avgRebounds.toFixed(1)} RPG</span>
                          <span>{s.avgAssists.toFixed(1)} APG</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-foreground">{s.totalPoints} PTS</span>
                          <span>{s.totalRebounds} REB</span>
                          <span>{s.totalAssists} AST</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsTab() {
  const { toast } = useToast();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [showSeasonDialog, setShowSeasonDialog] = useState(false);
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [shareGameId, setShareGameId] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [initialExpandDone, setInitialExpandDone] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const { data: seasons = [], isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ['/api/seasons']
  });

  useEffect(() => {
    if (!initialExpandDone && seasons.length > 0) {
      const activeIds = seasons.filter(s => s.isActive !== false).map(s => s.id);
      if (activeIds.length > 0) {
        setExpandedSeasons(new Set(activeIds));
        setSelectedSeasonId(activeIds[0]);
      }
      setInitialExpandDone(true);
    }
  }, [seasons, initialExpandDone]);

  const { data: careerStats } = useQuery<CareerStats>({
    queryKey: ['/api/stats/career']
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
      if (selectedSeasonId === deleteSeasonMutation.variables) {
        setSelectedSeasonId(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${selectedSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${selectedSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/career'] });
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
      <StatsOverviewCard careerStats={careerStats} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Seasons
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCsvImport(true)} data-testid="button-import-csv">
              <Upload className="w-4 h-4 mr-1" />
              Import CSV
            </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          {seasons.length === 0 ? (
            <div className="text-center p-8">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No seasons yet. Create your first season to start tracking game stats!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...seasons].sort((a, b) => (a.isActive === false ? 1 : 0) - (b.isActive === false ? 1 : 0)).map((season) => {
                const isExpanded = expandedSeasons.has(season.id);
                const seasonStats = careerStats?.seasonBreakdown.find(s => s.seasonId === season.id);
                const isActive = season.isActive !== false;
                
                return (
                  <div key={season.id} className={`border rounded-lg ${!isActive ? "opacity-70" : ""}`} data-testid={`season-item-${season.id}`}>
                    <div 
                      className="p-4 cursor-pointer hover-elevate"
                      onClick={() => toggleSeasonExpand(season.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{season.name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSeasonActiveMutation.mutate({ id: season.id, isActive: !isActive });
                            }}
                            title={isActive ? "Mark as Completed" : "Mark as Active"}
                            data-testid={`button-toggle-season-${season.id}`}
                          >
                            {isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                          </Button>
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
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {SEASON_TYPE_LABELS[season.seasonType]}
                        </Badge>
                        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                          {isActive ? "Active" : "Completed"}
                        </Badge>
                        <span>{season.year}</span>
                        {season.teamName && <span>• {season.teamName}</span>}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t p-4 space-y-4">
                        {seasonStats && (
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
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
                                          onClick={() => setShareGameId(game.id)}
                                          data-testid={`button-share-game-${game.id}`}
                                        >
                                          <Share2 className="w-3 h-3" />
                                        </Button>
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

      {shareGameId && (
        <ShareCardDialog
          open={!!shareGameId}
          onOpenChange={(open) => { if (!open) setShareGameId(null); }}
          gameId={shareGameId}
        />
      )}

      <CsvImportDialog open={showCsvImport} onOpenChange={setShowCsvImport} />
    </div>
  );
}

type TrophySection = "achievements" | "challenges" | "prs" | "awards";
// Achievements hidden until achievement definitions are seeded

function TrophyRoomTab({ 
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
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">My Career</h1>
        <BaseballCard profile={profile} careerStats={careerStats} userName={playerName} onPhotoUpdated={() => queryClient.invalidateQueries({ queryKey: ["/api/career"] })} />
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
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-4xl font-bold text-primary-foreground">
                {overallRating != null ? overallRating : "—"}
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {overallRating != null ? "Overall Rating" : "Not yet rated"}
            </p>
            
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
              <div key={skill.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{skill.label}</span>
                  <span className={`font-medium ${skill.value == null ? "text-muted-foreground italic" : ""}`}>
                    {skill.value != null ? skill.value : "Not rated"}
                  </span>
                </div>
                <Progress value={skill.value != null ? skill.value * 10 : 0} className="h-2" />
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
