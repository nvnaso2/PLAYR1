import { useQuery } from "@tanstack/react-query";

export function useFeatureFlags(): Record<string, boolean> {
  const { data } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/feature-flags"],
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
  return data ?? {};
}

export function useFeatureFlag(key: string): boolean {
  const flags = useFeatureFlags();
  return flags[key] ?? false;
}
