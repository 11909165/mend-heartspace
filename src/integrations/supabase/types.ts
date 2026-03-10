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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      circle_posts: {
        Row: {
          alias: string
          body: string
          circle_id: string
          created_at: string
          id: string
          support_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          alias: string
          body: string
          circle_id: string
          created_at?: string
          id?: string
          support_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          alias?: string
          body?: string
          circle_id?: string
          created_at?: string
          id?: string
          support_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_posts_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          support_prompts: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          support_prompts?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          support_prompts?: Json | null
        }
        Relationships: []
      }
      conversation_state: {
        Row: {
          id: string
          last_updated: string
          summary: string
          themes: string[]
          user_id: string
        }
        Insert: {
          id?: string
          last_updated?: string
          summary?: string
          themes?: string[]
          user_id: string
        }
        Update: {
          id?: string
          last_updated?: string
          summary?: string
          themes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          prompt: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          prompt?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          prompt?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mend_memory_evidence: {
        Row: {
          created_at: string | null
          id: string
          memory_id: string
          message_id: string | null
          snippet: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          memory_id: string
          message_id?: string | null
          snippet?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          memory_id?: string
          message_id?: string | null
          snippet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mend_memory_evidence_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "mend_user_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mend_memory_evidence_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mend_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mend_messages: {
        Row: {
          communication_bucket: string | null
          content: string
          created_at: string | null
          experience_mode: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          communication_bucket?: string | null
          content: string
          created_at?: string | null
          experience_mode?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          communication_bucket?: string | null
          content?: string
          created_at?: string | null
          experience_mode?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      mend_signals: {
        Row: {
          context: string
          created_at: string | null
          extracted_at: string | null
          id: string
          intensity: string
          message_id: string | null
          primary_emotion: string
          secondary_emotion: string | null
          source_id: string | null
          source_type: string
          stabilizer: string | null
          theme: string | null
          time_bucket: string
          trigger_signal: string | null
          user_id: string
        }
        Insert: {
          context: string
          created_at?: string | null
          extracted_at?: string | null
          id?: string
          intensity: string
          message_id?: string | null
          primary_emotion: string
          secondary_emotion?: string | null
          source_id?: string | null
          source_type?: string
          stabilizer?: string | null
          theme?: string | null
          time_bucket: string
          trigger_signal?: string | null
          user_id: string
        }
        Update: {
          context?: string
          created_at?: string | null
          extracted_at?: string | null
          id?: string
          intensity?: string
          message_id?: string | null
          primary_emotion?: string
          secondary_emotion?: string | null
          source_id?: string | null
          source_type?: string
          stabilizer?: string | null
          theme?: string | null
          time_bucket?: string
          trigger_signal?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mend_signals_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mend_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mend_user_memory: {
        Row: {
          confidence: number | null
          content: string
          created_at: string | null
          evidence_count: number | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          memory_type: string
          safety_level: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string | null
          evidence_count?: number | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          memory_type: string
          safety_level?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string | null
          evidence_count?: number | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          memory_type?: string
          safety_level?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mend_user_preferences: {
        Row: {
          companion_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          companion_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          companion_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mend_weekly_insights: {
        Row: {
          created_at: string | null
          dominant_emotions: Json | null
          id: string
          narrative: string | null
          time_bucket_peaks: Json | null
          top_triggers: Json | null
          user_id: string
          volatility_score: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          dominant_emotions?: Json | null
          id?: string
          narrative?: string | null
          time_bucket_peaks?: Json | null
          top_triggers?: Json | null
          user_id: string
          volatility_score?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          dominant_emotions?: Json | null
          id?: string
          narrative?: string | null
          time_bucket_peaks?: Json | null
          top_triggers?: Json | null
          user_id?: string
          volatility_score?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      post_replies: {
        Row: {
          alias: string
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          alias: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          alias?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
