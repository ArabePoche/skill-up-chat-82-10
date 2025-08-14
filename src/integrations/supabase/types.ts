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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      active_interviews: {
        Row: {
          created_at: string | null
          ended_at: string | null
          formation_id: string
          id: string
          is_active: boolean | null
          lesson_id: string
          started_at: string | null
          student_id: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          formation_id: string
          id?: string
          is_active?: boolean | null
          lesson_id: string
          started_at?: string | null
          student_id: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          formation_id?: string
          id?: string
          is_active?: boolean | null
          lesson_id?: string
          started_at?: string | null
          student_id?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_interviews_formation_id_fkey1"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_interviews_lesson_id_fkey1"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_interviews_teacher_id_fkey2"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_type: string
          caller_id: string
          created_at: string
          ended_at: string | null
          formation_id: string
          id: string
          lesson_id: string
          receiver_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          call_type: string
          caller_id: string
          created_at?: string
          ended_at?: string | null
          formation_id: string
          id?: string
          lesson_id: string
          receiver_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          formation_id?: string
          id?: string
          lesson_id?: string
          receiver_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_caller_id_fkey1"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_receiver_id_fkey1"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string | null
          id: string
          product_id: string | null
          quantity: number | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          label: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          created_at: string | null
          date: string
          formation_id: string
          id: string
          messages_sent: number
          minutes_used: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          formation_id: string
          id?: string
          messages_sent?: number
          minutes_used?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          formation_id?: string
          id?: string
          messages_sent?: number
          minutes_used?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_usage_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_requests: {
        Row: {
          created_at: string | null
          decided_by: string | null
          formation_id: string
          id: string
          plan_type: string | null
          rejected_reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          decided_by?: string | null
          formation_id: string
          id?: string
          plan_type?: string | null
          rejected_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          decided_by?: string | null
          formation_id?: string
          id?: string
          plan_type?: string | null
          rejected_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requests_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requests_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_files: {
        Row: {
          created_at: string
          exercise_id: string
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          file_type: string
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_files_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          id: string
          lesson_id: string
          title: string
          type: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id: string
          title: string
          type?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_activity: {
        Row: {
          created_at: string
          expert_name: string
          id: string
          last_review_at: string | null
          reviews_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expert_name: string
          id?: string
          last_review_at?: string | null
          reviews_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expert_name?: string
          id?: string
          last_review_at?: string | null
          reviews_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      expert_reviews: {
        Row: {
          action: string
          comment: string
          created_at: string
          expert_name: string
          id: string
          reviewed_at: string
          submission_id: string
        }
        Insert: {
          action: string
          comment: string
          created_at?: string
          expert_name: string
          id?: string
          reviewed_at?: string
          submission_id: string
        }
        Update: {
          action?: string
          comment?: string
          created_at?: string
          expert_name?: string
          id?: string
          reviewed_at?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_stats: {
        Row: {
          approval_rate: number | null
          approved_today: number
          average_review_time_hours: number | null
          created_at: string
          date: string
          id: string
          pending_review: number
          rejected_today: number
          total_submissions: number
          updated_at: string
        }
        Insert: {
          approval_rate?: number | null
          approved_today?: number
          average_review_time_hours?: number | null
          created_at?: string
          date?: string
          id?: string
          pending_review?: number
          rejected_today?: number
          total_submissions?: number
          updated_at?: string
        }
        Update: {
          approval_rate?: number | null
          approved_today?: number
          average_review_time_hours?: number | null
          created_at?: string
          date?: string
          id?: string
          pending_review?: number
          rejected_today?: number
          total_submissions?: number
          updated_at?: string
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          content_id: string
          content_title: string
          content_type: string
          created_at: string
          id: string
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_title: string
          content_type: string
          created_at?: string
          id?: string
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_title?: string
          content_type?: string
          created_at?: string
          id?: string
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      formation_pricing_options: {
        Row: {
          allow_calls: boolean | null
          allow_discussion: boolean | null
          allow_exercises: boolean | null
          allowed_call_days: string[] | null
          allowed_response_days: string[] | null
          call_type: string | null
          created_at: string | null
          formation_id: string | null
          id: string
          is_active: boolean | null
          lesson_access: string[] | null
          message_limit_per_day: number | null
          plan_type: string
          price_monthly: number | null
          price_yearly: number | null
          time_limit_minutes_per_day: number | null
          time_limit_minutes_per_week: number | null
          updated_at: string | null
        }
        Insert: {
          allow_calls?: boolean | null
          allow_discussion?: boolean | null
          allow_exercises?: boolean | null
          allowed_call_days?: string[] | null
          allowed_response_days?: string[] | null
          call_type?: string | null
          created_at?: string | null
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          lesson_access?: string[] | null
          message_limit_per_day?: number | null
          plan_type: string
          price_monthly?: number | null
          price_yearly?: number | null
          time_limit_minutes_per_day?: number | null
          time_limit_minutes_per_week?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_calls?: boolean | null
          allow_discussion?: boolean | null
          allow_exercises?: boolean | null
          allowed_call_days?: string[] | null
          allowed_response_days?: string[] | null
          call_type?: string | null
          created_at?: string | null
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          lesson_access?: string[] | null
          message_limit_per_day?: number | null
          plan_type?: string
          price_monthly?: number | null
          price_yearly?: number | null
          time_limit_minutes_per_day?: number | null
          time_limit_minutes_per_week?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formation_pricing_options_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_sales_stats: {
        Row: {
          created_at: string | null
          date: string | null
          formation_id: string
          id: string
          teacher_payments_total: number | null
          total_exercises_validated: number | null
          total_interviews_completed: number | null
          total_sales: number | null
          units_sold: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          formation_id: string
          id?: string
          teacher_payments_total?: number | null
          total_exercises_validated?: number | null
          total_interviews_completed?: number | null
          total_sales?: number | null
          units_sold?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          formation_id?: string
          id?: string
          teacher_payments_total?: number | null
          total_exercises_validated?: number | null
          total_interviews_completed?: number | null
          total_sales?: number | null
          units_sold?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      formations: {
        Row: {
          author_id: string | null
          badge: string | null
          completion_rate: number | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          duration: number | null
          duration_hours: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          languages: string[] | null
          level_count: number | null
          original_price: number | null
          price: number | null
          promo_video_url: string | null
          rating: number | null
          students_count: number | null
          thumbnail_url: string | null
          title: string | null
          total_lessons: number | null
          updated_at: string | null
          video_promo_id: string | null
        }
        Insert: {
          author_id?: string | null
          badge?: string | null
          completion_rate?: number | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          duration?: number | null
          duration_hours?: number | null
          id: string
          image_url?: string | null
          is_active?: boolean | null
          languages?: string[] | null
          level_count?: number | null
          original_price?: number | null
          price?: number | null
          promo_video_url?: string | null
          rating?: number | null
          students_count?: number | null
          thumbnail_url?: string | null
          title?: string | null
          total_lessons?: number | null
          updated_at?: string | null
          video_promo_id?: string | null
        }
        Update: {
          author_id?: string | null
          badge?: string | null
          completion_rate?: number | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          duration?: number | null
          duration_hours?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          languages?: string[] | null
          level_count?: number | null
          original_price?: number | null
          price?: number | null
          promo_video_url?: string | null
          rating?: number | null
          students_count?: number | null
          thumbnail_url?: string | null
          title?: string | null
          total_lessons?: number | null
          updated_at?: string | null
          video_promo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_evaluations: {
        Row: {
          created_at: string | null
          expires_at: string
          feedback_text: string | null
          formation_id: string
          id: string
          interview_session_id: string | null
          is_satisfied: boolean | null
          lesson_id: string
          responded_at: string | null
          satisfaction_rating: number | null
          student_id: string
          teacher_id: string
          teacher_rating: number | null
          updated_at: string | null
          wants_same_teacher: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          feedback_text?: string | null
          formation_id: string
          id?: string
          interview_session_id?: string | null
          is_satisfied?: boolean | null
          lesson_id: string
          responded_at?: string | null
          satisfaction_rating?: number | null
          student_id: string
          teacher_id: string
          teacher_rating?: number | null
          updated_at?: string | null
          wants_same_teacher?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          feedback_text?: string | null
          formation_id?: string
          id?: string
          interview_session_id?: string | null
          is_satisfied?: boolean | null
          lesson_id?: string
          responded_at?: string | null
          satisfaction_rating?: number | null
          student_id?: string
          teacher_id?: string
          teacher_rating?: number | null
          updated_at?: string | null
          wants_same_teacher?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_evaluations_formation_id_fkey1"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_interview_session_id_fkey1"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "active_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_lesson_id_fkey1"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_teacher_id_fkey1"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_exercises: {
        Row: {
          exercise_id: string
          lesson_id: string
        }
        Insert: {
          exercise_id: string
          lesson_id: string
        }
        Update: {
          exercise_id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_messages: {
        Row: {
          content: string
          created_at: string
          exercise_id: string | null
          exercise_status: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          formation_id: string
          id: string
          is_exercise_submission: boolean | null
          is_read: boolean | null
          is_system_message: boolean | null
          lesson_id: string
          message_type: string
          promotion_id: string | null
          read_by_teachers: string[] | null
          receiver_id: string | null
          replied_to_message_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          exercise_id?: string | null
          exercise_status?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          formation_id: string
          id?: string
          is_exercise_submission?: boolean | null
          is_read?: boolean | null
          is_system_message?: boolean | null
          lesson_id: string
          message_type?: string
          promotion_id?: string | null
          read_by_teachers?: string[] | null
          receiver_id?: string | null
          replied_to_message_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          exercise_id?: string | null
          exercise_status?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          formation_id?: string
          id?: string
          is_exercise_submission?: boolean | null
          is_read?: boolean | null
          is_system_message?: boolean | null
          lesson_id?: string
          message_type?: string
          promotion_id?: string | null
          read_by_teachers?: string[] | null
          receiver_id?: string | null
          replied_to_message_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_messages_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_messages_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_messages_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_messages_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_messages_replied_to_message_id_fkey"
            columns: ["replied_to_message_id"]
            isOneToOne: false
            referencedRelation: "lesson_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string | null
          description: string | null
          duration: string | null
          has_exercise: boolean | null
          id: string
          language: string | null
          level_id: string | null
          order_index: number
          reference_id: string
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          has_exercise?: boolean | null
          id?: string
          language?: string | null
          level_id?: string | null
          order_index: number
          reference_id: string
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: string | null
          has_exercise?: boolean | null
          id?: string
          language?: string | null
          level_id?: string | null
          order_index?: number
          reference_id?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string | null
          description: string | null
          formation_id: string | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          formation_id?: string | null
          id?: string
          order_index: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          formation_id?: string | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "levels_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "lesson_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string | null
          fcm_response: Json | null
          id: string
          message: string
          notification_type: string
          sent_at: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fcm_response?: Json | null
          id?: string
          message: string
          notification_type: string
          sent_at?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fcm_response?: Json | null
          id?: string
          message?: string
          notification_type?: string
          sent_at?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          enrollment_id: string | null
          formation_id: string | null
          id: string
          is_for_all_admins: boolean
          is_read: boolean
          message: string
          order_id: string | null
          requested_plan_type: string | null
          subscription_approved_by: string | null
          subscription_plan_changed_by: string | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enrollment_id?: string | null
          formation_id?: string | null
          id?: string
          is_for_all_admins?: boolean
          is_read?: boolean
          message: string
          order_id?: string | null
          requested_plan_type?: string | null
          subscription_approved_by?: string | null
          subscription_plan_changed_by?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string | null
          formation_id?: string | null
          id?: string
          is_for_all_admins?: boolean
          is_read?: boolean
          message?: string
          order_id?: string | null
          requested_plan_type?: string | null
          subscription_approved_by?: string | null
          subscription_plan_changed_by?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          id?: string
          order_id?: string | null
          price: number
          product_id?: string | null
          quantity: number
        }
        Update: {
          id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          total_amount: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          total_amount: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          total_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          id: string
          metadata: Json | null
          order_index: number
          post_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string
          file_url: string
          id?: string
          metadata?: Json | null
          order_index?: number
          post_id: string
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          metadata?: Json | null
          order_index?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
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
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          likes_count: number
          post_type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          likes_count?: number
          post_type: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          likes_count?: number
          post_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          badge: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          image_url: string | null
          instructor_id: string | null
          is_active: boolean | null
          original_price: number | null
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          promo_video_url: string | null
          rating: number | null
          students_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          badge?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          is_active?: boolean | null
          original_price?: number | null
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          promo_video_url?: string | null
          rating?: number | null
          students_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          badge?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          is_active?: boolean | null
          original_price?: number | null
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          promo_video_url?: string | null
          rating?: number | null
          students_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          interests: string[] | null
          is_teacher: boolean | null
          language: string | null
          last_name: string | null
          phone: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          subscribers_count: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          is_teacher?: boolean | null
          language?: string | null
          last_name?: string | null
          phone?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          subscribers_count?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_teacher?: boolean | null
          language?: string | null
          last_name?: string | null
          phone?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          subscribers_count?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string | null
          formation_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          device_type: string
          id: string
          is_active: boolean | null
          notification_preferences: Json | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string
          id?: string
          is_active?: boolean | null
          notification_preferences?: Json | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string
          id?: string
          is_active?: boolean | null
          notification_preferences?: Json | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_videos: {
        Row: {
          id: string
          saved_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          id?: string
          saved_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          id?: string
          saved_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      story_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant1_id: string
          participant2_id: string
          story_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant1_id: string
          participant2_id: string
          story_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant1_id?: string
          participant2_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_conversations_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
          story_reference: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
          story_reference?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
          story_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "story_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activity_tracking: {
        Row: {
          created_at: string | null
          formation_id: string
          id: string
          is_locked_for_inactivity: boolean | null
          last_submission_at: string | null
          lesson_id: string
          locked_at: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          formation_id: string
          id?: string
          is_locked_for_inactivity?: boolean | null
          last_submission_at?: string | null
          lesson_id: string
          locked_at?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          formation_id?: string
          id?: string
          is_locked_for_inactivity?: boolean | null
          last_submission_at?: string | null
          lesson_id?: string
          locked_at?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      student_course_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          formation_id: string
          id: string
          instructor_id: string
          is_active: boolean | null
          lesson_id: string
          started_at: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          formation_id: string
          id?: string
          instructor_id: string
          is_active?: boolean | null
          lesson_id: string
          started_at?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          formation_id?: string
          id?: string
          instructor_id?: string
          is_active?: boolean | null
          lesson_id?: string
          started_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_interviews_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_interviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_interviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_interviews_teacher_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_course_sessions_media: {
        Row: {
          created_at: string | null
          file_size: number | null
          id: string
          is_active: boolean | null
          media_description: string | null
          media_name: string | null
          media_type: string
          media_url: string
          mime_type: string | null
          session_id: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          media_description?: string | null
          media_name?: string | null
          media_type: string
          media_url: string
          mime_type?: string | null
          session_id: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          media_description?: string | null
          media_name?: string | null
          media_type?: string
          media_url?: string
          mime_type?: string | null
          session_id?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_course_sessions_media_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_course_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_course_sessions_media_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_sessions_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_course_sessions_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_course_sessions_notes: {
        Row: {
          created_at: string | null
          expires_at: string | null
          formation_id: string
          id: string
          instructor_id: string
          interview_session_id: string | null
          is_satisfied: boolean | null
          lesson_id: string
          responded_at: string | null
          satisfaction_rating: number | null
          student_id: string
          teacher_rating: number | null
          wants_same_teacher: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          formation_id: string
          id?: string
          instructor_id: string
          interview_session_id?: string | null
          is_satisfied?: boolean | null
          lesson_id: string
          responded_at?: string | null
          satisfaction_rating?: number | null
          student_id: string
          teacher_rating?: number | null
          wants_same_teacher?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          formation_id?: string
          id?: string
          instructor_id?: string
          interview_session_id?: string | null
          is_satisfied?: boolean | null
          lesson_id?: string
          responded_at?: string | null
          satisfaction_rating?: number | null
          student_id?: string
          teacher_rating?: number | null
          wants_same_teacher?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_evaluations_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "student_course_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "student_sessions_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_teacher_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payment: {
        Row: {
          amount: number | null
          comment: string | null
          created_at: string | null
          created_by: string
          days_added: number | null
          formation_id: string
          id: string
          is_request: boolean | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          requested_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          comment?: string | null
          created_at?: string | null
          created_by: string
          days_added?: number | null
          formation_id: string
          id?: string
          is_request?: boolean | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          comment?: string | null
          created_at?: string | null
          created_by?: string
          days_added?: number | null
          formation_id?: string
          id?: string
          is_request?: boolean | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_payment_progress: {
        Row: {
          created_at: string | null
          formation_id: string
          id: string
          last_payment_date: string | null
          total_days_remaining: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          formation_id: string
          id?: string
          last_payment_date?: string | null
          total_days_remaining?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          formation_id?: string
          id?: string
          last_payment_date?: string | null
          total_days_remaining?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_promotions: {
        Row: {
          id: string
          is_active: boolean | null
          joined_at: string | null
          promotion_id: string | null
          student_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          promotion_id?: string | null
          student_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          promotion_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_promotions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_formations: {
        Row: {
          assigned_at: string | null
          formation_id: string | null
          id: string
          teacher_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          formation_id?: string | null
          id?: string
          teacher_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          formation_id?: string | null
          id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_formations_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_formations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_pricing_rules: {
        Row: {
          created_at: string | null
          entretien_satisfait_price: number | null
          exercice_valide_price: number | null
          formation_id: string | null
          id: string
          is_active: boolean | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entretien_satisfait_price?: number | null
          exercice_valide_price?: number | null
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entretien_satisfait_price?: number | null
          exercice_valide_price?: number | null
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_pricing_rules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_pricing_rules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          teacher_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          teacher_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          teacher_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_transactions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          teacher_id: string
          total_earned: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          teacher_id: string
          total_earned?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          teacher_id?: string
          total_earned?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_wallets_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      temporary_media_links: {
        Row: {
          access_count: number
          created_at: string | null
          current_access: number
          expires_at: string
          id: string
          is_active: boolean
          media_id: string
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          access_count?: number
          created_at?: string | null
          current_access?: number
          expires_at: string
          id?: string
          is_active?: boolean
          media_id: string
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          access_count?: number
          created_at?: string | null
          current_access?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          media_id?: string
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      user_lesson_progress: {
        Row: {
          completed_at: string | null
          exercise_completed: boolean | null
          id: string
          lesson_id: string | null
          status: Database["public"]["Enums"]["lesson_status"]
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          exercise_completed?: boolean | null
          id?: string
          lesson_id?: string | null
          status?: Database["public"]["Enums"]["lesson_status"]
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          exercise_completed?: boolean | null
          id?: string
          lesson_id?: string | null
          status?: Database["public"]["Enums"]["lesson_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          ip_address: unknown | null
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown | null
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown | null
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stories: {
        Row: {
          background_color: string | null
          content_text: string | null
          content_type: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          media_url: string | null
          user_id: string
        }
        Insert: {
          background_color?: string | null
          content_text?: string | null
          content_type: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          media_url?: string | null
          user_id: string
        }
        Update: {
          background_color?: string | null
          content_text?: string | null
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          media_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          formation_id: string
          id: string
          plan_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          formation_id: string
          id?: string
          plan_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          formation_id?: string
          id?: string
          plan_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          parent_comment_id: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          author_id: string | null
          comments_count: number | null
          created_at: string | null
          description: string | null
          formation_id: string | null
          id: string
          is_active: boolean | null
          likes_count: number | null
          thumbnail_url: string | null
          title: string
          video_type: Database["public"]["Enums"]["video_type"] | null
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          author_id?: string | null
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          likes_count?: number | null
          thumbnail_url?: string | null
          title: string
          video_type?: Database["public"]["Enums"]["video_type"] | null
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string | null
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          formation_id?: string | null
          id?: string
          is_active?: boolean | null
          likes_count?: number | null
          thumbnail_url?: string | null
          title?: string
          video_type?: Database["public"]["Enums"]["video_type"] | null
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      webrtc_signals: {
        Row: {
          call_session_id: string
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          call_session_id: string
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          call_session_id?: string
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_signals_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_sessions_with_details: {
        Row: {
          created_at: string | null
          ended_at: string | null
          formation_id: string | null
          formation_title: string | null
          id: string | null
          instructor_id: string | null
          instructor_name: string | null
          is_active: boolean | null
          lesson_id: string | null
          lesson_title: string | null
          media_count: number | null
          notes_count: number | null
          started_at: string | null
          student_id: string | null
          student_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_interviews_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_interviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_interviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_interviews_teacher_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_enrollment: {
        Args: {
          p_decided_by?: string
          p_enrollment_id: string
          p_formation_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      can_student_access_lesson: {
        Args: { p_lesson_id: string; p_student_id: string }
        Returns: boolean
      }
      check_student_inactivity: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_media_links: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_stories: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decrement_post_comments: {
        Args: { post_id: string }
        Returns: undefined
      }
      delete_video_comment: {
        Args: { comment_id: string; user_id: string }
        Returns: boolean
      }
      get_formation_details_by_id: {
        Args: { p_formation_id: string; p_user_id: string }
        Returns: Json
      }
      get_formation_unread_count: {
        Args: { p_formation_id: string; p_teacher_id: string }
        Returns: number
      }
      get_student_promotion: {
        Args: { p_formation_id: string; p_student_id: string }
        Returns: string
      }
      get_unread_messages_count: {
        Args: {
          p_formation_id: string
          p_lesson_id: string
          p_student_id: string
          p_teacher_id: string
        }
        Returns: number
      }
      get_user_enrollments: {
        Args: { user_id_param: string }
        Returns: {
          completed_lessons: number
          id: string
          image_url: string
          title: string
          total_lessons: number
        }[]
      }
      handle_validated_exercise: {
        Args: {
          p_formation_id: string
          p_lesson_id: string
          p_user_id: string
          p_validated_exercise_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: { role: string; user_id: string }
        Returns: boolean
      }
      increment_post_comments: {
        Args: { post_id: string }
        Returns: undefined
      }
      initialize_first_lesson: {
        Args: { p_lesson_id: string; p_user_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      mark_lesson_messages_as_read: {
        Args: {
          p_formation_id: string
          p_lesson_id: string
          p_student_id: string
        }
        Returns: undefined
      }
      mark_messages_as_read_by_teachers: {
        Args: {
          p_formation_id: string
          p_lesson_id: string
          p_student_id: string
          p_teacher_id: string
        }
        Returns: undefined
      }
      mark_student_messages_as_read: {
        Args: {
          p_formation_id: string
          p_lesson_id: string
          p_student_id: string
        }
        Returns: undefined
      }
      notify_enrollment_approved: {
        Args: {
          p_enrollment_id: string
          p_formation_id: string
          p_formation_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      notify_enrollment_rejected: {
        Args: {
          p_decided_by?: string
          p_enrollment_id: string
          p_formation_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_expired_evaluations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_teacher_payment: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_teacher_id: string
          p_transaction_type: string
        }
        Returns: undefined
      }
      send_welcome_message: {
        Args: {
          p_exercise_id?: string
          p_formation_id: string
          p_formation_title: string
          p_lesson_id: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: undefined
      }
      validate_exercise_submission: {
        Args: {
          p_is_valid: boolean
          p_message_id: string
          p_reject_reason?: string
          p_user_id: string
        }
        Returns: undefined
      }
      validate_exercise_submission_with_promotion: {
        Args: {
          p_is_valid: boolean
          p_message_id: string
          p_reject_reason?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      lesson_status:
        | "not_started"
        | "in_progress"
        | "awaiting_review"
        | "completed"
      product_type: "formation" | "article" | "service"
      status: "not_started" | "in_progress" | "awaiting_review" | "completed"
      user_role: "user" | "admin"
      video_type: "lesson" | "promo" | "classic"
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
      lesson_status: [
        "not_started",
        "in_progress",
        "awaiting_review",
        "completed",
      ],
      product_type: ["formation", "article", "service"],
      status: ["not_started", "in_progress", "awaiting_review", "completed"],
      user_role: ["user", "admin"],
      video_type: ["lesson", "promo", "classic"],
    },
  },
} as const
