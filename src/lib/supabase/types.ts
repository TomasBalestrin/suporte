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
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'agent'
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: 'admin' | 'agent'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'agent'
          avatar_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          is_active?: boolean
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          name?: string
          color?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string
          cpf: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          cpf?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string
          cpf?: string | null
          phone?: string | null
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          ticket_code: string
          customer_id: string
          product_id: string | null
          category_id: string | null
          assigned_agent_id: string | null
          access_token: string
          title: string
          description: string
          status: TicketStatus
          priority: TicketPriority
          source: string
          sla_first_response_at: string | null
          sla_resolution_at: string | null
          first_response_at: string | null
          resolved_at: string | null
          closed_at: string | null
          satisfaction_rating: number | null
          satisfaction_comment: string | null
          satisfaction_rated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_code?: string
          customer_id: string
          product_id?: string | null
          category_id?: string | null
          assigned_agent_id?: string | null
          access_token?: string
          title: string
          description: string
          status?: TicketStatus
          priority?: TicketPriority
          source?: string
          sla_first_response_at?: string | null
          sla_resolution_at?: string | null
          first_response_at?: string | null
          resolved_at?: string | null
          closed_at?: string | null
          satisfaction_rating?: number | null
          satisfaction_comment?: string | null
          satisfaction_rated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          customer_id?: string
          product_id?: string | null
          category_id?: string | null
          assigned_agent_id?: string | null
          title?: string
          description?: string
          status?: TicketStatus
          priority?: TicketPriority
          source?: string
          sla_first_response_at?: string | null
          sla_resolution_at?: string | null
          first_response_at?: string | null
          resolved_at?: string | null
          closed_at?: string | null
          satisfaction_rating?: number | null
          satisfaction_comment?: string | null
          satisfaction_rated_at?: string | null
          updated_at?: string
        }
      }
      ticket_tags: {
        Row: {
          ticket_id: string
          tag_id: string
        }
        Insert: {
          ticket_id: string
          tag_id: string
        }
        Update: {
          ticket_id?: string
          tag_id?: string
        }
      }
      messages: {
        Row: {
          id: string
          ticket_id: string
          sender_type: MessageSenderType
          sender_id: string | null
          content: string
          is_internal_note: boolean
          attachments: Json
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          sender_type: MessageSenderType
          sender_id?: string | null
          content: string
          is_internal_note?: boolean
          attachments?: Json
          created_at?: string
        }
        Update: {
          content?: string
          is_internal_note?: boolean
          attachments?: Json
        }
      }
      quick_replies: {
        Row: {
          id: string
          shortcut: string
          title: string
          content: string
          category: string | null
          created_by: string | null
          is_active: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shortcut: string
          title: string
          content: string
          category?: string | null
          created_by?: string | null
          is_active?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          shortcut?: string
          title?: string
          content?: string
          category?: string | null
          is_active?: boolean
          usage_count?: number
          updated_at?: string
        }
      }
      knowledge_base: {
        Row: {
          id: string
          title: string
          content: string
          category: string | null
          product_id: string | null
          embedding: number[] | null
          is_active: boolean
          usage_count: number
          last_used_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category?: string | null
          product_id?: string | null
          embedding?: number[] | null
          is_active?: boolean
          usage_count?: number
          last_used_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          content?: string
          category?: string | null
          product_id?: string | null
          embedding?: number[] | null
          is_active?: boolean
          usage_count?: number
          last_used_at?: string | null
          updated_at?: string
        }
      }
      ai_config: {
        Row: {
          id: string
          config_key: string
          config_value: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          config_key: string
          config_value: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          config_value?: string
          updated_by?: string | null
          updated_at?: string
        }
      }
      ai_unanswered_questions: {
        Row: {
          id: string
          question: string
          ticket_id: string | null
          context: string | null
          similarity_score: number | null
          closest_article_id: string | null
          resolved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          question: string
          ticket_id?: string | null
          context?: string | null
          similarity_score?: number | null
          closest_article_id?: string | null
          resolved?: boolean
          created_at?: string
        }
        Update: {
          question?: string
          resolved?: boolean
        }
      }
      ai_feedback: {
        Row: {
          id: string
          message_id: string | null
          ticket_id: string | null
          rating: 'helpful' | 'not_helpful' | null
          feedback_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id?: string | null
          ticket_id?: string | null
          rating?: 'helpful' | 'not_helpful' | null
          feedback_text?: string | null
          created_at?: string
        }
        Update: {
          rating?: 'helpful' | 'not_helpful' | null
          feedback_text?: string | null
        }
      }
      sla_configs: {
        Row: {
          id: string
          priority: TicketPriority
          first_response_minutes: number
          resolution_minutes: number
          is_active: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          priority: TicketPriority
          first_response_minutes: number
          resolution_minutes: number
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          first_response_minutes?: number
          resolution_minutes?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      automation_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_type: string
          conditions: Json
          actions: Json
          is_active: boolean
          execution_count: number
          last_executed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_type: string
          conditions?: Json
          actions?: Json
          is_active?: boolean
          execution_count?: number
          last_executed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          trigger_type?: string
          conditions?: Json
          actions?: Json
          is_active?: boolean
          execution_count?: number
          last_executed_at?: string | null
          updated_at?: string
        }
      }
      notification_log: {
        Row: {
          id: string
          ticket_id: string | null
          recipient_email: string
          subject: string
          template: string
          status: 'sent' | 'failed' | 'bounced'
          resend_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id?: string | null
          recipient_email: string
          subject: string
          template: string
          status?: 'sent' | 'failed' | 'bounced'
          resend_id?: string | null
          created_at?: string
        }
        Update: {
          status?: 'sent' | 'failed' | 'bounced'
        }
      }
      ai_usage_stats: {
        Row: {
          id: string
          query: string
          response: string | null
          articles_found: number
          confidence_score: number | null
          was_helpful: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          query: string
          response?: string | null
          articles_found?: number
          confidence_score?: number | null
          was_helpful?: boolean | null
          created_at?: string
        }
        Update: {
          was_helpful?: boolean | null
        }
      }
      ai_conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          created_at: string
          confidence: number | null
          was_helpful: boolean | null
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          created_at?: string
          confidence?: number | null
          was_helpful?: boolean | null
        }
        Update: {
          confidence?: number | null
          was_helpful?: boolean | null
        }
      }
      activity_log: {
        Row: {
          id: string
          ticket_id: string | null
          actor_type: ActorType
          actor_id: string | null
          action: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id?: string | null
          actor_type: ActorType
          actor_id?: string | null
          action: string
          details?: Json
          created_at?: string
        }
        Update: {
          action?: string
          details?: Json
        }
      }
    }
    Functions: {
      search_knowledge_base: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          title: string
          content: string
          category: string | null
          similarity: number
        }[]
      }
    }
  }
}

export type TicketStatus =
  | 'open'
  | 'awaiting_customer'
  | 'in_progress'
  | 'resolved'
  | 'resolved_ia'
  | 'closed'

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export type MessageSenderType = 'customer' | 'agent' | 'ai' | 'system'

export type ActorType = 'customer' | 'agent' | 'admin' | 'system' | 'ai'

export type UserRole = 'admin' | 'agent'

// Convenience types for rows
export type User = Database['public']['Tables']['users']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type QuickReply = Database['public']['Tables']['quick_replies']['Row']
export type KnowledgeBaseArticle = Database['public']['Tables']['knowledge_base']['Row']
export type AiConfig = Database['public']['Tables']['ai_config']['Row']
export type AiUnansweredQuestion = Database['public']['Tables']['ai_unanswered_questions']['Row']
export type AiFeedback = Database['public']['Tables']['ai_feedback']['Row']
export type SlaConfig = Database['public']['Tables']['sla_configs']['Row']
export type AutomationRule = Database['public']['Tables']['automation_rules']['Row']
export type NotificationLog = Database['public']['Tables']['notification_log']['Row']
export type AiUsageStats = Database['public']['Tables']['ai_usage_stats']['Row']
export type ActivityLog = Database['public']['Tables']['activity_log']['Row']

// Extended types with relations
export type TicketWithRelations = Ticket & {
  customer?: Customer
  product?: Product | null
  category?: Category | null
  assigned_agent?: User | null
  tags?: Tag[]
  /** Derivado na listagem: nenhum agente humano respondeu (atendido só pela Sofia) */
  sofia_only?: boolean
  /** Derivado na listagem: sender_type da última mensagem ('ai' | 'agent' | 'customer') */
  last_sender?: string | null
}
