export type UserRole = 'admin' | 'manager' | 'sales_rep' | 'support_agent' | 'viewer'
export type CustomerStatus = 'lead' | 'prospect' | 'active' | 'inactive' | 'churned'
export type OfferStatus = 'borrador' | 'enviada' | 'aceptada' | 'rechazada'
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent'
export type RequestStatus = 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed'
export type ChannelType = 'direct' | 'group' | 'team'
export type NotificationType = 'offer_created' | 'offer_approved' | 'offer_rejected' | 'offer_assigned' | 'validation_requested' | 'request_created' | 'request_assigned' | 'request_updated' | 'chat_message' | 'system'
export type ProductBrand = 'AGFRI' | 'MYSAIR'
export type ProductStatus = 'active' | 'inactive' | 'draft'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  department: string | null
  phone: string | null
  is_active: boolean
  default_privacy_mode: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: number
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  website: string | null
  industry: string | null
  status: CustomerStatus
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Nuevos campos agregados
  notas_cliente: string | null
  descuento_sistemas: number | null
  descuento_difusion: number | null
  descuento_agfri: number | null
  id_erp: number | null
  nif: string | null
  forma_pago: string | null
  codigo_postal: string | null
  provincia: string | null
  ciudad: string | null
  pais: string | null
}

export interface Offer {
  id: number
  title: string
  description: string | null
  notas_internas: string | null
  customer_id: number
  contact_id: number | null
  tarifa_id: number | null
  offer_number: number
  amount: number
  currency: string
  status: OfferStatus
  valid_until: string | null
  items: any | null
  notes: string | null
  created_by: string
  approved_by: string | null
  approved_at: string | null
  is_validated: boolean
  validated_by: string | null
  validated_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  validation_required_at: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface OfferAssignment {
  id: number
  offer_id: number
  user_id: string
  assigned_by: string | null
  created_at: string
}

export interface CustomerProfileAssignment {
  id: number
  customer_id: number
  profile_id: string
  assigned_by: string | null
  created_at: string
}

export interface TechnicalRequest {
  id: number
  title: string
  description: string
  customer_id: number | null
  priority: RequestPriority
  status: RequestStatus
  category: string | null
  assigned_to: string | null
  resolution_notes: string | null
  created_by: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatChannel {
  id: number
  name: string
  description: string | null
  type: ChannelType
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  channel_id: number
  sender_id: string
  content: string
  is_edited: boolean
  created_at: string
  updated_at: string
}

export interface ChatMember {
  id: number
  channel_id: number
  user_id: string
  joined_at: string
  last_read_at: string | null
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  link: string | null
  read: boolean
  created_at: string
}

export interface ActivityLog {
  id: number
  user_id: string
  action: string
  entity_type: string | null
  entity_id: number | null
  details: any | null
  ip_address: string | null
  created_at: string
}

export interface Product {
  id: number
  referencia: string
  descripcion: string | null
  texto_prescripcion: string | null
  largo: string | number | null
  alto: string | number | null
  ancho: string | number | null
  volumen: string | number | null
  larguero_largo: string | number | null
  larguero_alto: string | number | null
  familia: string | null
  subfamilia: string | null
  motorizada: boolean
  modelo_nombre: string | null
  tipo_deflexion: string | null
  fijacion: string | null
  acabado: string | null
  compuerta: string | null
  regulacion_compuerta: string | null
  ficha_tecnica: string | null
  area_efectiva: string | number | null
  status: ProductStatus
  art_personalizado: boolean
  created_by: string | null
  brand_id: number | null
  created_at: string
  updated_at: string
}
