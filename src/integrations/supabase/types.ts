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
      analytics_events: {
        Row: {
          anonymous_id: string | null
          created_at: string | null
          event_name: string
          id: string
          ip_address: unknown
          properties: Json | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string | null
          event_name: string
          id?: string
          ip_address?: unknown
          properties?: Json | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string | null
          event_name?: string
          id?: string
          ip_address?: unknown
          properties?: Json | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
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
          monad_wallet_address: string | null
          onchain_initialized: boolean | null
          onchain_price: number | null
          onchain_updated_at: string | null
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
          monad_wallet_address?: string | null
          onchain_initialized?: boolean | null
          onchain_price?: number | null
          onchain_updated_at?: string | null
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
          monad_wallet_address?: string | null
          onchain_initialized?: boolean | null
          onchain_price?: number | null
          onchain_updated_at?: string | null
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
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
      comments: {
        Row: {
          author_id: string
          created_at: string
          id: string
          post_id: string
          text: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          post_id: string
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          post_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
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
      email_send_log: {
        Row: {
          email: string
          id: string
          metadata: Json | null
          resend_id: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          user_email_status_id: string | null
        }
        Insert: {
          email: string
          id?: string
          metadata?: Json | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          user_email_status_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          metadata?: Json | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          user_email_status_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_user_email_status_id_fkey"
            columns: ["user_email_status_id"]
            isOneToOne: false
            referencedRelation: "user_email_status"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_event: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_event: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_event?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string | null
          delay_hours: number | null
          html_template: string
          id: string
          is_active: boolean | null
          sequence_id: string
          step_number: number
          subject: string
          text_template: string | null
        }
        Insert: {
          created_at?: string | null
          delay_hours?: number | null
          html_template: string
          id?: string
          is_active?: boolean | null
          sequence_id: string
          step_number: number
          subject: string
          text_template?: string | null
        }
        Update: {
          created_at?: string | null
          delay_hours?: number | null
          html_template?: string
          id?: string
          is_active?: boolean | null
          sequence_id?: string
          step_number?: number
          subject?: string
          text_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
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
      market_activity: {
        Row: {
          action: string
          created_at: string | null
          id: string
          market_id: string
          outcome_id: string
          shares: number
          stake: number
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string | null
          id?: string
          market_id: string
          outcome_id: string
          shares: number
          stake: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          market_id?: string
          outcome_id?: string
          shares?: number
          stake?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_activity_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_activity_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "market_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "market_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_bets: {
        Row: {
          created_at: string | null
          id: string
          market_id: string
          outcome_id: string
          price_at_purchase: number
          shares_received: number
          stake: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          market_id: string
          outcome_id: string
          price_at_purchase: number
          shares_received: number
          stake: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          market_id?: string
          outcome_id?: string
          price_at_purchase?: number
          shares_received?: number
          stake?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_bets_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_bets_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "market_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "market_bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_outcomes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          label: string
          market_id: string
          metadata: Json | null
          probability: number | null
          shares: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          market_id: string
          metadata?: Json | null
          probability?: number | null
          shares?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          market_id?: string
          metadata?: Json | null
          probability?: number | null
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_outcomes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_connections: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          external_id: string | null
          id: string
          last_activity_at: string | null
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
          last_activity_at?: string | null
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
          last_activity_at?: string | null
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
      points_config: {
        Row: {
          action: Database["public"]["Enums"]["point_action"]
          daily_cap: number | null
          description: string | null
          points: number
          updated_at: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["point_action"]
          daily_cap?: number | null
          description?: string | null
          points: number
          updated_at?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["point_action"]
          daily_cap?: number | null
          description?: string | null
          points?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          action: Database["public"]["Enums"]["point_action"]
          created_at: string | null
          id: string
          metadata: Json | null
          points: number
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["point_action"]
          created_at?: string | null
          id?: string
          metadata?: Json | null
          points: number
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["point_action"]
          created_at?: string | null
          id?: string
          metadata?: Json | null
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_totals: {
        Row: {
          current_streak: number | null
          last_workout_date: string | null
          longest_streak: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
          weekly_points: number | null
        }
        Insert: {
          current_streak?: number | null
          last_workout_date?: string | null
          longest_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
          weekly_points?: number | null
        }
        Update: {
          current_streak?: number | null
          last_workout_date?: string | null
          longest_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
          weekly_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "points_totals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "points_totals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          comments_count: number
          created_at: string
          has_location: boolean | null
          id: string
          image_url: string | null
          is_pinned: boolean | null
          location_city: string | null
          location_country: string | null
          location_country_code: string | null
          location_geohash: string | null
          location_lat: number | null
          location_lng: number | null
          min_tokens_required: number
          monad_tx_hash: string | null
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
          comments_count?: number
          created_at?: string
          has_location?: boolean | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          location_city?: string | null
          location_country?: string | null
          location_country_code?: string | null
          location_geohash?: string | null
          location_lat?: number | null
          location_lng?: number | null
          min_tokens_required?: number
          monad_tx_hash?: string | null
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
          comments_count?: number
          created_at?: string
          has_location?: boolean | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          location_city?: string | null
          location_country?: string | null
          location_country_code?: string | null
          location_geohash?: string | null
          location_lat?: number | null
          location_lng?: number | null
          min_tokens_required?: number
          monad_tx_hash?: string | null
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_credits: {
        Row: {
          balance: number | null
          created_at: string | null
          total_earned: number | null
          total_wagered: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          total_earned?: number | null
          total_wagered?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          total_earned?: number | null
          total_wagered?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prediction_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_markets: {
        Row: {
          closes_at: string
          created_at: string | null
          division: string | null
          event_city: string | null
          event_date: string | null
          event_id: string
          event_name: string
          id: string
          metadata: Json | null
          question: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["market_status"]
          total_pool: number | null
          total_trades: number | null
          type: Database["public"]["Enums"]["market_type"]
          updated_at: string | null
          winning_outcome_id: string | null
        }
        Insert: {
          closes_at: string
          created_at?: string | null
          division?: string | null
          event_city?: string | null
          event_date?: string | null
          event_id: string
          event_name: string
          id?: string
          metadata?: Json | null
          question: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["market_status"]
          total_pool?: number | null
          total_trades?: number | null
          type: Database["public"]["Enums"]["market_type"]
          updated_at?: string | null
          winning_outcome_id?: string | null
        }
        Update: {
          closes_at?: string
          created_at?: string | null
          division?: string | null
          event_city?: string | null
          event_date?: string | null
          event_id?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          question?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["market_status"]
          total_pool?: number | null
          total_trades?: number | null
          type?: Database["public"]["Enums"]["market_type"]
          updated_at?: string | null
          winning_outcome_id?: string | null
        }
        Relationships: []
      }
      prediction_results: {
        Row: {
          created_at: string | null
          id: string
          market_id: string
          outcome_id: string
          payout: number | null
          resolved_at: string | null
          total_stake: number | null
          user_id: string
          was_correct: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          market_id: string
          outcome_id: string
          payout?: number | null
          resolved_at?: string | null
          total_stake?: number | null
          user_id: string
          was_correct?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          market_id?: string
          outcome_id?: string
          payout?: number | null
          resolved_at?: string | null
          total_stake?: number | null
          user_id?: string
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_results_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "prediction_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_results_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "market_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prediction_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          instagram_url: string | null
          is_agent: boolean | null
          monad_wallet_address: string | null
          onboarding_completed: boolean
          role: string | null
          sport: string | null
          strava_url: string | null
          tour_version_completed: string | null
          type: Database["public"]["Enums"]["athlete_type"] | null
          updated_at: string
          username: string
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          instagram_url?: string | null
          is_agent?: boolean | null
          monad_wallet_address?: string | null
          onboarding_completed?: boolean
          role?: string | null
          sport?: string | null
          strava_url?: string | null
          tour_version_completed?: string | null
          type?: Database["public"]["Enums"]["athlete_type"] | null
          updated_at?: string
          username: string
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instagram_url?: string | null
          is_agent?: boolean | null
          monad_wallet_address?: string | null
          onboarding_completed?: boolean
          role?: string | null
          sport?: string | null
          strava_url?: string | null
          tour_version_completed?: string | null
          type?: Database["public"]["Enums"]["athlete_type"] | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      props: {
        Row: {
          actor_user_id: string
          created_at: string
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_reward_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          referral_count: number
          reward_type: string
          reward_value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          referral_count: number
          reward_type: string
          reward_value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          referral_count?: number
          reward_type?: string
          reward_value?: string
        }
        Relationships: []
      }
      referral_rewards_claimed: {
        Row: {
          claimed_at: string | null
          id: string
          tier_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          tier_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          id?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_claimed_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "referral_reward_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_claimed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_rewards_claimed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          athlete_id: string
          block_number: number | null
          chain_id: number | null
          client_request_id: string | null
          created_at: string
          fee: number
          gross_amount: number
          id: string
          is_on_chain: boolean | null
          net_amount: number
          price_after: number
          qty: number
          side: Database["public"]["Enums"]["trade_side"]
          supply_after: number
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          athlete_id: string
          block_number?: number | null
          chain_id?: number | null
          client_request_id?: string | null
          created_at?: string
          fee: number
          gross_amount: number
          id?: string
          is_on_chain?: boolean | null
          net_amount: number
          price_after: number
          qty: number
          side: Database["public"]["Enums"]["trade_side"]
          supply_after: number
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          athlete_id?: string
          block_number?: number | null
          chain_id?: number | null
          client_request_id?: string | null
          created_at?: string
          fee?: number
          gross_amount?: number
          id?: string
          is_on_chain?: boolean | null
          net_amount?: number
          price_after?: number
          qty?: number
          side?: Database["public"]["Enums"]["trade_side"]
          supply_after?: number
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
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
      user_badges: {
        Row: {
          badge_type: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_status: {
        Row: {
          completed: boolean | null
          created_at: string | null
          current_step: number | null
          email: string
          id: string
          last_email_sent_at: string | null
          next_email_at: string | null
          sequence_id: string
          unsubscribed: boolean | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          current_step?: number | null
          email: string
          id?: string
          last_email_sent_at?: string | null
          next_email_at?: string | null
          sequence_id: string
          unsubscribed?: boolean | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          current_step?: number | null
          email?: string
          id?: string
          last_email_sent_at?: string | null
          next_email_at?: string | null
          sequence_id?: string
          unsubscribed?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_email_status_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_email_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallets_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          athlete_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "watchlist_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "watchlist_user_id_fkey"
            columns: ["user_id"]
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "athlete_tokens_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_users: {
        Row: {
          display_name: string | null
          founder_since: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_leaderboard: {
        Row: {
          accuracy: number | null
          avatar_url: string | null
          correct_predictions: number | null
          current_balance: number | null
          display_name: string | null
          net_profit: number | null
          rank: number | null
          total_earned: number | null
          total_markets: number | null
          total_wagered: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "prediction_leaderboard"
            referencedColumns: ["user_id"]
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
      award_points: {
        Args: {
          p_action: Database["public"]["Enums"]["point_action"]
          p_metadata?: Json
          p_user_id: string
        }
        Returns: number
      }
      calculate_user_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          last_workout_date: string
          longest_streak: number
        }[]
      }
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
      generate_referral_code: { Args: never; Returns: string }
      get_athlete_count: { Args: never; Returns: number }
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
      get_dm_conversations:
        | {
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
        | {
            Args: { p_limit?: number; p_offset?: number; p_user?: string }
            Returns: {
              conversation_id: string
              last_message: string
              last_message_at: string
              other_avatar_url: string
              other_display_name: string
              other_user_id: string
              unread_count: number
              updated_at: string
            }[]
          }
      get_dm_messages: {
        Args: { p_conversation_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          media_url: string
          sender_avatar_url: string
          sender_display_name: string
          sender_id: string
          sender_username: string
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
      get_points_leaderboard: {
        Args: { p_limit?: number; p_timeframe?: string }
        Returns: {
          avatar_url: string
          badge_type: string
          display_name: string
          points: number
          rank: number
          user_id: string
          username: string
        }[]
      }
      get_referral_stats: {
        Args: { p_user_id: string }
        Returns: {
          completed_referrals: number
          next_reward_at: number
          next_reward_type: string
          next_reward_value: string
          referral_code: string
          total_referrals: number
        }[]
      }
      get_top_movers: {
        Args: { p_limit?: number; p_window?: unknown }
        Returns: {
          athlete_id: string
          base_price: number
          last_price: number
          notional: number
          pct_change: number
          qty: number
        }[]
      }
      get_user_balance: { Args: { p_athlete_id: string }; Returns: number }
      place_prediction_bet: {
        Args: {
          p_market_id: string
          p_outcome_id: string
          p_stake: number
          p_user_id: string
        }
        Returns: Json
      }
      refresh_prices_daily_mv: { Args: never; Returns: undefined }
      resolve_prediction_market: {
        Args: { p_market_id: string; p_winning_outcome_id: string }
        Returns: Json
      }
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
      athlete_type: "human" | "agent"
      market_status: "open" | "closed" | "resolved" | "cancelled"
      market_type:
        | "winner"
        | "threshold"
        | "head_to_head"
        | "podium"
        | "station"
      point_action:
        | "profile_complete"
        | "strava_connect"
        | "first_workout"
        | "daily_workout"
        | "social_share"
        | "referral_signup"
        | "referral_workout"
        | "token_purchase"
        | "weekly_streak"
        | "badge_earned"
        | "manual_adjustment"
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
      athlete_type: ["human", "agent"],
      market_status: ["open", "closed", "resolved", "cancelled"],
      market_type: ["winner", "threshold", "head_to_head", "podium", "station"],
      point_action: [
        "profile_complete",
        "strava_connect",
        "first_workout",
        "daily_workout",
        "social_share",
        "referral_signup",
        "referral_workout",
        "token_purchase",
        "weekly_streak",
        "badge_earned",
        "manual_adjustment",
      ],
      trade_side: ["BUY", "SELL"],
    },
  },
} as const
