import { CalendarDays, Dumbbell, History, Target } from "lucide-react";

export const STARTER_PROMPTS = [
  {
    label: "Build my next workout",
    prompt: "Build my next workout",
    icon: Dumbbell,
    workoutBuilder: true,
  },
  {
    label: "Find my biggest opportunity",
    prompt: "Find my biggest opportunity",
    icon: Target,
  },
  {
    label: "Review my last training session",
    prompt: "Review my last training session",
    icon: History,
  },
  {
    label: "Prepare for my next game",
    prompt: "Prepare for my next game",
    icon: CalendarDays,
  },
];
