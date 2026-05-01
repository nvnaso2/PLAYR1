import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus } from "lucide-react";

type ConnectionRow = {
  id: string;
  playerId: string;
  trainerId: string;
  status: string;
  otherUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    displayName: string | null;
    profilePhotoUrl: string | null;
  } | null;
};

type AssignResult = { assigned: string[]; alreadyEnrolled: string[]; skipped: string[] };

export function AssignProgramDialog({
  programId,
  programTitle,
  trigger,
}: {
  programId: string;
  programTitle: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: connections = [], isLoading } = useQuery<ConnectionRow[]>({
    queryKey: ["/api/connections"],
    enabled: open,
  });

  // The connection model can have either side as initiator. From the
  // current user's POV the "other user" is always the candidate to assign.
  // Dedupe by user id so duplicate connection rows can never render twice.
  const candidates = useMemo(() => {
    const myId = user?.id;
    const byId = new Map<string, { id: string; name: string; photo: string | null }>();
    for (const c of connections) {
      if (c.status !== "accepted" || !c.otherUser || c.otherUser.id === myId) continue;
      if (byId.has(c.otherUser.id)) continue;
      byId.set(c.otherUser.id, {
        id: c.otherUser.id,
        name:
          c.otherUser.displayName?.trim() ||
          [c.otherUser.firstName, c.otherUser.lastName].filter(Boolean).join(" ").trim() ||
          "Player",
        photo: c.otherUser.profilePhotoUrl || c.otherUser.profileImageUrl || null,
      });
    }
    return Array.from(byId.values());
  }, [connections, user?.id]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(q));
  }, [candidates, filter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const assign = useMutation<AssignResult, Error, string[]>({
    mutationFn: async (playerIds) => {
      const res = await apiRequest("POST", `/api/programs/${programId}/assign`, { playerIds });
      return (await res.json()) as AssignResult;
    },
    onSuccess: (result) => {
      const total = result.assigned.length + result.alreadyEnrolled.length + result.skipped.length;
      const parts: string[] = [];
      if (result.assigned.length) parts.push(`${result.assigned.length} assigned`);
      if (result.alreadyEnrolled.length) parts.push(`${result.alreadyEnrolled.length} already enrolled`);
      if (result.skipped.length) parts.push(`${result.skipped.length} skipped (not in roster)`);
      toast({
        title: result.assigned.length > 0 ? "Players assigned" : "Nothing changed",
        description: parts.length ? parts.join(" · ") : `Processed ${total} players.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "edit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs/discover/assigned"] });
      setSelected(new Set());
      setOpen(false);
    },
    onError: (e) => toast({ title: "Couldn't assign", description: e?.message ?? "", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="button-assign-players">
          <UserPlus className="w-4 h-4 mr-1" /> Assign to players
        </Button>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign players to "{programTitle}"</DialogTitle>
          <DialogDescription>
            Pick players from your roster. They'll be enrolled in this program right away. Already-enrolled players are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search your roster…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8"
              data-testid="input-assign-search"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your roster…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-roster">
              You don't have any connected players yet. Connect with players first, then come back.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="text-primary hover:underline"
                  data-testid="button-toggle-all-roster"
                >
                  {allFilteredSelected ? "Clear all" : "Select all"}
                </button>
                <span className="text-muted-foreground">{selected.size} selected</span>
              </div>
              <ScrollArea className="h-72 pr-3 border rounded-md">
                <ul className="divide-y">
                  {filtered.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 p-2 hover-elevate">
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggle(c.id)}
                        data-testid={`checkbox-roster-${c.id}`}
                      />
                      <Avatar className="w-8 h-8">
                        {c.photo ? <AvatarImage src={c.photo} alt={c.name} /> : null}
                        <AvatarFallback>{c.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{c.name}</span>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="p-3 text-sm text-muted-foreground">No players match.</li>
                  )}
                </ul>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} data-testid="button-cancel-assign">
            Cancel
          </Button>
          <Button
            onClick={() => assign.mutate(Array.from(selected))}
            disabled={assign.isPending || selected.size === 0}
            data-testid="button-confirm-assign"
          >
            {assign.isPending ? "Assigning…" : `Assign ${selected.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
