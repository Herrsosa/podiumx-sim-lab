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
        }
        Relationships: [
          {
            foreignKeyName: "athlete_tokens_athlete_id_profiles_id_fk"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          athlete_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          athlete_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          athlete_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      posts: {
        Row: {
          author_id: string
          created_at: string
          id: string
          image_url: string | null
          strava_activity_id: number | null
          text: string | null
          token_gated: boolean | null
          workout_json: Json | null
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          strava_activity_id?: number | null
          text?: string | null
          token_gated?: boolean | null
          workout_json?: Json | null
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          strava_activity_id?: number | null
          text?: string | null
          token_gated?: boolean | null
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
          sport: string | null
          strava_url: string | null
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
          sport?: string | null
          strava_url?: string | null
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
          sport?: string | null
          strava_url?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          athlete_id: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_trade_transaction: {
        Args: {
          p_athlete_id: string
          p_fee: number
          p_gross_amount: number
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
