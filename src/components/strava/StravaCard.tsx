import { KeyboardEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Activity, BarChart3, Play, Link as LinkIcon, Settings, ExternalLink } from "lucide-react";
import { useStravaConnection, stravaConnectionQueryKey } from "@/hooks/useStravaConnection";
import { useActivities } from "@/hooks/useActivities";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { prepareStravaAuthorizeUrl } from "@/utils/stravaAuth";
import { useUser } from "@/store/auth";
import StravaImportDialog from "@/components/strava/StravaImportDialog";
import {
  getActivityDescription,
  getAverageSpeedFromActivity,
  formatPaceFromSpeed,
  type StoredActivity,
} from "@/utils/stravaActivity";

interface StravaCardProps {
  className?: string;
}

type ActivityRecord = StoredActivity;

export function StravaCard({ className }: StravaCardProps) {
  const { data: connection, isLoading: connectionLoading } = useStravaConnection();
  const user = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "activities">("summary");
  const [showAll, setShowAll] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityToImport, setActivityToImport] = useState<ActivityRecord | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

  const handleActivitySelect = (activity: ActivityRecord) => {
    setSelectedActivity(activity);
    setActivityDialogOpen(true);
  };

  const resetSelectedActivity = () => {
    setSelectedActivity(null);
  };

  const { data: activities, isLoading: activitiesLoading } = useActivities({ enabled: activitiesLoaded, limit: 25 });
  const pendingImportActivities = useMemo(
    () => (activities ?? []).filter((activity) => !activity.imported_post_id),
    [activities],
  );
  const pendingImportCount = pendingImportActivities.length;
  const nextPendingActivity = pendingImportActivities[0] ?? null;

  const handleToggleCollapse = () => setCollapsed((prev) => !prev);

  const lastSync = useMemo(() => {
    if (!connection?.updated_at) return "Never";
    try {
      return format(new Date(connection.updated_at), "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Unknown";
    }
  }, [connection?.updated_at]);

  const summaryKpis = useMemo(() => {
    if (!activities || activities.length === 0) {
      return [
        { label: "This Week", value: "0 km" },
        { label: "Activities", value: "0" },
        { label: "Avg HR", value: "-" },
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
        if (activity.avg_hr) {
          hrTotal += activity.avg_hr;
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
      { label: "Avg HR", value: averageHr ? `${averageHr} bpm` : "-" },
    ];
  }, [activities]);

  const recentActivities = useMemo(() => {
    if (!activities) {
      return [];
    }
    return activities.slice(0, showAll ? 10 : 3);
  }, [activities, showAll]);

  const handleOpenImportDialog = useCallback((activity: ActivityRecord) => {
    setActivityDialogOpen(false);
    setActivityToImport(activity);
    setImportDialogOpen(true);
  }, []);

  const handleImportCompleted = useCallback(() => {
    setImportDialogOpen(false);
    setActivityToImport(null);
    void queryClient.invalidateQueries({ queryKey: ['activities'] });
    void queryClient.invalidateQueries({ queryKey: ['workouts'] });
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: ['my-athlete', userId] });
    } else {
      void queryClient.invalidateQueries({ queryKey: ['my-athlete'] });
    }
  }, [queryClient, userId]);

  const selectedActivityDetails = useMemo(() => {
    if (!selectedActivity) {
      return null;
    }

    const rawValue = selectedActivity.raw;
    const raw =
      typeof rawValue === "object" && rawValue !== null
        ? (rawValue as Record<string, unknown>)
        : {};

    const toNumber = (value: unknown) => {
      if (value === null || value === undefined) return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const toStringValue = (value: unknown) => (typeof value === "string" ? value : null);

    const startTime =
      selectedActivity.start_time ??
      toStringValue(raw["start_date"]) ??
      toStringValue(raw["start_date_local"]);
    const distanceMeters = toNumber(selectedActivity.distance_m ?? raw["distance"]);
    const movingTime = toNumber(selectedActivity.moving_time_s ?? raw["moving_time"]);
    const elapsedTime = toNumber(selectedActivity.elapsed_time_s ?? raw["elapsed_time"]);
    const avgHr = toNumber(selectedActivity.avg_hr ?? raw["average_heartrate"]);
    const maxHr = toNumber(selectedActivity.max_hr ?? raw["max_heartrate"]);
    const elevGain = toNumber(selectedActivity.elev_gain_m ?? raw["total_elevation_gain"]);
    const calories = toNumber(selectedActivity.calories ?? raw["kilojoules"] ?? raw["calories"]);
    const averageSpeed = getAverageSpeedFromActivity(selectedActivity);

    const subtitle = startTime ? format(new Date(startTime), "PPP p") : null;

    const metrics: { label: string; value: string }[] = [];

    const sport =
      selectedActivity.sport_type ??
      toStringValue(raw["sport_type"]) ??
      toStringValue(raw["type"]);
    if (sport) {
      metrics.push({ label: "Sport", value: String(sport) });
    }

    if (subtitle) {
      metrics.push({ label: "Start", value: subtitle });
    }

    if (distanceMeters !== null) {
      metrics.push({ label: "Distance", value: formatDistance(distanceMeters) });
    }

    if (movingTime) {
      metrics.push({ label: "Moving Time", value: formatDuration(movingTime) });
    }

    if (elapsedTime) {
      metrics.push({ label: "Elapsed Time", value: formatDuration(elapsedTime) });
    }

    if (averageSpeed) {
      metrics.push({ label: "Avg Pace", value: formatPace(averageSpeed) });
    }

    if (avgHr) {
      metrics.push({ label: "Avg Heart Rate", value: `${Math.round(avgHr)} bpm` });
    }

    if (maxHr) {
      metrics.push({ label: "Max Heart Rate", value: `${Math.round(maxHr)} bpm` });
    }

    if (elevGain) {
      metrics.push({ label: "Elevation Gain", value: formatElevation(elevGain) });
    }

    if (calories) {
      metrics.push({ label: "Calories", value: formatCalories(calories) });
    }

    const description = getActivityDescription(selectedActivity);

    const permalink = toStringValue(raw["permalink"]);
    const rawId = toNumber(raw["id"]);
    const stravaUrl = permalink ?? (rawId ? `https://www.strava.com/activities/${rawId}` : null);

    return {
      title: selectedActivity.name ?? toStringValue(raw["name"]) ?? "Strava activity",
      subtitle,
      metrics,
      description,
      stravaUrl,
    };
  }, [selectedActivity]);

  const detailMetrics = selectedActivityDetails?.metrics ?? [];

  const canToggleActivityView = !!activities && activities.length > 3;

  const handleConnect = async () => {
    try {
      const authorizeUrl = await prepareStravaAuthorizeUrl();
      window.location.href = authorizeUrl;
    } catch (error) {
      console.error("Failed to initiate Strava authorization:", error);
      toast({
        title: "Strava unavailable",
        description: error instanceof Error ? error.message : "Unable to start Strava authorization",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!userId) {
      toast({
        title: "Unable to disconnect",
        description: "Sign in to manage Strava connections.",
        variant: "destructive",
      });
      return;
    }

    try {
      const [{ error: oauthError }, { error: integrationError }] = await Promise.all([
        supabase
          .from("oauth_connections")
          .delete()
          .eq("provider", "strava")
          .eq("user_id", userId),
        supabase
          .from("athlete_integrations")
          .delete()
          .eq("athlete_id", userId)
          .eq("service", "strava"),
      ]);

      if (oauthError) throw oauthError;
      if (integrationError) throw integrationError;

      queryClient.setQueryData(stravaConnectionQueryKey(userId), null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stravaConnectionQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
      ]);

      toast({ title: "Disconnected from Strava" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast({
        title: "Error disconnecting",
        description: message,
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
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      const importedCount = data?.inserted ?? 0;
      toast({ title: "Import complete", description: `Added ${importedCount} new activities.` });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        userId
          ? queryClient.invalidateQueries({ queryKey: stravaConnectionQueryKey(userId) })
          : queryClient.invalidateQueries({ queryKey: ["connections"] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not import Strava activities.";
      const normalized = message.toLowerCase();
      const helpfulMessage = normalized.includes('failed to send a request to the edge function')
        ? 'Unable to reach the Supabase Edge Function. Make sure "import-strava-activities" is running locally (supabase start / supabase functions serve) or deployed via supabase functions deploy.'
        : message;

      if (message.toLowerCase().includes("strava authorization has expired")) {
        if (userId) {
          await queryClient.invalidateQueries({ queryKey: stravaConnectionQueryKey(userId) });
        } else {
          await queryClient.invalidateQueries({ queryKey: ["connections"] });
        }
      }

      toast({
        title: "Import failed",
        description: helpfulMessage,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
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
                Last sync: {connectionLoading ? "Loading..." : lastSync}
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
              {importing ? "Importing" : "Import"}
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
            {pendingImportCount > 0 && (
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {pendingImportCount === 1
                    ? '1 Strava workout is ready to import'
                    : `${pendingImportCount} Strava workouts ready to import`}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 px-3"
                    onClick={() => nextPendingActivity && handleOpenImportDialog(nextPendingActivity)}
                    disabled={!nextPendingActivity}
                  >
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3"
                    onClick={() => {
                      setCollapsed(false);
                      setActivitiesLoaded(true);
                      setActiveTab('activities');
                    }}
                  >
                    View list
                  </Button>
                </div>
              </div>
            )}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
              <TabsList className="mb-3 grid h-9 w-full grid-cols-2">
                <TabsTrigger value="summary" className="text-sm">
                  Summary
                </TabsTrigger>
                <TabsTrigger value="activities" className="text-sm">
                  Activities
                </TabsTrigger>
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
                    onSelect={handleActivitySelect}
                    onImport={handleOpenImportDialog}
                  />
                </Suspense>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

      <Dialog
        open={activityDialogOpen && Boolean(selectedActivityDetails)}
        onOpenChange={(open) => {
          setActivityDialogOpen(open);
          if (!open) {
            resetSelectedActivity();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          {selectedActivityDetails ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedActivityDetails.title}</DialogTitle>
                {selectedActivityDetails.subtitle ? (
                  <p className="text-sm text-muted-foreground">{selectedActivityDetails.subtitle}</p>
                ) : null}
              </DialogHeader>

              <div className="grid gap-3 py-2 text-sm">
                {detailMetrics.map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">{metric.label}</span>
                    <span className="font-medium text-right">{metric.value}</span>
                  </div>
                ))}
              </div>

              {selectedActivityDetails.description ? (
                <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  {selectedActivityDetails.description}
                </div>
              ) : null}

              {selectedActivityDetails.stravaUrl ? (
                <Button asChild variant="outline" size="sm" className="mt-3 w-full gap-2">
                  <a href={selectedActivityDetails.stravaUrl} target="_blank" rel="noopener noreferrer">
                    View on Strava
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              ) : null}

              {selectedActivity && (
                selectedActivity.imported_post_id ? (
                  <Badge variant="secondary" className="mt-3 w-full justify-center py-2 text-xs uppercase tracking-wide">
                    Already on timeline
                  </Badge>
                ) : (
                  <Button
                    className="mt-3 w-full"
                    onClick={() => handleOpenImportDialog(selectedActivity)}
                  >
                    Import to timeline
                  </Button>
                )
              )}
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Unable to load activity details.</div>
          )}
        </DialogContent>
      </Dialog>

      <StravaImportDialog
        activity={activityToImport}
        open={importDialogOpen && Boolean(activityToImport)}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setActivityToImport(null);
          }
        }}
        onImported={() => handleImportCompleted()}
      />
    </>
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
  onSelect,
  onImport,
}: {
  activities: ActivityRecord[];
  loading: boolean;
  allowToggle: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
  onSelect?: (activity: ActivityRecord) => void;
  onImport?: (activity: ActivityRecord) => void;
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

  const handleKeyDown = onSelect
    ? (activity: ActivityRecord) => (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(activity);
        }
      }
    : null;

  return (
    <div className="space-y-2">
      <div className={cn("space-y-2", showAll ? "max-h-80 overflow-auto pr-1" : "")}>
        {activities.map((activity) => {
          const isInteractive = typeof onSelect === "function";
          const key = activity.id ?? activity.external_id ?? activity.start_time ?? activity.name;
          const paceValue = formatPaceFromSpeed(getAverageSpeedFromActivity(activity));
          const imported = Boolean(activity.imported_post_id);
          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-3 rounded-md border border-border/40 bg-muted/30 px-3 py-2",
                isInteractive && "cursor-pointer transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              )}
              role={isInteractive ? "button" : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              onClick={isInteractive ? () => onSelect(activity) : undefined}
              onKeyDown={isInteractive && handleKeyDown ? handleKeyDown(activity) : undefined}
            >
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
                  {paceValue ? <span>{paceValue}</span> : null}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                <span>
                  {activity.start_time ? format(new Date(activity.start_time), "MMM d, yyyy") : "-"}
                </span>
                {imported ? (
                  <Badge variant="outline" className="px-2 py-0 text-[10px] uppercase tracking-wide">
                    On timeline
                  </Badge>
                ) : onImport ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary"
                    onClick={(event) => {
                      event.stopPropagation();
                      onImport(activity);
                    }}
                  >
                    Import
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {allowToggle && (
        <Button variant="ghost" size="sm" className="h-8 w-full" onClick={onToggleShowAll}>
          {showAll ? "Show less" : "Show all"}
        </Button>
      )}
    </div>
  );
}

function formatDistance(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  const distance = Number(value);
  if (!Number.isFinite(distance)) {
    return "-";
  }

  if (distance <= 0) {
    return "0 m";
  }

  if (distance >= 1000) {
    const kilometers = distance / 1000;
    const precision = kilometers >= 100 ? 0 : kilometers >= 10 ? 1 : 2;
    return `${kilometers.toFixed(precision)} km`;
  }

  return `${Math.round(distance)} m`;
}

function formatElevation(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${Math.round(value)} m`;
}

function formatCalories(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${Math.round(value)} kcal`;
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
    return "-";
  }
  const paceSeconds = 1000 / speedMps;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  const secondsString = seconds.toString().padStart(2, "0");
  return minutes + ":" + secondsString + " /km";
}

export default StravaCard;
