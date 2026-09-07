import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  DEFAULT_HUB_STAT_ORDER,
  HUB_STAT_ACCENTS,
  HUB_STAT_DEFINITIONS,
  HUB_STAT_STORAGE_KEY,
  readHubStatOrder,
  type HubStatKey,
  type HubStatOrder,
} from "@/lib/dashboard-stats";
import { Button } from "@/components/ui/button";

export default function HubStatCustomizePage() {
  const [location, navigate] = useLocation();
  const [draftStatOrder, setDraftStatOrder] = useState<HubStatOrder>(() => readHubStatOrder());
  const [saved, setSaved] = useState(false);
  const fromHub = location.includes("from=hub");
  const returnPath = fromHub ? "/hub" : "/progress";

  const toggleStat = (key: HubStatKey) => {
    setDraftStatOrder((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : current.length < 9
          ? [...current, key]
          : current
    ));
    setSaved(false);
  };

  const moveStat = (index: number, direction: -1 | 1) => {
    setDraftStatOrder((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setSaved(false);
  };

  const saveLayout = () => {
    if (draftStatOrder.length !== 9) return;
    localStorage.setItem(HUB_STAT_STORAGE_KEY, JSON.stringify(draftStatOrder));
    setSaved(true);
    navigate(returnPath);
  };

  const resetLayout = () => {
    setDraftStatOrder([...DEFAULT_HUB_STAT_ORDER]);
    setSaved(false);
  };

  const categories = Array.from(new Set(HUB_STAT_DEFINITIONS.map((stat) => stat.category)));

  return (
    <div className="min-h-full bg-background px-4 py-5 pb-8 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(returnPath)}
          className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          {fromHub ? "Back to Hub" : "Dashboard"}
        </button>

        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Hub layout</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Choose your stat cards</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-500">
              Pick nine stats, then place them into three categories of three. The Hub uses the categories as its small buttons.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                draftStatOrder.length === 9
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-500/10 text-amber-300"
              }`}
              data-testid="text-dashboard-stat-count"
            >
              {draftStatOrder.length} / 9 selected
            </span>
            <Button
              type="button"
              onClick={saveLayout}
              disabled={draftStatOrder.length !== 9}
              className="gap-1.5 bg-orange-500 text-black hover:bg-orange-400"
              data-testid="button-save-dashboard-stats"
            >
              <Check className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section aria-labelledby="available-stats-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id="available-stats-heading" className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-300">Available stats</h2>
                <p className="mt-1 text-xs text-zinc-600">Selected stats can be removed so you can replace them.</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{HUB_STAT_DEFINITIONS.length} total</span>
            </div>
            <div className="divide-y divide-zinc-800/80 border-y border-zinc-800">
              {categories.map((category) => (
                <div key={category} className="py-3">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-orange-400/70">{category}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {HUB_STAT_DEFINITIONS.filter((stat) => stat.category === category).map((stat) => {
                      const selectedIndex = draftStatOrder.indexOf(stat.key);
                      const selected = selectedIndex >= 0;
                      const unavailable = !selected && draftStatOrder.length >= 9;
                      return (
                        <button
                          key={stat.key}
                          type="button"
                          onClick={() => toggleStat(stat.key)}
                          disabled={unavailable}
                          aria-pressed={selected}
                          className={`flex min-h-[64px] items-start justify-between gap-3 rounded-lg border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                            selected
                              ? `${HUB_STAT_ACCENTS[stat.key].cardClass}`
                              : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                          } ${unavailable ? "cursor-not-allowed opacity-40" : ""}`}
                          data-testid={`button-dashboard-stat-${stat.key}`}
                        >
                          <span className="min-w-0">
                            <span className={`block text-xs font-bold ${selected ? HUB_STAT_ACCENTS[stat.key].textClass : "text-zinc-300"}`}>{stat.label}</span>
                            <span className="mt-1 block text-[10px] leading-snug text-zinc-600">{stat.description}</span>
                          </span>
                          <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider ${selected ? HUB_STAT_ACCENTS[stat.key].textClass : "text-zinc-600"}`}>
                            {selected ? `#${selectedIndex + 1}` : "Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="group-order-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id="group-order-heading" className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-300">Category order</h2>
                <p className="mt-1 text-xs text-zinc-600">The Hub buttons represent these three categories.</p>
              </div>
              <button
                type="button"
                onClick={resetLayout}
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                data-testid="button-reset-dashboard-stats"
              >
                Reset
              </button>
            </div>
            <div className="space-y-3">
              {[0, 1, 2].map((groupIndex) => (
                <div key={groupIndex} className="border-b border-zinc-800 pb-3 last:border-b-0" data-testid={`hub-stat-group-${groupIndex}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Category {groupIndex + 1}</p>
                    <span className="text-[10px] text-zinc-600">Hub button {groupIndex + 1}</span>
                  </div>
                  <div className="space-y-1.5">
                    {[0, 1, 2].map((offset) => {
                      const index = groupIndex * 3 + offset;
                      const key = draftStatOrder[index];
                      const definition = key && HUB_STAT_DEFINITIONS.find((stat) => stat.key === key);
                      return (
                        <div key={offset} className={`flex items-center gap-2 rounded-lg border p-2 ${definition ? HUB_STAT_ACCENTS[definition.key].cardClass : "border-zinc-800 bg-zinc-900/50"}`}>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-black text-zinc-500">{index + 1}</span>
                          <span className={`min-w-0 flex-1 truncate text-xs font-bold ${definition ? HUB_STAT_ACCENTS[definition.key].textClass : "text-zinc-600"}`}>
                            {definition?.label ?? "Empty slot"}
                          </span>
                          <button
                            type="button"
                            onClick={() => moveStat(index, -1)}
                            disabled={index === 0 || !key}
                            className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 text-zinc-500 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                            aria-label={`Move stat ${index + 1} up`}
                            data-testid={`button-move-stat-up-${index}`}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStat(index, 1)}
                            disabled={index >= draftStatOrder.length - 1 || !key}
                            className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 text-zinc-500 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                            aria-label={`Move stat ${index + 1} down`}
                            data-testid={`button-move-stat-down-${index}`}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {saved && (
          <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-400" role="status">
            <Check className="h-3.5 w-3.5" />
            Layout saved.
          </p>
        )}
      </div>
    </div>
  );
}