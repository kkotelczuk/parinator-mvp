export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          round_id: string | null
          team_id: string | null
          tournament_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          round_id?: string | null
          team_id?: string | null
          tournament_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          round_id?: string | null
          team_id?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      estimator_events: {
        Row: {
          actor_membership_id: string
          clicked_at: string
          event_order: number
          id: string
          session_id: string
          tile_label: string
          tile_value: number
        }
        Insert: {
          actor_membership_id: string
          clicked_at?: string
          event_order: number
          id?: string
          session_id: string
          tile_label: string
          tile_value: number
        }
        Update: {
          actor_membership_id?: string
          clicked_at?: string
          event_order?: number
          id?: string
          session_id?: string
          tile_label?: string
          tile_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimator_events_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimator_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "estimator_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      estimator_sessions: {
        Row: {
          created_at: string
          created_by_membership_id: string
          id: string
          round_id: string
        }
        Insert: {
          created_at?: string
          created_by_membership_id: string
          id?: string
          round_id: string
        }
        Update: {
          created_at?: string
          created_by_membership_id?: string
          id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimator_sessions_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimator_sessions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          error_message: string | null
          id: string
          normalized_payload: Json | null
          raw_payload: Json | null
          source_hash: string
          source_type: Database["public"]["Enums"]["import_source"]
          source_url: string
          status: Database["public"]["Enums"]["import_status"]
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          error_message?: string | null
          id?: string
          normalized_payload?: Json | null
          raw_payload?: Json | null
          source_hash: string
          source_type: Database["public"]["Enums"]["import_source"]
          source_url: string
          status: Database["public"]["Enums"]["import_status"]
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          error_message?: string | null
          id?: string
          normalized_payload?: Json | null
          raw_payload?: Json | null
          source_hash?: string
          source_type?: Database["public"]["Enums"]["import_source"]
          source_url?: string
          status?: Database["public"]["Enums"]["import_status"]
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      join_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          generated_by_membership_id: string
          id: string
          remaining_uses: number
          revoked_at: string | null
          status: Database["public"]["Enums"]["join_code_status"]
          team_id: string
          tournament_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          generated_by_membership_id: string
          id?: string
          remaining_uses: number
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["join_code_status"]
          team_id: string
          tournament_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          generated_by_membership_id?: string
          id?: string
          remaining_uses?: number
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["join_code_status"]
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_codes_generated_by_membership_id_fkey"
            columns: ["generated_by_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_codes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_codes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      matchup_estimations: {
        Row: {
          comment: string | null
          created_at: string
          has_first_turn_impact: boolean
          id: string
          list_opened_at: string
          opponent_player_id: string
          player_membership_id: string
          round_id: string
          score_go_first: number | null
          score_go_second: number | null
          score_single: number | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          has_first_turn_impact: boolean
          id?: string
          list_opened_at: string
          opponent_player_id: string
          player_membership_id: string
          round_id: string
          score_go_first?: number | null
          score_go_second?: number | null
          score_single?: number | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          has_first_turn_impact?: boolean
          id?: string
          list_opened_at?: string
          opponent_player_id?: string
          player_membership_id?: string
          round_id?: string
          score_go_first?: number | null
          score_go_second?: number | null
          score_single?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchup_estimations_opponent_player_id_fkey"
            columns: ["opponent_player_id"]
            isOneToOne: false
            referencedRelation: "opponent_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchup_estimations_player_membership_id_fkey"
            columns: ["player_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchup_estimations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_sync_snapshots: {
        Row: {
          captain_membership_id: string
          client_snapshot_id: string
          id: string
          payload: Json
          round_id: string
          synced_at: string
        }
        Insert: {
          captain_membership_id: string
          client_snapshot_id: string
          id?: string
          payload: Json
          round_id: string
          synced_at?: string
        }
        Update: {
          captain_membership_id?: string
          client_snapshot_id?: string
          id?: string
          payload?: Json
          round_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_sync_snapshots_captain_membership_id_fkey"
            columns: ["captain_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sync_snapshots_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      opponent_players: {
        Row: {
          created_at: string
          external_ref: string | null
          faction: string | null
          id: string
          list_opened_required: boolean
          list_text: string | null
          name: string
          round_id: string
        }
        Insert: {
          created_at?: string
          external_ref?: string | null
          faction?: string | null
          id?: string
          list_opened_required?: boolean
          list_text?: string | null
          name: string
          round_id: string
        }
        Update: {
          created_at?: string
          external_ref?: string | null
          faction?: string | null
          id?: string
          list_opened_required?: boolean
          list_text?: string | null
          name?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opponent_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_assignments: {
        Row: {
          created_at: string
          estimation_id: string | null
          game_result: number | null
          id: string
          opponent_player_id: string
          pairing_run_id: string
          player_membership_id: string
          round_table_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimation_id?: string | null
          game_result?: number | null
          id?: string
          opponent_player_id: string
          pairing_run_id: string
          player_membership_id: string
          round_table_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimation_id?: string | null
          game_result?: number | null
          id?: string
          opponent_player_id?: string
          pairing_run_id?: string
          player_membership_id?: string
          round_table_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_assignments_estimation_id_fkey"
            columns: ["estimation_id"]
            isOneToOne: false
            referencedRelation: "matchup_estimations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_assignments_opponent_player_id_fkey"
            columns: ["opponent_player_id"]
            isOneToOne: false
            referencedRelation: "opponent_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_assignments_pairing_run_id_fkey"
            columns: ["pairing_run_id"]
            isOneToOne: false
            referencedRelation: "pairing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_assignments_player_membership_id_fkey"
            columns: ["player_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_assignments_round_table_id_fkey"
            columns: ["round_table_id"]
            isOneToOne: false
            referencedRelation: "round_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_runs: {
        Row: {
          created_at: string
          created_by_membership_id: string
          finalized_at: string | null
          id: string
          is_final: boolean
          mode: Database["public"]["Enums"]["pairing_mode"]
          name: string | null
          round_id: string
          simulation_rating:
            | Database["public"]["Enums"]["simulation_rating"]
            | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_membership_id: string
          finalized_at?: string | null
          id?: string
          is_final?: boolean
          mode: Database["public"]["Enums"]["pairing_mode"]
          name?: string | null
          round_id: string
          simulation_rating?:
            | Database["public"]["Enums"]["simulation_rating"]
            | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_membership_id?: string
          finalized_at?: string | null
          id?: string
          is_final?: boolean
          mode?: Database["public"]["Enums"]["pairing_mode"]
          name?: string | null
          round_id?: string
          simulation_rating?:
            | Database["public"]["Enums"]["simulation_rating"]
            | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_runs_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_runs_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_steps: {
        Row: {
          created_at: string
          id: string
          pairing_run_id: string
          payload: Json
          phase_key: string
          step_no: number
        }
        Insert: {
          created_at?: string
          id?: string
          pairing_run_id: string
          payload: Json
          phase_key: string
          step_no: number
        }
        Update: {
          created_at?: string
          id?: string
          pairing_run_id?: string
          payload?: Json
          phase_key?: string
          step_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "pairing_steps_pairing_run_id_fkey"
            columns: ["pairing_run_id"]
            isOneToOne: false
            referencedRelation: "pairing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      round_tables: {
        Row: {
          created_at: string
          id: string
          image_asset_id: string | null
          round_id: string
          table_name: string | null
          table_no: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_asset_id?: string | null
          round_id: string
          table_name?: string | null
          table_no: number
        }
        Update: {
          created_at?: string
          id?: string
          image_asset_id?: string | null
          round_id?: string
          table_name?: string | null
          table_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "round_tables_image_asset_id_fkey"
            columns: ["image_asset_id"]
            isOneToOne: false
            referencedRelation: "table_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_tables_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string
          deployment: string
          display_name: string
          id: string
          is_active: boolean
          locked_at: string | null
          locked_by_membership_id: string | null
          mission: string
          opponent_team_name: string | null
          round_number: number
          sort_order: number
          status: Database["public"]["Enums"]["round_status"]
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deployment: string
          display_name: string
          id?: string
          is_active?: boolean
          locked_at?: string | null
          locked_by_membership_id?: string | null
          mission: string
          opponent_team_name?: string | null
          round_number: number
          sort_order: number
          status?: Database["public"]["Enums"]["round_status"]
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deployment?: string
          display_name?: string
          id?: string
          is_active?: boolean
          locked_at?: string | null
          locked_by_membership_id?: string | null
          mission?: string
          opponent_team_name?: string | null
          round_number?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["round_status"]
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_locked_by_membership_id_fkey"
            columns: ["locked_by_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      table_assets: {
        Row: {
          created_at: string
          id: string
          image_url: string
          label: string
          source_attribution: string
          source_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          label: string
          source_attribution: string
          source_url: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          label?: string
          source_attribution?: string
          source_url?: string
        }
        Relationships: []
      }
      table_preferences: {
        Row: {
          created_at: string
          id: string
          player_membership_id: string
          preference: Database["public"]["Enums"]["table_preference_level"]
          round_id: string
          round_table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_membership_id: string
          preference: Database["public"]["Enums"]["table_preference_level"]
          round_id: string
          round_table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_membership_id?: string
          preference?: Database["public"]["Enums"]["table_preference_level"]
          round_id?: string
          round_table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_preferences_player_membership_id_fkey"
            columns: ["player_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_preferences_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_preferences_round_table_id_fkey"
            columns: ["round_table_id"]
            isOneToOne: false
            referencedRelation: "round_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          is_playing: boolean
          joined_at: string
          left_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_playing?: boolean
          joined_at?: string
          left_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_playing?: boolean
          joined_at?: string
          left_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by_user_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_rosters: {
        Row: {
          created_at: string
          id: string
          is_playing: boolean
          membership_id: string
          role: Database["public"]["Enums"]["app_role"]
          slot_no: number
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_playing: boolean
          membership_id: string
          role: Database["public"]["Enums"]["app_role"]
          slot_no: number
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_playing?: boolean
          membership_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          slot_no?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_rosters_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_rosters_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by_membership_id: string
          id: string
          name: string
          setup_locked_at: string | null
          source_type: Database["public"]["Enums"]["import_source"] | null
          source_url: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          team_id: string
          team_size: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by_membership_id: string
          id?: string
          name: string
          setup_locked_at?: string | null
          source_type?: Database["public"]["Enums"]["import_source"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          team_id: string
          team_size: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by_membership_id?: string
          id?: string
          name?: string
          setup_locked_at?: string | null
          source_type?: Database["public"]["Enums"]["import_source"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          team_id?: string
          team_size?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_membership_id_fkey"
            columns: ["created_by_membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          is_active: boolean
          pin_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id?: string
          is_active?: boolean
          pin_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean
          pin_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_round: { Args: { _round_id: string }; Returns: boolean }
      can_access_team: { Args: { _team_id: string }; Returns: boolean }
      can_access_tournament: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      can_manage_round: { Args: { _round_id: string }; Returns: boolean }
      can_manage_team: { Args: { _team_id: string }; Returns: boolean }
      can_manage_tournament: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      current_membership_id: { Args: never; Returns: string }
      current_team_id: { Args: never; Returns: string }
      has_completed_round_estimations: {
        Args: { _membership_id: string; _round_id: string }
        Returns: boolean
      }
      is_active_membership: {
        Args: { _membership_id: string; _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_current_captain_for_round: {
        Args: { _round_id: string }
        Returns: boolean
      }
      is_current_membership_player: { Args: never; Returns: boolean }
      is_round_editable: { Args: { _round_id: string }; Returns: boolean }
      is_team_captain: { Args: { _membership_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "captain" | "player"
      import_source: "champions_hub" | "best_coast_pairings" | "manual_fallback"
      import_status: "success" | "partial_success" | "failed"
      join_code_status: "active" | "exhausted" | "revoked" | "expired"
      pairing_mode: "simulation" | "live"
      round_status: "editable" | "locked"
      simulation_rating: "better" | "worse" | "neutral"
      table_preference_level: "preferred" | "not_preferred"
      tournament_status: "active" | "closed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["captain", "player"],
      import_source: [
        "champions_hub",
        "best_coast_pairings",
        "manual_fallback",
      ],
      import_status: ["success", "partial_success", "failed"],
      join_code_status: ["active", "exhausted", "revoked", "expired"],
      pairing_mode: ["simulation", "live"],
      round_status: ["editable", "locked"],
      simulation_rating: ["better", "worse", "neutral"],
      table_preference_level: ["preferred", "not_preferred"],
      tournament_status: ["active", "closed"],
    },
  },
} as const

