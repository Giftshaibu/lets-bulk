export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      available_equipment: {
        Row: {
          equipment_type: string;
          id: string;
          is_available: boolean | null;
          notes: string | null;
          user_id: string;
        };
        Insert: {
          equipment_type: string;
          id?: string;
          is_available?: boolean | null;
          notes?: string | null;
          user_id: string;
        };
        Update: {
          equipment_type?: string;
          id?: string;
          is_available?: boolean | null;
          notes?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      body_measurements: {
        Row: {
          arm_cm: number | null;
          chest_cm: number | null;
          date: string;
          id: string;
          thigh_cm: number | null;
          user_id: string;
          waist_cm: number | null;
        };
        Insert: {
          arm_cm?: number | null;
          chest_cm?: number | null;
          date: string;
          id?: string;
          thigh_cm?: number | null;
          user_id: string;
          waist_cm?: number | null;
        };
        Update: {
          arm_cm?: number | null;
          chest_cm?: number | null;
          date?: string;
          id?: string;
          thigh_cm?: number | null;
          user_id?: string;
          waist_cm?: number | null;
        };
        Relationships: [];
      };
      daily_checkins: {
        Row: {
          completed_actions: number | null;
          completed_at: string | null;
          completion_percentage: number | null;
          completion_policy: Json | null;
          date: string;
          day_completed: boolean | null;
          id: string;
          nutrition_logged: boolean | null;
          recovery_logged: boolean | null;
          required_actions: number | null;
          user_id: string;
          water_logged: boolean | null;
          weight_logged: boolean | null;
          workout_requirement_met: boolean | null;
        };
        Insert: {
          completed_actions?: number | null;
          completed_at?: string | null;
          completion_percentage?: number | null;
          completion_policy?: Json | null;
          date: string;
          day_completed?: boolean | null;
          id?: string;
          nutrition_logged?: boolean | null;
          recovery_logged?: boolean | null;
          required_actions?: number | null;
          user_id: string;
          water_logged?: boolean | null;
          weight_logged?: boolean | null;
          workout_requirement_met?: boolean | null;
        };
        Update: {
          completed_actions?: number | null;
          completed_at?: string | null;
          completion_percentage?: number | null;
          completion_policy?: Json | null;
          date?: string;
          day_completed?: boolean | null;
          id?: string;
          nutrition_logged?: boolean | null;
          recovery_logged?: boolean | null;
          required_actions?: number | null;
          user_id?: string;
          water_logged?: boolean | null;
          weight_logged?: boolean | null;
          workout_requirement_met?: boolean | null;
        };
        Relationships: [];
      };
      exercise_sets: {
        Row: {
          completed_at: string;
          exercise_id: string;
          id: string;
          is_completed: boolean;
          is_warmup: boolean;
          reps: number;
          rir: number | null;
          set_number: number;
          user_id: string;
          weight_kg: number;
          workout_session_id: string;
        };
        Insert: {
          completed_at?: string;
          exercise_id: string;
          id?: string;
          is_completed?: boolean;
          is_warmup?: boolean;
          reps: number;
          rir?: number | null;
          set_number: number;
          user_id: string;
          weight_kg: number;
          workout_session_id: string;
        };
        Update: {
          completed_at?: string;
          exercise_id?: string;
          id?: string;
          is_completed?: boolean;
          is_warmup?: boolean;
          reps?: number;
          rir?: number | null;
          set_number?: number;
          user_id?: string;
          weight_kg?: number;
          workout_session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercise_sets_workout_session_id_user_id_fkey";
            columns: ["workout_session_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      exercises: {
        Row: {
          common_mistakes: Json | null;
          default_rep_max: number | null;
          default_rep_min: number | null;
          default_rest_seconds: number | null;
          difficulty: string | null;
          equipment: string;
          exercise_type: string | null;
          id: string;
          illustration_author: string | null;
          illustration_style: string | null;
          illustration_url: string | null;
          instructions: Json | null;
          is_active: boolean | null;
          movement_pattern: string | null;
          name: string;
          primary_muscle: string;
          progression_increment_kg: number | null;
          required_equipment: Json;
          secondary_muscles: Json | null;
          slug: string;
          source: string | null;
          source_license: string | null;
        };
        Insert: {
          common_mistakes?: Json | null;
          default_rep_max?: number | null;
          default_rep_min?: number | null;
          default_rest_seconds?: number | null;
          difficulty?: string | null;
          equipment: string;
          exercise_type?: string | null;
          id?: string;
          illustration_author?: string | null;
          illustration_style?: string | null;
          illustration_url?: string | null;
          instructions?: Json | null;
          is_active?: boolean | null;
          movement_pattern?: string | null;
          name: string;
          primary_muscle: string;
          progression_increment_kg?: number | null;
          required_equipment?: Json;
          secondary_muscles?: Json | null;
          slug: string;
          source?: string | null;
          source_license?: string | null;
        };
        Update: {
          common_mistakes?: Json | null;
          default_rep_max?: number | null;
          default_rep_min?: number | null;
          default_rest_seconds?: number | null;
          difficulty?: string | null;
          equipment?: string;
          exercise_type?: string | null;
          id?: string;
          illustration_author?: string | null;
          illustration_style?: string | null;
          illustration_url?: string | null;
          instructions?: Json | null;
          is_active?: boolean | null;
          movement_pattern?: string | null;
          name?: string;
          primary_muscle?: string;
          progression_increment_kg?: number | null;
          required_equipment?: Json;
          secondary_muscles?: Json | null;
          slug?: string;
          source?: string | null;
          source_license?: string | null;
        };
        Relationships: [];
      };
      food_prices: {
        Row: {
          food_id: string;
          id: string;
          place: string | null;
          price_mwk: number;
          quantity: number;
          recorded_at: string;
          unit: string;
          user_id: string;
        };
        Insert: {
          food_id: string;
          id?: string;
          place?: string | null;
          price_mwk: number;
          quantity: number;
          recorded_at?: string;
          unit: string;
          user_id: string;
        };
        Update: {
          food_id?: string;
          id?: string;
          place?: string | null;
          price_mwk?: number;
          quantity?: number;
          recorded_at?: string;
          unit?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_prices_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          alcohol_g_per_100g: number | null;
          availability: string | null;
          calories_per_100g: number | null;
          carbs_per_100g: number | null;
          category: string;
          common_in_malawi: boolean | null;
          created_at: string | null;
          fat_per_100g: number | null;
          fiber_per_100g: number | null;
          id: string;
          is_active: boolean | null;
          local_name: string | null;
          name: string;
          preparation_state: string;
          protein_per_100g: number | null;
          serving_grams: number | null;
          serving_name: string | null;
          serving_volume_ml: number | null;
          source: string;
          source_license: string | null;
          source_reference: string | null;
          source_year: number | null;
          user_id: string | null;
        };
        Insert: {
          alcohol_g_per_100g?: number | null;
          availability?: string | null;
          calories_per_100g?: number | null;
          carbs_per_100g?: number | null;
          category: string;
          common_in_malawi?: boolean | null;
          created_at?: string | null;
          fat_per_100g?: number | null;
          fiber_per_100g?: number | null;
          id?: string;
          is_active?: boolean | null;
          local_name?: string | null;
          name: string;
          preparation_state: string;
          protein_per_100g?: number | null;
          serving_grams?: number | null;
          serving_name?: string | null;
          serving_volume_ml?: number | null;
          source: string;
          source_license?: string | null;
          source_reference?: string | null;
          source_year?: number | null;
          user_id?: string | null;
        };
        Update: {
          alcohol_g_per_100g?: number | null;
          availability?: string | null;
          calories_per_100g?: number | null;
          carbs_per_100g?: number | null;
          category?: string;
          common_in_malawi?: boolean | null;
          created_at?: string | null;
          fat_per_100g?: number | null;
          fiber_per_100g?: number | null;
          id?: string;
          is_active?: boolean | null;
          local_name?: string | null;
          name?: string;
          preparation_state?: string;
          protein_per_100g?: number | null;
          serving_grams?: number | null;
          serving_name?: string | null;
          serving_volume_ml?: number | null;
          source?: string;
          source_license?: string | null;
          source_reference?: string | null;
          source_year?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      gym_load_options: {
        Row: {
          equipment_type: string;
          exercise_id: string | null;
          id: string;
          increment_kg: number;
          maximum_kg: number;
          minimum_kg: number;
          user_id: string;
        };
        Insert: {
          equipment_type: string;
          exercise_id?: string | null;
          id?: string;
          increment_kg: number;
          maximum_kg: number;
          minimum_kg?: number;
          user_id: string;
        };
        Update: {
          equipment_type?: string;
          exercise_id?: string | null;
          id?: string;
          increment_kg?: number;
          maximum_kg?: number;
          minimum_kg?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gym_load_options_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_items: {
        Row: {
          food_id: string;
          grams: number;
          id: string;
          meal_id: string;
          sort_order: number | null;
          user_id: string;
        };
        Insert: {
          food_id: string;
          grams: number;
          id?: string;
          meal_id: string;
          sort_order?: number | null;
          user_id: string;
        };
        Update: {
          food_id?: string;
          grams?: number;
          id?: string;
          meal_id?: string;
          sort_order?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_items_meal_id_user_id_fkey";
            columns: ["meal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      meals: {
        Row: {
          description: string | null;
          id: string;
          is_favorite: boolean | null;
          meal_type: string | null;
          name: string;
          user_id: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          is_favorite?: boolean | null;
          meal_type?: string | null;
          name: string;
          user_id: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          is_favorite?: boolean | null;
          meal_type?: string | null;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      nutrition_log_items: {
        Row: {
          calories: number;
          carbs_g: number;
          fat_g: number;
          food_id: string;
          grams: number;
          id: string;
          name: string;
          nutrition_log_id: string;
          protein_g: number;
          user_id: string;
        };
        Insert: {
          calories: number;
          carbs_g: number;
          fat_g: number;
          food_id: string;
          grams: number;
          id?: string;
          name: string;
          nutrition_log_id: string;
          protein_g: number;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          fat_g?: number;
          food_id?: string;
          grams?: number;
          id?: string;
          name?: string;
          nutrition_log_id?: string;
          protein_g?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nutrition_log_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nutrition_log_items_nutrition_log_id_user_id_fkey";
            columns: ["nutrition_log_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "nutrition_logs";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      nutrition_logs: {
        Row: {
          date: string;
          id: string;
          logged_at: string;
          meal_id: string | null;
          meal_type: string;
          user_id: string;
        };
        Insert: {
          date: string;
          id?: string;
          logged_at?: string;
          meal_id?: string | null;
          meal_type: string;
          user_id: string;
        };
        Update: {
          date?: string;
          id?: string;
          logged_at?: string;
          meal_id?: string | null;
          meal_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_meal_id_user_id_fkey";
            columns: ["meal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      nutrition_targets: {
        Row: {
          calories_target: number;
          carbs_target_g: number;
          created_at: string | null;
          created_from_recommendation_id: string | null;
          effective_from: string;
          effective_to: string | null;
          fat_target_g: number;
          id: string;
          protein_target_g: number;
          reason: string | null;
          user_id: string;
          version: number;
        };
        Insert: {
          calories_target: number;
          carbs_target_g: number;
          created_at?: string | null;
          created_from_recommendation_id?: string | null;
          effective_from: string;
          effective_to?: string | null;
          fat_target_g: number;
          id?: string;
          protein_target_g: number;
          reason?: string | null;
          user_id: string;
          version: number;
        };
        Update: {
          calories_target?: number;
          carbs_target_g?: number;
          created_at?: string | null;
          created_from_recommendation_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          fat_target_g?: number;
          id?: string;
          protein_target_g?: number;
          reason?: string | null;
          user_id?: string;
          version?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          currency: string;
          first_name: string;
          goal_weight_kg: number;
          height_cm: number;
          id: string;
          start_date: string;
          starting_weight_kg: number;
          target_date: string | null;
          timezone: string;
          track_creatine: boolean | null;
          training_days_per_week: number;
          training_experience: string | null;
          updated_at: string;
          user_id: string;
          water_target_ml: number;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          first_name: string;
          goal_weight_kg: number;
          height_cm: number;
          id?: string;
          start_date: string;
          starting_weight_kg: number;
          target_date?: string | null;
          timezone?: string;
          track_creatine?: boolean | null;
          training_days_per_week?: number;
          training_experience?: string | null;
          updated_at?: string;
          user_id: string;
          water_target_ml?: number;
        };
        Update: {
          created_at?: string;
          currency?: string;
          first_name?: string;
          goal_weight_kg?: number;
          height_cm?: number;
          id?: string;
          start_date?: string;
          starting_weight_kg?: number;
          target_date?: string | null;
          timezone?: string;
          track_creatine?: boolean | null;
          training_days_per_week?: number;
          training_experience?: string | null;
          updated_at?: string;
          user_id?: string;
          water_target_ml?: number;
        };
        Relationships: [];
      };
      program_weeks: {
        Row: {
          goal: string | null;
          id: string;
          phase_week: number;
          training_program_id: string;
          user_id: string;
          week_number: number;
        };
        Insert: {
          goal?: string | null;
          id?: string;
          phase_week?: number;
          training_program_id: string;
          user_id: string;
          week_number: number;
        };
        Update: {
          goal?: string | null;
          id?: string;
          phase_week?: number;
          training_program_id?: string;
          user_id?: string;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "program_weeks_training_program_id_user_id_fkey";
            columns: ["training_program_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "training_programs";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      progress_photos: {
        Row: {
          date: string;
          id: string;
          phase: string | null;
          storage_path: string;
          user_id: string;
          view: string;
          weight_kg: number | null;
        };
        Insert: {
          date: string;
          id?: string;
          phase?: string | null;
          storage_path: string;
          user_id: string;
          view: string;
          weight_kg?: number | null;
        };
        Update: {
          date?: string;
          id?: string;
          phase?: string | null;
          storage_path?: string;
          user_id?: string;
          view?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      recommendations: {
        Row: {
          accepted_at: string | null;
          confidence: number;
          created_at: string | null;
          current_value: number | null;
          description: string | null;
          id: string;
          payload: Json;
          reason: string;
          recommended_value: number | null;
          rejected_at: string | null;
          request_id: string | null;
          source_period_end: string;
          source_period_start: string;
          status: string;
          title: string;
          type: string;
          unit: string | null;
          user_id: string;
          weekly_analysis_id: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          confidence: number;
          created_at?: string | null;
          current_value?: number | null;
          description?: string | null;
          id?: string;
          payload?: Json;
          reason: string;
          recommended_value?: number | null;
          rejected_at?: string | null;
          request_id?: string | null;
          source_period_end: string;
          source_period_start: string;
          status?: string;
          title: string;
          type: string;
          unit?: string | null;
          user_id: string;
          weekly_analysis_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          confidence?: number;
          created_at?: string | null;
          current_value?: number | null;
          description?: string | null;
          id?: string;
          payload?: Json;
          reason?: string;
          recommended_value?: number | null;
          rejected_at?: string | null;
          request_id?: string | null;
          source_period_end?: string;
          source_period_start?: string;
          status?: string;
          title?: string;
          type?: string;
          unit?: string | null;
          user_id?: string;
          weekly_analysis_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recommendations_weekly_analysis_id_user_id_fkey";
            columns: ["weekly_analysis_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "weekly_analyses";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      recovery_logs: {
        Row: {
          date: string;
          energy: number;
          id: string;
          recovery_score: number;
          sleep_hours: number;
          soreness: number;
          status: string;
          stress: number;
          user_id: string;
        };
        Insert: {
          date: string;
          energy: number;
          id?: string;
          recovery_score: number;
          sleep_hours: number;
          soreness: number;
          status: string;
          stress: number;
          user_id: string;
        };
        Update: {
          date?: string;
          energy?: number;
          id?: string;
          recovery_score?: number;
          sleep_hours?: number;
          soreness?: number;
          status?: string;
          stress?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      training_programs: {
        Row: {
          created_from_recommendation_id: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          name: string;
          phase: string;
          planned_until: string | null;
          resume_program_id: string | null;
          user_id: string;
          version: number;
        };
        Insert: {
          created_from_recommendation_id?: string | null;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          name: string;
          phase?: string;
          planned_until?: string | null;
          resume_program_id?: string | null;
          user_id: string;
          version: number;
        };
        Update: {
          created_from_recommendation_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          name?: string;
          phase?: string;
          planned_until?: string | null;
          resume_program_id?: string | null;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "training_programs_resume_program_id_user_id_fkey";
            columns: ["resume_program_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "training_programs";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          budget_mode: string | null;
          completion_policy: Json;
          diet_type: string | null;
          evening_reminder: boolean;
          id: string;
          mass_unit: string;
          meals_per_day: number | null;
          morning_reminder: boolean;
          morning_time: string;
          notifications_enabled: boolean | null;
          onboarding_context: Json;
          units: string | null;
          user_id: string;
          volume_unit: string;
        };
        Insert: {
          budget_mode?: string | null;
          completion_policy?: Json;
          diet_type?: string | null;
          evening_reminder?: boolean;
          id?: string;
          mass_unit?: string;
          meals_per_day?: number | null;
          morning_reminder?: boolean;
          morning_time?: string;
          notifications_enabled?: boolean | null;
          onboarding_context?: Json;
          units?: string | null;
          user_id: string;
          volume_unit?: string;
        };
        Update: {
          budget_mode?: string | null;
          completion_policy?: Json;
          diet_type?: string | null;
          evening_reminder?: boolean;
          id?: string;
          mass_unit?: string;
          meals_per_day?: number | null;
          morning_reminder?: boolean;
          morning_time?: string;
          notifications_enabled?: boolean | null;
          onboarding_context?: Json;
          units?: string | null;
          user_id?: string;
          volume_unit?: string;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          amount_ml: number;
          date: string;
          id: string;
          logged_at: string | null;
          user_id: string;
        };
        Insert: {
          amount_ml: number;
          date: string;
          id?: string;
          logged_at?: string | null;
          user_id: string;
        };
        Update: {
          amount_ml?: number;
          date?: string;
          id?: string;
          logged_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      weekly_analyses: {
        Row: {
          confidence: number;
          created_at: string | null;
          data_completeness: number;
          id: string;
          period_end: string;
          period_start: string;
          raw_analysis: Json;
          user_id: string;
        };
        Insert: {
          confidence: number;
          created_at?: string | null;
          data_completeness: number;
          id?: string;
          period_end: string;
          period_start: string;
          raw_analysis: Json;
          user_id: string;
        };
        Update: {
          confidence?: number;
          created_at?: string | null;
          data_completeness?: number;
          id?: string;
          period_end?: string;
          period_start?: string;
          raw_analysis?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          date: string;
          id: string;
          logged_at: string | null;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          date: string;
          id?: string;
          logged_at?: string | null;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          date?: string;
          id?: string;
          logged_at?: string | null;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          completed_at: string | null;
          duration_seconds: number | null;
          id: string;
          notes: string | null;
          session_date: string;
          started_at: string;
          status: string;
          user_id: string;
          workout_template_id: string;
        };
        Insert: {
          completed_at?: string | null;
          duration_seconds?: number | null;
          id?: string;
          notes?: string | null;
          session_date: string;
          started_at?: string;
          status?: string;
          user_id: string;
          workout_template_id: string;
        };
        Update: {
          completed_at?: string | null;
          duration_seconds?: number | null;
          id?: string;
          notes?: string | null;
          session_date?: string;
          started_at?: string;
          status?: string;
          user_id?: string;
          workout_template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_template_id_user_id_fkey";
            columns: ["workout_template_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      workout_template_exercises: {
        Row: {
          exercise_id: string;
          id: string;
          lineage_id: string;
          planned_weight_kg: number;
          rep_max: number;
          rep_min: number;
          rest_seconds: number | null;
          sets: number;
          sort_order: number;
          target_rir: number | null;
          user_id: string;
          workout_template_id: string;
        };
        Insert: {
          exercise_id: string;
          id?: string;
          lineage_id?: string;
          planned_weight_kg?: number;
          rep_max: number;
          rep_min: number;
          rest_seconds?: number | null;
          sets: number;
          sort_order: number;
          target_rir?: number | null;
          user_id: string;
          workout_template_id: string;
        };
        Update: {
          exercise_id?: string;
          id?: string;
          lineage_id?: string;
          planned_weight_kg?: number;
          rep_max?: number;
          rep_min?: number;
          rest_seconds?: number | null;
          sets?: number;
          sort_order?: number;
          target_rir?: number | null;
          user_id?: string;
          workout_template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_template_exercises_workout_template_id_user_id_fkey";
            columns: ["workout_template_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      workout_templates: {
        Row: {
          day_of_week: number;
          estimated_minutes: number | null;
          id: string;
          lineage_id: string;
          name: string;
          program_week_id: string;
          sort_order: number;
          user_id: string;
        };
        Insert: {
          day_of_week: number;
          estimated_minutes?: number | null;
          id?: string;
          lineage_id?: string;
          name: string;
          program_week_id: string;
          sort_order?: number;
          user_id: string;
        };
        Update: {
          day_of_week?: number;
          estimated_minutes?: number | null;
          id?: string;
          lineage_id?: string;
          name?: string;
          program_week_id?: string;
          sort_order?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_templates_program_week_id_user_id_fkey";
            columns: ["program_week_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "program_weeks";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      logging_days: {
        Row: {
          date: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      ai_begin: {
        Args: {
          p_hash: string;
          p_model: string;
          p_task: string;
          p_version: string;
        };
        Returns: Json;
      };
      ai_finish: {
        Args: { p_error: string; p_id: string; p_output: Json; p_ttl: number };
        Returns: undefined;
      };
      can_use_exercise: { Args: { p_exercise: string }; Returns: boolean };
      claim_due_reminders: { Args: never; Returns: Json };
      complete_workout: { Args: { p_session: string }; Returns: undefined };
      delete_set: { Args: { p_id: string }; Returns: undefined };
      expire_recommendations: { Args: never; Returns: number };
      finish_reminder: {
        Args: { p_id: string; p_status: number; p_token: string };
        Returns: undefined;
      };
      guided_initialize: {
        Args: { p_input: Json; p_targets: Json };
        Returns: undefined;
      };
      initial_exercise_load: {
        Args: { p_id: string; p_weight: number };
        Returns: undefined;
      };
      initialize_profile: {
        Args: { p_equipment: Json; p_profile: Json; p_targets: Json };
        Returns: undefined;
      };
      log_food: {
        Args: {
          p_date: string;
          p_food: string;
          p_grams: number;
          p_id: string;
          p_slot: string;
        };
        Returns: string;
      };
      log_food_batch: {
        Args: { p_date: string; p_items: Json };
        Returns: number;
      };
      log_meal: {
        Args: { p_date: string; p_id: string; p_meal: string; p_slot: string };
        Returns: string;
      };
      prepare_test_push: { Args: { p_endpoint: string }; Returns: Json };
      reconcile_rewards: { Args: never; Returns: Json };
      refresh_completion: { Args: { p_date: string }; Returns: undefined };
      reminder_still_needed: {
        Args: { p_id: string; p_token: string };
        Returns: boolean;
      };
      remove_push_subscription: {
        Args: { p_endpoint: string };
        Returns: undefined;
      };
      resolve_recommendation: {
        Args: { p_accept: boolean; p_id: string };
        Returns: undefined;
      };
      save_meal: {
        Args: { p_id: string; p_items: Json; p_name: string; p_slot: string };
        Returns: string;
      };
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string };
        Returns: string;
      };
      save_review: {
        Args: {
          p_analysis: Json;
          p_end: string;
          p_recommendations: Json;
          p_start: string;
        };
        Returns: string;
      };
      save_set: {
        Args: {
          p_done: boolean;
          p_exercise: string;
          p_number: number;
          p_reps: number;
          p_rir: number;
          p_session: string;
          p_weight: number;
        };
        Returns: string;
      };
      save_settings: { Args: { p_settings: Json }; Returns: undefined };
      start_workout: { Args: { p_template: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
