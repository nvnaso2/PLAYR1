export type ShotSuggestion = {
  startSeconds: number;
  endSeconds: number;
  result: "possible_make" | "possible_miss" | "uncertain";
  reason: string;
};

export type ManualHoopLocation = {
  x: number;
  y: number;
};
