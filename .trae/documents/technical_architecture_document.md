# Technical Architecture Document: GoVip

## 1. System Overview
The application follows a client-server architecture with a clear separation between the frontend (UI) and backend (API/Data).

## 2. Tech Stack
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS.
- **Backend**: Node.js + Express + TypeScript.
- **Database**: SQLite (managed via Prisma ORM).
- **Package Manager**: npm.

## 3. Project Structure
```text
/
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
├── backend/          # Node.js Express application
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── prisma/ (Schema)
```

## 4. Data Model

### Event
- `id`: Int (PK)
- `title`: String
- `description`: String
- `date`: DateTime
- `location`: String
- `category`: String (e.g., Football, Concert, Theater)
- `imageUrl`: String
- `createdAt`: DateTime
- `updatedAt`: DateTime
- `ticketTypes`: Relation to TicketType[]

### TicketType
- `id`: Int (PK)
- `eventId`: Int (FK -> Event)
- `name`: String (e.g., VIP, General)
- `price`: Float
- `stock`: Int
- `reservations`: Relation to Reservation[]

### Reservation
- `id`: Int (PK)
- `ticketTypeId`: Int (FK -> TicketType)
- `customerName`: String
- `customerEmail`: String
- `quantity`: Int
- `date`: DateTime (Date of reservation)

## 5. API Endpoints
- `GET /api/events`: List all events.
- `GET /api/events/:id`: Get single event details.
- `POST /api/events`: Create a new event.
