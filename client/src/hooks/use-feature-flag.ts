import { useQuery } from "@tanstack/react-query";

export function useFeatureFlags(): Record<string, boolean> {
  const { data } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/feature-flags"],
    staleTime: 5 * 60 * 1000,
  });
  return data ?? {};
}

export function useFeatureFlag(key: string): boolean {
  const flags = useFeatureFlags();
  return flags[key] ?? false;
}
