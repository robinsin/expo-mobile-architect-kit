export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      artworks: {
        Row: {
          created_at: string | null
          description: string | null
          genre: string | null
          id: string
          image_url: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          image_url: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          image_url?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artworks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      inspirations: {
        Row: {
          created_at: string | null
          id: string
          inspired_id: string
          inspired_type: string
          source_id: string
          source_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inspired_id: string
          inspired_type: string
          source_id: string
          source_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inspired_id?: string
          inspired_type?: string
          source_id?: string
          source_type?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          audio_url: string
          created_at: string | null
          description: string | null
          duration: number
          genre: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          description?: string | null
          duration: number
          genre?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          description?: string | null
          duration?: number
          genre?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          artist_type: string
          avatar_url: string | null
          background_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          likes_credit: number | null
          likes_points: number | null
          name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          artist_type: string
          avatar_url?: string | null
          background_url?: string | null
          bio?: string | null
          created_at?: string | null
          id: string
          likes_credit?: number | null
          likes_points?: number | null
          name: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          artist_type?: string
          avatar_url?: string | null
          background_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          likes_credit?: number | null
          likes_points?: number | null
          name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          dark_mode: boolean | null
          email_notifications: boolean | null
          id: string
          privacy_mode: string | null
          push_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          id?: string
          privacy_mode?: string | null
          push_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          id?: string
          privacy_mode?: string | null
          push_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_likes_points: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_likes_points: {
        Args: { user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
