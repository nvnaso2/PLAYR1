import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

export function useGoogleCalendar() {
  const { toast } = useToast();
  const { user } = useAuth();
  const popupRef = useRef<Window | null>(null);

  const statusQuery = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google-calendar/status"],
    staleTime: 30000,
    enabled: !!user,
  });

  const [isConnecting, setIsConnecting] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/google-calendar/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/status"] });
      toast({ title: "Google Calendar disconnected" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to disconnect", description: error.message, variant: "destructive" });
    },
  });

  const addSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await apiRequest("POST", `/api/google-calendar/add-session/${sessionId}`, { timezone });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Added to Google Calendar",
        description: "Session has been added to your calendar.",
      });
      if (data.eventLink) {
        window.open(data.eventLink, "_blank");
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add to calendar", description: error.message, variant: "destructive" });
    },
  });

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "google-calendar-connected") {
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/status"] });
      toast({ title: "Google Calendar connected!" });
    }
  }, [toast]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const connect = useCallback(() => {
    setIsConnecting(true);
    popupRef.current = window.open("/api/google-calendar/connect", "google-calendar-auth", "width=600,height=700,scrollbars=yes");
    const checkClosed = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(checkClosed);
        setIsConnecting(false);
      }
    }, 500);
  }, []);

  return {
    isConnected: statusQuery.data?.connected ?? false,
    isLoading: statusQuery.isLoading,
    connect,
    disconnect: () => disconnectMutation.mutate(),
    addSession: (sessionId: string) => addSessionMutation.mutate(sessionId),
    isConnecting,
    isDisconnecting: disconnectMutation.isPending,
    isAddingSession: addSessionMutation.isPending,
  };
}
