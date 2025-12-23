export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          avg_hr: number | null
          calories: number | null
          created_at: string
          distance_m: number | null
          elapsed_time_s: number | null
          elev_gain_m: number | null
          external_id: string | null
          id: number
          imported_at: string | null
          imported_post_id: string | null
          max_hr: number | null
          moving_time_s: number | null
          name: string | null
          raw: Json | null
          source: string
          sport_type: string | null
          start_time: string | null
          user_id: string
        }
        Insert: {
          avg_hr?: number | null
          calories?: number | null
          created_at?: string
          distance_m?: number | null
          elapsed_time_s?: number | null
          elev_gain_m?: number | null
          external_id?: string | null
          id?: number
          imported_at?: string | null
          imported_post_id?: string | null
          max_hr?: number | null
          moving_time_s?: number | null
          name?: string | null
          raw?: Json | null
          source: string
          sport_type?: string | null
          start_time?: string | null
          user_id: string
        }
        Update: {
          avg_hr?: number | null
          calories?: number | null
          created_at?: string
          distance_m?: number | null
          elapsed_time_s?: number | null
          elev_gain_m?: number | null
          external_id?: string | null
          id?: number
          imported_at?: string | null
          imported_post_id?: string | null
          max_hr?: number | null
          moving_time_s?: number | null
          name?: string | null
          raw?: Json | null
          source?: string
          sport_type?: string | null
          start_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_imported_post_id_fkey"
            columns: ["imported_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_chat_messages: {
        Row: {
          athlete_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          athlete_id: string
          content: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Update: {
          athlete_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_chat_messages_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_integrations: {
        Row: {
          access_token: string
          athlete_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          service: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          athlete_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          service: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          athlete_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          service?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_integrations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_prices: {
        Row: {
          athlete_earnings: number
          athlete_id: string
          client_request_id: string | null
          created_at: string
          curve_a: number | null
          curve_b: number | null
          curve_c: number | null
          gross_amount: number
          id: string
          price: number
          side: Database["public"]["Enums"]["trade_side"]
          supply: number
          treasury_balance: number
        }
        Insert: {
          athlete_earnings: number
          athlete_id: string
          client_request_id?: string | null
          created_at?: string
          curve_a?: number | null
          curve_b?: number | null
          curve_c?: number | null
          gross_amount: number
          id?: string
          price: number
          side: Database["public"]["Enums"]["trade_side"]
          supply: number
          treasury_balance: number
        }
        Update: {
          athlete_earnings?: number
          athlete_id?: string
          client_request_id?: string | null
          created_at?: string
          curve_a?: number | null
          curve_b?: number | null
          curve_c?: number | null
          gross_amount?: number
          id?: string
          price?: number
          side?: Database["public"]["Enums"]["trade_side"]
          supply?: number
          treasury_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "athlete_prices_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_metrics_24h"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "athlete_prices_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_tokens"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "athlete_prices_client_request_id_fkey"
            columns: ["client_request_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["client_request_id"]
          },
        ]
      }
      athlete_tokens: {
        Row: {
          a: number
          athlete_earnings: number
          athlete_id: string
          b: number
          c: number
          created_at: string
          supply: number
          symbol: string
          treasury_balance: number
          updated_at: string | null
        }
        Insert: {
          a?: number
          athlete_earnings?: number
          athlete_id: string
          b?: number
          c?: number
          created_at?: string
          supply?: number
          symbol: string
          treasury_balance?: number
          updated_at?: string | null
        }
        Update: {
          a?: number
          athlete_earnings?: number
          athlete_id?: string
          b?: number
          c?: number
          created_at?: string
          supply?: number
          symbol?: string
          treasury_balance?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_tokens_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      balances: {
        Row: {
          test_fiat_cents: number
          test_usdc: number
          test_usdt: number
          updated_at: string
          user_id: string
        }
        Insert: {
          test_fiat_cents?: number
          test_usdc?: number
          test_usdt?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          test_fiat_cents?: number
          test_usdc?: number
          test_usdt?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deposit_intents: {
        Row: {
          amount: number
          asset: string
          created_at: string
          id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          asset: string
          created_at?: string
          id?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          asset?: string
          created_at?: string
          id?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      dm_conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          media_url: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          media_url?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          media_url?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_participants: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          athlete_id: string
          avg_cost: number
          qty: number
          updated_at: string
          user_id: string
        }
        Insert: {
          athlete_id: string
          avg_cost?: number
          qty?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          athlete_id?: string
          avg_cost?: number
          qty?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_connections: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          external_id: string | null
          id: string
          provider: string
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          app_url: string | null
          created_at: string
          expires_at: string
          id: string
          provider: string | null
          state: string
          user_id: string
        }
        Insert: {
          app_url?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          provider?: string | null
          state: string
          user_id: string
        }
        Update: {
          app_url?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          provider?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      props: {
        Row: {
          id: string
          created_at: string
          actor_user_id: string
          target_type: string
          target_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          actor_user_id: string
          target_type: string
          target_id: string
        }
        Update: {
          id?: string
          created_at?: string
          actor_user_id?: string
          target_type?: string
          target_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          created_at: string
          user_id: string
          type: string
          payload: Json
          read_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          type: string
          payload?: Json
          read_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          type?: string
          payload?: Json
          read_at?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          created_at: string
          has_location: boolean | null
          id: string
          image_url: string | null
          location_city: string | null
          location_country: string | null
          location_country_code: string | null
          location_geohash: string | null
          location_lat: number | null
          location_lng: number | null
          min_tokens_required: number
          props_count: number
          strava_activity_id: number | null
          strava_map_polyline: string | null
          text: string | null
          token_gated: boolean | null
          visibility: string
          workout_json: Json | null
        }
        Insert: {
          author_id: string
          created_at?: string
          has_location?: boolean | null
          id?: string
          image_url?: string | null
          location_city?: string | null
          location_country?: string | null
          location_country_code?: string | null
          location_geohash?: string | null
          location_lat?: number | null
          location_lng?: number | null
          min_tokens_required?: number
          props_count?: number
          strava_activity_id?: number | null
          strava_map_polyline?: string | null
          text?: string | null
          token_gated?: boolean | null
          visibility?: string
          workout_json?: Json | null
        }
        Update: {
          author_id?: string
          created_at?: string
          has_location?: boolean | null
          id?: string
          image_url?: string | null
          location_city?: string | null
          location_country?: string | null
          location_country_code?: string | null
          location_geohash?: string | null
          location_lat?: number | null
          location_lng?: number | null
          min_tokens_required?: number
          props_count?: number
          strava_activity_id?: number | null
          strava_map_polyline?: string | null
          text?: string | null
          token_gated?: boolean | null
          visibility?: string
          workout_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          instagram_url: string | null
          onboarding_completed: boolean
          role: string | null
          sport: string | null
          strava_url: string | null
          tour_version_completed: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          instagram_url?: string | null
          onboarding_completed?: boolean
          role?: string | null
          sport?: string | null
          strava_url?: string | null
          tour_version_completed?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instagram_url?: string | null
          onboarding_completed?: boolean
          role?: string | null
          sport?: string | null
          strava_url?: string | null
          tour_version_completed?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          athlete_id: string
          client_request_id: string | null
          created_at: string
          fee: number
          gross_amount: number
          id: string
          net_amount: number
          price_after: number
          qty: number
          side: Database["public"]["Enums"]["trade_side"]
          supply_after: number
          user_id: string
        }
        Insert: {
          athlete_id: string
          client_request_id?: string | null
          created_at?: string
          fee: number
          gross_amount: number
          id?: string
          net_amount: number
          price_after: number
          qty: number
          side: Database["public"]["Enums"]["trade_side"]
          supply_after: number
          user_id: string
        }
        Update: {
          athlete_id?: string
          client_request_id?: string | null
          created_at?: string
          fee?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          price_after?: number
          qty?: number
          side?: Database["public"]["Enums"]["trade_side"]
          supply_after?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: number
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          user_id: string
          athlete_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          athlete_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          athlete_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      athlete_metrics_24h: {
        Row: {
          athlete_id: string | null
          last_price: number | null
          notional_24h: number | null
          pct_change_24h: number | null
          qty_24h: number | null
          spark7d: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_tokens_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prices_daily_mv: {
        Row: {
          athlete_id: string | null
          carried: boolean | null
          close: number | null
          day_utc: string | null
          volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_prices_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_metrics_24h"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "athlete_prices_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_tokens"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      trades_norm: {
        Row: {
          athlete_id: string | null
          notional: number | null
          price: number | null
          qty: number | null
          ts: string | null
        }
        Insert: {
          athlete_id?: string | null
          notional?: number | null
          price?: number | null
          qty?: never
          ts?: never
        }
        Update: {
          athlete_id?: string | null
          notional?: number | null
          price?: number | null
          qty?: never
          ts?: never
        }
        Relationships: [
          {
            foreignKeyName: "trades_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_token_holdings: {
        Row: {
          athlete_id: string | null
          balance: number | null
          user_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          balance?: never
          user_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          balance?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holdings_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      execute_trade_transaction: {
        Args: {
          p_athlete_id: string
          p_curve_a: number
          p_curve_b: number
          p_curve_c: number
          p_fee: number
          p_gross_amount: number
          p_idempotency_key: string
          p_net_amount: number
          p_new_athlete_earnings: number
          p_new_price: number
          p_new_supply: number
          p_new_treasury: number
          p_qty: number
          p_side: Database["public"]["Enums"]["trade_side"]
          p_user_id: string
        }
        Returns: undefined
      }
      get_athletes_batch: {
        Args: { _ids: string[] }
        Returns: {
          a: number
          athlete_earnings: number
          avatar_url: string
          b: number
          bio: string
          c: number
          created_at: string
          display_name: string
          id: string
          instagram_url: string
          sport: string
          strava_url: string
          supply: number
          treasury_balance: number
          username: string
        }[]
      }
      get_dm_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          last_message: string
          last_message_at: string
          other_avatar_url: string
          other_user_id: string
          other_username: string
          unread_count: number
        }[]
      }
      get_dm_messages: {
        Args: { p_conversation_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          media_url: string
          sender_id: string
        }[]
      }
      get_market_overview: {
        Args: { athlete_ids?: string[] }
        Returns: {
          athlete_id: string
          last_price: number
          notional_24h: number
          pct_change_24h: number
          qty_24h: number
          spark7d: number[]
        }[]
      }
      get_user_balance: { Args: { p_athlete_id: string }; Returns: number }
      refresh_prices_daily_mv: { Args: never; Returns: undefined }
      send_dm: {
        Args: {
          p_body: string
          p_conversation_id: string
          p_media_url?: string
        }
        Returns: string
      }
      start_dm: { Args: { p_other_user_id: string }; Returns: string }
    }
    Enums: {
      trade_side: "BUY" | "SELL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      trade_side: ["BUY", "SELL"],
    },
  },
} as const
