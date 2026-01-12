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
      asr_versions: {
        Row: {
          asr_version_id: string
          assessment_id: string
          change_log: Json | null
          completeness_percent: number | null
          created_at: string | null
          section_a: Json | null
          section_b: Json | null
          section_c: Json | null
          section_d: Json | null
          section_e: Json | null
          section_f: Json | null
          section_g: Json | null
          section_h: Json | null
          section_i: Json | null
          section_j: Json | null
          updated_at: string | null
          validation_status: string | null
        }
        Insert: {
          asr_version_id: string
          assessment_id: string
          change_log?: Json | null
          completeness_percent?: number | null
          created_at?: string | null
          section_a?: Json | null
          section_b?: Json | null
          section_c?: Json | null
          section_d?: Json | null
          section_e?: Json | null
          section_f?: Json | null
          section_g?: Json | null
          section_h?: Json | null
          section_i?: Json | null
          section_j?: Json | null
          updated_at?: string | null
          validation_status?: string | null
        }
        Update: {
          asr_version_id?: string
          assessment_id?: string
          change_log?: Json | null
          completeness_percent?: number | null
          created_at?: string | null
          section_a?: Json | null
          section_b?: Json | null
          section_c?: Json | null
          section_d?: Json | null
          section_e?: Json | null
          section_f?: Json | null
          section_g?: Json | null
          section_h?: Json | null
          section_i?: Json | null
          section_j?: Json | null
          updated_at?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asr_versions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["assessment_id"]
          },
        ]
      }
      assessment_banks: {
        Row: {
          assessment_id: string
          content_bank_id: string
          created_at: string | null
        }
        Insert: {
          assessment_id: string
          content_bank_id: string
          created_at?: string | null
        }
        Update: {
          assessment_id?: string
          content_bank_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_banks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["assessment_id"]
          },
          {
            foreignKeyName: "assessment_banks_content_bank_id_fkey"
            columns: ["content_bank_id"]
            isOneToOne: false
            referencedRelation: "content_banks"
            referencedColumns: ["content_bank_id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_id: string
          component_code: string
          content_model: string
          created_at: string | null
          current_asr_version_id: string | null
          grade_range: string
          status: string
          subcomponent_code: string
          subcomponent_name: string
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          component_code: string
          content_model: string
          created_at?: string | null
          current_asr_version_id?: string | null
          grade_range: string
          status?: string
          subcomponent_code: string
          subcomponent_name: string
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          component_code?: string
          content_model?: string
          created_at?: string | null
          current_asr_version_id?: string | null
          grade_range?: string
          status?: string
          subcomponent_code?: string
          subcomponent_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      content_banks: {
        Row: {
          content_bank_id: string
          created_at: string | null
          current_size: number | null
          differentiation_keys: string[] | null
          equivalence_set_required: boolean | null
          linked_assessment_id: string
          name: string
          status: string | null
          target_bank_size: number | null
          updated_at: string | null
        }
        Insert: {
          content_bank_id: string
          created_at?: string | null
          current_size?: number | null
          differentiation_keys?: string[] | null
          equivalence_set_required?: boolean | null
          linked_assessment_id: string
          name: string
          status?: string | null
          target_bank_size?: number | null
          updated_at?: string | null
        }
        Update: {
          content_bank_id?: string
          created_at?: string | null
          current_size?: number | null
          differentiation_keys?: string[] | null
          equivalence_set_required?: boolean | null
          linked_assessment_id?: string
          name?: string
          status?: string | null
          target_bank_size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_banks_linked_assessment_id_fkey"
            columns: ["linked_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["assessment_id"]
          },
        ]
      }
      forms: {
        Row: {
          assessment_id: string
          content_bank_id: string
          created_at: string | null
          equivalence_set_id: string | null
          form_id: string
          form_number: number
          grade_or_level_tag: string
          metadata: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          content_bank_id: string
          created_at?: string | null
          equivalence_set_id?: string | null
          form_id: string
          form_number: number
          grade_or_level_tag: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          content_bank_id?: string
          created_at?: string | null
          equivalence_set_id?: string | null
          form_id?: string
          form_number?: number
          grade_or_level_tag?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["assessment_id"]
          },
          {
            foreignKeyName: "forms_content_bank_id_fkey"
            columns: ["content_bank_id"]
            isOneToOne: false
            referencedRelation: "content_banks"
            referencedColumns: ["content_bank_id"]
          },
        ]
      }
      import_history: {
        Row: {
          assessment_id: string | null
          change_note: string | null
          file_name: string | null
          import_id: string
          import_type: string
          imported_at: string | null
          imported_by: string | null
          rows_created: number
          rows_failed: number
          rows_processed: number
          rows_updated: number
        }
        Insert: {
          assessment_id?: string | null
          change_note?: string | null
          file_name?: string | null
          import_id?: string
          import_type: string
          imported_at?: string | null
          imported_by?: string | null
          rows_created?: number
          rows_failed?: number
          rows_processed?: number
          rows_updated?: number
        }
        Update: {
          assessment_id?: string | null
          change_note?: string | null
          file_name?: string | null
          import_id?: string
          import_type?: string
          imported_at?: string | null
          imported_by?: string | null
          rows_created?: number
          rows_failed?: number
          rows_processed?: number
          rows_updated?: number
        }
        Relationships: []
      }
      items: {
        Row: {
          content_payload: Json
          created_at: string | null
          form_id: string
          item_id: string
          item_type: string
          scoring_tags: string[] | null
          sequence_number: number
          updated_at: string | null
        }
        Insert: {
          content_payload: Json
          created_at?: string | null
          form_id: string
          item_id: string
          item_type: string
          scoring_tags?: string[] | null
          sequence_number: number
          updated_at?: string | null
        }
        Update: {
          content_payload?: Json
          created_at?: string | null
          form_id?: string
          item_id?: string
          item_type?: string
          scoring_tags?: string[] | null
          sequence_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["form_id"]
          },
        ]
      }
      scoring_outputs: {
        Row: {
          assessment_id: string
          created_at: string | null
          derived_metrics_schema: Json | null
          flags: Json | null
          formulas: Json | null
          raw_metrics_schema: Json | null
          scoring_model_id: string
          thresholds: Json | null
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          derived_metrics_schema?: Json | null
          flags?: Json | null
          formulas?: Json | null
          raw_metrics_schema?: Json | null
          scoring_model_id: string
          thresholds?: Json | null
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          derived_metrics_schema?: Json | null
          flags?: Json | null
          formulas?: Json | null
          raw_metrics_schema?: Json | null
          scoring_model_id?: string
          thresholds?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_outputs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["assessment_id"]
          },
        ]
      }
      session_responses: {
        Row: {
          computed_scores: Json | null
          created_at: string | null
          discontinue_flag: boolean | null
          discontinue_reason: string | null
          elapsed_seconds: number | null
          error_tags: string[] | null
          is_correct: boolean | null
          item_id: string
          notes: string | null
          response_id: string
          response_time_ms: number | null
          sequence_number: number
          session_id: string
          token_state_map: Json | null
        }
        Insert: {
          computed_scores?: Json | null
          created_at?: string | null
          discontinue_flag?: boolean | null
          discontinue_reason?: string | null
          elapsed_seconds?: number | null
          error_tags?: string[] | null
          is_correct?: boolean | null
          item_id: string
          notes?: string | null
          response_id?: string
          response_time_ms?: number | null
          sequence_number: number
          session_id: string
          token_state_map?: Json | null
        }
        Update: {
          computed_scores?: Json | null
          created_at?: string | null
          discontinue_flag?: boolean | null
          discontinue_reason?: string | null
          elapsed_seconds?: number | null
          error_tags?: string[] | null
          is_correct?: boolean | null
          item_id?: string
          notes?: string | null
          response_id?: string
          response_time_ms?: number | null
          sequence_number?: number
          session_id?: string
          token_state_map?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "session_responses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "session_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      sessions: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string | null
          current_item_index: number
          form_id: string
          grade_tag: string | null
          session_id: string
          started_at: string | null
          status: string
          student_name: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string | null
          current_item_index?: number
          form_id: string
          grade_tag?: string | null
          session_id?: string
          started_at?: string | null
          status?: string
          student_name: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_item_index?: number
          form_id?: string
          grade_tag?: string | null
          session_id?: string
          started_at?: string | null
          status?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["assessment_id"]
          },
          {
            foreignKeyName: "sessions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["form_id"]
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
