import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { apiRequest, storeAuthToken, buildUrl, getAuthHeaders } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/track";
import logoImg from "@assets/PNG_image_auth_trimmed.png";
import { Eye, EyeOff, Share2, Download, Check, Lock, ArrowRight, ChevronRight } from "lucide-react";

function getCharIcon(c: string): string {
  const l = c.toLowerCase();
  if (l.includes("shoot") || l.includes("shot") || l.includes("range") || l.includes("arc")) return "🎯";
  if (l.includes("handling") || l.includes("dribble") || l.includes("ball")) return "🏀";
  if (l.includes("defense") || l.includes("defensive") || l.includes("deny") || l.includes("pressure")) return "🛡️";
  if (l.includes("finish") || l.includes("contact") || l.includes("paint")) return "💪";
  if (l.includes("pass") || l.includes("vision") || l.includes("making") || l.includes("court")) return "👁️";
  if (l.includes("speed") || l.includes("burst") || l.includes("quick") || l.includes("lateral") || l.includes("explosive")) return "⚡";
  if (l.includes("rebound")) return "🏆";
  if (l.includes("block") || l.includes("protect") || l.includes("anchor")) return "🤚";
  if (l.includes("iq") || l.includes("versatil") || l.includes("selfless") || l.includes("selflessness")) return "🧠";
  if (l.includes("leadership") || l.includes("tempo")) return "⭐";
  if (l.includes("condition") || l.includes("consistency") || l.includes("motor") || l.includes("physical")) return "🔄";
  if (l.includes("size") || l.includes("transition") || l.includes("spacing")) return "📐";
  return "🏀";
}

// ─── ROMAN NUMERALS ──────────────────────────────────────────────────────────
function toRoman(n: number): string {
  return (["I","II","III","IV","V","VI","VII","VIII","IX","X"])[n - 1] ?? n.toString();
}

// ─── ARCHETYPE META ──────────────────────────────────────────────────────────
// Includes icon (for result slides), tagline, strengths, coach quote, gradient, primaryHex
const ARCHETYPE_META: Record<string, {
  icon: string; tagline: string; strengths: string[]; coachP: string;
  gradient: string; primaryHex: string;
}> = {
  "Sharpshooter": {
    icon: "🎯", primaryHex: "#3b82f6",
    gradient: "from-blue-800 via-blue-700 to-blue-600",
    tagline: "Give me an inch of space, and it's already going in.",
    strengths: ["Elite shot mechanics", "Quick release", "Movement shooting", "Creates spacing"],
    coachP: "Your shot isn't just a skill — it's a weapon defenses have to respect every second you're on the floor. My job is making sure you can get that shot off in more ways than standing still waiting for a pass.",
  },
  "Shot Creator": {
    icon: "⚡", primaryHex: "#f97316",
    gradient: "from-orange-800 via-orange-600 to-amber-500",
    tagline: "I don't need a screen. I make my own daylight.",
    strengths: ["Advanced ball handling", "One-on-one scoring", "Shot-making off the dribble", "Footwork & change of pace"],
    coachP: "You can get a bucket when nobody else can. That's rare. The next step is making sure you're not just scoring — you're scoring efficiently, and when the defense sends extra help, you know exactly what to do.",
  },
  "Floor General": {
    icon: "🧠", primaryHex: "#14b8a6",
    gradient: "from-teal-800 via-teal-600 to-cyan-500",
    tagline: "The game runs through my hands — and through my head.",
    strengths: ["Court vision", "Pace control", "Decision-making under pressure", "Makes teammates better"],
    coachP: "The game slows down for you in a way it doesn't for most players. That gift is the foundation. Now we build the scoring punch that forces defenses to respect you as more than just a passer.",
  },
  "Lockdown Defender": {
    icon: "🔒", primaryHex: "#ef4444",
    gradient: "from-red-900 via-red-700 to-red-600",
    tagline: "Whoever you're guarding tonight is having a rough night.",
    strengths: ["Lateral quickness", "On-ball pressure", "Anticipation", "Physical & mental toughness"],
    coachP: "You make winning plays that never show up on a stat sheet. The next level for you is making sure your offense doesn't become a reason coaches sit you in close games.",
  },
  "Athletic Slasher": {
    icon: "🔥", primaryHex: "#22c55e",
    gradient: "from-green-800 via-emerald-600 to-green-500",
    tagline: "If there's a gap, I'm already through it.",
    strengths: ["First-step burst", "Finishing through contact", "Transition scoring", "Vertical explosiveness"],
    coachP: "Your speed and explosiveness create problems most defenders can't solve. We're going to make sure you're not one-dimensional — so when the lane gets crowded, you've still got an answer.",
  },
  "Playmaking Wing": {
    icon: "🦅", primaryHex: "#6366f1",
    gradient: "from-indigo-800 via-indigo-600 to-violet-500",
    tagline: "I make the right play look easy.",
    strengths: ["Positional size", "Secondary playmaking", "Lineup versatility", "Unselfish decision-making"],
    coachP: "You make the game easier for everyone around you. That's a real superpower. Now let's make sure you're comfortable taking over when your team needs you to score, not just facilitate.",
  },
  "Two-Way Player": {
    icon: "⚖️", primaryHex: "#a855f7",
    gradient: "from-purple-800 via-purple-600 to-violet-500",
    tagline: "I'm not punting on either end.",
    strengths: ["Defensive versatility", "Offensive reliability", "Conditioning & consistency", "Coachability"],
    coachP: "You don't give anything away on either end, and that's incredibly valuable. The next step is finding the one thing you can become truly elite at — so you're not just reliable, you're a difference-maker.",
  },
  "Swiss Army Knife": {
    icon: "🛠️", primaryHex: "#94a3b8",
    gradient: "from-slate-700 via-slate-600 to-zinc-500",
    tagline: "Whatever the team needs tonight, that's what I'll do.",
    strengths: ["Basketball IQ", "Positional versatility", "Selflessness", "Reads what the team needs"],
    coachP: "You can do a little bit of everything, and coaches love that. The risk is staying a 'jack of all trades, master of none.' Let's find your signature move so your versatility has a real edge.",
  },
  "Rim Protector": {
    icon: "🏰", primaryHex: "#f59e0b",
    gradient: "from-amber-700 via-amber-500 to-yellow-400",
    tagline: "Nothing gets through. Nothing gets easy.",
    strengths: ["Shot-blocking instincts", "Rebounding", "Defensive anchor presence", "Physical advantage"],
    coachP: "You make your team feel safe just by being on the floor. To take the next step, we need to make sure you can move well enough on defense to handle being pulled away from the paint.",
  },
  "Stretch Big": {
    icon: "📏", primaryHex: "#0ea5e9",
    gradient: "from-sky-800 via-sky-600 to-blue-500",
    tagline: "I'm taller than you and I can shoot over you.",
    strengths: ["Size + perimeter shooting", "Floor spacing", "Mismatch creation", "Rebounding range"],
    coachP: "That combination of size and shooting is exactly what modern basketball is built around. Just make sure you don't become only a shooter. We still need you to win the physical battles in the paint.",
  },
};

// ─── STAGE DATA ──────────────────────────────────────────────────────────────
const STAGES: Record<string, { description: string; needsMost: string }> = {
  "Foundation Builder": {
    description: "Just starting to build real basketball habits — learning fundamentals, getting comfortable, figuring out how the game works.",
    needsMost: "Repetition of the basics in a low-pressure environment. Confidence-building matters more than complex skill work right now.",
  },
  "Aspiring Player": {
    description: "Has the fundamentals but hasn't found a clear role yet — working hard without consistent payoff in games.",
    needsMost: "Help identifying natural strengths so the effort starts pointing in one clear direction instead of everywhere at once.",
  },
  "Team Contributor": {
    description: "Has earned a steady role and reliably contributes — not yet a primary option, but a trusted piece of the rotation.",
    needsMost: "Expanding their offensive or defensive role incrementally, and reps in slightly higher-pressure situations.",
  },
  "Impact Player": {
    description: "A player their team genuinely leans on — someone whose performance noticeably swings the outcome of games.",
    needsMost: "Skill refinement at game speed and mental tools for handling pressure — the margin for error is smaller at this stage.",
  },
  "Difference Maker": {
    description: "A go-to player capable of single-handedly changing a game's outcome through scoring, defense, or both.",
    needsMost: "Elite-level competition to stay challenged, and leadership development — how they affect teammates matters as much as their own production.",
  },
  "Elite Competitor": {
    description: "Operating at the highest level of their current environment — the standard others are measured against.",
    needsMost: "A path to the next level of competition and structured habits around recovery, mindset, and consistency.",
  },
};
const STAGE_ORDER = ["Foundation Builder","Aspiring Player","Team Contributor","Impact Player","Difference Maker","Elite Competitor"];

// ─── BOTTLENECK DATA ─────────────────────────────────────────────────────────
const BOTTLENECKS: Record<string, { description: string; unlocks: string }> = {
  "Shooting": { description: "Inconsistent percentages on open looks, hesitation to shoot in-rhythm, a shot that breaks down under fatigue or pressure.", unlocks: "Defensive gravity — defenders are forced to respect you, which opens driving lanes and space for the rest of your game." },
  "Ball Handling": { description: "Turnovers under pressure, difficulty creating separation, getting stripped or trapped by aggressive defense.", unlocks: "Independence — the ability to create offense and escape pressure without relying entirely on teammates or set plays." },
  "Finishing": { description: "Getting blocked or losing the ball at the rim, finishing well in practice but not in live game contact.", unlocks: "Conversion — turning drives that are already happening into actual points, immediately raising scoring efficiency." },
  "Defense": { description: "Getting beaten off the dribble, late or incorrect rotations, fouling out of position rather than through good habits.", unlocks: "Playing time and trust — defense is often the fastest path to earning a coach's confidence." },
  "Athleticism": { description: "Getting beaten in transition, losing physical battles for position, fatigue affecting performance late in games.", unlocks: "A higher ceiling on every other skill — athleticism amplifies shooting range, finishing ability, and defensive reach simultaneously." },
  "Basketball IQ": { description: "Poor shot selection, late reads on rotations or passing lanes, getting 'sped up' mentally in high-pressure moments.", unlocks: "Efficiency without needing more athleticism or skill — smarter decisions immediately reduce mistakes and increase impact." },
  "Confidence": { description: "Hesitating on open shots, playing tighter in big moments than in practice, visible body language changes after mistakes.", unlocks: "Consistency — most of the gap between 'practice player' and 'game player' is confidence, not actual skill." },
  "Rebounding": { description: "Getting boxed out easily, poor timing on box-outs, low second-chance opportunities created or denied.", unlocks: "Extra possessions — one of the most direct ways to single-handedly create more chances for a team to score." },
};

// ─── QUIZ STEPS ──────────────────────────────────────────────────────────────
type QuizStep =
  | { type: "chapter"; chapterNum: number; title: string; sub?: string }
  | { type: "question"; id: string; text: string; options: string[] }
  | { type: "name" }
  | { type: "email" }
  | { type: "password" };

const STEPS: QuizStep[] = [
  { type: "chapter", chapterNum: 1, title: "Let's Find the Best Parts of Your Game." },
  { type: "question", id: "Q1", text: "When you have a great game, what usually happens?", options: ["Shots are falling", "I'm breaking down defenders", "I'm controlling the offense", "I'm locking people up", "I'm dominating inside"] },
  { type: "question", id: "Q2", text: "What part of basketball comes most naturally to you?", options: ["Shooting the ball", "Creating my own shot off the dribble", "Setting up teammates / playmaking", "Defending and disrupting", "Attacking the rim / finishing through contact", "Rebounding and playing physical", "Doing a little bit of everything", "Protecting the rim / shot blocking"] },
  { type: "name" },
  { type: "chapter", chapterNum: 2, title: "Let's Learn About Your Current Situation." },
  { type: "question", id: "Q3", text: "What best describes your current basketball situation?", options: ["Elementary School", "Middle School", "Freshman / JV", "Varsity", "College Basketball", "Intramural League", "Adult Rec League", "Just Playing For Fun"] },
  { type: "question", id: "Q4", text: "How would you describe your current role on your team?", options: ["Not On A Team", "Limited Minutes", "Rotation Player", "Starter", "Team Leader"] },
  { type: "question", id: "Q5", text: "When your team needs a bucket, what are you most likely to do?", options: ["Take the shot", "Create a shot", "Drive", "Find an open teammate", "Get a teammate open", "Get the offensive rebound"] },
  { type: "chapter", chapterNum: 3, title: "Let's Understand What Will Take Your Game to the Next Level." },
  { type: "question", id: "Q6", text: "What frustrates you most during games?", options: ["Missing open shots", "Losing the ball", "Finishing at the rim", "Defending athletes and scorers", "Making quick decisions under pressure", "Confidence"] },
  { type: "question", id: "Q7", text: "When you struggle in games, why?", options: ["Can't create space", "Miss opportunities at the rim", "Lose confidence", "Get sped up mentally", "Too slow / physical limitations", "Defensive mistakes", "Poor shot selection"] },
  { type: "question", id: "Q8", text: "If you could instantly improve one thing tomorrow, what would it be?", options: ["Shooting", "Finishing", "Ball Handling", "Defense", "Athleticism", "Rebounding", "Confidence", "Basketball IQ"] },
  { type: "chapter", chapterNum: 4, title: "Your Basketball Life.", sub: "Whether you grind every day or play when life lets you — how does basketball fit into your life?" },
  { type: "question", id: "Q9", text: "How serious is basketball in your life right now?", options: ["Casual Hobby", "Serious Hobby", "Major Priority", "My Biggest Goal"] },
  { type: "question", id: "Q10", text: "How often do you train outside of team practice?", options: ["Never", "Rarely", "1–2 Times a Week", "3–4 Times a Week", "5–6 Times a Week", "Daily"] },
  { type: "question", id: "Q11", text: "How many years have you played organized team basketball?", options: ["0", "1–3", "4–6", "7–10", "10+"] },
  { type: "question", id: "Q12", text: "How many years have you played basketball in general?", options: ["0", "1–3", "4–6", "7–10", "10+"] },
  { type: "chapter", chapterNum: 5, title: "When It Gets Hard.", sub: "How you think when things aren't going your way is the most important thing we'll learn about you." },
  { type: "question", id: "Q13", text: "When games get close, what do you do?", options: ["Tense up and get nervous", "Embrace the moment", "Drift to the sidelines mentally", "Don't think too much about it"] },
  { type: "question", id: "Q14", text: "How confident are you in your ability to impact games?", options: ["Still Learning", "Sometimes", "Usually", "Consistently", "I expect to be one of the best players on the court"] },
  { type: "question", id: "Q15", text: "After a bad game, what's your honest reaction?", options: ["I get frustrated and need time to cool off", "I replay it trying to figure out what went wrong", "I immediately think about what I need to fix", "I get back in the gym as soon as I can", "I'm already focused on the next one"] },
  { type: "question", id: "Q16", text: "Which statement feels most like you right now?", options: ["I'm still learning the fundamentals and figuring out my game", "I work hard in practice but haven't found my role yet", "I've earned a steady spot and contribute when I'm needed", "I'm one of the players my team leans on to make plays", "I expect to dominate every time I step on the court"] },
  { type: "chapter", chapterNum: 6, title: "What Are You Chasing?", sub: "One last question. Then we show you everything we built for you." },
  { type: "question", id: "Q17", text: "What's your primary basketball goal right now?", options: ["Make a team I'm trying out for", "Earn more playing time / a bigger role", "Play at the next level (high school, college, etc.)", "Become the best version of my game, for myself", "Compete at the highest level I possibly can"] },
  { type: "email" },
  { type: "password" },
];

const QUESTION_NUMBERS: (number | null)[] = (() => {
  let n = 0;
  return STEPS.map(s => s.type === "question" ? ++n : null);
})();

// ─── SCORING ENGINE ──────────────────────────────────────────────────────────
interface AssessmentResult {
  archetype: string; archetypeTagline: string; archetypeStrengths: string[]; archetypeCoachP: string;
  stage: string; stageDescription: string; stageNeedsMost: string; teamRole: string;
  bottleneck: string; bottleneckDescription: string; bottleneckUnlocks: string; top3GrowthAreas: string[];
  mindsetScore: number; mindsetBand: string; dedicationScore: number; dedicationBand: string;
  experienceScore: number; experienceBand: string; primaryGoal: string;
}

function scoreArchetype(ans: Map<string, string>): string {
  const pts: Record<string, number> = {};
  const qs: Record<string, Set<string>> = {};
  const add = (a: string, p: number, q: string) => { pts[a] = (pts[a] || 0) + p; qs[a] = qs[a] || new Set(); qs[a].add(q); };

  const q1 = ans.get("Q1");
  if (q1 === "Shots are falling")              { add("Sharpshooter",4,"Q1"); add("Stretch Big",1,"Q1"); }
  else if (q1 === "I'm breaking down defenders")     { add("Shot Creator",4,"Q1"); add("Athletic Slasher",1,"Q1"); }
  else if (q1 === "I'm controlling the offense")     { add("Floor General",4,"Q1"); add("Playmaking Wing",1,"Q1"); }
  else if (q1 === "I'm locking people up")           { add("Lockdown Defender",4,"Q1"); add("Two-Way Player",1,"Q1"); }
  else if (q1 === "I'm dominating inside")           { add("Rim Protector",3,"Q1"); add("Athletic Slasher",2,"Q1"); }

  const q2 = ans.get("Q2");
  if (q2 === "Shooting the ball")                        { add("Sharpshooter",3,"Q2"); add("Stretch Big",1,"Q2"); }
  else if (q2 === "Creating my own shot off the dribble") { add("Shot Creator",3,"Q2"); add("Athletic Slasher",1,"Q2"); }
  else if (q2 === "Setting up teammates / playmaking")   { add("Floor General",3,"Q2"); add("Playmaking Wing",2,"Q2"); }
  else if (q2 === "Defending and disrupting")            { add("Lockdown Defender",3,"Q2"); add("Two-Way Player",1,"Q2"); }
  else if (q2 === "Attacking the rim / finishing through contact") { add("Athletic Slasher",3,"Q2"); add("Shot Creator",1,"Q2"); }
  else if (q2 === "Rebounding and playing physical")     { add("Swiss Army Knife",3,"Q2"); add("Rim Protector",1,"Q2"); }
  else if (q2 === "Doing a little bit of everything")    { add("Swiss Army Knife",3,"Q2"); add("Two-Way Player",2,"Q2"); }
  else if (q2 === "Protecting the rim / shot blocking")  { add("Rim Protector",3,"Q2"); add("Lockdown Defender",1,"Q2"); }

  const q5 = ans.get("Q5");
  if (q5 === "Take the shot")          { add("Sharpshooter",2,"Q5"); add("Stretch Big",1,"Q5"); }
  else if (q5 === "Create a shot")     { add("Shot Creator",2,"Q5"); add("Athletic Slasher",1,"Q5"); }
  else if (q5 === "Drive")             { add("Athletic Slasher",2,"Q5"); add("Shot Creator",1,"Q5"); }
  else if (q5 === "Find an open teammate") { add("Floor General",2,"Q5"); add("Playmaking Wing",1,"Q5"); }
  else if (q5 === "Get a teammate open") { add("Playmaking Wing",2,"Q5"); add("Swiss Army Knife",1,"Q5"); }
  else if (q5 === "Get the offensive rebound") { add("Rim Protector",2,"Q5"); add("Swiss Army Knife",1,"Q5"); }

  const q6 = ans.get("Q6");
  if (q6 === "Missing open shots")              { add("Sharpshooter",1,"Q6"); }
  else if (q6 === "Losing the ball")            { add("Floor General",1,"Q6"); }
  else if (q6 === "Finishing at the rim")       { add("Athletic Slasher",1,"Q6"); }
  else if (q6 === "Defending athletes and scorers") { add("Lockdown Defender",1,"Q6"); add("Two-Way Player",1,"Q6"); }
  else if (q6 === "Making quick decisions under pressure") { add("Floor General",1,"Q6"); }

  if (ans.get("Q4") === "Team Leader") { add("Floor General",1,"Q4"); }
  if (ans.get("Q14") === "I expect to be one of the best players on the court") { add("Shot Creator",1,"Q14"); add("Athletic Slasher",1,"Q14"); }

  const all = Object.keys(pts);
  if (!all.length) return "Two-Way Player";
  all.sort((a, b) => { if (pts[b] !== pts[a]) return pts[b] - pts[a]; const dq = (qs[b]?.size??0)-(qs[a]?.size??0); if (dq!==0) return dq; if (q2) { if (qs[b]?.has("Q2")&&!qs[a]?.has("Q2")) return 1; if (qs[a]?.has("Q2")&&!qs[b]?.has("Q2")) return -1; } return 0; });
  return all[0];
}

function scoreStage(ans: Map<string, string>): string {
  const q4m: Record<string,number> = {"Not On A Team":0,"Limited Minutes":2,"Rotation Player":4,"Starter":6,"Team Leader":8};
  const q16m: Record<string,number> = {"I'm still learning the fundamentals and figuring out my game":0,"I work hard in practice but haven't found my role yet":2,"I've earned a steady spot and contribute when I'm needed":4,"I'm one of the players my team leans on to make plays":6,"I expect to dominate every time I step on the court":8};
  const q3m: Record<string,number> = {"Elementary School":0,"Middle School":1,"Freshman / JV":2,"Varsity":3,"College Basketball":4,"Intramural League":2,"Adult Rec League":2,"Just Playing For Fun":0};
  const q14m: Record<string,number> = {"Still Learning":0,"Sometimes":1,"Usually":2,"Consistently":3,"I expect to be one of the best players on the court":4};
  const total = (q4m[ans.get("Q4")??""]??0)+(q16m[ans.get("Q16")??""]??0)+(q3m[ans.get("Q3")??""]??0)+(q14m[ans.get("Q14")??""]??0);
  if (total<=4)  return "Foundation Builder";
  if (total<=9)  return "Aspiring Player";
  if (total<=14) return "Team Contributor";
  if (total<=18) return "Impact Player";
  if (total<=21) return "Difference Maker";
  return "Elite Competitor";
}

function scoreTeamRole(ans: Map<string, string>): string {
  const map: Record<string,string> = {"Elementary School":"Youth Player","Middle School":"Middle School Player","Freshman / JV":"Freshman / JV Player","Varsity":"Varsity Player","College Basketball":"College Player","Intramural League":"Adult Rec League Player","Adult Rec League":"Adult Rec League Player","Just Playing For Fun":"Casual / For-Fun Player"};
  return map[ans.get("Q3")??""]??"Casual / For-Fun Player";
}

function scoreBottleneck(ans: Map<string, string>): { bottleneck: string; top3: string[] } {
  const pts: Record<string,number> = {};
  const add = (cat: string, w: number) => { pts[cat]=(pts[cat]||0)+w; };
  const q6m: Record<string,string> = {"Missing open shots":"Shooting","Losing the ball":"Ball Handling","Finishing at the rim":"Finishing","Defending athletes and scorers":"Defense","Making quick decisions under pressure":"Basketball IQ","Confidence":"Confidence"};
  const q7m: Record<string,string> = {"Can't create space":"Ball Handling","Miss opportunities at the rim":"Finishing","Lose confidence":"Confidence","Get sped up mentally":"Basketball IQ","Too slow / physical limitations":"Athleticism","Defensive mistakes":"Defense","Poor shot selection":"Basketball IQ"};
  const q6cat = q6m[ans.get("Q6")??""], q7cat = q7m[ans.get("Q7")??""], q8cat = ans.get("Q8");
  if (q6cat) add(q6cat,4); if (q7cat) add(q7cat,3); if (q8cat&&BOTTLENECKS[q8cat]) add(q8cat,3);
  const sorted = Object.entries(pts).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
  const seen = new Set<string>(); const top3: string[] = [];
  for (const s of [q6cat,q7cat,q8cat,...sorted]) { if(s&&!seen.has(s)&&top3.length<3){top3.push(s);seen.add(s);} }
  return { bottleneck: sorted[0]??q8cat??"Basketball IQ", top3 };
}

function scoreMindset(ans: Map<string, string>): { score: number; band: string } {
  const q13m: Record<string,number> = {"Tense up and get nervous":2,"Embrace the moment":10,"Drift to the sidelines mentally":0,"Don't think too much about it":6};
  const q14m: Record<string,number> = {"Still Learning":2,"Sometimes":4,"Usually":6,"Consistently":8,"I expect to be one of the best players on the court":10};
  const q15m: Record<string,number> = {"I get frustrated and need time to cool off":3,"I replay it trying to figure out what went wrong":6,"I immediately think about what I need to fix":9,"I get back in the gym as soon as I can":10,"I'm already focused on the next one":8};
  const total = (q13m[ans.get("Q13")??""]??5)+(q14m[ans.get("Q14")??""]??5)+(q15m[ans.get("Q15")??""]??5);
  const score = Math.round((total/30)*100);
  const band = score<=20?"Still Building Belief":score<=40?"Finding Your Footing":score<=60?"Trusting Your Game":score<=80?"Bringing The Heat":"Ice In Your Veins";
  return { score, band };
}

function scoreDedication(ans: Map<string, string>): { score: number; band: string } {
  const q9m: Record<string,number> = {"Casual Hobby":2,"Serious Hobby":5,"Major Priority":8,"My Biggest Goal":10};
  const q10m: Record<string,number> = {"Never":0,"Rarely":2,"1–2 Times a Week":4,"3–4 Times a Week":7,"5–6 Times a Week":9,"Daily":10};
  const total = (q9m[ans.get("Q9")??""]??3)+(q10m[ans.get("Q10")??""]??3);
  const score = Math.round((total/20)*100);
  const band = score<=20?"Just Getting Started":score<=40?"Building The Habit":score<=60?"Putting In Work":score<=80?"Grinding":"Obsessed";
  return { score, band };
}

function scoreExperience(ans: Map<string, string>): { score: number; band: string } {
  const ym: Record<string,number> = {"0":0,"1–3":2,"4–6":5,"7–10":8,"10+":10};
  const total = (ym[ans.get("Q11")??""]??0)+(ym[ans.get("Q12")??""]??0);
  const score = Math.round((total/20)*100);
  const band = score<=20?"New To The Game":score<=40?"Building A Foundation":score<=60?"Seasoned Player":score<=80?"Deep Roots":"Lifer";
  return { score, band };
}

function computeResults(ans: Map<string, string>): AssessmentResult {
  const archetypeName = scoreArchetype(ans);
  const meta = ARCHETYPE_META[archetypeName] ?? ARCHETYPE_META["Two-Way Player"];
  const stageName = scoreStage(ans);
  const stageData = STAGES[stageName] ?? STAGES["Team Contributor"];
  const teamRole = scoreTeamRole(ans);
  const { bottleneck, top3 } = scoreBottleneck(ans);
  const btData = BOTTLENECKS[bottleneck] ?? BOTTLENECKS["Basketball IQ"];
  const mindset = scoreMindset(ans); const dedication = scoreDedication(ans); const experience = scoreExperience(ans);
  return {
    archetype: archetypeName, archetypeTagline: meta.tagline, archetypeStrengths: meta.strengths, archetypeCoachP: meta.coachP,
    stage: stageName, stageDescription: stageData.description, stageNeedsMost: stageData.needsMost, teamRole,
    bottleneck, bottleneckDescription: btData.description, bottleneckUnlocks: btData.unlocks, top3GrowthAreas: top3,
    mindsetScore: mindset.score, mindsetBand: mindset.band, dedicationScore: dedication.score, dedicationBand: dedication.band,
    experienceScore: experience.score, experienceBand: experience.band, primaryGoal: ans.get("Q17")??"",
  };
}

// ─── SCORE BAR ───────────────────────────────────────────────────────────────
function ScoreBar({ label, score, band, color="bg-orange-500" }: { label: string; score: number; band: string; color?: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">{label}</span>
        <span className="text-zinc-400 text-xs">{score} · <span className="text-white font-semibold">{band}</span></span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── PROPS ───────────────────────────────────────────────────────────────────
interface WelcomePageProps {
  previewMode?: boolean;
  authenticatedMode?: boolean;
  onPreviewComplete?: () => void;
}
type Phase = "intro" | "quiz" | "loading" | "results";

export default function WelcomePage({
  previewMode = false,
  authenticatedMode = false,
  onPreviewComplete,
}: WelcomePageProps = {}) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("intro");
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [animIn, setAnimIn] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captureError, setCaptureError] = useState("");

  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [resultSlide, setResultSlide] = useState(0);
  const [slideIn, setSlideIn] = useState(true);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const summaryCardRef = useRef<HTMLDivElement>(null);
  const [shareState, setShareState] = useState<"idle"|"sharing"|"shared">("idle");

  const topPad = previewMode ? "pt-9" : "";

  function goToStep(idx: number) {
    setAnimIn(false);
    setTimeout(() => { setStepIdx(idx); setAnimIn(true); }, 200);
  }

  function getNextStepIndex(index: number) {
    let nextIndex = index + 1;
    if (authenticatedMode) {
      while (
        nextIndex < STEPS.length &&
        ["name", "email", "password"].includes(STEPS[nextIndex].type)
      ) {
        nextIndex += 1;
      }
    }
    return nextIndex;
  }

  function advanceStep() {
    goToStep(getNextStepIndex(stepIdx));
  }

  function handleAnswer(answer: string) {
    if (transitioning) return;
    const step = STEPS[stepIdx];
    if (step.type !== "question") return;
    setSelectedOption(answer);
    setTransitioning(true);
    setTimeout(() => {
      const nextAnswers = new Map(answers).set(step.id, answer);
      setAnswers(nextAnswers);
      setSelectedOption(null);
      setTransitioning(false);

      const nextStepIndex = getNextStepIndex(stepIdx);
      if (authenticatedMode && nextStepIndex >= STEPS.length) {
        handleSubmit(nextAnswers);
      } else {
        goToStep(nextStepIndex);
      }
    }, 280);
  }

  function handleCaptureNext() {
    setCaptureError("");
    const step = STEPS[stepIdx];
    if (step.type === "name") {
      if (!firstName.trim()) { setCaptureError("Please enter your first name"); return; }
      advanceStep();
    } else if (step.type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim())) { setCaptureError("Please enter a valid email address"); return; }
      advanceStep();
    } else if (step.type === "password") {
      if (accountPassword.length < 8) { setCaptureError("Password must be at least 8 characters"); return; }
      handleSubmit();
    }
  }

  async function handleSubmit(answerSet = answers) {
    setPhase("loading");
    const computed = computeResults(answerSet);
    if (previewMode) {
      await new Promise(r => setTimeout(r, 1600));
      setResults(computed); setResultSlide(0); setPhase("results"); return;
    }
    try {
      if (authenticatedMode) {
        await apiRequest("POST", "/api/onboarding/assess", {
          result: computed,
          answers: Object.fromEntries(answerSet),
        });
        qc.invalidateQueries({ queryKey: ["/api/career"] });
        setResults(computed);
        setResultSlide(0);
        setPhase("results");
        return;
      }

      const registerRes = await fetch(buildUrl("/api/auth/register"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim()||undefined, email: accountEmail.trim().toLowerCase(), password: accountPassword }),
      });
      if (!registerRes.ok) {
        const err = await registerRes.json().catch(()=>({}));
        setCaptureError(err.message||"Registration failed. Try a different email.");
        setStepIdx(STEPS.findIndex(s=>s.type==="email")); setPhase("quiz"); return;
      }
      const registerData = await registerRes.json();
      if (registerData?.token) storeAuthToken(registerData.token);
      const { token: _t, ...userData } = registerData;
      setRegisteredUser(userData);
      track("signup", { userId: userData?.id, source: "assessment-onboarding" });
      await apiRequest("POST", "/api/onboarding/assess", { result: computed, answers: Object.fromEntries(answers) });
      qc.invalidateQueries({ queryKey: ["/api/career"] });
      setResults(computed); setResultSlide(0); setPhase("results");
    } catch {
      setCaptureError("Something went wrong. Please try again.");
      setStepIdx(STEPS.findIndex(s=>s.type==="email")); setPhase("quiz");
    }
  }

  function advanceResult() {
    if (resultSlide < 3) {
      setSlideIn(false);
      setTimeout(() => { setResultSlide(r => r + 1); setSlideIn(true); }, 200);
    }
  }

  function finishOnboarding() {
    if (previewMode) { onPreviewComplete?.(); return; }
    localStorage.setItem("playr1_new_onboarding","1");
    if (registeredUser) qc.setQueryData(["/api/auth/user"], registeredUser);
    else qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "My PLAYR1 Player Profile" }); }
      else { const a = document.createElement("a"); a.download="playr1-player-profile.png"; a.href=dataUrl; a.click(); }
      setShareState("shared"); setTimeout(()=>setShareState("idle"),3000);
    } catch { setShareState("idle"); }
  }

  // ── VIDEO INTRO ─────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div
        className={`fixed inset-0 bg-black cursor-pointer ${topPad}`}
        onClick={() => {
          if (!videoEnded) { videoRef.current?.pause(); setVideoEnded(true); }
          else { setPhase("quiz"); }
        }}
        data-testid="screen-intro">
        <video
          ref={videoRef}
          src="/welcome.mp4"
          autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-contain"
          onEnded={() => setVideoEnded(true)}
        />
        {/* Logo overlay always shown */}
        <div className="absolute top-6 left-0 right-0 flex justify-center z-10">
          <img src={logoImg} alt="PLAYR1" className="h-8 w-auto object-contain" />
        </div>
        {/* Tap to continue — appears when video ends */}
        <div className={`absolute inset-0 flex flex-col items-center justify-end pb-16 z-10 transition-all duration-700 ${videoEnded ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={{ background: videoEnded ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" : "none" }}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-px h-8 bg-orange-500" style={{ animation: videoEnded ? "pulse 1.5s ease-in-out infinite" : "none" }} />
            <p className="text-white text-xs font-bold tracking-[0.4em] uppercase"
              style={{ animation: videoEnded ? "pulse 1.5s ease-in-out infinite" : "none" }}>
              Tap to Begin
            </p>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  // ── QUIZ ────────────────────────────────────────────────────────────────────
  if (phase === "quiz") {
    const step = STEPS[stepIdx];
    const qNum = QUESTION_NUMBERS[stepIdx];

    // ─ Chapter screen ─────────────────────────────────────────────────────────
    if (step.type === "chapter") {
      const chStr = step.chapterNum.toString().padStart(2, "0");
      const roman = toRoman(step.chapterNum);
      const title = step.title.replace("{name}", firstName || "Player");

      return (
        <div
          className={`fixed inset-0 bg-black flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden ${topPad}`}
          onClick={advanceStep}
          data-testid="screen-chapter">

          {/* Atmospheric orange glow — circular like reference image */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0.05) 45%, transparent 70%)" }} />

          {/* Large watermark number */}
          <div className="absolute text-[260px] font-black select-none pointer-events-none leading-none"
            style={{ color: "rgba(249,115,22,0.04)", letterSpacing: "-0.05em" }}>
            {chStr}
          </div>

          {/* Content */}
          <div className={`relative z-10 flex flex-col items-center text-center px-8 max-w-sm w-full transition-all duration-200 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>

            {/* Chapter label */}
            <div className="mb-7">
              <span className="text-[10px] font-black tracking-[0.5em] uppercase"
                style={{ color: "#f97316", textShadow: "0 0 16px rgba(249,115,22,0.8), 0 0 32px rgba(249,115,22,0.4)" }}>
                Chapter {roman}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-white text-[28px] font-black leading-tight tracking-tight mb-3">{title}</h2>

            {/* Optional sub */}
            {step.sub && (
              <p className="text-orange-100/40 text-sm leading-relaxed max-w-[260px] mt-1">{step.sub}</p>
            )}

            {/* Tap hint */}
            <div className="mt-12 text-zinc-700 text-[9px] tracking-[0.4em] uppercase font-semibold">
              tap anywhere to continue
            </div>
          </div>
        </div>
      );
    }

    // ─ Name capture — jersey design ─────────────────────────────────────────
    if (step.type === "name") {
      return (
        <div className={`fixed inset-0 bg-black flex flex-col ${topPad}`} data-testid="screen-name-capture">
          {/* Ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 70%)" }} />

          <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 gap-5">
            {/* Prompt */}
            <div className="text-center">
              <p className="text-zinc-600 text-[9px] font-bold tracking-[0.5em] uppercase mb-1">PLAYR1 ASSESSMENT</p>
              <h2 className="text-white text-2xl font-black">Who Are You?</h2>
            </div>

            {/* Jersey card */}
            <div className="w-full max-w-[288px]">
              {/* Jersey body */}
              <div className="rounded-b-3xl overflow-hidden"
                style={{
                  background: "linear-gradient(to right, #ea580c 0px, #ea580c 14px, #0c0c0e 14px, #0c0c0e calc(100% - 14px), #ea580c calc(100% - 14px), #ea580c 100%)",
                  boxShadow: "0 0 50px rgba(249,115,22,0.13), 0 8px 32px rgba(0,0,0,0.6)",
                }}>
                {/* Collar */}
                <div className="h-3" style={{ background: "linear-gradient(to right, #c2410c, #f97316, #ea580c, #f97316, #c2410c)" }} />

                {/* Body content */}
                <div className="px-7 pt-5 pb-7 flex flex-col items-center">
                  {/* PLAYR1 logo on chest */}
                  <img src={logoImg} alt="PLAYR1" className="h-5 w-auto object-contain mb-5 opacity-80" />

                  {/* Name inputs — inline on jersey */}
                  <div className="relative w-full">
                    {/* Watermark player number */}
                    <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                      <span className="text-[88px] font-black leading-none"
                        style={{ color: "rgba(249,115,22,0.05)", letterSpacing: "-0.04em" }}>01</span>
                    </div>

                    <div className="relative z-10 space-y-4 py-2">
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="FIRST NAME"
                        autoFocus
                        data-testid="input-first-name"
                        onKeyDown={e => e.key === "Enter" && document.getElementById("ln-jersey")?.focus()}
                        className="w-full bg-transparent border-b-2 border-orange-500/35 text-white text-center text-xl font-black tracking-[0.12em] uppercase focus:outline-none placeholder:text-zinc-700 focus:border-orange-500 transition-colors py-1.5"
                      />
                      <input
                        id="ln-jersey"
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="LAST NAME"
                        data-testid="input-last-name"
                        onKeyDown={e => e.key === "Enter" && handleCaptureNext()}
                        className="w-full bg-transparent border-b border-orange-500/25 text-white text-center text-base font-bold tracking-[0.1em] uppercase focus:outline-none placeholder:text-zinc-700 focus:border-orange-500/60 transition-colors py-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom trim */}
                <div className="h-2.5" style={{ background: "linear-gradient(to right, #c2410c, #f97316, #ea580c, #f97316, #c2410c)" }} />
              </div>
            </div>

            {captureError && <p className="text-red-400 text-xs text-center -mt-1" data-testid="text-capture-error">{captureError}</p>}

            <button onClick={handleCaptureNext} data-testid="button-name-next"
              className="w-full max-w-[288px] bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2"
              style={{ boxShadow: "0 0 24px rgba(234,88,12,0.3)" }}>
              Continue <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      );
    }

    // ─ Email capture ──────────────────────────────────────────────────────────
    if (step.type === "email") {
      return (
        <div className={`fixed inset-0 bg-black flex flex-col ${topPad}`} data-testid="screen-email-capture">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)" }} />
          <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-8">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-px bg-orange-500/60" />
                <span className="text-orange-500/70 text-[9px] font-black tracking-[0.5em] uppercase">Almost There</span>
              </div>
              <h2 className="text-white text-2xl font-black leading-tight">
                {firstName ? `${firstName}'s journey` : "Your journey"}
                <br /><span className="text-zinc-400 font-semibold text-xl">is ready. Enter your email to access it.</span>
              </h2>
            </div>
            <div className="space-y-3">
              <input type="email" value={accountEmail} onChange={e=>setAccountEmail(e.target.value)}
                placeholder="you@example.com" autoFocus data-testid="input-email"
                onKeyDown={e=>e.key==="Enter"&&handleCaptureNext()}
                className="w-full bg-zinc-900/80 border border-zinc-800 text-white rounded-2xl px-5 py-3.5 text-base placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors" />
              {captureError && <p className="text-red-400 text-sm" data-testid="text-capture-error">{captureError}</p>}
              <button onClick={handleCaptureNext} data-testid="button-email-next"
                className="w-full bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2"
                style={{ boxShadow: "0 0 20px rgba(234,88,12,0.25)" }}>
                Continue <ArrowRight className="h-5 w-5" />
              </button>
              <div className="text-center pt-1">
                <a href="/auth" className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors">Already have an account?</a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ─ Password capture ───────────────────────────────────────────────────────
    if (step.type === "password") {
      return (
        <div className={`fixed inset-0 bg-black flex flex-col ${topPad}`} data-testid="screen-password-capture">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)" }} />
          <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-8">
            <div className="mb-8">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5">
                <Lock className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-px bg-orange-500/60" />
                <span className="text-orange-500/70 text-[9px] font-black tracking-[0.5em] uppercase">Last Step</span>
              </div>
              <h2 className="text-white text-2xl font-black leading-tight">Create a password<br />to lock in your journey.</h2>
              <p className="text-zinc-600 text-sm mt-2">Minimum 8 characters.</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input type={showPassword?"text":"password"} value={accountPassword} onChange={e=>setAccountPassword(e.target.value)}
                  placeholder="Create your password" autoFocus data-testid="input-password"
                  onKeyDown={e=>e.key==="Enter"&&handleCaptureNext()}
                  className="w-full bg-zinc-900/80 border border-zinc-800 text-white rounded-2xl px-5 py-3.5 text-base placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors pr-12" />
                <button type="button" onClick={()=>setShowPassword(p=>!p)} data-testid="button-toggle-password"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {captureError && <p className="text-red-400 text-sm" data-testid="text-capture-error">{captureError}</p>}
              <button onClick={handleCaptureNext} data-testid="button-password-next"
                className="w-full bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2"
                style={{ boxShadow: "0 0 20px rgba(234,88,12,0.25)" }}>
                Reveal My Results <ArrowRight className="h-5 w-5" />
              </button>
              <button onClick={()=>{setCaptureError("");goToStep(stepIdx-1);}}
                className="w-full text-zinc-600 text-sm py-2 hover:text-zinc-400 transition-colors" data-testid="button-back">
                ← Go back
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ─ Question ───────────────────────────────────────────────────────────────
    const progress = qNum ? (qNum / 17) * 100 : 0;
    return (
      <div className={`fixed inset-0 bg-black flex flex-col ${topPad}`} data-testid="screen-quiz">
        {/* Glowing progress bar */}
        <div className="shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-600 text-[11px] font-semibold">{qNum} / 17</span>
            <span className="text-orange-500/70 text-[9px] font-bold tracking-[0.25em] uppercase">Assessment</span>
          </div>
          <div className="h-0.5 bg-zinc-900 rounded-full relative">
            <div className="absolute top-0 left-0 h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 8px rgba(249,115,22,0.9), 0 0 20px rgba(249,115,22,0.5), 0 0 40px rgba(249,115,22,0.2)",
              }} />
          </div>
        </div>

        {/* Scrollable question + options */}
        <div
          className={`flex-1 flex flex-col overflow-y-auto px-5 pb-6 transition-all duration-200 ${animIn?"opacity-100 translate-y-0":"opacity-0 translate-y-2"}`}
          style={{ WebkitOverflowScrolling: "touch" }}>
          <h2 className="text-white text-lg font-bold leading-snug mb-5 mt-2 shrink-0" data-testid="text-quiz-question">
            {step.text}
          </h2>
          <div className="space-y-2">
            {step.options.map((opt, i) => {
              const isSel = selectedOption === opt;
              return (
                <button key={i} onClick={() => handleAnswer(opt)} disabled={transitioning}
                  data-testid={`button-quiz-option-${i}`}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                    isSel
                      ? "bg-orange-500/20 border-orange-500 text-white"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"
                  }`}>
                  <span className="text-sm font-medium leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className={`fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 ${topPad}`} data-testid="screen-loading">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)" }} />
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center space-y-1 relative z-10">
          <p className="text-white text-xl font-bold">Building your profile…</p>
          <p className="text-zinc-600 text-sm">Analyzing your answers</p>
        </div>
      </div>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────────────────────────
  if (phase === "results" && results) {
    const meta = ARCHETYPE_META[results.archetype] ?? ARCHETYPE_META["Two-Way Player"];
    const isLast = resultSlide === 3;

    // Per-slide config — slide 0 is always black per reference design
    const slideBgs = [
      "bg-black",
      "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900",
      "bg-gradient-to-br from-zinc-950 via-red-950/40 to-zinc-950",
      "bg-black",
    ];
    const slideLabels = ["YOUR ARCHETYPE", "YOUR DEVELOPMENT STAGE", "YOUR #1 GROWTH AREA", "YOUR PLAYR1 JOURNEY"];
    const bg = slideBgs[resultSlide];
    // Slide 0 advances via the CONTINUE button only; slides 1–2 advance on tap
    const containerClick = resultSlide === 0 || isLast ? undefined : advanceResult;

    return (
      <div
        className={`fixed inset-0 ${bg} flex flex-col overflow-hidden ${topPad}`}
        onClick={containerClick}
        style={{ cursor: containerClick ? "pointer" : "default" }}
        data-testid={`screen-result-${resultSlide}`}>

        {/* Slide dots */}
        <div className="shrink-0 flex justify-center gap-1.5 pt-4 pb-1">
          {[0,1,2,3].map(i => (
            <div key={i} className={`rounded-full transition-all duration-300 ${
              i===resultSlide ? "w-5 h-1.5 bg-white/70" : "w-1.5 h-1.5 bg-white/20"
            }`} />
          ))}
        </div>

        {/* ─ Slide 0: Archetype — reference design ─ */}
        {resultSlide === 0 && (
          <div className={`flex-1 overflow-y-auto transition-opacity duration-200 ${slideIn?"opacity-100":"opacity-0"}`}
            style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="px-5 pb-6 pt-2">

              {/* ASSESSMENT COMPLETE label */}
              <p className="text-zinc-500 text-[10px] font-bold tracking-[0.4em] uppercase text-center mb-3">
                ASSESSMENT COMPLETE
              </p>

              {/* Name + YOU ARE A + archetype name */}
              <div className="text-center mb-5">
                {firstName && (
                  <p className="text-white text-2xl font-black tracking-tight leading-tight">
                    {firstName.toUpperCase()},
                  </p>
                )}
                <p className="text-zinc-400 text-sm font-bold tracking-[0.2em] uppercase mb-1">
                  YOU ARE A
                </p>
                <h1
                  className="text-5xl font-black leading-tight tracking-tight"
                  style={{
                    color: meta.primaryHex,
                    textShadow: `0 0 30px ${meta.primaryHex}55, 0 0 60px ${meta.primaryHex}22`,
                  }}
                  data-testid="text-result-archetype"
                >
                  {results.archetype.toUpperCase()}
                </h1>
              </div>

              {/* Basketball emblem — circular glowing icon */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center text-5xl"
                  style={{
                    background: `radial-gradient(circle, ${meta.primaryHex}28 0%, ${meta.primaryHex}0a 55%, transparent 75%)`,
                    border: `1.5px solid ${meta.primaryHex}55`,
                    boxShadow: `0 0 32px ${meta.primaryHex}40, 0 0 64px ${meta.primaryHex}18, inset 0 0 20px ${meta.primaryHex}10`,
                  }}
                >
                  {meta.icon}
                </div>
              </div>

              {/* Coach P Says */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-5">
                <p className="font-black tracking-[0.25em] uppercase text-[10px] mb-3"
                  style={{ color: meta.primaryHex }}>
                  COACH P SAYS
                </p>
                <div className="flex gap-2.5 items-start">
                  <span className="text-2xl leading-none font-black shrink-0 mt-0.5"
                    style={{ color: `${meta.primaryHex}70` }}>"</span>
                  <p className="text-zinc-300 text-sm leading-relaxed">{results.archetypeCoachP}</p>
                </div>
              </div>

              {/* Core Characteristics */}
              <p className="font-black tracking-[0.25em] uppercase text-[10px] mb-3"
                style={{ color: meta.primaryHex }}>
                CORE CHARACTERISTICS
              </p>
              <div className="space-y-2 mb-5">
                {results.archetypeStrengths.map((s, i) => (
                  <div key={i}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                    style={{ background: `${meta.primaryHex}08`, borderColor: `${meta.primaryHex}20` }}>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                      style={{ background: `${meta.primaryHex}18`, border: `1px solid ${meta.primaryHex}30` }}>
                      {getCharIcon(s)}
                    </div>
                    <span className="text-white text-sm font-semibold flex-1">{s}</span>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: `${meta.primaryHex}60` }} />
                  </div>
                ))}
              </div>

              {/* CONTINUE button */}
              <button
                onClick={e => { e.stopPropagation(); advanceResult(); }}
                data-testid="button-result-continue"
                className="w-full py-4 rounded-2xl font-black text-sm tracking-[0.3em] uppercase transition-all active:scale-[0.98]"
                style={{
                  background: meta.primaryHex,
                  color: "#000",
                  boxShadow: `0 0 24px ${meta.primaryHex}50`,
                }}>
                CONTINUE
              </button>
            </div>
          </div>
        )}

        {/* ─ Slide 1: Stage ─ */}
        {resultSlide === 1 && (
          <div className={`flex-1 overflow-y-auto px-6 pb-5 transition-opacity duration-200 ${slideIn?"opacity-100":"opacity-0"}`}>
            <p className="text-white/50 text-[10px] font-bold tracking-[0.3em] uppercase mb-3 mt-2">{slideLabels[1]}</p>

            {/* Stage ladder */}
            <div className="flex flex-col gap-1.5 mb-5">
              {STAGE_ORDER.map((s, i) => {
                const isActive = s === results.stage;
                const isBefore = STAGE_ORDER.indexOf(results.stage) > i;
                return (
                  <div key={s} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                    isActive ? "bg-white/20 border border-white/25" : isBefore ? "opacity-35" : "opacity-15"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive?"bg-white":"bg-white/40"}`} />
                    <span className={`text-sm flex-1 ${isActive?"font-black text-white":"font-medium text-white/60"}`}>{s}</span>
                    {isActive && <span className="text-[9px] font-bold text-white/50 tracking-wider uppercase">← You</span>}
                  </div>
                );
              })}
            </div>

            <h1 className="text-white text-2xl font-black leading-tight mb-2" data-testid="text-result-stage">
              {results.stage.toUpperCase()}
            </h1>
            <p className="text-white/65 text-sm leading-relaxed mb-3">{results.stageDescription}</p>
            <div className="rounded-2xl p-3.5 bg-white/8 border border-white/10">
              <p className="text-white/35 text-[10px] font-bold tracking-widest mb-1.5">WHAT YOU NEED MOST</p>
              <p className="text-white/75 text-sm leading-relaxed">{results.stageNeedsMost}</p>
            </div>
            <p className="text-center text-white/30 text-xs mt-4">Tap anywhere to continue</p>
          </div>
        )}

        {/* ─ Slide 2: Bottleneck ─ */}
        {resultSlide === 2 && (
          <div className={`flex-1 overflow-y-auto px-6 pb-5 transition-opacity duration-200 ${slideIn?"opacity-100":"opacity-0"}`}>
            <p className="text-white/50 text-[10px] font-bold tracking-[0.3em] uppercase mb-3 mt-2">{slideLabels[2]}</p>

            {/* Ranked growth areas */}
            {results.top3GrowthAreas.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                {results.top3GrowthAreas.map((area, i) => (
                  <div key={area} className="flex items-center gap-3">
                    <span className={`text-xs font-black w-5 shrink-0 ${i===0?"text-white":"text-white/40"}`}>#{i+1}</span>
                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${i===0?"bg-white":"bg-white/30"}`}
                        style={{ width: i===0?"100%":i===1?"60%":"40%" }} />
                    </div>
                    <span className={`text-xs font-semibold w-28 ${i===0?"text-white":"text-white/50"}`}>{area}</span>
                  </div>
                ))}
              </div>
            )}

            <h1 className="text-white text-3xl font-black leading-tight mb-3" data-testid="text-result-bottleneck">
              {results.bottleneck.toUpperCase()}
            </h1>
            <p className="text-white/65 text-sm leading-relaxed mb-3">
              This isn't a weakness call-out — it's the single highest-leverage area you can work on right now to get better, faster.
            </p>
            <div className="rounded-2xl p-3.5 bg-white/8 border border-white/10">
              <p className="text-white/35 text-[10px] font-bold tracking-widest mb-1.5">WHAT IMPROVING THIS UNLOCKS</p>
              <p className="text-white/75 text-sm leading-relaxed">{results.bottleneckUnlocks}</p>
            </div>
            <p className="text-center text-white/30 text-xs mt-4">Tap anywhere to continue</p>
          </div>
        )}

        {/* ─ Slide 3: Summary ─ */}
        {resultSlide === 3 && (
          <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className={`px-4 py-4 transition-opacity duration-200 ${slideIn?"opacity-100":"opacity-0"}`}>

              {/* Summary card */}
              <div ref={summaryCardRef} className="rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 mb-4" data-testid="card-summary">
                {/* Card header */}
                <div className={`bg-gradient-to-br ${meta.gradient} px-5 pt-5 pb-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white/40 text-[9px] font-bold tracking-[0.3em] uppercase mb-1">PLAYR1 PLAYER PROFILE</p>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl leading-none">{meta.icon}</span>
                        <div>
                          <h3 className="text-white text-lg font-black leading-tight">{results.archetype}</h3>
                          <p className="text-white/55 text-[10px] leading-snug max-w-[180px]">{results.archetypeTagline}</p>
                        </div>
                      </div>
                    </div>
                    <img src={logoImg} alt="PLAYR1" className="h-6 w-auto object-contain shrink-0 opacity-70" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white/70 text-[10px] font-bold">{results.stage}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white/70 text-[10px] font-bold">{results.teamRole}</span>
                  </div>
                </div>
                {/* Card body */}
                <div className="px-5 py-4 space-y-4">
                  <div className="pb-3 border-b border-zinc-800">
                    <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase mb-1">#1 Growth Area</p>
                    <p className="text-orange-400 text-xl font-black">{results.bottleneck}</p>
                    <p className="text-zinc-500 text-xs mt-0.5 leading-snug">{results.bottleneckUnlocks.slice(0,80)}…</p>
                  </div>
                  <div className="space-y-3">
                    <ScoreBar label="Mindset" score={results.mindsetScore} band={results.mindsetBand} />
                    <ScoreBar label="Dedication" score={results.dedicationScore} band={results.dedicationBand} color="bg-blue-500" />
                    <ScoreBar label="Experience" score={results.experienceScore} band={results.experienceBand} color="bg-purple-500" />
                  </div>
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <p className="text-zinc-700 text-[10px]">playr1.app</p>
                    {firstName && <p className="text-zinc-700 text-[10px]">{firstName}{lastName?` ${lastName}`:""}</p>}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-2.5" onClick={e=>e.stopPropagation()}>
                <button onClick={handleShareSummary} disabled={shareState==="sharing"} data-testid="button-share-profile"
                  className="w-full bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white rounded-2xl py-3.5 font-bold text-sm transition-all flex items-center justify-center gap-2 border border-zinc-800">
                  {shareState==="shared" ? <><Check className="h-4 w-4 text-green-400"/>Saved!</>
                  : shareState==="sharing" ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</>
                  : typeof navigator.canShare === "function" ? <><Share2 className="h-4 w-4"/>Share My PLAYR1 Card</>
                  : <><Download className="h-4 w-4"/>Save My PLAYR1 Card</>}
                </button>
                <button onClick={finishOnboarding} data-testid="button-start-journey"
                  className="w-full bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2"
                  style={{ boxShadow: "0 0 24px rgba(234,88,12,0.3)" }}>
                  Start My First Training Session <ArrowRight className="h-5 w-5" />
                </button>
              </div>
              <div className="h-8" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
