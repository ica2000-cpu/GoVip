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
}

export type Commerce = {
  id: string;
  nombre: string;
  slug: string;
  owner_id: string;
  logo_url?: string;
  es_destacado: boolean;
  created_at: string;
  payment_data?: any;
}
