import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Film, Flame, Play, Star, X } from "lucide-react";

type CreatorSubmission = {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
  score: number;
  attemptDate: string;
  videoUrl: string;
  isNewRecord: boolean;
  createdAt: string;
};

export function AdminCommunity3Pointers() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const { data: submissions = [], isLoading } = useQuery<CreatorSubmission[]>({
    queryKey: ["/api/admin/streak-challenges/creator-submissions", "fifty-in-a-row"],
    queryFn: async () => {
      const response = await fetch("/api/admin/streak-challenges/creator-submissions?slug=fifty-in-a-row", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load community submissions");
      return response.json();
    },
    refetchInterval: 5000,
  });
  const filtered = dateFilter ? submissions.filter((submission) => submission.attemptDate === dateFilter) : submissions;

  return (
    <div className="space-y-6" data-testid="section-community-3-pointers">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="flex items-center gap-2 text-xl font-bold"><Flame className="h-5 w-5 text-orange-400" />Community 3 Point Challenge</h2><p className="mt-1 text-sm text-muted-foreground">Review player submissions and community challenge activity.</p></div>
        <div className="flex items-center gap-2"><Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-9 w-44 text-sm" />{dateFilter && <Button size="sm" variant="ghost" onClick={() => setDateFilter("")} className="h-9 px-2 text-muted-foreground"><X className="h-4 w-4" /></Button>}<Badge variant="outline" className="text-xs">{filtered.length} clip{filtered.length !== 1 ? "s" : ""}</Badge></div>
      </div>
      {isLoading ? <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}</div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border/50 py-16 text-center"><Film className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{dateFilter ? `No submissions on ${dateFilter}` : "No creator submissions yet."}</p></div> : <div className="space-y-3">{filtered.map((submission) => { const internal = submission.videoUrl.startsWith("/objects/"); return <div key={submission.id} className="overflow-hidden rounded-xl border border-border/60 bg-card" data-testid={`card-community-submission-${submission.id}`}><div className="flex items-center gap-3 p-4"><Avatar className="h-10 w-10 shrink-0"><AvatarImage src={submission.profilePhotoUrl ?? undefined} /><AvatarFallback className="text-xs">{submission.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{submission.displayName}</p>{submission.isNewRecord && <Badge className="border-yellow-500/30 bg-yellow-500/15 px-1.5 py-0 text-[10px] text-yellow-500"><Star className="mr-0.5 h-2.5 w-2.5" />PR</Badge>}</div><div className="mt-0.5 flex items-center gap-3"><span className="text-xs text-muted-foreground">{submission.attemptDate}</span><span className="text-xs font-bold text-orange-400">{submission.score} makes</span><span className="text-[10px] text-muted-foreground">submitted {new Date(submission.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div></div>{internal ? <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}><Play className="h-3.5 w-3.5" />{expandedId === submission.id ? "Hide" : "Play"}</Button> : <a href={submission.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-blue-400/20 px-2 py-1.5 text-xs text-blue-400 hover:text-blue-300"><ExternalLink className="h-3.5 w-3.5" />Open link</a>}</div>{expandedId === submission.id && internal && <div className="px-4 pb-4"><video src={submission.videoUrl} controls autoPlay className="max-h-80 w-full rounded-lg bg-black" playsInline /></div>}</div>; })}</div>}
    </div>
  );
}