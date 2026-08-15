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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      cartoes: {
        Row: {
          ativo: boolean
          banco: string | null
          created_at: string
          dia_fechamento: number
          dia_vencimento: number
          id: string
          limite: number
          nome: string
          titular_id: string | null
          ultimos4: string | null
        }
        Insert: {
          ativo?: boolean
          banco?: string | null
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          id?: string
          limite?: number
          nome: string
          titular_id?: string | null
          ultimos4?: string | null
        }
        Update: {
          ativo?: boolean
          banco?: string | null
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          id?: string
          limite?: number
          nome?: string
          titular_id?: string | null
          ultimos4?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_titular_id_fkey"
            columns: ["titular_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          cancelada: boolean
          cartao_id: string
          categoria_id: string | null
          created_at: string
          created_by: string
          data_compra: string
          descricao: string
          id: string
          observacao: string | null
          qtd_parcelas: number
          recorrencia_fim: string | null
          responsavel_id: string | null
          tipo: Database["public"]["Enums"]["purchase_type"]
          valor_total: number
        }
        Insert: {
          cancelada?: boolean
          cartao_id: string
          categoria_id?: string | null
          created_at?: string
          created_by?: string
          data_compra: string
          descricao: string
          id?: string
          observacao?: string | null
          qtd_parcelas?: number
          recorrencia_fim?: string | null
          responsavel_id?: string | null
          tipo?: Database["public"]["Enums"]["purchase_type"]
          valor_total: number
        }
        Update: {
          cancelada?: boolean
          cartao_id?: string
          categoria_id?: string | null
          created_at?: string
          created_by?: string
          data_compra?: string
          descricao?: string
          id?: string
          observacao?: string | null
          qtd_parcelas?: number
          recorrencia_fim?: string | null
          responsavel_id?: string | null
          tipo?: Database["public"]["Enums"]["purchase_type"]
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          cartao_id: string
          categoria_id: string | null
          compra_id: string
          created_at: string
          data_prevista: string
          id: string
          mes_referencia: string
          numero: number
          responsavel_id: string | null
          status: Database["public"]["Enums"]["installment_status"]
          total: number
          valor: number
        }
        Insert: {
          cartao_id: string
          categoria_id?: string | null
          compra_id: string
          created_at?: string
          data_prevista: string
          id?: string
          mes_referencia: string
          numero?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
          total?: number
          valor: number
        }
        Update: {
          cartao_id?: string
          categoria_id?: string | null
          compra_id?: string
          created_at?: string
          data_prevista?: string
          id?: string
          mes_referencia?: string
          numero?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
          total?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
          pode_editar: boolean
          pode_excluir: boolean
          pode_lancar: boolean
          responsavel_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          nome?: string
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_lancar?: boolean
          responsavel_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_lancar?: boolean
          responsavel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      rateios: {
        Row: {
          compra_id: string
          created_at: string
          id: string
          responsavel_id: string
          valor: number
        }
        Insert: {
          compra_id: string
          created_at?: string
          id?: string
          responsavel_id: string
          valor: number
        }
        Update: {
          compra_id?: string
          created_at?: string
          id?: string
          responsavel_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rateios_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateios_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
      installment_status: "pendente" | "pago" | "cancelado"
      purchase_type: "avista" | "parcelada" | "recorrente"
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
      app_role: ["admin", "member"],
      installment_status: ["pendente", "pago", "cancelado"],
      purchase_type: ["avista", "parcelada", "recorrente"],
    },
  },
} as const
