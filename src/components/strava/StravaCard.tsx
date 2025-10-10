import { useEffect, useMemo, useState, Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Activity, BarChart3, Play, Link as LinkIcon, Settings } from "lucide-react";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { useActivities } from "@/hooks/useActivities";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface StravaCardProps {
  className?: string;
}

// Compact Strava card replaces the legacy tall block and defers heavy fetches until the user expands the section.
export function StravaCard({ className }: StravaCardProps) {
  const { data: connection, isLoading: connectionLoading } = useStravaConnection();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "activities">("summary");
  const [showAll, setShowAll] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("strava-card-collapsed") : null;
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("strava-card-collapsed", collapsed ? "true" : "false");
    }
  }, [collapsed]);

  useEffect(() => {
    if (activeTab === "activities" && !activitiesLoaded) {
      setActivitiesLoaded(true);
    }
  }, [activeTab, activitiesLoaded]);

  useEffect(() => {
    if (!collapsed) {
      setActivitiesLoaded(true);
    }
  }, [collapsed]);

  const { data: activities, isLoading: activitiesLoading } = useActivities({ enabled: activitiesLoaded, limit: 25 });

  const handleToggleCollapse = () => setCollapsed((prev) => !prev);

  const lastSync = useMemo(() => {
    if (!connection?.updated_at) return "Never";
    try {
      return format(new Date(connection.updated_at), "MMM d • h:mm a");
    } catch (error) {
      return "Unknown";
    }
  }, [connection?.updated_at]);

  const summaryKpis = useMemo(() => {
    if (!activities || activities.length === 0) {
      return [
        { label: "This Week", value: "0 km" },
        { label: "Activities", value: "0" },
        { label: "Avg HR", value: "—" },
      ];
    }

    const now = new Date();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    let distance = 0;
    let hrTotal = 0;
    let hrCount = 0;
    let count = 0;

    activities.forEach((activity) => {
      if (!activity.start_time) {
        return;
      }
      const start = new Date(activity.start_time);
      const diff = now.getTime() - start.getTime();
      if (diff >= 0 && diff <= weekMs) {
        distance += activity.distance_m || 0;
        if (activity.average_heartrate) {
          hrTotal += activity.average_heartrate;
          hrCount += 1;
        }
        count += 1;
      }
    });

    const averageHr = hrCount > 0 ? Math.round(hrTotal / hrCount) : null;
    const distanceKm = (distance / 1000).toFixed(1) + " km";

    return [
      { label: "This Week", value: distanceKm },
      { label: "Activities", value: String(count) },
      { label: "Avg HR", value: averageHr ? averageHr + " bpm" : "—" },
    ];
  }, [activities]);

  const recentActivities = useMemo(() => {
    if (!activities) {
      return [];
    }
    return activities.slice(0, showAll ? 10 : 3);
  }, [activities, showAll]);

  const canToggleActivityView = !!activities && activities.length > 3;

  const handleConnect = () => {
    const redirectUri = window.location.origin + "/strava/callback";
    const scope = "read,activity:read_all";
    const clientId = "172877";
    const url = "https://www.strava.com/oauth/authorize?client_id=" +
      clientId +
      "&response_type=code&redirect_uri=" + encodeURIComponent(redirectUri) +
      "&approval_prompt=force&scope=" + scope;
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    try {
      await supabase.from("oauth_connections").delete().eq("provider", "strava");
      toast({ title: "Disconnected from Strava" });
      queryClient.invalidateQueries({ queryKey: ["strava-connection"] });
    } catch (error: any) {
      toast({
        title: "Error disconnecting",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        throw new Error("Please sign in to import.");
      }
      const { data, error } = await supabase.functions.invoke("import-strava-activities", {
        headers: {
          Authorization: "Bearer " + session.access_token,
        },
      });
      if (error) {
        throw error;
      }
      const importedCount = data?.inserted ?? 0;
      toast({ title: "Import complete", description: "Added " + importedCount + " new activities." });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error?.message || "Could not import Strava activities.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className={cn("bg-card/60 border-border/60", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/60 text-muted-foreground hover:bg-background"
            aria-label={collapsed ? "Expand Strava card" : "Collapse Strava card"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="flex items-center gap-1">
                <LinkIcon className="h-4 w-4" />
                Strava Training
              </span>
              <Badge variant={connection ? "default" : "secondary"} className="text-xs">
                {connection ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Last sync: {connectionLoading ? "Loading…" : lastSync}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={handleImport}
            disabled={importing || !connection}
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            Import
          </Button>
          {connection ? (
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleConnect}>
              Connect
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 px-2" disabled>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="px-4 pb-4 pt-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="mb-3 grid w-full grid-cols-2 h-9">
              <TabsTrigger value="summary" className="text-sm">Summary</TabsTrigger>
              <TabsTrigger value="activities" className="text-sm">Activities</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-0">
              <div className="grid gap-2 sm:grid-cols-3">
                {summaryKpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                  >
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-sm font-semibold leading-tight">{kpi.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="activities" className="mt-0">
              <Suspense fallback={<ActivitiesSkeleton rows={3} />}>
                <ActivitiesList
                  activities={recentActivities}
                  loading={activitiesLoading}
                  allowToggle={canToggleActivityView}
                  showAll={showAll}
                  onToggleShowAll={() => setShowAll((prev) => !prev)}
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

function ActivitiesSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-md border border-border/40 bg-muted/30 px-3 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

function ActivitiesList({
  activities,
  loading,
  allowToggle,
  showAll,
  onToggleShowAll,
}: {
  activities: any[];
  loading: boolean;
  allowToggle: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  if (loading) {
    return <ActivitiesSkeleton rows={3} />;
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-border/40 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        No Strava activities found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={cn("space-y-2", showAll ? "max-h-80 overflow-auto pr-1" : "")}>
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-3 rounded-md border border-border/40 bg-muted/30 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">
                {activity.name || "Strava activity"}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {activity.distance_m ? <span>{(activity.distance_m / 1000).toFixed(1)} km</span> : null}
                {activity.moving_time_s ? <span>{formatDuration(activity.moving_time_s)}</span> : null}
                {activity.average_speed ? <span>{formatPace(activity.average_speed)}</span> : null}
              </div>
            </div>
            <div className="whitespace-nowrap text-xs text-muted-foreground">
              {activity.start_time ? format(new Date(activity.start_time), "MMM d") : "—"}
            </div>
          </div>
        ))}
      </div>
      {allowToggle && (
        <Button variant="ghost" size="sm" className="h-8 w-full" onClick={onToggleShowAll}>
          {showAll ? "Show less" : "Show all"}
        </Button>
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return hours + "h " + remainingMinutes + "m";
  }
  return minutes + "m";
}

function formatPace(speedMps: number) {
  if (!speedMps || speedMps <= 0) {
    return "—";
  }
  const paceSeconds = 1000 / speedMps;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  const secondsString = seconds.toString().padStart(2, "0");
  return minutes + ":" + secondsString + " /km";
}

export default StravaCard;
