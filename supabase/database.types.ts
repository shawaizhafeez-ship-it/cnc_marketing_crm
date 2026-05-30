/**
 * Generated from supabase/migrations (001–014).
 * Regenerate after schema changes:
 *   supabase gen types typescript --linked > supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          id: string;
          certificate_no: string;
          company_name: string;
          item: string | null;
          expiry_date: string;
          recipient_email: string;
          renewal_amount: number | null;
          ops_status: string;
          contact_person: string | null;
          sheet_row_hash: string | null;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          certificate_no: string;
          company_name: string;
          item?: string | null;
          expiry_date: string;
          recipient_email: string;
          renewal_amount?: number | null;
          ops_status?: string;
          contact_person?: string | null;
          sheet_row_hash?: string | null;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          certificate_no?: string;
          company_name?: string;
          item?: string | null;
          expiry_date?: string;
          recipient_email?: string;
          renewal_amount?: number | null;
          ops_status?: string;
          contact_person?: string | null;
          sheet_row_hash?: string | null;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_send_counters: {
        Row: {
          id: string;
          counter_date: string;
          renewal_sent: number;
          marketing_sent: number;
          marketing_limit: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          counter_date: string;
          renewal_sent?: number;
          marketing_sent?: number;
          marketing_limit?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          counter_date?: string;
          renewal_sent?: number;
          marketing_sent?: number;
          marketing_limit?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_logs: {
        Row: {
          id: string;
          email_type: Database["public"]["Enums"]["touchpoint_type"];
          campaign_id: string | null;
          scheduled_email_id: string | null;
          recipient_email: string;
          company_name: string | null;
          subject: string;
          certificate_count: number;
          status: Database["public"]["Enums"]["email_status"];
          error_message: string | null;
          smtp_message_id: string | null;
          sent_by: string | null;
          sent_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          email_type: Database["public"]["Enums"]["touchpoint_type"];
          campaign_id?: string | null;
          scheduled_email_id?: string | null;
          recipient_email: string;
          company_name?: string | null;
          subject: string;
          certificate_count?: number;
          status: Database["public"]["Enums"]["email_status"];
          error_message?: string | null;
          smtp_message_id?: string | null;
          sent_by?: string | null;
          sent_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          email_type?: Database["public"]["Enums"]["touchpoint_type"];
          campaign_id?: string | null;
          scheduled_email_id?: string | null;
          recipient_email?: string;
          company_name?: string | null;
          subject?: string;
          certificate_count?: number;
          status?: Database["public"]["Enums"]["email_status"];
          error_message?: string | null;
          smtp_message_id?: string | null;
          sent_by?: string | null;
          sent_at?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "email_logs_sent_by_fkey";
            columns: ["sent_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          campaign_type: Database["public"]["Enums"]["campaign_type"];
          status: Database["public"]["Enums"]["campaign_status"];
          filters_applied: Json;
          total_certificates: number;
          total_recipients: number;
          total_emails: number;
          emails_sent: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          campaign_type?: Database["public"]["Enums"]["campaign_type"];
          status?: Database["public"]["Enums"]["campaign_status"];
          filters_applied?: Json;
          total_certificates?: number;
          total_recipients?: number;
          total_emails?: number;
          emails_sent?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          campaign_type?: Database["public"]["Enums"]["campaign_type"];
          status?: Database["public"]["Enums"]["campaign_status"];
          filters_applied?: Json;
          total_certificates?: number;
          total_recipients?: number;
          total_emails?: number;
          emails_sent?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_scheduled_emails: {
        Row: {
          id: string;
          campaign_id: string;
          touchpoint_id: string;
          template_id: string;
          recipient_email: string;
          company_name: string;
          certificate_ids: string[];
          rendered_subject: string;
          rendered_html: string;
          scheduled_at: string;
          status: Database["public"]["Enums"]["email_status"];
          sent_at: string | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          touchpoint_id: string;
          template_id: string;
          recipient_email: string;
          company_name: string;
          certificate_ids?: string[];
          rendered_subject: string;
          rendered_html: string;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["email_status"];
          sent_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          touchpoint_id?: string;
          template_id?: string;
          recipient_email?: string;
          company_name?: string;
          certificate_ids?: string[];
          rendered_subject?: string;
          rendered_html?: string;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["email_status"];
          sent_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_scheduled_emails_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "marketing_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_scheduled_emails_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "marketing_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_scheduled_emails_touchpoint_id_fkey";
            columns: ["touchpoint_id"];
            isOneToOne: false;
            referencedRelation: "marketing_touchpoints";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_templates: {
        Row: {
          id: string;
          name: string;
          category: Database["public"]["Enums"]["template_category"];
          subject: string;
          html_content: string;
          variables: string[];
          description: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: Database["public"]["Enums"]["template_category"];
          subject: string;
          html_content: string;
          variables?: string[];
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: Database["public"]["Enums"]["template_category"];
          subject?: string;
          html_content?: string;
          variables?: string[];
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_touchpoints: {
        Row: {
          id: string;
          campaign_id: string;
          touchpoint_number: number;
          template_id: string;
          schedule_type: string;
          schedule_value: number;
          delay_days: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          touchpoint_number: number;
          template_id: string;
          schedule_type: string;
          schedule_value?: number;
          delay_days?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          touchpoint_number?: number;
          template_id?: string;
          schedule_type?: string;
          schedule_value?: number;
          delay_days?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_touchpoints_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "marketing_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_touchpoints_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "marketing_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      renewal_campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          target_month: number;
          target_year: number;
          status: Database["public"]["Enums"]["campaign_status"];
          anchor_date: string;
          total_certificates: number;
          total_recipients: number;
          total_emails_scheduled: number;
          emails_sent: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          target_month: number;
          target_year: number;
          status?: Database["public"]["Enums"]["campaign_status"];
          anchor_date: string;
          total_certificates?: number;
          total_recipients?: number;
          total_emails_scheduled?: number;
          emails_sent?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          target_month?: number;
          target_year?: number;
          status?: Database["public"]["Enums"]["campaign_status"];
          anchor_date?: string;
          total_certificates?: number;
          total_recipients?: number;
          total_emails_scheduled?: number;
          emails_sent?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "renewal_campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_emails: {
        Row: {
          id: string;
          campaign_id: string;
          touchpoint_number: number;
          recipient_email: string;
          company_name: string;
          certificate_ids: string[];
          certificate_snapshot: Json;
          subject: string;
          scheduled_at: string;
          status: Database["public"]["Enums"]["email_status"];
          sent_at: string | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          touchpoint_number: number;
          recipient_email: string;
          company_name: string;
          certificate_ids?: string[];
          certificate_snapshot?: Json;
          subject?: string;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["email_status"];
          sent_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          touchpoint_number?: number;
          recipient_email?: string;
          company_name?: string;
          certificate_ids?: string[];
          certificate_snapshot?: Json;
          subject?: string;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["email_status"];
          sent_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "renewal_campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      sheet_sync_logs: {
        Row: {
          id: string;
          status: Database["public"]["Enums"]["sync_status"];
          rows_processed: number;
          rows_inserted: number;
          rows_updated: number;
          rows_skipped: number;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          status: Database["public"]["Enums"]["sync_status"];
          rows_processed?: number;
          rows_inserted?: number;
          rows_updated?: number;
          rows_skipped?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          status?: Database["public"]["Enums"]["sync_status"];
          rows_processed?: number;
          rows_inserted?: number;
          rows_updated?: number;
          rows_skipped?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_certificates_active: {
        Row: {
          id: string;
          certificate_no: string;
          company_name: string;
          item: string | null;
          expiry_date: string;
          recipient_email: string;
          renewal_amount: number | null;
          ops_status: string;
          contact_person: string | null;
          sheet_row_hash: string | null;
          last_synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
      v_marketing_campaign_stats: {
        Row: {
          id: string;
          name: string;
          campaign_type: Database["public"]["Enums"]["campaign_type"];
          status: Database["public"]["Enums"]["campaign_status"];
          total_certificates: number;
          total_recipients: number;
          total_emails: number;
          emails_sent: number;
          filters_applied: Json;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          progress_pct: number | null;
          pending_count: number | null;
          failed_count: number | null;
        };
        Relationships: [];
      };
      v_renewal_campaign_stats: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: Database["public"]["Enums"]["campaign_status"];
          target_year: number;
          target_month: number;
          anchor_date: string;
          total_certificates: number;
          total_recipients: number;
          total_emails_scheduled: number;
          emails_sent: number;
          created_by: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          progress_pct: number | null;
          pending_count: number | null;
          sent_count: number | null;
          failed_count: number | null;
          skipped_count: number | null;
          cancelled_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_renewal_touchpoint_date: {
        Args: {
          p_anchor_date: string;
          p_touchpoint: number;
          p_send_hour?: number;
        };
        Returns: string;
      };
      get_renewal_touchpoint_offset_days: {
        Args: { p_touchpoint: number };
        Returns: number;
      };
      is_cnc_admin: { Args: Record<string, never>; Returns: boolean };
      is_cnc_user: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      campaign_status: "draft" | "active" | "paused" | "completed" | "cancelled";
      campaign_type:
        | "marketing"
        | "newsletter"
        | "product_update"
        | "compliance_alert"
        | "general";
      email_status:
        | "pending"
        | "sent"
        | "failed"
        | "skipped"
        | "cancelled";
      sync_status: "success" | "failed" | "partial";
      template_category:
        | "product_updates"
        | "compliance_news"
        | "general_marketing"
        | "announcements"
        | "renewals"
        | "custom";
      touchpoint_type: "renewal" | "marketing" | "manual";
      user_role: "admin" | "user";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Views<T extends keyof PublicSchema["Views"]> =
  PublicSchema["Views"][T]["Row"];
