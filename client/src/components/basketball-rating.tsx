import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

function BasketballIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("w-5 h-5 transition-colors", className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M 2 12 Q 12 8 22 12" />
      <path d="M 2 12 Q 12 16 22 12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  );
}

interface BasketballRatingProps {
  drillId: string;
  size?: "sm" | "md";
  showCount?: boolean;
  interactive?: boolean;
}

interface RatingData {
  userRating: number | null;
  averageRating: number;
  totalRatings: number;
}

export function BasketballRating({ drillId, size = "md", showCount = true, interactive = true }: BasketballRatingProps) {
  const { user } = useAuth();
  const [hoverRating, setHoverRating] = useState(0);

  const { data: ratingData } = useQuery<RatingData>({
    queryKey: ['/api/drills', drillId, 'rating'],
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await apiRequest("POST", `/api/drills/${drillId}/rating`, { rating });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills', drillId, 'rating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drill-ratings'] });
    },
  });

  const userRating = ratingData?.userRating ?? 0;
  const averageRating = ratingData?.averageRating ?? 0;
  const totalRatings = ratingData?.totalRatings ?? 0;
  const displayRating = hoverRating || userRating || Math.round(averageRating);

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  const handleClick = (rating: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!interactive || !user) return;
    rateMutation.mutate(rating);
  };

  return (
    <div
      className="flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setHoverRating(0)}
      data-testid={`rating-container-${drillId}`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={cn(
              "p-0 border-0 bg-transparent cursor-pointer transition-transform",
              interactive && user ? "hover:scale-110" : "cursor-default",
              displayRating >= star ? "text-orange-500" : "text-muted-foreground/30"
            )}
            onMouseEnter={() => interactive && user && setHoverRating(star)}
            onClick={(e) => handleClick(star, e)}
            disabled={!interactive || !user || rateMutation.isPending}
            data-testid={`rating-ball-${drillId}-${star}`}
          >
            <BasketballIcon filled={displayRating >= star} className={iconSize} />
          </button>
        ))}
      </div>
      {showCount && totalRatings > 0 && (
        <span className="text-xs text-muted-foreground" data-testid={`rating-info-${drillId}`}>
          {averageRating.toFixed(1)} ({totalRatings})
        </span>
      )}
    </div>
  );
}

interface StaticBasketballRatingProps {
  averageRating: number;
  totalRatings: number;
  size?: "sm" | "md";
}

export function StaticBasketballRating({ averageRating, totalRatings, size = "sm" }: StaticBasketballRatingProps) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  const roundedRating = Math.round(averageRating);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <BasketballIcon
            key={star}
            filled={roundedRating >= star}
            className={cn(
              iconSize,
              roundedRating >= star ? "text-orange-500" : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
      {totalRatings > 0 && (
        <span className="text-xs text-muted-foreground">
          {averageRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
