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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: string
          description: string | null
          earned_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          description?: string | null
          earned_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          description?: string | null
          earned_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_type: string
          created_at: string
          date: string
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          date: string
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          date?: string
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string | null
          sender: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string | null
          sender: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string | null
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          challenges: string | null
          created_at: string
          date: string
          goals_achieved: string | null
          id: string
          mood: number | null
          progress_notes: string | null
          user_id: string
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          date?: string
          goals_achieved?: string | null
          id?: string
          mood?: number | null
          progress_notes?: string | null
          user_id: string
        }
        Update: {
          challenges?: string | null
          created_at?: string
          date?: string
          goals_achieved?: string | null
          id?: string
          mood?: number | null
          progress_notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goal_progress: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          notes: string | null
          progress_amount: number
          recorded_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          notes?: string | null
          progress_amount?: number
          recorded_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          notes?: string | null
          progress_amount?: number
          recorded_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_amount: number | null
          duration_days: number | null
          end_date: string | null
          goal_description: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          last_reminder_sent: string | null
          reminder_frequency: string | null
          start_date: string | null
          target_amount: number | null
          target_unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number | null
          duration_days?: number | null
          end_date?: string | null
          goal_description?: string | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          last_reminder_sent?: string | null
          reminder_frequency?: string | null
          start_date?: string | null
          target_amount?: number | null
          target_unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number | null
          duration_days?: number | null
          end_date?: string | null
          goal_description?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          last_reminder_sent?: string | null
          reminder_frequency?: string | null
          start_date?: string | null
          target_amount?: number | null
          target_unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_data: {
        Row: {
          challenges: string[]
          created_at: string
          current_habits: string
          goals: Json
          id: string
          motivation: string
          previous_attempts: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenges?: string[]
          created_at?: string
          current_habits: string
          goals?: Json
          id?: string
          motivation: string
          previous_attempts: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenges?: string[]
          created_at?: string
          current_habits?: string
          goals?: Json
          id?: string
          motivation?: string
          previous_attempts?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          profile_picture_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_ai_generated: boolean
          message: string
          reminder_type: string
          time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_ai_generated?: boolean
          message: string
          reminder_type: string
          time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_ai_generated?: boolean
          message?: string
          reminder_type?: string
          time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          best_count: number | null
          created_at: string
          current_count: number | null
          id: string
          last_updated: string | null
          streak_type: string
          user_id: string
        }
        Insert: {
          best_count?: number | null
          created_at?: string
          current_count?: number | null
          id?: string
          last_updated?: string | null
          streak_type: string
          user_id: string
        }
        Update: {
          best_count?: number | null
          created_at?: string
          current_count?: number | null
          id?: string
          last_updated?: string | null
          streak_type?: string
          user_id?: string
        }
        Relationships: []
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
