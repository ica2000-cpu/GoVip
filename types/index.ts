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
}
