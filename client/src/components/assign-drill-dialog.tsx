import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, ClipboardList } from "lucide-react";
import type { Drill } from "@shared/schema";

interface AssignDrillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  assignedTo: string;
  onSuccess?: () => void;
}

export function AssignDrillDialog({ open, onOpenChange, playerName, assignedTo, onSuccess }: AssignDrillDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: drills, isLoading } = useQuery<Drill[]>({
    queryKey: ["/api/drills"],
    enabled: open,
  });

  const filteredDrills = useMemo(() => {
    if (!drills) return [];
    if (!search.trim()) return drills;
    const q = search.toLowerCase();
    return drills.filter(d => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
  }, [drills, search]);

  const assignMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/trainer/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/players"] });
      toast({ title: "Drill assigned!", description: `${selectedDrill?.title} assigned to ${playerName}` });
      handleClose();
      onSuccess?.();
    },
    onError: (err: Error) => toast({ title: "Failed to assign drill", description: err.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setSearch("");
    setSelectedDrill(null);
    setDueDate("");
    setNotes("");
    onOpenChange(false);
  };

  const handleAssign = () => {
    if (!selectedDrill) return;
    assignMutation.mutate({
      drillId: selectedDrill.id,
      assignedTo,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col" data-testid="dialog-assign-drill">
        <DialogHeader>
          <DialogTitle>Assign Drill to {playerName}</DialogTitle>
          <DialogDescription>Select a drill from the library to assign.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search drills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-drill-search"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-64">
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
            ) : filteredDrills.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No drills found</p>
              </div>
            ) : (
              filteredDrills.map(drill => (
                <button
                  key={drill.id}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${selectedDrill?.id === drill.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
                  onClick={() => setSelectedDrill(selectedDrill?.id === drill.id ? null : drill)}
                  data-testid={`button-select-drill-${drill.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{drill.title}</p>
                    <Badge variant="outline" className="no-default-hover-elevate text-[10px] shrink-0 capitalize">{drill.category?.replace(/-/g, " ")}</Badge>
                  </div>
                  {drill.difficulty && (
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{drill.difficulty}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {selectedDrill && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium text-primary">Selected: {selectedDrill.title}</p>
              <div className="space-y-1">
                <label className="text-sm font-medium">Due Date <span className="text-muted-foreground">(optional)</span></label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-due-date" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any instructions..." data-testid="input-assignment-notes" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedDrill || assignMutation.isPending}
            data-testid="button-confirm-assign-drill"
          >
            {assignMutation.isPending ? "Assigning..." : "Assign Drill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
