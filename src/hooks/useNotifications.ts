import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import { featureFlags } from '@/lib/config/featureFlags';

export interface NotificationActor {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
}

export interface Notification {
    id: string;
    created_at: string;
    user_id: string;
    type: 'prop_received' | 'token_trade' | 'dm_received' | string;
    payload: {
        actor_id?: string;
        post_id?: string;
        trade_id?: string;
        side?: string;
        qty?: number;
        sender_id?: string;
        conversation_id?: string;
        message_id?: string;
    };
    read_at: string | null;
    // Enriched actor info
    actor?: NotificationActor;
}

interface UseNotificationsResult {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    isFetching: boolean;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    refetch: () => void;
}

const NOTIFICATIONS_QUERY_KEY = ['notifications'];

/**
 * Hook for managing user notifications with realtime updates
 */
export function useNotifications(): UseNotificationsResult {
    const user = useUser();
    const queryClient = useQueryClient();

    // Fetch notifications with actor profiles
    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: NOTIFICATIONS_QUERY_KEY,
        enabled: !!user?.id && featureFlags.enableNotifications,
        staleTime: 30_000,
        queryFn: async (): Promise<Notification[]> => {
            if (!user?.id) return [];

            // Step 1: Fetch notifications
            const { data: notificationsData, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Failed to fetch notifications:', error);
                throw error;
            }

            const notifications = (notificationsData ?? []).map((row) => ({
                ...row,
                payload: (row.payload as Notification['payload']) ?? {},
            }));

            // Step 2: Collect unique actor IDs from payloads
            const actorIds = new Set<string>();
            for (const n of notifications) {
                if (n.payload.actor_id) actorIds.add(n.payload.actor_id);
                if (n.payload.sender_id) actorIds.add(n.payload.sender_id);
            }

            // Step 3: Fetch actor profiles if we have any
            const actorMap = new Map<string, NotificationActor>();
            if (actorIds.size > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, display_name, avatar_url, username')
                    .in('id', Array.from(actorIds));

                if (profiles) {
                    for (const profile of profiles) {
                        actorMap.set(profile.id, {
                            id: profile.id,
                            display_name: profile.display_name,
                            avatar_url: profile.avatar_url,
                            username: profile.username,
                        });
                    }
                }
            }

            // Step 4: Enrich notifications with actor info
            return notifications.map((n) => {
                const actorId = n.payload.actor_id || n.payload.sender_id;
                return {
                    ...n,
                    actor: actorId ? actorMap.get(actorId) : undefined,
                };
            });
        },
    });

    // Realtime subscription for new notifications
    useEffect(() => {
        if (!user?.id || !featureFlags.enableNotifications) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // Refetch notifications on new insert
                    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // Refetch on update (e.g., read_at changed)
                    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [user?.id, queryClient]);

    // Mark single notification as read
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        },
    });

    // Mark all notifications as read
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id) return;

            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .is('read_at', null);

            if (error) throw error;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        },
    });

    const notifications = useMemo(() => data ?? [], [data]);

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.read_at).length,
        [notifications]
    );

    return {
        notifications,
        unreadCount,
        isLoading,
        isFetching,
        markAsRead: (id) => markAsReadMutation.mutate(id),
        markAllAsRead: () => markAllAsReadMutation.mutate(),
        refetch: () => void refetch(),
    };
}
