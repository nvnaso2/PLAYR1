import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Trash2, ArrowUp, ArrowDown, Layers2 } from "lucide-react";
import { DRILL_CATEGORIES } from "@shared/schema";
import type { Drill } from "@shared/schema";

export function ComboBadge() {
  return (
    <Badge
      variant="secondary"
      className="no-default-hover-elevate text-[10px] bg-primary/15 text-primary border-primary/30 shrink-0"
    >
      Combo
    </Badge>
  );
}

type ComboDrillBuilderProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (drill: Drill) => void;
};

export function ComboDrillBuilder({ open, onClose, onCreated }: ComboDrillBuilderProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("ball-handling");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: systemDrills = [] } = useQuery<Drill[]>({
    queryKey: ["/api/drills"],
    enabled: open,
  });

  const { data: myDrills = [] } = useQuery<Drill[]>({
    queryKey: ["/api/user/my-drills"],
    enabled: open,
  });

  const drillMap = useMemo(() => {
    const map = new Map<string, Drill>();
    [...systemDrills, ...myDrills].forEach(d => map.set(d.id, d));
    return map;
  }, [systemDrills, myDrills]);

  const availableDrills = useMemo(() => {
    const selected = new Set(selectedIds);
    const seen = new Set<string>();
    const out: Drill[] = [];
    [...systemDrills, ...myDrills].forEach(d => {
      if (!seen.has(d.id) && !selected.has(d.id)) {
        seen.add(d.id);
        out.push(d);
      }
    });
    return out;
  }, [systemDrills, myDrills, selectedIds]);

  const filteredDrills = useMemo(() => {
    const q = search.toLowerCase().trim();
    const pool = q
      ? availableDrills.filter(d =>
          d.title.toLowerCase().includes(q) || (d.category ?? "").toLowerCase().includes(q)
        )
      : availableDrills;
    return pool.slice(0, 30);
  }, [availableDrills, search]);

  const selectedDrills = useMemo(
    () => selectedIds.map(id => drillMap.get(id)).filter(Boolean) as Drill[],
    [selectedIds, drillMap]
  );

  const addDrill = (id: string) => {
    setSelectedIds(prev => [...prev, id]);
    setSearch("");
  };

  const removeDrill = (idx: number) =>
    setSelectedIds(prev => prev.filter((_, i) => i !== idx));

  const moveDrill = (idx: number, dir: -1 | 1) => {
    setSelectedIds(prev => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const reset = () => {
    setName("");
    setCategory("ball-handling");
    setSearch("");
    setSelectedIds([]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const comboComponents = selectedIds.map((drillId, i) => ({ drillId, order: i }));
      const res = await apiRequest("POST", "/api/user/drills", {
        title: name.trim(),
        category,
        difficulty: "beginner",
        comboComponents,
        description: `Combo: ${selectedDrills.map(d => d.title).join(" → ")}`,
        isShared: false,
      });
      return res.json();
    },
    onSuccess: (drill: Drill) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/my-drills"] });
      toast({ title: `"${drill.title}" combo created!` });
      reset();
      onCreated?.(drill);
      onClose();
    },
    onError: (e: any) =>
      toast({ title: "Failed to create combo", description: e?.message, variant: "destructive" }),
  });

  const canSave = name.trim().length >= 2 && selectedIds.length >= 2;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-combo-drill-builder">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers2 className="w-5 h-5 text-primary" />
            Create Combo Drill
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Combo Name</label>
            <Input
              placeholder="e.g. Steph Curry Ball Handling"
              value={name}
              onChange={e => setName(e.target.value)}
              data-testid="input-combo-name"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-combo-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRILL_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Selected Drills ({selectedIds.length})
              {selectedIds.length < 2 && (
                <span className="text-muted-foreground font-normal ml-1">— pick at least 2</span>
              )}
            </label>

            {selectedDrills.length > 0 && (
              <div className="space-y-1 mb-3">
                {selectedDrills.map((drill, idx) => (
                  <div
                    key={drill.id}
                    className="flex items-center gap-1 p-2 rounded-md bg-muted/50 text-sm"
                    data-testid={`combo-selected-${drill.id}`}
                  >
                    <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{idx + 1}</span>
                    <span className="flex-1 truncate">{drill.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0 no-default-hover-elevate">
                      {drill.category}
                    </Badge>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                      disabled={idx === 0}
                      onClick={() => moveDrill(idx, -1)}
                      data-testid={`button-combo-up-${drill.id}`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                      disabled={idx === selectedDrills.length - 1}
                      onClick={() => moveDrill(idx, 1)}
                      data-testid={`button-combo-down-${drill.id}`}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-destructive"
                      onClick={() => removeDrill(idx)}
                      data-testid={`button-combo-remove-${drill.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search drills to add..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-combo-search"
                />
              </div>
              {filteredDrills.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-1">
                  {filteredDrills.map(drill => (
                    <div
                      key={drill.id}
                      className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/50 text-sm"
                      onClick={() => addDrill(drill.id)}
                      data-testid={`button-combo-add-${drill.id}`}
                    >
                      <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{drill.title}</span>
                      <Badge variant="outline" className="text-[10px] no-default-hover-elevate">
                        {drill.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {filteredDrills.length === 0 && search && (
                <p className="text-xs text-muted-foreground text-center py-2">No drills found</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} data-testid="button-combo-cancel">
            Cancel
          </Button>
          <Button
            disabled={!canSave || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            data-testid="button-combo-save"
          >
            {createMutation.isPending
              ? "Creating..."
              : `Create Combo (${selectedIds.length} drill${selectedIds.length !== 1 ? "s" : ""})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
