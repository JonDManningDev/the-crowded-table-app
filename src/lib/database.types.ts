
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "community_account_profiles": {
                  Row: {
                    "bio": string | null,"created_at": string,"created_by": string | null,"display_name": string,"tenant_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  Insert: {
                    "bio"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name": string,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "bio"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name"?: string,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_account_profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "community_account_profiles_tenant_id_user_id_fkey"
      columns: ["tenant_id","user_id"]
isOneToOne: true
      referencedRelation: "community_accounts"
      referencedColumns: ["tenant_id","user_id"]
    },{
      foreignKeyName: "community_account_profiles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"community_accounts": {
                  Row: {
                    "created_at": string,"created_by": string | null,"standing": string,"tenant_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"standing"?: string,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"standing"?: string,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_accounts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "community_accounts_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_accounts_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "community_accounts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"tenant_admin_actions": {
                  Row: {
                    "action": string,"content_key": string | null,"created_at": string,"created_by": string | null,"id": string,"target_user_id": string | null,"tenant_id": string
                  }
                  Insert: {
                    "action": string,"content_key"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"target_user_id"?: string | null,"tenant_id": string
                  }
                  Update: {
                    "action"?: string,"content_key"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"target_user_id"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_admin_actions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "tenant_admin_actions_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "tenant_admin_actions_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_settings": {
                  Row: {
                    "auto_approve_users": boolean,"created_at": string,"created_by": string | null,"tenant_id": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "auto_approve_users"?: boolean,"created_at"?: string,"created_by"?: string | null,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "auto_approve_users"?: boolean,"created_at"?: string,"created_by"?: string | null,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_settings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "tenant_settings_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenant_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"tenant_staff_assignments": {
                  Row: {
                    "can_approve_users": boolean,"can_create_admin": boolean,"created_at": string,"created_by": string | null,"role": string,"status": string,"tenant_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  Insert: {
                    "can_approve_users"?: boolean,"can_create_admin"?: boolean,"created_at"?: string,"created_by"?: string | null,"role": string,"status"?: string,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "can_approve_users"?: boolean,"can_create_admin"?: boolean,"created_at"?: string,"created_by"?: string | null,"role"?: string,"status"?: string,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_staff_assignments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "tenant_staff_assignments_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenant_staff_assignments_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "tenant_staff_assignments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"tenant_website_content_overrides": {
                  Row: {
                    "content_key": string,"created_at": string,"created_by": string | null,"tenant_id": string,"text_value": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "content_key": string,"created_at"?: string,"created_by"?: string | null,"tenant_id": string,"text_value": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "content_key"?: string,"created_at"?: string,"created_by"?: string | null,"tenant_id"?: string,"text_value"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_website_content_overrides_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "tenant_website_content_overrides_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenant_website_content_overrides_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "city": string | null,"country_code": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"operational_status": string,"slug": string,"state_province": string | null,"timezone": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "city"?: string | null,"country_code": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"operational_status"?: string,"slug": string,"state_province"?: string | null,"timezone": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"country_code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"operational_status"?: string,"slug"?: string,"state_province"?: string | null,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenants_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "tenants_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"user_accounts": {
                  Row: {
                    "created_at": string,"created_by": string | null,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_accounts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "user_accounts_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "approve_community_account":
{ Args: { "p_tenant_id": string,"p_user_id": string }; Returns: undefined
                           },
"create_tenant":
{ Args: { "p_city"?: string,"p_country_code": string,"p_join_community"?: boolean,"p_name": string,"p_slug": string,"p_state_province"?: string,"p_timezone": string }; Returns: string
                           },
"create_tenant_admin":
{ Args: { "p_tenant_id": string,"p_user_id": string }; Returns: undefined
                           },
"join_community":
{ Args: { "p_tenant_id": string }; Returns: string
                           },
"list_admin_candidates":
{ Args: { "p_tenant_id": string }; Returns: {
              "display_name": string,"staff_role": string,"staff_status": string,"standing": string,"user_id": string
            }[]
                           },
"list_pending_community_accounts":
{ Args: { "p_tenant_id": string }; Returns: {
              "display_name": string,"user_id": string
            }[]
                           },
"lookup_tenant":
{ Args: { "p_slug": string }; Returns: {
              "city": string,"country_code": string,"id": string,"name": string,"slug": string,"state_province": string,"timezone": string
            }[]
                           },
"save_community_profile":
{ Args: { "p_bio"?: string,"p_display_name": string,"p_tenant_id": string }; Returns: undefined
                           },
"set_admin_permissions":
{ Args: { "p_can_approve_users": boolean,"p_can_create_admin": boolean,"p_tenant_id": string,"p_user_id": string }; Returns: undefined
                           },
"set_auto_approve_users":
{ Args: { "p_enabled": boolean,"p_tenant_id": string }; Returns: undefined
                           },
"set_tenant_archived":
{ Args: { "p_archived": boolean,"p_tenant_id": string }; Returns: undefined
                           },
"set_website_content_override":
{ Args: { "p_content_key": string,"p_tenant_id": string,"p_text_value": string }; Returns: undefined
                           },
"update_tenant_details":
{ Args: { "p_city"?: string,"p_country_code": string,"p_name": string,"p_state_province"?: string,"p_tenant_id": string,"p_timezone": string }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
