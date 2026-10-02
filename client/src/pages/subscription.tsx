import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SubscriptionPage() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(`/profile-hub${window.location.search}`, { replace: true });
  }, [navigate]);

  return (
    <div className="p-6 text-center text-sm text-muted-foreground" role="status">
      Opening your plan on Profile…
    </div>
  );
}