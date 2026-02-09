import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Play, Link as LinkIcon, ExternalLink, ChevronDown, History } from "lucide-react";
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
  getAverageSpeedFromActivity,
  type StoredActivity,
} from "@/utils/stravaActivity";

interface StravaCardProps {
  className?: string;
}

type ActivityRecord = StoredActivity;



function SyncAction({
  onSync,
  importing,
  lastSync,
  className
}: {
  onSync: (deep: boolean) => void;
  importing: boolean;
  lastSync?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSync(false)}
        disabled={importing}
        className="gap-2 h-8"
      >
        <Play className={cn("h-3.5 w-3.5", importing && "animate-spin")} />
        {importing ? 'Syncing...' : 'Sync'}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={importing} className="px-2 h-8 w-6">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onSync(true)}>
            <History className="mr-2 h-4 w-4" />
            Sync last 3 months
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function StravaCard({ className }: StravaCardProps) {
  const { data: connection, isLoading: connectionLoading } = useStravaConnection();
  const user = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityToImport, setActivityToImport] = useState<ActivityRecord | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());

  const { data: activities, isLoading: activitiesLoading } = useActivities({ enabled: !!connection, limit: 300 });
  const pendingImportActivities = useMemo(
    () => (activities ?? []).filter((activity) => !activity.imported_post_id),
    [activities],
  );
  const pendingImportCount = pendingImportActivities.length;

  const lastSync = useMemo(() => {
    if (!connection?.updated_at) return "Never";
    try {
      return format(new Date(connection.updated_at), "MMM d, h:mm a");
    } catch (error) {
      return "Unknown";
    }
  }, [connection?.updated_at]);

  const handleActivitySelect = (activity: ActivityRecord) => {
    setSelectedActivity(activity);
    setActivityDialogOpen(true);
  };

  const resetSelectedActivity = () => {
    setSelectedActivity(null);
  };

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

      setSelectionModalOpen(false);
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

  const handleSync = async (deepSync = false) => {
    setImporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        throw new Error("Please sign in to import.");
      }

      // Calculate 3 months ago for deep sync
      let body = {};
      if (deepSync) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        body = { after_timestamp: threeMonthsAgo.toISOString() };
      }

      const response = await supabase.functions.invoke("import-strava-activities", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body,
      });

      const { data, error } = response;

      if (error) {
        try {
          const errorContext = (error as unknown as { context?: { json?: () => Promise<unknown> } })?.context;
          if (errorContext?.json) {
            const errorBody = await errorContext.json();
            const detailedError = (errorBody as { error?: string })?.error;
            if (detailedError) {
              throw new Error(detailedError);
            }
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== error.message) {
            throw parseErr;
          }
        }
        throw error;
      }

      const importedCount = data?.saved ?? data?.inserted ?? 0;
      toast({ title: "Sync complete", description: `Added ${importedCount} new activities.` });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        userId
          ? queryClient.invalidateQueries({ queryKey: stravaConnectionQueryKey(userId) })
          : queryClient.invalidateQueries({ queryKey: ["connections"] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sync Strava activities.";
      toast({
        title: "Sync failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleToggleWorkout = (activityKey: string) => {
    setSelectedWorkouts(prev => {
      const next = new Set(prev);
      if (next.has(activityKey)) {
        next.delete(activityKey);
      } else {
        next.add(activityKey);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedWorkouts.size === pendingImportActivities.length) {
      setSelectedWorkouts(new Set());
    } else {
      setSelectedWorkouts(new Set(pendingImportActivities.map(a => getActivityKey(a))));
    }
  };

  const handleImportSelected = async () => {
    const toImport = pendingImportActivities.filter(a => selectedWorkouts.has(getActivityKey(a)));
    if (toImport.length === 0) return;

    // Import selected workouts one by one via the existing dialog flow
    if (toImport.length === 1) {
      handleOpenImportDialog(toImport[0]);
    } else {
      // For multiple, we open the first one (user can import sequentially)
      handleOpenImportDialog(toImport[0]);
    }
    setSelectionModalOpen(false);
  };

  const getActivityKey = (activity: ActivityRecord): string => {
    const key = activity.id ?? activity.external_id ?? activity.start_time ?? activity.name ?? '';
    return String(key);
  };

  // Disconnected state
  if (!connection && !connectionLoading) {
    return (
      <Card className={cn("bg-card/60 border-border/60", className)} data-tour="strava-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#FC4C02]/10 flex items-center justify-center">
                <LinkIcon className="h-5 w-5 text-[#FC4C02]" />
              </div>
              <div>
                <p className="text-sm font-medium">Connect Strava</p>
                <p className="text-xs text-muted-foreground">Import your workouts</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleConnect}>
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (connectionLoading) {
    return (
      <Card className={cn("bg-card/60 border-border/60", className)} data-tour="strava-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected state - compact 2-line view
  return (
    <>
      <Card className={cn("bg-card/60 border-border/60", className)} data-tour="strava-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Strava Connected
                </p>
                <p className="text-xs text-muted-foreground">
                  {activitiesLoading ? 'Loading...' : `${pendingImportCount} workouts ready`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SyncAction onSync={handleSync} importing={importing} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionModalOpen(true)}
                disabled={activitiesLoading}
                className="h-8"
              >
                View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Modal */}
      <Dialog open={selectionModalOpen} onOpenChange={setSelectionModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import from Strava</DialogTitle>
          </DialogHeader>

          {/* Workout list */}
          <div className="flex-1 overflow-y-auto py-2 -mx-6 px-6">
            {activitiesLoading ? (
              <ActivitiesSkeleton rows={5} />
            ) : !activities || activities.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No workouts found. Tap Sync to fetch from Strava.
              </div>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 300).map((activity) => {
                  const key = getActivityKey(activity);
                  const isImported = Boolean(activity.imported_post_id);
                  const isSelected = selectedWorkouts.has(key);
                  const relativeDate = activity.start_time
                    ? formatRelativeDate(new Date(activity.start_time))
                    : '';
                  const distance = activity.distance_m
                    ? `${(activity.distance_m / 1000).toFixed(1)}km`
                    : null;
                  const duration = activity.moving_time_s
                    ? formatDuration(activity.moving_time_s)
                    : null;

                  if (isImported) {
                    // Already imported - show with green indicator, not clickable
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5"
                      >
                        <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-emerald-500">✓</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.name || activity.sport_type || 'Workout'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[distance, duration, relativeDate].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                          Imported
                        </Badge>
                      </div>
                    );
                  }

                  // Not imported - show with checkbox
                  return (
                    <button
                      key={key}
                      onClick={() => handleToggleWorkout(key)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/40 bg-muted/20 hover:bg-muted/40"
                      )}
                    >
                      <div className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      )}>
                        {isSelected && <span className="text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.name || activity.sport_type || 'Workout'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[distance, duration, relativeDate].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {pendingImportActivities.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedWorkouts.size === pendingImportActivities.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                size="sm"
                onClick={handleImportSelected}
                disabled={selectedWorkouts.size === 0}
              >
                Import ({selectedWorkouts.size})
              </Button>
            </div>
          )}

          {/* Footer - sync and disconnect */}
          <div className="pt-4 border-t mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last sync: {lastSync}</span>
              <div className="flex items-center gap-1">
                <SyncAction onSync={handleSync} importing={importing} />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-destructive"
              onClick={handleDisconnect}
            >
              Disconnect Strava
            </Button>
          </div>
        </DialogContent>
      </Dialog >

      {/* Activity detail dialog */}
      < Dialog
        open={activityDialogOpen && Boolean(selectedActivity)
        }
        onOpenChange={(open) => {
          setActivityDialogOpen(open);
          if (!open) {
            resetSelectedActivity();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          {selectedActivity && (
            <ActivityDetailContent
              activity={selectedActivity}
              onImport={() => handleOpenImportDialog(selectedActivity)}
            />
          )}
        </DialogContent>
      </Dialog >

      {/* Import dialog */}
      < StravaImportDialog
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

function ActivityDetailContent({
  activity,
  onImport,
}: {
  activity: ActivityRecord;
  onImport: () => void;
}) {
  const rawValue = activity.raw;
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
    activity.start_time ??
    toStringValue(raw["start_date"]) ??
    toStringValue(raw["start_date_local"]);
  const distanceMeters = toNumber(activity.distance_m ?? raw["distance"]);
  const movingTime = toNumber(activity.moving_time_s ?? raw["moving_time"]);
  const avgHr = toNumber(activity.avg_hr ?? raw["average_heartrate"]);
  const elevGain = toNumber(activity.elev_gain_m ?? raw["total_elevation_gain"]);
  const averageSpeed = getAverageSpeedFromActivity(activity);

  const subtitle = startTime ? format(new Date(startTime), "PPP p") : null;
  const title = activity.name ?? toStringValue(raw["name"]) ?? "Strava activity";

  const rawId = toNumber(raw["id"]);
  const stravaUrl = rawId ? `https://www.strava.com/activities/${rawId}` : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </DialogHeader>

      <div className="grid gap-3 py-2 text-sm">
        {distanceMeters && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Distance</span>
            <span className="font-medium">{formatDistance(distanceMeters)}</span>
          </div>
        )}
        {movingTime && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{formatDuration(movingTime)}</span>
          </div>
        )}
        {averageSpeed && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Avg Pace</span>
            <span className="font-medium">{formatPace(averageSpeed)}</span>
          </div>
        )}
        {avgHr && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Avg HR</span>
            <span className="font-medium">{Math.round(avgHr)} bpm</span>
          </div>
        )}
        {elevGain && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Elevation</span>
            <span className="font-medium">{formatElevation(elevGain)}</span>
          </div>
        )}
      </div>

      {stravaUrl && (
        <Button asChild variant="outline" size="sm" className="w-full gap-2">
          <a href={stravaUrl} target="_blank" rel="noopener noreferrer">
            View on Strava
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}

      {activity.imported_post_id ? (
        <Badge variant="secondary" className="mt-3 w-full justify-center py-2 text-xs uppercase tracking-wide">
          Already on timeline
        </Badge>
      ) : (
        <Button className="mt-3 w-full" onClick={onImport}>
          Import to timeline
        </Button>
      )}
    </>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return format(date, 'MMM d');
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
