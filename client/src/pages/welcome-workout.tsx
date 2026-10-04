import { useEffect } from "react";
import { useLocation } from "wouter";

export default function WelcomeWorkoutPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/coach-p?welcomeWorkout=1");
  }, [setLocation]);

  return (
    <main
      className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-zinc-400"
      aria-live="polite"
    >
      Opening your Coach P workout chat…
    </main>
  );
}