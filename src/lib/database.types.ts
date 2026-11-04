
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "community_account_permissions": {
                  Row: {
                    "can_post_public_events": boolean,"created_at": string,"created_by": string | null,"tenant_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "can_post_public_events"?: boolean,"created_at"?: string,"created_by"?: string | null,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "can_post_public_events"?: boolean,"created_at"?: string,"created_by"?: string | null,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_account_permissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "community_account_permissions_tenant_id_user_id_fkey"
      columns: ["tenant_id","user_id"]
isOneToOne: true
      referencedRelation: "community_accounts"
      referencedColumns: ["tenant_id","user_id"]
    },{
      foreignKeyName: "community_account_permissions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"community_account_preferences": {
                  Row: {
                    "allow_direct_messages": boolean,"allow_private_invitations": boolean,"created_at": string,"created_by": string | null,"show_global_profile": boolean,"tenant_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_direct_messages"?: boolean,"allow_private_invitations"?: boolean,"created_at"?: string,"created_by"?: string | null,"show_global_profile"?: boolean,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "allow_direct_messages"?: boolean,"allow_private_invitations"?: boolean,"created_at"?: string,"created_by"?: string | null,"show_global_profile"?: boolean,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_account_preferences_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "community_account_preferences_tenant_id_user_id_fkey"
      columns: ["tenant_id","user_id"]
isOneToOne: true
      referencedRelation: "community_accounts"
      referencedColumns: ["tenant_id","user_id"]
    },{
      foreignKeyName: "community_account_preferences_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"community_account_profiles": {
                  Row: {
                    "bio": string | null,"created_at": string,"created_by": string | null,"display_name": string,"tenant_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name": string,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
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
                    "created_at": string,"created_by": string | null,"first_approved_at": string | null,"has_disciplinary_restriction": boolean,"revision": string,"standing": string,"tenant_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"first_approved_at"?: string | null,"has_disciplinary_restriction"?: boolean,"revision"?: string,"standing"?: string,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"first_approved_at"?: string | null,"has_disciplinary_restriction"?: boolean,"revision"?: string,"standing"?: string,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_accounts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "community_accounts_standing_fkey"
      columns: ["standing"]
isOneToOne: false
      referencedRelation: "community_standing"
      referencedColumns: ["standing"]
    },{
      foreignKeyName: "community_accounts_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "my_community_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_accounts_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_accounts_tenant_id_user_id_fkey"
      columns: ["tenant_id","user_id"]
isOneToOne: true
      referencedRelation: "community_account_preferences"
      referencedColumns: ["tenant_id","user_id"]
    },{
      foreignKeyName: "community_accounts_tenant_id_user_id_fkey1"
      columns: ["tenant_id","user_id"]
isOneToOne: true
      referencedRelation: "community_account_permissions"
      referencedColumns: ["tenant_id","user_id"]
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
                },"community_standing": {
                  Row: {
                    "enable_other_profile_visibility": boolean,"enable_own_profile_management": boolean,"enable_standard_activity_visibility": boolean,"enable_standard_chat_visibility": boolean,"enable_standard_dms": boolean,"enable_standard_participation": boolean,"standing": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enable_other_profile_visibility": boolean,"enable_own_profile_management": boolean,"enable_standard_activity_visibility": boolean,"enable_standard_chat_visibility": boolean,"enable_standard_dms": boolean,"enable_standard_participation": boolean,"standing": string
                  }
                  Update: {
                    "enable_other_profile_visibility"?: boolean,"enable_own_profile_management"?: boolean,"enable_standard_activity_visibility"?: boolean,"enable_standard_chat_visibility"?: boolean,"enable_standard_dms"?: boolean,"enable_standard_participation"?: boolean,"standing"?: string
                  }
                  Relationships: [

                  ]
                },"tenant_admin_actions": {
                  Row: {
                    "action": string,"content_key": string | null,"created_at": string,"created_by": string | null,"details": NonNullable<Json>,"id": string,"operation_id": string,"reason": string | null,"target_user_id": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"content_key"?: string | null,"created_at"?: string,"created_by"?: string | null,"details"?: NonNullable<Json>,"id"?: string,"operation_id"?: string,"reason"?: string | null,"target_user_id"?: string | null,"tenant_id": string
                  }
                  Update: {
                    "action"?: string,"content_key"?: string | null,"created_at"?: string,"created_by"?: string | null,"details"?: NonNullable<Json>,"id"?: string,"operation_id"?: string,"reason"?: string | null,"target_user_id"?: string | null,"tenant_id"?: string
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
      referencedRelation: "my_community_summaries"
      referencedColumns: ["id"]
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
                    "allow_public_activity_visibility": boolean,"allow_public_chat_visibility": boolean,"allow_public_directory_visibility": boolean,"auto_approve_users": boolean,"created_at": string,"created_by": string | null,"pause_community_events": boolean,"tenant_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_public_activity_visibility"?: boolean,"allow_public_chat_visibility"?: boolean,"allow_public_directory_visibility"?: boolean,"auto_approve_users"?: boolean,"created_at"?: string,"created_by"?: string | null,"pause_community_events"?: boolean,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "allow_public_activity_visibility"?: boolean,"allow_public_chat_visibility"?: boolean,"allow_public_directory_visibility"?: boolean,"auto_approve_users"?: boolean,"created_at"?: string,"created_by"?: string | null,"pause_community_events"?: boolean,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null
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
      referencedRelation: "my_community_summaries"
      referencedColumns: ["id"]
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
                    "can_approve_users": boolean,"can_audit_community_accounts": boolean,"can_audit_staff_accounts": boolean,"can_discipline_staff": boolean,"can_discipline_users": boolean,"can_grant_staff": boolean,"can_manage_community_activities": boolean,"can_manage_community_permissions": boolean,"can_manage_official_activities": boolean,"can_manage_settings": boolean,"can_moderate_all_chats": boolean,"can_modify_content": boolean,"can_see_private_events": boolean,"created_at": string,"created_by": string | null,"required_account_standing": string | null,"role": string,"status": string,"tenant_id": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "can_approve_users"?: boolean,"can_audit_community_accounts"?: boolean,"can_audit_staff_accounts"?: boolean,"can_discipline_staff"?: boolean,"can_discipline_users"?: boolean,"can_grant_staff"?: boolean,"can_manage_community_activities"?: boolean,"can_manage_community_permissions"?: boolean,"can_manage_official_activities"?: boolean,"can_manage_settings"?: boolean,"can_moderate_all_chats"?: boolean,"can_modify_content"?: boolean,"can_see_private_events"?: boolean,"created_at"?: string,"created_by"?: string | null,"required_account_standing"?: never,"role": string,"status"?: string,"tenant_id": string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "can_approve_users"?: boolean,"can_audit_community_accounts"?: boolean,"can_audit_staff_accounts"?: boolean,"can_discipline_staff"?: boolean,"can_discipline_users"?: boolean,"can_grant_staff"?: boolean,"can_manage_community_activities"?: boolean,"can_manage_community_permissions"?: boolean,"can_manage_official_activities"?: boolean,"can_manage_settings"?: boolean,"can_moderate_all_chats"?: boolean,"can_modify_content"?: boolean,"can_see_private_events"?: boolean,"created_at"?: string,"created_by"?: string | null,"required_account_standing"?: never,"role"?: string,"status"?: string,"tenant_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
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
      referencedRelation: "my_community_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenant_staff_assignments_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenant_staff_assignments_tenant_id_user_id_required_accoun_fkey"
      columns: ["tenant_id","user_id","required_account_standing"]
isOneToOne: false
      referencedRelation: "community_accounts"
      referencedColumns: ["tenant_id","user_id","standing"]
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
                  ComputedFields: never
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
      referencedRelation: "my_community_summaries"
      referencedColumns: ["id"]
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
                  ComputedFields: never
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
                },"user_account_profiles": {
                  Row: {
                    "bio": string | null,"created_at": string,"created_by": string | null,"display_name": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name": string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "bio"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_account_profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "user_account_profiles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "user_account_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "user_accounts"
      referencedColumns: ["user_id"]
    }
                  ]
                },"user_accounts": {
                  Row: {
                    "allow_direct_messages": boolean,"created_at": string,"created_by": string | null,"enable_matchmaking": boolean,"updated_at": string,"updated_by": string | null,"user_id": string,"user_is_discoverable": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_direct_messages"?: boolean,"created_at"?: string,"created_by"?: string | null,"enable_matchmaking"?: boolean,"updated_at"?: string,"updated_by"?: string | null,"user_id": string,"user_is_discoverable"?: boolean
                  }
                  Update: {
                    "allow_direct_messages"?: boolean,"created_at"?: string,"created_by"?: string | null,"enable_matchmaking"?: boolean,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string,"user_is_discoverable"?: boolean
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
            "my_community_summaries": {
                  Row: {
                    "city": string | null,"country_code": string,"created_at": string,"id": string,"is_managed": boolean | null,"is_member": boolean | null,"is_owned": boolean | null,"name": string,"operational_status": string,"state_province": string | null
                  }
                  ComputedFields: never
                  Relationships: [

                  ]
                }
          }
          Functions: {
            "lookup_tenant":
{ Args: { "p_slug": string }; Returns: {
              "city": string,"country_code": string,"id": string,"name": string,"slug": string,"state_province": string,"timezone": string
            }[]
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
