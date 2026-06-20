import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { apiRequest, storeAuthToken, buildUrl, getAuthHeaders } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/track";
import logoImg from "@assets/PNG_image_auth_trimmed.png";
import { Eye, EyeOff, ChevronRight, Share2, Download, Check, Lock } from "lucide-react";

// ─── ARCHETYPE DATA ──────────────────────────────────────────────────────────
const ARCHETYPES: Record<string, {
  tagline: string; description: string; strengths: string[];
  focus: string; coachP: string; icon: string; color: string;
}> = {
  "Sharpshooter": {
    tagline: "Give me an inch of space, and it's already going in.",
    description: "The Sharpshooter's value lives in their shot. When they're feeling it, the whole defense has to bend around them.",
    strengths: ["Elite shot mechanics", "Quick release", "Movement shooting", "Creates spacing for teammates"],
    focus: "Off-ball movement, shooting under fatigue, expanding range, and building a counter move for when the jumper is taken away.",
    coachP: "Your shot isn't just a skill — it's a weapon defenses have to respect every second you're on the floor. My job is making sure you can get that shot off in more ways than standing still waiting for a pass.",
    icon: "🎯", color: "orange",
  },
  "Shot Creator": {
    tagline: "I don't need a screen. I make my own daylight.",
    description: "Shot Creators generate offense out of nothing — a hesitation, a screen, a quick burst — and can score from anywhere without needing plays run through them.",
    strengths: ["Advanced ball handling", "One-on-one scoring", "Shot-making off the dribble", "Footwork and change of pace"],
    focus: "Shot selection and efficiency, reading double teams, and developing a playmaking counter so defenses can't just load up on the scoring.",
    coachP: "You can get a bucket when nobody else can. That's rare. The next step is making sure you're not just scoring — you're scoring efficiently, and when the defense sends extra help, you know exactly what to do.",
    icon: "⚡", color: "orange",
  },
  "Floor General": {
    tagline: "The game runs through my hands — and through my head.",
    description: "Floor Generals see the whole court before everyone else does. They organize the offense, set the pace, and make players around them better.",
    strengths: ["Court vision", "Pace control", "Decision-making under pressure", "Leadership through organization"],
    focus: "Scoring threat development so defenses can't ignore them, pick-and-roll reads, and late-clock decision-making.",
    coachP: "The game slows down for you in a way it doesn't for most players. That gift is the foundation. Now we build the scoring punch that forces defenses to respect you as more than just a passer.",
    icon: "🧠", color: "blue",
  },
  "Lockdown Defender": {
    tagline: "Whoever you're guarding tonight is having a rough night.",
    description: "Lockdown Defenders take pride in making the other team's best player uncomfortable for 32+ minutes. Defense isn't a chore — it's their identity.",
    strengths: ["Lateral quickness", "On-ball pressure", "Anticipation", "Physical and mental toughness"],
    focus: "Building enough offensive value to stay on the floor in crunch time, and expanding into team-defense reads.",
    coachP: "You make winning plays that never show up on a stat sheet. The next level for you is making sure your offense doesn't become a reason coaches sit you in close games.",
    icon: "🔒", color: "blue",
  },
  "Athletic Slasher": {
    tagline: "If there's a gap, I'm already through it.",
    description: "Athletic Slashers attack downhill with speed and explosiveness, finishing through and around contact in ways that make highlight reels.",
    strengths: ["First-step burst", "Finishing through contact", "Transition scoring", "Vertical explosiveness"],
    focus: "A reliable jumper to keep defenses honest, finishing package versatility, and controlling speed in the half-court.",
    coachP: "Your speed and explosiveness create problems most defenders can't solve. We're going to make sure you're not one-dimensional — so when the lane gets crowded, you've still got an answer.",
    icon: "🔥", color: "red",
  },
  "Playmaking Wing": {
    tagline: "I make the right play look easy.",
    description: "Playmaking Wings combine size and vision — they initiate offense, make reads from the wing, and create easy looks for teammates.",
    strengths: ["Positional size", "Secondary playmaking", "Lineup versatility", "Unselfish decision-making"],
    focus: "Developing a more aggressive scoring mentality when the team needs it, and sharpening pick-and-roll reads from a non-traditional ball-handling spot.",
    coachP: "You make the game easier for everyone around you. That's a real superpower. Now let's make sure you're comfortable taking over when your team needs you to score, not just facilitate.",
    icon: "🦅", color: "purple",
  },
  "Two-Way Player": {
    tagline: "I'm not punting on either end.",
    description: "Two-Way Players refuse to be a specialist. They compete defensively and contribute offensively — dependable on both ends every night.",
    strengths: ["Defensive versatility", "Offensive reliability", "Conditioning and consistency", "Coachability"],
    focus: "Developing one clear standout skill so they evolve from 'solid everywhere' into 'elite somewhere,' while keeping the two-way habits intact.",
    coachP: "You don't give anything away on either end, and that's incredibly valuable. The next step is finding the one thing you can become truly elite at — so you're not just reliable, you're a difference-maker.",
    icon: "⚖️", color: "green",
  },
  "Swiss Army Knife": {
    tagline: "Whatever the team needs tonight, that's what I'll do.",
    description: "The Swiss Army Knife plays whatever role is required — rebounding one night, scoring the next. Pure adaptability.",
    strengths: ["Basketball IQ", "Positional versatility", "Selflessness", "Reading what the team needs"],
    focus: "Building one signature strength to anchor their game, since pure versatility without a calling card can get overlooked at higher levels.",
    coachP: "You can do a little bit of everything, and coaches love that. The risk is staying a 'jack of all trades, master of none.' Let's find your signature move so your versatility has a real edge to it.",
    icon: "🛠️", color: "gray",
  },
  "Rim Protector": {
    tagline: "Nothing gets through. Nothing gets easy.",
    description: "Rim Protectors control the paint defensively, deterring and erasing shots at the basket and anchoring their team's entire defensive structure.",
    strengths: ["Shot-blocking instincts", "Rebounding", "Defensive anchor presence", "Physical and vertical advantage"],
    focus: "Mobility on the perimeter to defend in space against modern offenses, and a finishing package on offense beyond simple putbacks.",
    coachP: "You make your team feel safe just by being on the floor. To take the next step, we need to make sure you can move well enough on defense to handle being pulled away from the paint.",
    icon: "🏰", color: "gray",
  },
  "Stretch Big": {
    tagline: "I'm taller than you and I can shoot over you.",
    description: "Stretch Bigs combine size with perimeter shooting ability, creating spacing problems for defenses that aren't built to guard a shooter their height.",
    strengths: ["Outside shooting from a size advantage", "Floor spacing", "Mismatch creation", "Rebounding range"],
    focus: "Adding strength and physicality in the post so the shooting gift doesn't come at the cost of being pushed around inside.",
    coachP: "That combination of size and shooting is exactly what modern basketball is built around. Just make sure you don't become only a shooter. We still need you to win the physical battles in the paint.",
    icon: "📏", color: "orange",
  },
};

// ─── STAGE DATA ───────────────────────────────────────────────────────────────
const STAGES: Record<string, { description: string; needsMost: string }> = {
  "Foundation Builder": {
    description: "Just starting to build real basketball habits — learning fundamentals, getting comfortable with the ball, figuring out how the game works.",
    needsMost: "Repetition of the basics in a low-pressure environment. Confidence-building matters more than complex skill work right now.",
  },
  "Aspiring Player": {
    description: "Has the fundamentals but hasn't found a clear role yet — working hard in practice without consistent payoff in games.",
    needsMost: "Help identifying their natural strengths so their effort starts pointing in one clear direction instead of trying to do everything.",
  },
  "Team Contributor": {
    description: "Has earned a steady role and reliably contributes when called upon — not yet a primary option, but a trusted piece of the rotation.",
    needsMost: "Expanding their offensive or defensive role incrementally, and reps in slightly higher-pressure situations.",
  },
  "Impact Player": {
    description: "A player their team genuinely leans on — someone whose performance noticeably swings the outcome of games.",
    needsMost: "Skill refinement at game speed and mental tools for handling pressure — the margin for error is smaller at this stage.",
  },
  "Difference Maker": {
    description: "A go-to player capable of single-handedly changing a game's outcome through scoring, defense, or both.",
    needsMost: "Elite-level competition to stay challenged, and leadership development — at this stage, how they affect teammates matters as much as their own production.",
  },
  "Elite Competitor": {
    description: "Operating at the highest level of their current environment — the standard others are measured against.",
    needsMost: "A path to the next level of competition and structured habits around recovery, mindset, and consistency — the margins here are about sustaining excellence.",
  },
};

const STAGE_ORDER = ["Foundation Builder", "Aspiring Player", "Team Contributor", "Impact Player", "Difference Maker", "Elite Competitor"];

// ─── BOTTLENECK DATA ──────────────────────────────────────────────────────────
const BOTTLENECKS: Record<string, { description: string; unlocks: string }> = {
  "Shooting": {
    description: "Inconsistent percentages on open looks, hesitation to shoot in-rhythm, a shot that breaks down under fatigue or pressure.",
    unlocks: "Defensive gravity — defenders are forced to respect the shot, which opens driving lanes and space for the rest of your game.",
  },
  "Ball Handling": {
    description: "Turnovers under pressure, difficulty creating separation, getting stripped or trapped by aggressive defense.",
    unlocks: "Independence — the ability to create offense and escape pressure without relying entirely on teammates or set plays.",
  },
  "Finishing": {
    description: "Getting blocked or losing the ball at the rim, finishing well in practice but not in live game contact.",
    unlocks: "Conversion — turning drives that are already happening into actual points, immediately raising scoring efficiency.",
  },
  "Defense": {
    description: "Getting beaten off the dribble, late or incorrect rotations, fouling out of position rather than through good defensive habits.",
    unlocks: "Playing time and trust — defense is often the fastest path to earning a coach's confidence.",
  },
  "Athleticism": {
    description: "Getting beaten in transition, losing physical battles for position, fatigue affecting performance late in games.",
    unlocks: "A higher ceiling on every other skill — athleticism amplifies shooting range, finishing ability, and defensive reach simultaneously.",
  },
  "Basketball IQ": {
    description: "Poor shot selection, late reads on rotations or passing lanes, getting 'sped up' mentally in high-pressure moments.",
    unlocks: "Efficiency without needing more athleticism or skill — smarter decisions immediately reduce mistakes and increase impact.",
  },
  "Confidence": {
    description: "Hesitating on open shots, playing tighter in big moments than in practice, visible body language changes after mistakes.",
    unlocks: "Consistency — most of the gap between 'practice player' and 'game player' is confidence, not actual skill.",
  },
  "Rebounding": {
    description: "Getting boxed out easily, poor timing on box-outs, low second-chance opportunities created or denied.",
    unlocks: "Extra possessions — one of the most direct ways to single-handedly create more chances for a team to score.",
  },
};

// ─── QUIZ STEPS ───────────────────────────────────────────────────────────────
type QuizStep =
  | { type: "chapter"; title: string; sub: string }
  | { type: "question"; id: string; text: string; options: string[] }
  | { type: "name" }
  | { type: "email" }
  | { type: "password" };

const STEPS: QuizStep[] = [
  { type: "chapter", title: "Let's Find Your Game", sub: "No wrong answers here. Just go with your gut." },
  { type: "question", id: "Q1", text: "When you have a great game, what usually happens?", options: ["Shots are falling", "I'm breaking down defenders", "I'm controlling the offense", "I'm locking people up", "I'm dominating inside"] },
  { type: "question", id: "Q2", text: "What part of basketball comes most naturally to you?", options: ["Shooting the ball", "Creating my own shot off the dribble", "Setting up teammates / playmaking", "Defending and disrupting", "Attacking the rim / finishing through contact", "Rebounding and playing physical", "Doing a little bit of everything", "Protecting the rim / shot blocking"] },
  { type: "name" },
  { type: "chapter", title: "{name}, Tell Us About Your Game", sub: "Now let's get specific." },
  { type: "question", id: "Q3", text: "What best describes your current basketball situation?", options: ["Elementary School", "Middle School", "Freshman / JV", "Varsity", "College Basketball", "Intramural League", "Adult Rec League", "Just Playing For Fun"] },
  { type: "question", id: "Q4", text: "How would you describe your current role on your team?", options: ["Not On A Team", "Limited Minutes", "Rotation Player", "Starter", "Team Leader"] },
  { type: "question", id: "Q5", text: "When your team needs a bucket, what are you most likely to do?", options: ["Take the shot", "Create a shot", "Drive", "Find an open teammate", "Get a teammate open", "Get the offensive rebound"] },
  { type: "chapter", title: "The Real Talk Section", sub: "This is the part most apps skip. We don't." },
  { type: "question", id: "Q6", text: "What frustrates you most during games?", options: ["Missing open shots", "Losing the ball", "Finishing at the rim", "Defending athletes and scorers", "Making quick decisions under pressure", "Confidence"] },
  { type: "question", id: "Q7", text: "When you struggle in games, why?", options: ["Can't create space", "Miss opportunities", "Lose confidence", "Got sped up", "Too slow / physical limitations", "Defensive mistakes", "Poor shot selection"] },
  { type: "question", id: "Q8", text: "If you could instantly improve one thing tomorrow, what would it be?", options: ["Shooting", "Finishing", "Ball Handling", "Defense", "Athleticism", "Rebounding", "Confidence", "Basketball IQ"] },
  { type: "chapter", title: "How Bad Do You Want It?", sub: "Be honest. This stays between us." },
  { type: "question", id: "Q9", text: "How serious is basketball in your life right now?", options: ["Casual Hobby", "Serious Hobby", "Major Priority", "My Biggest Goal"] },
  { type: "question", id: "Q10", text: "How often do you train outside of team practice?", options: ["Never", "Rarely", "1–2 Times a Week", "3–4 Times a Week", "5–6 Times a Week", "Daily"] },
  { type: "question", id: "Q11", text: "How many years have you played organized team basketball?", options: ["0", "1–3", "4–6", "7–10", "10+"] },
  { type: "question", id: "Q12", text: "How many years have you played basketball in general?", options: ["0", "1–3", "4–6", "7–10", "10+"] },
  { type: "chapter", title: "Pressure Reveals Character", sub: "Anyone can play well when it's easy. Let's talk about when it's not." },
  { type: "question", id: "Q13", text: "When games get close, what do you do?", options: ["Tense up and get nervous", "Embrace the moment", "Imagine myself on the sidelines", "Don't think too much about it"] },
  { type: "question", id: "Q14", text: "How confident are you in your ability to impact games?", options: ["Still Learning", "Sometimes", "Usually", "Consistently", "I expect to be one of the best players on the court"] },
  { type: "question", id: "Q15", text: "After a bad game, what's your honest reaction?", options: ["I get frustrated and need time to cool off", "I replay it trying to figure out what went wrong", "I immediately think about what I need to fix", "I get back in the gym as soon as I can", "I barely think about it — I'm already focused on the next one"] },
  { type: "question", id: "Q16", text: "Which statement feels most like you right now?", options: ["I'm still learning the fundamentals and figuring out my game", "I work hard in practice but haven't found my role yet", "I've earned a steady spot and contribute when I'm needed", "I'm one of the players my team leans on to make plays happen", "I expect to dominate every time I step on the court"] },
  { type: "chapter", title: "What Are You Chasing?", sub: "Last one. Then we show you everything." },
  { type: "question", id: "Q17", text: "What's your primary basketball goal right now?", options: ["Make a team I'm trying out for", "Earn more playing time / a bigger role", "Play at the next level (high school, college, etc.)", "Become the best version of my game, for myself", "Compete at the highest level I possibly can"] },
  { type: "email" },
  { type: "password" },
];

// Pre-compute question numbers for progress display (null for non-question steps)
const QUESTION_NUMBERS: (number | null)[] = (() => {
  let n = 0;
  return STEPS.map(s => s.type === "question" ? ++n : null);
})();

// ─── SCORING ENGINE ───────────────────────────────────────────────────────────
interface AssessmentResult {
  archetype: string;
  archetypeTagline: string;
  archetypeStrengths: string[];
  archetypeFocus: string;
  archetypeCoachP: string;
  stage: string;
  stageDescription: string;
  stageNeedsMost: string;
  teamRole: string;
  bottleneck: string;
  bottleneckDescription: string;
  bottleneckUnlocks: string;
  top3GrowthAreas: string[];
  mindsetScore: number;
  mindsetBand: string;
  dedicationScore: number;
  dedicationBand: string;
  experienceScore: number;
  experienceBand: string;
  primaryGoal: string;
}

function scoreArchetype(ans: Map<string, string>): string {
  const pts: Record<string, number> = {};
  const questions: Record<string, Set<string>> = {};

  const add = (arch: string, p: number, qId: string) => {
    pts[arch] = (pts[arch] || 0) + p;
    if (!questions[arch]) questions[arch] = new Set();
    questions[arch].add(qId);
  };

  const q1 = ans.get("Q1");
  if (q1 === "Shots are falling") { add("Sharpshooter", 3, "Q1"); add("Stretch Big", 1, "Q1"); }
  else if (q1 === "I'm breaking down defenders") { add("Shot Creator", 3, "Q1"); add("Athletic Slasher", 1, "Q1"); }
  else if (q1 === "I'm controlling the offense") { add("Floor General", 3, "Q1"); add("Playmaking Wing", 1, "Q1"); }
  else if (q1 === "I'm locking people up") { add("Lockdown Defender", 3, "Q1"); add("Two-Way Player", 1, "Q1"); }
  else if (q1 === "I'm dominating inside") { add("Rim Protector", 2, "Q1"); add("Athletic Slasher", 2, "Q1"); }

  const q2 = ans.get("Q2");
  if (q2 === "Shooting the ball") { add("Sharpshooter", 3, "Q2"); add("Stretch Big", 1, "Q2"); }
  else if (q2 === "Creating my own shot off the dribble") { add("Shot Creator", 3, "Q2"); add("Athletic Slasher", 1, "Q2"); }
  else if (q2 === "Setting up teammates / playmaking") { add("Floor General", 3, "Q2"); add("Playmaking Wing", 2, "Q2"); }
  else if (q2 === "Defending and disrupting") { add("Lockdown Defender", 3, "Q2"); add("Two-Way Player", 1, "Q2"); }
  else if (q2 === "Attacking the rim / finishing through contact") { add("Athletic Slasher", 3, "Q2"); add("Shot Creator", 1, "Q2"); }
  else if (q2 === "Rebounding and playing physical") { add("Swiss Army Knife", 3, "Q2"); add("Rim Protector", 1, "Q2"); }
  else if (q2 === "Doing a little bit of everything") { add("Swiss Army Knife", 3, "Q2"); add("Two-Way Player", 2, "Q2"); }
  else if (q2 === "Protecting the rim / shot blocking") { add("Rim Protector", 3, "Q2"); add("Lockdown Defender", 1, "Q2"); }

  const q5 = ans.get("Q5");
  if (q5 === "Take the shot") { add("Sharpshooter", 3, "Q5"); add("Stretch Big", 1, "Q5"); }
  else if (q5 === "Create a shot") { add("Shot Creator", 3, "Q5"); add("Athletic Slasher", 1, "Q5"); }
  else if (q5 === "Drive") { add("Athletic Slasher", 3, "Q5"); add("Shot Creator", 1, "Q5"); }
  else if (q5 === "Find an open teammate") { add("Floor General", 3, "Q5"); add("Playmaking Wing", 1, "Q5"); }
  else if (q5 === "Get a teammate open") { add("Playmaking Wing", 3, "Q5"); add("Swiss Army Knife", 1, "Q5"); }
  else if (q5 === "Get the offensive rebound") { add("Rim Protector", 2, "Q5"); add("Swiss Army Knife", 2, "Q5"); }

  const allArchetypes = Object.keys(pts);
  if (!allArchetypes.length) return "Two-Way Player";

  allArchetypes.sort((a, b) => {
    if (pts[b] !== pts[a]) return pts[b] - pts[a];
    const qA = questions[a]?.size ?? 0;
    const qB = questions[b]?.size ?? 0;
    if (qB !== qA) return qB - qA;
    // Q2 tiebreak
    if (q2) {
      if (questions[b]?.has("Q2") && !questions[a]?.has("Q2")) return 1;
      if (questions[a]?.has("Q2") && !questions[b]?.has("Q2")) return -1;
    }
    return 0;
  });

  return allArchetypes[0];
}

function scoreStage(ans: Map<string, string>): string {
  const q4Map: Record<string, number> = {
    "Not On A Team": 0, "Limited Minutes": 2, "Rotation Player": 4, "Starter": 6, "Team Leader": 8,
  };
  const q16Map: Record<string, number> = {
    "I'm still learning the fundamentals and figuring out my game": 0,
    "I work hard in practice but haven't found my role yet": 2,
    "I've earned a steady spot and contribute when I'm needed": 4,
    "I'm one of the players my team leans on to make plays happen": 6,
    "I expect to dominate every time I step on the court": 8,
  };
  const total = (q4Map[ans.get("Q4") ?? ""] ?? 0) + (q16Map[ans.get("Q16") ?? ""] ?? 0);
  if (total <= 2) return "Foundation Builder";
  if (total <= 5) return "Aspiring Player";
  if (total <= 8) return "Team Contributor";
  if (total <= 11) return "Impact Player";
  if (total <= 14) return "Difference Maker";
  return "Elite Competitor";
}

function scoreTeamRole(ans: Map<string, string>): string {
  const map: Record<string, string> = {
    "Elementary School": "Youth Player",
    "Middle School": "Middle School Player",
    "Freshman / JV": "Freshman / JV Player",
    "Varsity": "Varsity Player",
    "College Basketball": "College Player",
    "Intramural League": "Adult Rec League Player",
    "Adult Rec League": "Adult Rec League Player",
    "Just Playing For Fun": "Casual / For-Fun Player",
  };
  return map[ans.get("Q3") ?? ""] ?? "Casual / For-Fun Player";
}

function scoreBottleneck(ans: Map<string, string>): { bottleneck: string; top3: string[] } {
  const pts: Record<string, number> = {};
  const add = (cat: string, w: number) => { pts[cat] = (pts[cat] || 0) + w; };

  const q6Map: Record<string, string> = {
    "Missing open shots": "Shooting", "Losing the ball": "Ball Handling",
    "Finishing at the rim": "Finishing", "Defending athletes and scorers": "Defense",
    "Making quick decisions under pressure": "Basketball IQ", "Confidence": "Confidence",
  };
  const q7Map: Record<string, string> = {
    "Can't create space": "Ball Handling", "Miss opportunities": "Shooting",
    "Lose confidence": "Confidence", "Got sped up": "Basketball IQ",
    "Too slow / physical limitations": "Athleticism", "Defensive mistakes": "Defense",
    "Poor shot selection": "Basketball IQ",
  };
  // Q8 answer IS the category name
  const q6cat = q6Map[ans.get("Q6") ?? ""];
  const q7cat = q7Map[ans.get("Q7") ?? ""];
  const q8cat = ans.get("Q8");

  if (q6cat) add(q6cat, 4);
  if (q7cat) add(q7cat, 3);
  if (q8cat && BOTTLENECKS[q8cat]) add(q8cat, 3);

  const sorted = Object.entries(pts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const top3 = Array.from(new Set([q6cat, q7cat, q8cat].filter(Boolean) as string[])).slice(0, 3);
  while (top3.length < 3 && sorted.length > top3.length) {
    const next = sorted.find(s => !top3.includes(s));
    if (next) top3.push(next);
    else break;
  }
  return { bottleneck: sorted[0] ?? q8cat ?? "Basketball IQ", top3 };
}

function scoreMindset(ans: Map<string, string>): { score: number; band: string } {
  const q13Map: Record<string, number> = {
    "Tense up and get nervous": 2, "Embrace the moment": 10,
    "Imagine myself on the sidelines": 0, "Don't think too much about it": 6,
  };
  const q14Map: Record<string, number> = {
    "Still Learning": 2, "Sometimes": 4, "Usually": 6, "Consistently": 8,
    "I expect to be one of the best players on the court": 10,
  };
  const q15Map: Record<string, number> = {
    "I get frustrated and need time to cool off": 3,
    "I replay it trying to figure out what went wrong": 6,
    "I immediately think about what I need to fix": 9,
    "I get back in the gym as soon as I can": 10,
    "I barely think about it — I'm already focused on the next one": 8,
  };
  const total = (q13Map[ans.get("Q13") ?? ""] ?? 5) + (q14Map[ans.get("Q14") ?? ""] ?? 5) + (q15Map[ans.get("Q15") ?? ""] ?? 5);
  const score = Math.round((total / 30) * 100);
  const band = score <= 20 ? "Still Building Belief" : score <= 40 ? "Finding Your Footing" : score <= 60 ? "Trusting Your Game" : score <= 80 ? "Bringing The Heat" : "Ice In Your Veins";
  return { score, band };
}

function scoreDedication(ans: Map<string, string>): { score: number; band: string } {
  const q9Map: Record<string, number> = {
    "Casual Hobby": 2, "Serious Hobby": 5, "Major Priority": 8, "My Biggest Goal": 10,
  };
  const q10Map: Record<string, number> = {
    "Never": 0, "Rarely": 2, "1–2 Times a Week": 4, "3–4 Times a Week": 7, "5–6 Times a Week": 9, "Daily": 10,
  };
  const total = (q9Map[ans.get("Q9") ?? ""] ?? 3) + (q10Map[ans.get("Q10") ?? ""] ?? 3);
  const score = Math.round((total / 20) * 100);
  const band = score <= 20 ? "Just Getting Started" : score <= 40 ? "Building The Habit" : score <= 60 ? "Putting In Work" : score <= 80 ? "Grinding" : "Obsessed";
  return { score, band };
}

function scoreExperience(ans: Map<string, string>): { score: number; band: string } {
  const yearsMap: Record<string, number> = { "0": 0, "1–3": 2, "4–6": 5, "7–10": 8, "10+": 10 };
  const total = (yearsMap[ans.get("Q11") ?? ""] ?? 0) + (yearsMap[ans.get("Q12") ?? ""] ?? 0);
  const score = Math.round((total / 20) * 100);
  const band = score <= 20 ? "New To The Game" : score <= 40 ? "Building A Foundation" : score <= 60 ? "Seasoned Player" : score <= 80 ? "Deep Roots" : "Lifer";
  return { score, band };
}

function computeResults(ans: Map<string, string>): AssessmentResult {
  const archetypeName = scoreArchetype(ans);
  const archData = ARCHETYPES[archetypeName] ?? ARCHETYPES["Two-Way Player"];
  const stageName = scoreStage(ans);
  const stageData = STAGES[stageName] ?? STAGES["Team Contributor"];
  const teamRole = scoreTeamRole(ans);
  const { bottleneck, top3 } = scoreBottleneck(ans);
  const btData = BOTTLENECKS[bottleneck] ?? BOTTLENECKS["Basketball IQ"];
  const mindset = scoreMindset(ans);
  const dedication = scoreDedication(ans);
  const experience = scoreExperience(ans);

  return {
    archetype: archetypeName,
    archetypeTagline: archData.tagline,
    archetypeStrengths: archData.strengths,
    archetypeFocus: archData.focus,
    archetypeCoachP: archData.coachP,
    stage: stageName,
    stageDescription: stageData.description,
    stageNeedsMost: stageData.needsMost,
    teamRole,
    bottleneck,
    bottleneckDescription: btData.description,
    bottleneckUnlocks: btData.unlocks,
    top3GrowthAreas: top3,
    mindsetScore: mindset.score,
    mindsetBand: mindset.band,
    dedicationScore: dedication.score,
    dedicationBand: dedication.band,
    experienceScore: experience.score,
    experienceBand: experience.band,
    primaryGoal: ans.get("Q17") ?? "",
  };
}

// ─── MOCK RESULTS (preview mode) ────────────────────────────────────────────
const MOCK_RESULTS: AssessmentResult = computeResults(new Map([
  ["Q1", "I'm breaking down defenders"], ["Q2", "Creating my own shot off the dribble"],
  ["Q3", "Varsity"], ["Q4", "Starter"], ["Q5", "Create a shot"],
  ["Q6", "Missing open shots"], ["Q7", "Can't create space"], ["Q8", "Shooting"],
  ["Q9", "Major Priority"], ["Q10", "3–4 Times a Week"], ["Q11", "4–6"], ["Q12", "7–10"],
  ["Q13", "Embrace the moment"], ["Q14", "Consistently"], ["Q15", "I immediately think about what I need to fix"],
  ["Q16", "I'm one of the players my team leans on to make plays happen"],
  ["Q17", "Play at the next level (high school, college, etc.)"],
]));

// ─── RESULT SLIDES CONFIG ────────────────────────────────────────────────────
const SLIDE_CONFIGS = [
  { key: "archetype", bg: "bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500", label: "YOUR ARCHETYPE", text: "text-orange-950", sub: "text-orange-950/70" },
  { key: "stage",     bg: "bg-gradient-to-br from-blue-700 via-blue-500 to-cyan-400",     label: "YOUR DEVELOPMENT STAGE", text: "text-blue-950", sub: "text-blue-950/70" },
  { key: "bottleneck",bg: "bg-gradient-to-br from-rose-700 via-rose-500 to-orange-400",   label: "YOUR #1 GROWTH AREA", text: "text-rose-950", sub: "text-rose-950/70" },
  { key: "summary",   bg: "bg-zinc-950",                                                  label: "YOUR PLAYR1 JOURNEY", text: "text-white", sub: "text-zinc-400" },
];

// ─── PROPS ────────────────────────────────────────────────────────────────────
interface WelcomePageProps {
  previewMode?: boolean;
  onPreviewComplete?: () => void;
}

type Phase = "intro" | "quiz" | "loading" | "results";

export default function WelcomePage({ previewMode = false, onPreviewComplete }: WelcomePageProps = {}) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [animIn, setAnimIn] = useState(true);

  // Inline captures
  const [firstName, setFirstName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captureError, setCaptureError] = useState("");

  // Results
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [resultSlide, setResultSlide] = useState(0);
  const [slideIn, setSlideIn] = useState(true);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const summaryCardRef = useRef<HTMLDivElement>(null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "shared">("idle");

  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Offset for preview banner (banner ≈ 40px)
  const topPad = previewMode ? "pt-10" : "";

  // ── Intro auto-advance ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "intro") {
      introTimerRef.current = setTimeout(() => setPhase("quiz"), 4000);
      return () => { if (introTimerRef.current) clearTimeout(introTimerRef.current); };
    }
  }, [phase]);

  const advanceIntro = useCallback(() => {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    setPhase("quiz");
  }, []);

  // ── Quiz navigation ───────────────────────────────────────────────────────
  function goToStep(idx: number) {
    setAnimIn(false);
    setTimeout(() => { setStepIdx(idx); setAnimIn(true); }, 220);
  }

  function advanceStep() { goToStep(stepIdx + 1); }

  function handleAnswer(answer: string) {
    if (transitioning) return;
    const step = STEPS[stepIdx];
    if (step.type !== "question") return;
    setSelectedOption(answer);
    setTransitioning(true);
    setTimeout(() => {
      setAnswers(prev => new Map(prev).set(step.id, answer));
      setSelectedOption(null);
      setTransitioning(false);
      goToStep(stepIdx + 1);
    }, 320);
  }

  function handleCaptureNext() {
    setCaptureError("");
    const step = STEPS[stepIdx];
    if (step.type === "name") {
      if (!firstName.trim()) { setCaptureError("Please enter your first name"); return; }
    } else if (step.type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim())) { setCaptureError("Please enter a valid email address"); return; }
    } else if (step.type === "password") {
      if (accountPassword.length < 8) { setCaptureError("Password must be at least 8 characters"); return; }
      handleSubmit();
      return;
    }
    advanceStep();
  }

  // ── Submit (register + save results) ─────────────────────────────────────
  async function handleSubmit() {
    setPhase("loading");
    const computed = computeResults(answers);

    if (previewMode) {
      await new Promise(r => setTimeout(r, 2000));
      setResults(MOCK_RESULTS);
      setResultSlide(0);
      setPhase("results");
      return;
    }

    try {
      const registerRes = await fetch(buildUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ firstName: firstName.trim(), email: accountEmail.trim().toLowerCase(), password: accountPassword }),
        credentials: "include",
      });
      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        setCaptureError(err.message || "Registration failed. Try a different email.");
        setStepIdx(STEPS.findIndex(s => s.type === "email"));
        setPhase("quiz");
        return;
      }
      const registerData = await registerRes.json();
      if (registerData?.token) storeAuthToken(registerData.token);
      const { token: _t, ...userData } = registerData;
      setRegisteredUser(userData);
      track("signup", { userId: userData?.id, source: "cinematic-onboarding" });

      // Store pre-computed results (no AI call)
      await apiRequest("POST", "/api/onboarding/assess", {
        result: computed,
        answers: Object.fromEntries(answers),
      });
      qc.invalidateQueries({ queryKey: ["/api/career"] });
      setResults(computed);
      setResultSlide(0);
      setPhase("results");
    } catch (err) {
      console.error("Onboarding error:", err);
      setCaptureError("Something went wrong. Please try again.");
      setStepIdx(STEPS.findIndex(s => s.type === "email"));
      setPhase("quiz");
    }
  }

  function advanceResult() {
    if (resultSlide < SLIDE_CONFIGS.length - 1) {
      setSlideIn(false);
      setTimeout(() => { setResultSlide(r => r + 1); setSlideIn(true); }, 230);
    }
  }

  function finishOnboarding() {
    if (previewMode) { onPreviewComplete?.(); return; }
    localStorage.setItem("playr1_new_onboarding", "1");
    if (registeredUser) { qc.setQueryData(["/api/auth/user"], registeredUser); }
    else { qc.invalidateQueries({ queryKey: ["/api/auth/user"] }); }
    navigate("/hub");
  }

  async function handleShareSummary() {
    if (!summaryCardRef.current || shareState !== "idle") return;
    setShareState("sharing");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(summaryCardRef.current, { backgroundColor: "#09090b", scale: 2, useCORS: true, logging: false });
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "playr1-player-profile.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My PLAYR1 Player Profile" });
      } else {
        const a = document.createElement("a"); a.download = "playr1-player-profile.png"; a.href = dataUrl; a.click();
      }
      setShareState("shared");
      setTimeout(() => setShareState("idle"), 3000);
    } catch { setShareState("idle"); }
  }

  // ─── INTRO ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className={`fixed inset-0 bg-black flex flex-col items-center justify-center cursor-pointer select-none ${topPad}`}
        onClick={advanceIntro} data-testid="screen-intro">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 rounded-full bg-orange-500/20 blur-3xl animate-pulse" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
          <img src={logoImg} alt="PLAYR1" className="h-16 w-auto object-contain" data-testid="img-intro-logo" />
          <div className="space-y-1">
            <p className="text-white/40 text-xs tracking-[0.3em] uppercase">Find Your PLAYR1 Journey in</p>
            <p className="text-white text-xl font-bold tracking-tight">Under 60 Seconds</p>
          </div>
          <div className="w-12 h-0.5 bg-orange-500 rounded-full" />
          <p className="text-white/50 text-sm max-w-xs leading-relaxed">17 questions. Pure basketball. No fluff.</p>
          <p className="text-white/25 text-xs animate-pulse mt-2">Tap anywhere to begin</p>
        </div>
      </div>
    );
  }

  // ─── QUIZ ─────────────────────────────────────────────────────────────────
  if (phase === "quiz") {
    const step = STEPS[stepIdx];
    const qNum = QUESTION_NUMBERS[stepIdx];
    const totalQs = 17;

    // Chapter transition screen
    if (step.type === "chapter") {
      const title = step.title.replace("{name}", firstName || "Player");
      return (
        <div className={`fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center px-6 text-center ${topPad}`}
          onClick={advanceStep} data-testid="screen-chapter" style={{ cursor: "pointer" }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-orange-500/8 blur-3xl" />
          </div>
          <div className={`relative z-10 space-y-4 transition-all duration-220 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <span className="text-orange-400 text-xs font-bold tracking-wider uppercase">PLAYER ASSESSMENT</span>
            </div>
            <h2 className="text-white text-3xl font-black leading-tight">{title}</h2>
            <p className="text-zinc-400 text-base leading-relaxed max-w-xs">{step.sub}</p>
            <p className="text-zinc-600 text-sm pt-4 animate-pulse">Tap to continue →</p>
          </div>
        </div>
      );
    }

    // Name capture
    if (step.type === "name") {
      return (
        <div className={`fixed inset-0 bg-zinc-950 flex flex-col ${topPad}`} data-testid="screen-name-capture">
          <div className="flex-1 flex flex-col justify-center px-5 py-6">
            <div className="mb-8 space-y-1">
              <p className="text-orange-400 text-xs font-bold tracking-widest uppercase">Alright — we're already learning a lot about your game.</p>
              <h2 className="text-white text-2xl font-bold leading-tight mt-2">Before we keep going —<br />what should we call you?</h2>
            </div>
            <div className="space-y-4">
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Your first name" autoFocus data-testid="input-first-name"
                onKeyDown={e => e.key === "Enter" && handleCaptureNext()}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-5 py-4 text-base placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors" />
              {captureError && <p className="text-red-400 text-sm" data-testid="text-capture-error">{captureError}</p>}
              <button onClick={handleCaptureNext} data-testid="button-name-next"
                className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2">
                That's Me <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Email capture
    if (step.type === "email") {
      return (
        <div className={`fixed inset-0 bg-zinc-950 flex flex-col ${topPad}`} data-testid="screen-email-capture">
          <div className="flex-1 flex flex-col justify-center px-5 py-6">
            <div className="mb-8 space-y-1">
              <p className="text-orange-400 text-xs font-bold tracking-widest uppercase">Almost there</p>
              <h2 className="text-white text-2xl font-bold leading-tight mt-2">{firstName || "Your"} PLAYR1 Journey is built.<br />Enter your email to unlock it.</h2>
            </div>
            <div className="space-y-4">
              <input type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)}
                placeholder="you@example.com" autoFocus data-testid="input-email"
                onKeyDown={e => e.key === "Enter" && handleCaptureNext()}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-5 py-4 text-base placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors" />
              {captureError && <p className="text-red-400 text-sm" data-testid="text-capture-error">{captureError}</p>}
              <button onClick={handleCaptureNext} data-testid="button-email-next"
                className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2">
                Unlock My Journey <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="shrink-0 px-5 pb-6 text-center">
            <a href="/auth" className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors">Already have an account? Sign in</a>
          </div>
        </div>
      );
    }

    // Password capture
    if (step.type === "password") {
      return (
        <div className={`fixed inset-0 bg-zinc-950 flex flex-col ${topPad}`} data-testid="screen-password-capture">
          <div className="flex-1 flex flex-col justify-center px-5 py-6">
            <div className="mb-8 space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-orange-400 text-xs font-bold tracking-widest uppercase">Save your journey</p>
              <h2 className="text-white text-2xl font-bold leading-tight mt-2">Almost there.<br />Save your progress.</h2>
              <p className="text-zinc-500 text-sm">Minimum 8 characters.</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={accountPassword}
                  onChange={e => setAccountPassword(e.target.value)}
                  placeholder="Create your password" autoFocus data-testid="input-password"
                  onKeyDown={e => e.key === "Enter" && handleCaptureNext()}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-5 py-4 text-base placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors pr-12" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300" data-testid="button-toggle-password">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {captureError && <p className="text-red-400 text-sm" data-testid="text-capture-error">{captureError}</p>}
              <button onClick={handleCaptureNext} data-testid="button-password-next"
                className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2">
                Save & Reveal My Results <ChevronRight className="h-5 w-5" />
              </button>
              <button onClick={() => { setCaptureError(""); goToStep(stepIdx - 1); }}
                className="w-full text-zinc-500 text-sm py-2" data-testid="button-back">Go back</button>
            </div>
          </div>
        </div>
      );
    }

    // Question screen
    const progress = qNum ? (qNum / totalQs) * 100 : 0;
    return (
      <div className={`fixed inset-0 bg-zinc-950 flex flex-col ${topPad}`} data-testid="screen-quiz">
        {/* Progress bar */}
        <div className="shrink-0 px-5 pt-5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-xs font-medium">{qNum} of {totalQs}</span>
            <span className="text-orange-400 text-xs font-bold tracking-widest uppercase">Player Assessment</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question + options */}
        <div className={`flex-1 flex flex-col justify-center px-5 py-4 overflow-y-auto transition-all duration-220 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <h2 className="text-white text-xl font-bold leading-snug mb-6" data-testid="text-quiz-question">
            {step.text}
          </h2>
          <div className="space-y-2.5">
            {step.options.map((opt, i) => {
              const isSel = selectedOption === opt;
              return (
                <button key={i} onClick={() => handleAnswer(opt)} disabled={transitioning}
                  data-testid={`button-quiz-option-${i}`}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${isSel ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20" : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-orange-500/40 hover:bg-zinc-800/80"}`}>
                  <span className="text-sm font-medium leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className={`fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-7 ${topPad}`} data-testid="screen-loading">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-zinc-800" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-white text-xl font-bold">Building your profile…</p>
          <p className="text-zinc-500 text-sm">Analyzing your answers</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ─── RESULTS ─────────────────────────────────────────────────────────────
  if (phase === "results" && results) {
    const cfg = SLIDE_CONFIGS[resultSlide];
    const isLast = resultSlide === SLIDE_CONFIGS.length - 1;

    return (
      <div className={`fixed inset-0 ${cfg.bg} flex flex-col overflow-hidden ${topPad}`}
        data-testid={`screen-result-${resultSlide}`}
        onClick={isLast ? undefined : advanceResult}
        style={{ cursor: isLast ? "default" : "pointer" }}>

        {/* Slide dots */}
        <div className="shrink-0 flex justify-center gap-1.5 pt-5 pb-2">
          {SLIDE_CONFIGS.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === resultSlide ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/25"}`} />
          ))}
        </div>

        {/* ── Archetype slide ── */}
        {cfg.key === "archetype" && (
          <div className={`flex-1 flex flex-col px-6 pb-4 overflow-y-auto transition-all duration-230 ${slideIn ? "opacity-100" : "opacity-0"}`}>
            <div className="flex-1 flex flex-col justify-center">
              <p className={`text-xs font-bold tracking-[0.3em] uppercase mb-3 ${cfg.sub}`}>{cfg.label}</p>
              <div className="text-5xl mb-3">{ARCHETYPES[results.archetype]?.icon ?? "🏀"}</div>
              <h1 className={`text-3xl font-black leading-tight mb-2 ${cfg.text}`} data-testid="text-result-title">
                {firstName ? `${firstName.toUpperCase()}, YOU'RE A` : "YOU'RE A"}<br />
                {results.archetype.toUpperCase()}
              </h1>
              <p className={`text-base italic leading-relaxed mb-4 ${cfg.sub}`}>"{results.archetypeTagline}"</p>

              {/* Strength chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {results.archetypeStrengths.map(s => (
                  <span key={s} className="px-2.5 py-1 rounded-full bg-black/10 text-xs font-semibold text-orange-950/80">{s}</span>
                ))}
              </div>

              {/* Coach P quote */}
              <div className="bg-black/10 rounded-2xl p-4 border border-black/10">
                <p className={`text-xs font-bold mb-1 ${cfg.sub}`}>COACH P SAYS</p>
                <p className={`text-sm leading-relaxed ${cfg.text}`}>"{results.archetypeCoachP}"</p>
              </div>
            </div>
            <p className={`text-center text-xs pt-3 ${cfg.sub}`}>Tap anywhere to continue</p>
          </div>
        )}

        {/* ── Stage slide ── */}
        {cfg.key === "stage" && (
          <div className={`flex-1 flex flex-col px-6 pb-4 overflow-y-auto transition-all duration-230 ${slideIn ? "opacity-100" : "opacity-0"}`}>
            <div className="flex-1 flex flex-col justify-center">
              <p className={`text-xs font-bold tracking-[0.3em] uppercase mb-3 ${cfg.sub}`}>{cfg.label}</p>

              {/* Stage ladder */}
              <div className="flex flex-col gap-1 mb-5">
                {STAGE_ORDER.map((s, i) => {
                  const isActive = s === results.stage;
                  const isPast = STAGE_ORDER.indexOf(results.stage) > i;
                  return (
                    <div key={s} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${isActive ? "bg-white/25 border border-white/30" : isPast ? "opacity-50" : "opacity-20"}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-white" : isPast ? "bg-white/70" : "bg-white/30"}`} />
                      <span className={`text-sm font-${isActive ? "black" : "medium"} ${cfg.text}`}>{s}</span>
                      {isActive && <span className="ml-auto text-xs font-bold text-white/70">← YOU</span>}
                    </div>
                  );
                })}
              </div>

              <h1 className={`text-2xl font-black leading-tight mb-2 ${cfg.text}`} data-testid="text-result-title">
                YOU'RE AN<br />{results.stage.toUpperCase()}
              </h1>
              <p className={`text-sm leading-relaxed mb-3 ${cfg.sub}`}>{results.stageDescription}</p>
              <div className="bg-black/10 rounded-2xl p-3.5 border border-black/10">
                <p className={`text-xs font-bold mb-1 ${cfg.sub}`}>WHAT YOU NEED MOST</p>
                <p className={`text-sm leading-relaxed ${cfg.text}`}>{results.stageNeedsMost}</p>
              </div>
            </div>
            <p className={`text-center text-xs pt-3 ${cfg.sub}`}>Tap anywhere to continue</p>
          </div>
        )}

        {/* ── Bottleneck slide ── */}
        {cfg.key === "bottleneck" && (
          <div className={`flex-1 flex flex-col px-6 pb-4 overflow-y-auto transition-all duration-230 ${slideIn ? "opacity-100" : "opacity-0"}`}>
            <div className="flex-1 flex flex-col justify-center">
              <p className={`text-xs font-bold tracking-[0.3em] uppercase mb-3 ${cfg.sub}`}>{cfg.label}</p>

              {/* Top 3 bars */}
              {results.top3GrowthAreas.length > 0 && (
                <div className="flex flex-col gap-2 mb-5">
                  {results.top3GrowthAreas.map((area, i) => {
                    const isTop = i === 0;
                    const widths = ["100%", "65%", "45%"];
                    return (
                      <div key={area} className="flex items-center gap-2.5">
                        <span className={`text-xs font-bold w-4 flex-shrink-0 ${cfg.text}`}>#{i + 1}</span>
                        <div className="flex-1 bg-black/15 rounded-full h-2">
                          <div className={`h-full rounded-full transition-all duration-700 ${isTop ? "bg-white" : "bg-white/50"}`} style={{ width: widths[i] }} />
                        </div>
                        <span className={`text-xs font-semibold w-24 flex-shrink-0 ${isTop ? cfg.text : cfg.sub}`}>{area}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <h1 className={`text-2xl font-black leading-tight mb-3 ${cfg.text}`} data-testid="text-result-title">
                {results.bottleneck.toUpperCase()}
              </h1>
              <p className={`text-sm leading-relaxed mb-3 ${cfg.sub}`}>
                This isn't a weakness call-out. It's the single highest-leverage thing you can work on right now.
              </p>
              <div className="bg-black/10 rounded-2xl p-3.5 border border-black/10">
                <p className={`text-xs font-bold mb-1 ${cfg.sub}`}>WHAT IMPROVING THIS UNLOCKS</p>
                <p className={`text-sm leading-relaxed ${cfg.text}`}>{results.bottleneckUnlocks}</p>
              </div>
            </div>
            <p className={`text-center text-xs pt-3 ${cfg.sub}`}>Tap anywhere to continue</p>
          </div>
        )}

        {/* ── Summary card ── */}
        {cfg.key === "summary" && (
          <div className={`flex-1 flex flex-col px-5 pb-4 overflow-y-auto transition-all duration-230 ${slideIn ? "opacity-100" : "opacity-0"}`}>
            {/* Capturable card */}
            <div ref={summaryCardRef} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mb-3 flex flex-col" data-testid="card-summary">
              <div className="flex items-center justify-between mb-4">
                <img src={logoImg} alt="PLAYR1" className="h-6 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                <span className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Player Profile</span>
              </div>

              <h2 className="text-white text-lg font-black mb-4">
                {firstName ? `${firstName}'s PLAYR1 Journey` : "My PLAYR1 Journey"}
              </h2>

              <div className="space-y-2.5 flex-1">
                {[
                  { icon: "🏀", label: "Archetype", value: results.archetype },
                  { icon: "📈", label: "Stage", value: results.stage },
                  { icon: "🏟️", label: "Level", value: results.teamRole },
                  { icon: "🎯", label: "Top Growth Area", value: results.bottleneck },
                  { icon: "🔥", label: "Mindset", value: `${results.mindsetScore} — ${results.mindsetBand}` },
                  { icon: "💪", label: "Dedication", value: `${results.dedicationScore} — ${results.dedicationBand}` },
                  { icon: "⏳", label: "Experience", value: `${results.experienceScore} — ${results.experienceBand}` },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      <span className="text-zinc-400 text-xs font-medium">{label}</span>
                    </div>
                    <span className={`text-sm font-bold ${label === "Top Growth Area" ? "text-orange-400" : "text-white"}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs text-center">playr1.app · Powered by PLAYR1</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2.5" onClick={e => e.stopPropagation()}>
              <button onClick={handleShareSummary} disabled={shareState === "sharing"} data-testid="button-share-profile"
                className="w-full bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-white rounded-2xl py-3.5 font-bold text-sm transition-all flex items-center justify-center gap-2 border border-zinc-700">
                {shareState === "shared" ? <><Check className="h-4 w-4 text-green-400" /> Saved!</>
                  : shareState === "sharing" ? <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                  : navigator.canShare ? <><Share2 className="h-4 w-4" /> Share My PLAYR1 Card</>
                  : <><Download className="h-4 w-4" /> Save My PLAYR1 Card</>}
              </button>
              <button onClick={finishOnboarding} data-testid="button-start-journey"
                className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2">
                Start My First Training Session <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
