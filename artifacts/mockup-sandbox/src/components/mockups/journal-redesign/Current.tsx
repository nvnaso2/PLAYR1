import { useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, ChevronRight, Dumbbell, Plus, Search, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import "./_group.css";

const sampleEntries = [
  {
    id: "practice-1",
    type: "After practice / workout",
    icon: Dumbbell,
    date: "Oct 1, 2026",
    source: "Linked workout",
    mood: "😊",
    answer: "I stayed balanced on the catch today. When I slowed down and got my feet set, the shot felt easier and more repeatable.",
    coached: true,
  },
  {
    id: "game-1",
    type: "After game",
    icon: Trophy,
    date: "Sep 29, 2026",
    source: "Linked game",
    mood: "😐",
    answer: "I made the right read late in the fourth, but I need to be louder earlier when we're switching on the screen.",
    coached: false,
  },
];

export function Current() {
  const [search, setSearch] = useState("");
  const visibleEntries = sampleEntries.filter((entry) => `${entry.type} ${entry.answer}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-6">
      <main className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" aria-label="Back to Profile">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold"><BookOpen className="h-6 w-6 text-primary" />Journal</h1>
              <p className="mt-1 text-sm text-muted-foreground">Reflect on your game. Grow as a player.</p>
            </div>
          </div>
          <Button><Plus className="mr-2 h-4 w-4" />New entry</Button>
        </header>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reflections and Coach P feedback..." className="pl-9" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>All types</option></select>
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>Any mood</option></select>
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>Any coaching</option></select>
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>Any source</option></select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" aria-label="From date" />
              <Input type="date" aria-label="To date" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {visibleEntries.map((entry) => {
            const Icon = entry.icon;
            return (
              <Card key={entry.id} className="group cursor-pointer transition-colors hover:border-primary/40">
                <CardContent className="flex gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{entry.type}</span>
                      {entry.coached && <Badge variant="secondary" className="gap-1 text-xs"><Sparkles className="h-3 w-3" />Coached</Badge>}
                      <Badge variant="outline" className="text-xs">{entry.source}</Badge>
                      <span>{entry.mood}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" />{entry.date}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{entry.answer}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}