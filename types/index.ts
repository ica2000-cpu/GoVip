export type TicketType = {
  id: number;
  name: string;
  price: number;
  stock: number;
  event_id: number;
}

export type Event = {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  category: string;
  image_url: string;
  ticket_types: TicketType[];
  comercio_id?: string;
  duration?: string;
  reservation_fee?: number;
  is_active?: boolean;
  detalles_extra?: any;
  comercios?: { nombre: string; slug: string }; // Joined relation
}

export type Category = {
  id: string;
  nombre: string;
  icono?: string;
  activo: boolean;
}

export type Commerce = {
  id: string;
  nombre: string;
  slug: string;
  owner_id: string;
  logo_url?: string;
  es_destacado: boolean;
  activo?: boolean; // New field
  created_at: string;
  payment_data?: any;
  categoria_id?: string;
  categorias?: Category; // Joined relation
}
