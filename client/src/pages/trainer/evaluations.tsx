import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  Plus,
  Star,
  TrendingUp,
  Calendar,
  Trash2,
  Edit,
  ChevronRight,
  User,
  Search,
  Eye,
  X,
  Share2,
  EyeOff,
} from "lucide-react";
import type { EvaluationAttribute, PlayerEvaluation, PlayerEvaluationRating } from "@shared/schema";

interface TrainerPlayer {
  id: string;
  firstName: string;
  lastName: string;
  linkedUserId: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  notes: string | null;
}

interface EvalRatingWithAttr extends PlayerEvaluationRating {
  attribute: EvaluationAttribute;
}

interface EvalDetail {
  evaluation: PlayerEvaluation;
  ratings: EvalRatingWithAttr[];
}

interface RatingInput {
  attributeId: string;
  numericValue: number | null;
  wordValue: string | null;
  notes: string;
}

const CATEGORIES = ["Offense", "Defense", "Intangibles", "Other"];

function getCategoryColor(cat: string | null) {
  switch (cat) {
    case "Offense": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "Defense": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "Intangibles": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getWordNumericEquivalent(wordValue: string, wordOptions: string[]): number {
  const idx = wordOptions.indexOf(wordValue);
  if (idx === -1) return 0;
  return idx + 1;
}

export default function TrainerEvaluationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("evaluate");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [viewingEvalId, setViewingEvalId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, RatingInput>>({});
  const [evalNotes, setEvalNotes] = useState("");

  const [showAttrDialog, setShowAttrDialog] = useState(false);
  const [editingAttr, setEditingAttr] = useState<EvaluationAttribute | null>(null);
  const [attrName, setAttrName] = useState("");
  const [attrCategory, setAttrCategory] = useState("");
  const [attrScaleType, setAttrScaleType] = useState("1-10");
  const [attrWordOptions, setAttrWordOptions] = useState("");
  const [deleteAttrId, setDeleteAttrId] = useState<string | null>(null);

  const { data: players, isLoading: playersLoading } = useQuery<TrainerPlayer[]>({
    queryKey: ["/api/trainer-players"],
  });

  const { data: attributes, isLoading: attrsLoading } = useQuery<EvaluationAttribute[]>({
    queryKey: ["/api/evaluation-attributes"],
  });

  const { data: evaluations, isLoading: evalsLoading } = useQuery<PlayerEvaluation[]>({
    queryKey: ["/api/player-evaluations", selectedPlayerId],
    enabled: !!selectedPlayerId,
    queryFn: () => fetch(`/api/player-evaluations/${selectedPlayerId}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: evalDetail } = useQuery<EvalDetail>({
    queryKey: ["/api/player-evaluations/detail", viewingEvalId],
    enabled: !!viewingEvalId,
    queryFn: () => fetch(`/api/player-evaluations/detail/${viewingEvalId}`, { credentials: "include" }).then(r => r.json()),
  });

  const createEvalMutation = useMutation({
    mutationFn: (data: { playerId: string; evaluationDate: string; notes: string; ratings: any[] }) =>
      apiRequest("POST", "/api/player-evaluations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player-evaluations", selectedPlayerId] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/trainer/players" && q.queryKey[2] === "evaluations" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-evaluations"] });
      toast({ title: "Evaluation saved" });
      setShowEvalForm(false);
      setRatings({});
      setEvalNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save evaluation", description: error.message, variant: "destructive" });
    },
  });

  const deleteEvalMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/player-evaluations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player-evaluations", selectedPlayerId] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/trainer/players" && q.queryKey[2] === "evaluations" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-evaluations"] });
      toast({ title: "Evaluation deleted" });
      setViewingEvalId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) =>
      apiRequest("PUT", `/api/player-evaluations/${id}/share`, { shared }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/player-evaluations", selectedPlayerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/player-evaluations/detail", viewingEvalId] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/trainer/players" && q.queryKey[2] === "evaluations" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-evaluations"] });
      toast({ title: variables.shared ? "Evaluation shared with player" : "Evaluation unshared" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update sharing", description: error.message, variant: "destructive" });
    },
  });

  const createAttrMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/evaluation-attributes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-attributes"] });
      toast({ title: "Attribute created" });
      resetAttrForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create attribute", description: error.message, variant: "destructive" });
    },
  });

  const updateAttrMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/evaluation-attributes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-attributes"] });
      toast({ title: "Attribute updated" });
      resetAttrForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update attribute", description: error.message, variant: "destructive" });
    },
  });

  const deleteAttrMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/evaluation-attributes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-attributes"] });
      toast({ title: "Attribute deleted" });
      setDeleteAttrId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete attribute", description: error.message, variant: "destructive" });
    },
  });

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    if (!playerSearch) return players;
    const q = playerSearch.toLowerCase();
    return players.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
    );
  }, [players, playerSearch]);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId || !players) return null;
    return players.find(p => (p.linkedUserId || p.id) === selectedPlayerId) || null;
  }, [selectedPlayerId, players]);

  const attributesByCategory = useMemo(() => {
    if (!attributes) return {};
    const grouped: Record<string, EvaluationAttribute[]> = {};
    for (const attr of attributes) {
      const cat = attr.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(attr);
    }
    return grouped;
  }, [attributes]);

  function resetAttrForm() {
    setShowAttrDialog(false);
    setEditingAttr(null);
    setAttrName("");
    setAttrCategory("");
    setAttrScaleType("1-10");
    setAttrWordOptions("");
  }

  function openEditAttr(attr: EvaluationAttribute) {
    setEditingAttr(attr);
    setAttrName(attr.name);
    setAttrCategory(attr.category || "");
    setAttrScaleType(attr.scaleType);
    setAttrWordOptions(attr.wordOptions ? JSON.parse(attr.wordOptions).join(", ") : "");
    setShowAttrDialog(true);
  }

  function handleAttrSubmit() {
    const wordOpts = attrScaleType === "word" ? JSON.stringify(attrWordOptions.split(",").map(s => s.trim()).filter(Boolean)) : null;
    const data = {
      name: attrName,
      category: attrCategory || null,
      scaleType: attrScaleType,
      wordOptions: wordOpts,
    };

    if (editingAttr) {
      updateAttrMutation.mutate({ id: editingAttr.id, data });
    } else {
      createAttrMutation.mutate(data);
    }
  }

  function startNewEvaluation() {
    if (!attributes) return;
    const initial: Record<string, RatingInput> = {};
    for (const attr of attributes) {
      initial[attr.id] = {
        attributeId: attr.id,
        numericValue: attr.scaleType === "1-10" ? 5 : attr.scaleType === "1-5" ? 3 : null,
        wordValue: null,
        notes: "",
      };
    }
    setRatings(initial);
    setEvalNotes("");
    setShowEvalForm(true);
  }

  function updateRating(attrId: string, field: string, value: any) {
    setRatings(prev => ({
      ...prev,
      [attrId]: { ...prev[attrId], [field]: value },
    }));
  }

  function handleSubmitEvaluation() {
    if (!selectedPlayerId) return;
    const ratingsList = Object.values(ratings).filter(r => r.numericValue !== null || r.wordValue !== null);
    if (ratingsList.length === 0) {
      toast({ title: "Please rate at least one attribute", variant: "destructive" });
      return;
    }
    createEvalMutation.mutate({
      playerId: selectedPlayerId,
      evaluationDate: new Date().toISOString().split("T")[0],
      notes: evalNotes,
      ratings: ratingsList,
    });
  }

  const initialEval = useMemo(() => {
    if (!evaluations) return null;
    return evaluations.find(e => e.evaluationType === "initial") || null;
  }, [evaluations]);

  if (playersLoading || attrsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-evaluations-title">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          Player Evaluations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Rate player skills, track progress over time</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-evaluations">
          <TabsTrigger value="evaluate" data-testid="tab-evaluate">Evaluate</TabsTrigger>
          <TabsTrigger value="attributes" data-testid="tab-attributes">Attributes</TabsTrigger>
        </TabsList>

        <TabsContent value="evaluate" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                className="pl-9"
                data-testid="input-player-search"
              />
            </div>
            <Select
              value={selectedPlayerId || ""}
              onValueChange={(v) => { setSelectedPlayerId(v); setShowEvalForm(false); setViewingEvalId(null); }}
            >
              <SelectTrigger className="w-full sm:w-[260px]" data-testid="select-player">
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                {filteredPlayers.map(p => (
                  <SelectItem key={p.linkedUserId || p.id} value={p.linkedUserId || p.id} data-testid={`option-player-${p.id}`}>
                    {p.firstName} {p.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedPlayerId && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">Select a player to evaluate</p>
                <p className="text-sm mt-1">Choose a player from your roster to create or view evaluations</p>
              </CardContent>
            </Card>
          )}

          {selectedPlayerId && selectedPlayer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold" data-testid="text-selected-player">
                    {selectedPlayer.firstName} {selectedPlayer.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {evaluations?.length || 0} evaluation{(evaluations?.length || 0) !== 1 ? "s" : ""} recorded
                    {initialEval && <span> &middot; Initial: {formatDate(initialEval.evaluationDate)}</span>}
                  </p>
                </div>
                <Button onClick={startNewEvaluation} data-testid="button-new-evaluation">
                  <Plus className="w-4 h-4 mr-1" />
                  New Evaluation
                </Button>
              </div>

              {showEvalForm && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      {evaluations && evaluations.length > 0 ? "Progress Evaluation" : "Initial Evaluation"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {CATEGORIES.map(cat => {
                      const catAttrs = attributesByCategory[cat];
                      if (!catAttrs || catAttrs.length === 0) return null;
                      return (
                        <div key={cat} className="space-y-3">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Badge variant="outline" className={getCategoryColor(cat)}>{cat}</Badge>
                          </h3>
                          <div className="space-y-4">
                            {catAttrs.map(attr => {
                              const rating = ratings[attr.id];
                              if (!rating) return null;
                              return (
                                <div key={attr.id} className="rounded-lg border p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="font-medium">{attr.name}</Label>
                                    <Badge variant="outline" className="text-xs">{attr.scaleType}</Badge>
                                  </div>
                                  {(attr.scaleType === "1-10" || attr.scaleType === "1-5") && (
                                    <div className="flex items-center gap-3">
                                      <Slider
                                        min={1}
                                        max={attr.scaleType === "1-10" ? 10 : 5}
                                        step={1}
                                        value={[rating.numericValue || 1]}
                                        onValueChange={([v]) => updateRating(attr.id, "numericValue", v)}
                                        className="flex-1"
                                        data-testid={`slider-${attr.id}`}
                                      />
                                      <span className="w-8 text-center text-lg font-bold text-primary" data-testid={`value-${attr.id}`}>
                                        {rating.numericValue}
                                      </span>
                                    </div>
                                  )}
                                  {attr.scaleType === "word" && attr.wordOptions && (
                                    <div className="flex flex-wrap gap-2">
                                      {JSON.parse(attr.wordOptions).map((word: string, idx: number) => (
                                        <Button
                                          key={word}
                                          type="button"
                                          variant={rating.wordValue === word ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => updateRating(attr.id, "wordValue", word)}
                                          data-testid={`word-${attr.id}-${idx}`}
                                        >
                                          {word}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                  <Textarea
                                    value={rating.notes || ""}
                                    onChange={e => updateRating(attr.id, "notes", e.target.value)}
                                    placeholder="Notes for this attribute..."
                                    rows={2}
                                    className="text-xs"
                                    data-testid={`textarea-attr-notes-${attr.id}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="space-y-2">
                      <Label>Overall Notes</Label>
                      <Textarea
                        value={evalNotes}
                        onChange={e => setEvalNotes(e.target.value)}
                        placeholder="General observations, areas to improve, standout skills..."
                        rows={3}
                        data-testid="textarea-eval-notes"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowEvalForm(false)} data-testid="button-cancel-eval">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitEvaluation}
                        disabled={createEvalMutation.isPending}
                        data-testid="button-submit-eval"
                      >
                        {createEvalMutation.isPending ? "Saving..." : "Save Evaluation"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {evalsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : evaluations && evaluations.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Evaluation History</h3>
                  {evaluations.map(ev => (
                    <Card
                      key={ev.id}
                      className="cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => setViewingEvalId(ev.id)}
                      data-testid={`card-eval-${ev.id}`}
                    >
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{formatDate(ev.evaluationDate)}</span>
                          </div>
                          <Badge variant={ev.evaluationType === "initial" ? "default" : "secondary"}>
                            {ev.evaluationType === "initial" ? "Initial" : "Progress"}
                          </Badge>
                          {ev.sharedWithPlayer && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Share2 className="w-3 h-3" /> Shared
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !showEvalForm ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No evaluations yet for this player</p>
                    <p className="text-sm mt-1">Click "New Evaluation" to create the initial assessment</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attributes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Skill Attributes</h2>
              <p className="text-sm text-muted-foreground">Manage the attributes you use to evaluate players</p>
            </div>
            <Button onClick={() => { resetAttrForm(); setShowAttrDialog(true); }} data-testid="button-add-attribute">
              <Plus className="w-4 h-4 mr-1" />
              Add Attribute
            </Button>
          </div>

          {CATEGORIES.map(cat => {
            const catAttrs = attributesByCategory[cat];
            if (!catAttrs || catAttrs.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Badge variant="outline" className={getCategoryColor(cat)}>{cat}</Badge>
                  <span className="text-muted-foreground text-xs">({catAttrs.length})</span>
                </h3>
                <div className="grid gap-2">
                  {catAttrs.map(attr => (
                    <Card key={attr.id} data-testid={`card-attr-${attr.id}`}>
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{attr.name}</span>
                          <Badge variant="outline" className="text-xs">{attr.scaleType}</Badge>
                          {attr.scaleType === "word" && attr.wordOptions && (
                            <span className="text-xs text-muted-foreground">
                              {JSON.parse(attr.wordOptions).join(" → ")}
                            </span>
                          )}
                          {attr.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditAttr(attr)} data-testid={`button-edit-attr-${attr.id}`}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          {!attr.isDefault && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleteAttrId(attr.id)} data-testid={`button-delete-attr-${attr.id}`}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <Sheet open={!!viewingEvalId} onOpenChange={(open) => { if (!open) setViewingEvalId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle data-testid="text-eval-detail-title">Evaluation Details</SheetTitle>
            <SheetDescription asChild>
              <div>
                {evalDetail && (
                  <span>
                    {formatDate(evalDetail.evaluation.evaluationDate)} &middot;{" "}
                    <Badge variant={evalDetail.evaluation.evaluationType === "initial" ? "default" : "secondary"} className="text-xs">
                      {evalDetail.evaluation.evaluationType === "initial" ? "Initial" : "Progress"}
                    </Badge>
                  </span>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>

          {evalDetail && (
            <div className="space-y-4 mt-4">
              {evalDetail.evaluation.notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{evalDetail.evaluation.notes}</p>
                </div>
              )}

              {CATEGORIES.map(cat => {
                const catRatings = evalDetail.ratings.filter(r => (r.attribute.category || "Other") === cat);
                if (catRatings.length === 0) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <Badge variant="outline" className={getCategoryColor(cat)}>{cat}</Badge>
                    {catRatings.map(r => {
                      const maxVal = r.attribute.scaleType === "1-10" ? 10 : 5;
                      const currentVal = r.attribute.scaleType === "word"
                        ? (r.wordValue && r.attribute.wordOptions ? getWordNumericEquivalent(r.wordValue, JSON.parse(r.attribute.wordOptions)) : 0)
                        : (r.numericValue || 0);
                      const pct = (currentVal / maxVal) * 100;

                      let initialVal: number | null = null;
                      if (evalDetail.evaluation.evaluationType === "progress" && initialEval) {
                        // We don't have initial eval ratings loaded here unless we fetch them
                        // This comparison will be shown in a future enhancement
                      }

                      return (
                        <div key={r.id} className="rounded-lg border p-3" data-testid={`rating-${r.id}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium">{r.attribute.name}</span>
                            <span className="text-sm font-bold text-primary">
                              {r.attribute.scaleType === "word" ? r.wordValue : `${r.numericValue}/${maxVal}`}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {r.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic" data-testid={`text-rating-notes-${r.id}`}>
                              {r.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <div className="pt-2 flex items-center gap-2">
                <Button
                  variant={evalDetail.evaluation.sharedWithPlayer ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    if (viewingEvalId) {
                      shareMutation.mutate({ id: viewingEvalId, shared: !evalDetail.evaluation.sharedWithPlayer });
                    }
                  }}
                  disabled={shareMutation.isPending}
                  data-testid="button-share-eval"
                >
                  {evalDetail.evaluation.sharedWithPlayer ? (
                    <><EyeOff className="w-3.5 h-3.5 mr-1" /> Unshare</>
                  ) : (
                    <><Share2 className="w-3.5 h-3.5 mr-1" /> Share with Player</>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { if (viewingEvalId) deleteEvalMutation.mutate(viewingEvalId); }}
                  disabled={deleteEvalMutation.isPending}
                  data-testid="button-delete-eval"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showAttrDialog} onOpenChange={(open) => { if (!open) resetAttrForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAttr?.isDefault ? "Edit Rating Scale" : editingAttr ? "Edit Attribute" : "Add Custom Attribute"}</DialogTitle>
            <DialogDescription>
              {editingAttr?.isDefault ? "Change the rating scale for this attribute" : editingAttr ? "Update this skill attribute" : "Create a new skill attribute for evaluations"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingAttr?.isDefault ? (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Attribute Name</Label>
                <Input value={attrName} disabled data-testid="input-attr-name" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Attribute Name</Label>
                  <Input
                    value={attrName}
                    onChange={e => setAttrName(e.target.value)}
                    placeholder="e.g., Free Throw Form"
                    data-testid="input-attr-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={attrCategory} onValueChange={setAttrCategory}>
                    <SelectTrigger data-testid="select-attr-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Rating Scale</Label>
              <Select value={attrScaleType} onValueChange={setAttrScaleType}>
                <SelectTrigger data-testid="select-attr-scale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1–10 (Numeric)</SelectItem>
                  <SelectItem value="1-5">1–5 (Numeric)</SelectItem>
                  <SelectItem value="word">Word Rating (maps to 1–5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {attrScaleType === "word" && (
              <div className="space-y-2">
                <Label>Word Options (comma-separated, ordered low to high)</Label>
                <Input
                  value={attrWordOptions}
                  onChange={e => setAttrWordOptions(e.target.value)}
                  placeholder="e.g., Needs Work, Developing, Solid, Strong, Elite"
                  data-testid="input-word-options"
                />
                <p className="text-xs text-muted-foreground">
                  Each word maps to a number: first word = 1, second = 2, etc.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAttrForm} data-testid="button-cancel-attr">Cancel</Button>
            <Button
              onClick={handleAttrSubmit}
              disabled={!attrName || createAttrMutation.isPending || updateAttrMutation.isPending}
              data-testid="button-save-attr"
            >
              {editingAttr ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAttrId} onOpenChange={(open) => { if (!open) setDeleteAttrId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attribute?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the attribute. Existing evaluations using it will keep their data, but new evaluations won't include it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-attr">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteAttrId) deleteAttrMutation.mutate(deleteAttrId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-attr"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
