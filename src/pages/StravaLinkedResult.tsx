import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { stravaConnectionQueryKey } from "@/hooks/useStravaConnection";

type Status = "idle" | "loading" | "success" | "error" | "missing";

export default function StravaLinkedResult() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      setStatus("missing");
      setMessage("Authorization details were not returned. Please try connecting again.");
      return;
    }

    let isMounted = true;
    setStatus("loading");
    setMessage(null);

    (async () => {
      console.log('[StravaLinkedResult] Calling edge function with code:', code?.substring(0, 10) + '...', 'state:', state?.substring(0, 10) + '...');

      const response = await supabase.functions.invoke("strava-oauth-exchange", {
        body: { code, state },
      });
      const { data, error } = response;

      // Log full response for debugging
      console.log('[StravaLinkedResult] Edge function response:', { data, error });

      // Try to extract detailed error from response context if available
      if (error) {
        try {
          // The error context may contain the actual JSON response
          const errorContext = (error as unknown as { context?: { json?: () => Promise<unknown> } })?.context;
          if (errorContext?.json) {
            const errorBody = await errorContext.json();
            console.error('[StravaLinkedResult] Error body:', errorBody);
          }
        } catch (parseErr) {
          console.warn('[StravaLinkedResult] Could not parse error body:', parseErr);
        }
      }

      if (!isMounted) return;

      if (error || (data && "error" in data)) {
        const reason =
          error?.message ?? (data && "error" in data ? String(data.error) : null);
        console.error('[StravaLinkedResult] Connection failed:', reason, error);
        setStatus("error");
        setMessage(reason ?? "We could not connect to Strava. Please try again.");
        toast({
          title: "Strava connection failed",
          description: reason ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }

      const linkedAthlete =
        data && typeof data === "object" && "athlete" in data && data.athlete
          ? String(data.athlete)
          : params.get("athlete");
      setAthleteId(linkedAthlete ?? null);

      setStatus("success");
      setMessage("Strava account connected successfully.");
      toast({
        title: "Strava connected",
        description: "Your workouts will sync automatically.",
      });

      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: stravaConnectionQueryKey(user.id) }).catch(
          (invalidateError) => {
            console.warn("Failed to invalidate Strava connection query:", invalidateError);
          },
        );
      }

      queryClient.invalidateQueries({ queryKey: ["activities"] }).catch((invalidateError) => {
        console.warn("Failed to invalidate activities query:", invalidateError);
      });

      setTimeout(() => {
        navigate("/my-athlete/overview", { replace: true });
      }, 1500);
    })().catch((invokeError: unknown) => {
      if (!isMounted) return;
      const reason =
        invokeError instanceof Error ? invokeError.message : "Unexpected error occurred.";
      setStatus("error");
      setMessage(reason);
      toast({
        title: "Strava connection failed",
        description: reason,
        variant: "destructive",
      });
    });

    return () => {
      isMounted = false;
    };
  }, [navigate, params, queryClient, toast, user?.id]);

  const renderBody = () => {
    switch (status) {
      case "loading":
        return <p>Connecting to Strava…</p>;
      case "success":
        return (
          <>
            <p>✅ Connected to Strava successfully.</p>
            {athleteId ? <p>Athlete ID: {athleteId}</p> : null}
            <p>Redirecting you back to your dashboard…</p>
          </>
        );
      case "missing":
        return (
          <>
            <p>⚠️ Missing authorization details.</p>
            <button
              type="button"
              onClick={() => navigate("/my-athlete/overview", { replace: true })}
            >
              Return to My Athlete
            </button>
          </>
        );
      case "error":
        return (
          <>
            <p>⚠️ Could not connect to Strava.</p>
            {message ? <p>{message}</p> : null}
            <button type="button" onClick={() => navigate("/my-athlete/overview", { replace: true })}>
              Return to My Athlete
            </button>
          </>
        );
      default:
        return <p>Preparing Strava connection…</p>;
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Strava Link</h1>
      {message && status !== "success" ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <div className="rounded-lg border border-border/60 bg-card/60 p-6 shadow-sm">{renderBody()}</div>
    </div>
  );
}
