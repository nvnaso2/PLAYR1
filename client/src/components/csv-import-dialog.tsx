import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, AlertCircle, ChevronRight, Download, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Season = { id: string; name: string; year: string; teamName: string | null; seasonType: string };

type GameField = {
  key: string;
  label: string;
  required?: boolean;
  type: "date" | "text" | "number" | "result" | "home" | "score";
};

const GAME_FIELDS: GameField[] = [
  { key: "gameDate", label: "Game Date", required: true, type: "date" },
  { key: "opponent", label: "Opponent", type: "text" },
  { key: "result", label: "Result (W/L)", type: "result" },
  { key: "teamScore", label: "Team Score", type: "score" },
  { key: "opponentScore", label: "Opp Score", type: "score" },
  { key: "isHome", label: "Home/Away", type: "home" },
  { key: "points", label: "Points", type: "number" },
  { key: "rebounds", label: "Rebounds", type: "number" },
  { key: "assists", label: "Assists", type: "number" },
  { key: "steals", label: "Steals", type: "number" },
  { key: "blocks", label: "Blocks", type: "number" },
  { key: "turnovers", label: "Turnovers", type: "number" },
  { key: "fouls", label: "Fouls", type: "number" },
  { key: "fgMade", label: "FG Made", type: "number" },
  { key: "fgAttempted", label: "FG Attempted", type: "number" },
  { key: "threePtMade", label: "3PT Made", type: "number" },
  { key: "threePtAttempted", label: "3PT Attempted", type: "number" },
  { key: "ftMade", label: "FT Made", type: "number" },
  { key: "ftAttempted", label: "FT Attempted", type: "number" },
  { key: "offensiveRebounds", label: "Off Rebounds", type: "number" },
  { key: "defensiveRebounds", label: "Def Rebounds", type: "number" },
  { key: "minutesPlayed", label: "Minutes", type: "number" },
  { key: "notes", label: "Notes", type: "text" },
];

const COLUMN_ALIASES: Record<string, string[]> = {
  gameDate: ["date", "game date", "game_date", "gamdate", "day"],
  opponent: ["opponent", "opp", "vs", "vs.", "against", "team"],
  result: ["result", "w/l", "win/loss", "outcome", "wl"],
  teamScore: ["score", "team score", "team_score", "pts scored", "our score", "us"],
  opponentScore: ["opp score", "opp_score", "opponent score", "their score", "them", "against score"],
  isHome: ["home", "away", "location", "home/away"],
  points: ["pts", "points", "pts.", "pt", "p"],
  rebounds: ["reb", "rebounds", "reb.", "total reb", "total rebounds", "tot reb"],
  assists: ["ast", "assists", "ast.", "ass", "a"],
  steals: ["stl", "steals", "stl.", "st"],
  blocks: ["blk", "blocks", "blk.", "bl"],
  turnovers: ["to", "turnovers", "t/o", "tov", "turn"],
  fouls: ["pf", "fouls", "foul", "personal fouls", "pf."],
  fgMade: ["fgm", "fg made", "fg_made", "field goals", "fgm.", "fg", "makes"],
  fgAttempted: ["fga", "fg att", "fg_att", "fg attempted", "fga.", "fg_attempted", "attempts"],
  threePtMade: ["3pm", "3p made", "3pt made", "three pt made", "3fg", "3pt", "3p", "threes", "3 pt made"],
  threePtAttempted: ["3pa", "3p att", "3pt att", "three pt att", "3fga", "3p attempted", "3 pt att"],
  ftMade: ["ftm", "ft made", "ft_made", "free throw made", "ft", "free throws"],
  ftAttempted: ["fta", "ft att", "ft_att", "ft attempted", "fta.", "free throw att"],
  offensiveRebounds: ["oreb", "off reb", "offensive reb", "offensive rebounds", "off_reb", "o reb"],
  defensiveRebounds: ["dreb", "def reb", "defensive reb", "defensive rebounds", "def_reb", "d reb"],
  minutesPlayed: ["min", "minutes", "mins", "minutes played", "min.", "mp"],
  notes: ["notes", "note", "comments", "memo", "remarks"],
};

function detectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  for (const field of GAME_FIELDS) {
    const aliases = COLUMN_ALIASES[field.key] || [field.key.toLowerCase()];
    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const normalized = header.toLowerCase().trim();
      if (aliases.some(alias => normalized === alias || normalized.includes(alias) || alias.includes(normalized))) {
        mapping[field.key] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  return mapping;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

function coerceValue(raw: string, field: GameField): unknown {
  const v = raw?.trim() ?? "";
  if (!v) return field.type === "number" || field.type === "score" ? 0 : null;

  switch (field.type) {
    case "number":
    case "score": {
      const n = parseInt(v.replace(/[^0-9-]/g, ""), 10);
      return isNaN(n) ? 0 : n;
    }
    case "result": {
      const upper = v.toUpperCase();
      if (upper === "W" || upper === "WIN" || upper === "1") return "W";
      if (upper === "L" || upper === "LOSS" || upper === "0") return "L";
      return null;
    }
    case "home": {
      const lower = v.toLowerCase();
      if (lower === "home" || lower === "h" || lower === "true" || lower === "1") return true;
      return false;
    }
    case "date": {
      const parsed = new Date(v);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    default:
      return v || null;
  }
}

function rowToGame(row: string[], headers: string[], mapping: Record<string, string>): Record<string, unknown> {
  const game: Record<string, unknown> = {};
  for (const field of GAME_FIELDS) {
    const colHeader = mapping[field.key];
    if (!colHeader) continue;
    const idx = headers.indexOf(colHeader);
    if (idx === -1) continue;
    const raw = row[idx] ?? "";
    const value = coerceValue(raw, field);
    if (value !== null && value !== undefined) {
      game[field.key] = value;
    }
  }
  return game;
}

const TEMPLATE_CSV = `Date,Opponent,Result,Team Score,Opp Score,Home,PTS,REB,AST,STL,BLK,TO,PF,FGM,FGA,3PM,3PA,FTM,FTA,OREB,DREB,MIN,Notes
2024-11-15,Central High,W,72,58,Home,24,8,5,2,1,3,2,9,18,3,7,3,4,2,6,28,Great game
2024-11-22,West Academy,L,61,67,Away,18,6,7,1,0,4,3,7,16,2,5,2,2,1,5,30,`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "playr1_game_stats_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Step = "upload" | "map" | "preview" | "import";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CsvImportDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [importProgress, setImportProgress] = useState(0);

  const { data: seasons = [] } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });

  const importMutation = useMutation({
    mutationFn: async (games: Record<string, unknown>[]) => {
      const res = await apiRequest("POST", `/api/seasons/${selectedSeasonId}/games/bulk`, { games });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      queryClient.invalidateQueries({ queryKey: [`/api/seasons/${selectedSeasonId}/games`] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/career"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/overview"] });
      toast({
        title: "Import complete",
        description: `Successfully imported ${data.imported} game${data.imported !== 1 ? "s" : ""}${data.skipped ? `. ${data.skipped} row(s) skipped.` : ""}.`,
      });
      handleClose();
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSelectedSeasonId("");
    setFileName("");
    setImportProgress(0);
    onOpenChange(false);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast({ title: "Invalid file", description: "Please upload a .csv file", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0) {
        toast({ title: "Empty file", description: "The CSV file appears to be empty", variant: "destructive" });
        return;
      }
      setHeaders(h);
      setRows(r.filter(row => row.some(cell => cell.trim())));
      setMapping(detectMapping(h));
      setStep("map");
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const previewGames = rows.slice(0, 5).map(row => rowToGame(row, headers, mapping));
  const allGames = rows.map(row => rowToGame(row, headers, mapping)).filter(g => g.gameDate);
  const skippedCount = rows.length - allGames.length;

  const handleImport = async () => {
    if (!selectedSeasonId) {
      toast({ title: "Select a season", description: "Choose which season to import games into", variant: "destructive" });
      return;
    }
    setImportProgress(10);
    const interval = setInterval(() => setImportProgress(p => Math.min(p + 15, 85)), 300);
    await importMutation.mutateAsync(allGames);
    clearInterval(interval);
    setImportProgress(100);
  };

  const mappedCount = Object.keys(mapping).filter(k => mapping[k]).length;
  const requiredMapped = !!mapping["gameDate"];

  const stepLabels: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map Columns" },
    { key: "preview", label: "Preview" },
    { key: "import", label: "Import" },
  ];
  const stepIndex = stepLabels.findIndex(s => s.key === step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Import Game Stats from CSV
          </DialogTitle>
          <DialogDescription>
            Import your game statistics from Hudl, MaxPreps, or any CSV export
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4">
          {stepLabels.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors",
                i < stepIndex ? "text-primary" : i === stepIndex ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}>
                {i < stepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full border text-[10px]">{i + 1}</span>}
                {s.label}
              </div>
              {i < stepLabels.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              data-testid="dropzone-csv"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Drop your CSV file here or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports exports from Hudl, MaxPreps, StatCrew, or any spreadsheet</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
                data-testid="input-csv-file"
              />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
              <Download className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Need a template?</p>
                <p className="text-xs text-muted-foreground">Download a sample CSV with all supported columns pre-filled</p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
                Download
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Supported column headers (auto-detected):</p>
              <p>Date, Opponent, Result, Score, PTS, REB, AST, STL, BLK, TO, PF, FGM/FGA, 3PM/3PA, FTM/FTA, OREB, DREB, MIN, and more</p>
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{headers.length} columns</span> detected in <span className="font-medium text-foreground">{fileName}</span>, <span className="font-medium text-foreground">{rows.length} rows</span> of data
              </p>
              <Badge variant="outline">{mappedCount} fields mapped</Badge>
            </div>
            <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
              {GAME_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3 px-3 py-2">
                  <div className="w-32 shrink-0">
                    <span className="text-sm font-medium">{field.label}</span>
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </div>
                  <Select
                    value={mapping[field.key] || "__none__"}
                    onValueChange={(val) => setMapping(prev => ({ ...prev, [field.key]: val === "__none__" ? "" : val }))}
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid={`select-map-${field.key}`}>
                      <SelectValue placeholder="— skip —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— skip —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping[field.key] && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                </div>
              ))}
            </div>
            {!requiredMapped && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                Game Date column is required. Please map it to continue.
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("upload")} className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1"
                disabled={!requiredMapped}
                onClick={() => setStep("preview")}
                data-testid="button-next-preview"
              >
                Preview Import <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing first {Math.min(5, allGames.length)} of <span className="font-medium text-foreground">{allGames.length} valid games</span>
                {skippedCount > 0 && <span className="text-amber-500 ml-1">({skippedCount} rows will be skipped — missing date)</span>}
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Opponent</th>
                    <th className="text-left p-2 font-medium">Result</th>
                    <th className="text-left p-2 font-medium">PTS</th>
                    <th className="text-left p-2 font-medium">REB</th>
                    <th className="text-left p-2 font-medium">AST</th>
                    <th className="text-left p-2 font-medium">STL</th>
                    <th className="text-left p-2 font-medium">BLK</th>
                  </tr>
                </thead>
                <tbody>
                  {previewGames.filter(g => g.gameDate).map((game, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2">{game.gameDate ? new Date(game.gameDate as string).toLocaleDateString() : "—"}</td>
                      <td className="p-2">{(game.opponent as string) || "—"}</td>
                      <td className="p-2">
                        {game.result ? (
                          <Badge variant={game.result === "W" ? "default" : "destructive"} className="text-[10px] px-1 py-0">
                            {game.result as string}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="p-2 font-medium">{game.points ?? 0}</td>
                      <td className="p-2">{game.rebounds ?? 0}</td>
                      <td className="p-2">{game.assists ?? 0}</td>
                      <td className="p-2">{game.steals ?? 0}</td>
                      <td className="p-2">{game.blocks ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {allGames.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>No valid rows found. Make sure the Date column is correctly mapped.</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("map")} className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1"
                disabled={allGames.length === 0}
                onClick={() => setStep("import")}
                data-testid="button-next-import"
              >
                Continue to Import <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "import" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Import Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Games to import</div>
                <div className="font-medium">{allGames.length}</div>
                {skippedCount > 0 && <>
                  <div className="text-muted-foreground">Rows skipped</div>
                  <div className="text-amber-500 font-medium">{skippedCount}</div>
                </>}
                <div className="text-muted-foreground">Fields mapped</div>
                <div className="font-medium">{mappedCount}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Import into season</label>
              <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                <SelectTrigger data-testid="select-season-import">
                  <SelectValue placeholder="Choose a season..." />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.year}{s.teamName ? ` (${s.teamName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {seasons.length === 0 && (
                <p className="text-xs text-muted-foreground">No seasons yet. Create a season first from the Stats tab, then come back to import.</p>
              )}
            </div>

            {importMutation.isPending && (
              <div className="space-y-2">
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">Importing {allGames.length} games…</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("preview")} className="flex items-center gap-1" disabled={importMutation.isPending}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1"
                disabled={!selectedSeasonId || allGames.length === 0 || importMutation.isPending}
                onClick={handleImport}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? "Importing…" : `Import ${allGames.length} Games`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
