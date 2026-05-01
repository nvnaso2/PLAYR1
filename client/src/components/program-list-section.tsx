import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, ExternalLink, Lock } from "lucide-react";
import type { Program } from "@shared/schema";

type Mode = "admin" | "trainer";

export function ProgramListSection({ mode }: { mode: Mode }) {
  const endpoint = mode === "admin" ? "/api/admin/programs" : "/api/trainer/programs";
  const { data: programs, isLoading } = useQuery<Program[]>({ queryKey: [endpoint] });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-programs-section-title">
            {mode === "admin" ? "All Programs" : "My Programs"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "admin"
              ? "Create and manage PLAYR1 system programs and review trainer-authored programs."
              : "Programs you've created. Set them to public + published to make them visible to your players."}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-program">
              <Plus className="w-4 h-4 mr-1" /> New Program
            </Button>
          </DialogTrigger>
          <NewProgramDialog mode={mode} onClose={() => setCreateOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (programs ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {mode === "admin"
            ? "No programs yet. Click \"New Program\" to create the first one."
            : "You haven't authored any programs yet. Build your first one for your players."}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(programs ?? []).map((p) => (
            <ProgramRow key={p.id} program={p} mode={mode} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramRow({ program, mode }: { program: Program; mode: Mode }) {
  return (
    <Card className="hover-elevate" data-testid={`row-program-${program.id}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate" data-testid={`text-program-title-${program.id}`}>
              {program.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">/{program.slug}</div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {program.isPublished ? (
              <Badge variant="default" className="text-xs">Published</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Draft</Badge>
            )}
            {program.visibility !== "public" && (
              <Badge variant="outline" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />{program.visibility}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <Badge variant="outline" className="capitalize">{program.difficulty}</Badge>
          <span>{program.lengthDays} days</span>
          <span>·</span>
          <span>{program.enrollmentCount ?? 0} enrolled</span>
          {mode === "admin" && (
            <Badge variant="outline" className="ml-auto capitalize">{program.authorType}</Badge>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Link href={`/programs/${program.id}/edit`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full" data-testid={`button-edit-program-${program.id}`}>
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
          </Link>
          <Link href={`/programs/${program.slug}`}>
            <Button variant="ghost" size="sm" data-testid={`button-preview-program-${program.id}`}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function NewProgramDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [lengthDays, setLengthDays] = useState(7);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");

  const create = useMutation({
    mutationFn: async () => {
      const body: any = {
        title: title.trim(),
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        lengthDays,
        difficulty,
        cadence: "userPaced",
        visibility: mode === "trainer" ? "private" : "public",
        isPublished: false,
        authorType: mode === "admin" ? "system" : "trainer",
      };
      return await apiRequest("POST", "/api/programs", body);
    },
    onSuccess: async (res: any) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program created — opening editor" });
      onClose();
      // Hard navigate so editor mounts cleanly
      window.location.href = `/programs/${created.id}/edit`;
    },
    onError: (e: any) =>
      toast({ title: "Couldn't create program", description: e?.message ?? "", variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-md" data-testid="dialog-new-program">
      <DialogHeader>
        <DialogTitle>New program</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 7-Day Ball Handling Foundation" data-testid="input-new-program-title" />
        </div>
        <div>
          <Label>Tagline</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)}
            placeholder="One-line hook" data-testid="input-new-program-tagline" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
            data-testid="input-new-program-description" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Length (days)</Label>
            <Input type="number" min={1} value={lengthDays}
              onChange={(e) => setLengthDays(parseInt(e.target.value || "0", 10))}
              data-testid="input-new-program-length" />
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
              <SelectTrigger data-testid="select-new-program-difficulty"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">beginner</SelectItem>
                <SelectItem value="intermediate">intermediate</SelectItem>
                <SelectItem value="advanced">advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} data-testid="button-cancel-new-program">Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}
          data-testid="button-create-program">
          Create & open editor
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
