type PlayerProfileLink = {
  userId: string;
  profileSlug?: string | null;
};

export function playerProfileHref(player: PlayerProfileLink) {
  const returnTo = typeof window !== "undefined"
    ? `${window.location.pathname}${window.location.search}`
    : "/community";
  return `/player/${player.profileSlug || player.userId}?returnTo=${encodeURIComponent(returnTo)}`;
}