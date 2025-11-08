# POS System Backend

Backend API for a Point of Sale (POS) system built with Node.js, Express, SQLite, and WebSocket for real-time updates.

## Features

- **RESTful API** for menu management, orders, and transactions
- **Real-time updates** via WebSocket for live order notifications
- **SQLite database** with optimized performance (WAL mode)
- **Category-based menu management** with inventory tracking
- **Order management** with status tracking (Waiting, Completed, Canceled)
- **Transaction history** with detailed item records
- **Security features** with Helmet.js middleware
- **Response compression** for improved performance
- **Pagination support** for large datasets

## Tech Stack

- **Runtime:** Node.js 20.x
- **Framework:** Express.js
- **Database:** SQLite3
- **WebSocket:** ws library
- **Security:** Helmet.js, CORS
- **Compression:** compression middleware

## Prerequisites

- Node.js 20.x or higher
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd back-end-pos
```

2. Install dependencies:
```bash
npm install
```

3. The database will be automatically created and seeded with initial data on first run.

## Running the Application

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on **http://localhost:5000**

## API Endpoints

### Menu Management

#### Get All Menu Items
```
GET /api/menu
```
Returns all menu items with category names.

#### Get All Categories
```
GET /api/categories
```
Returns all available categories.

#### Create Menu Item (Admin)
```
POST /api/menu
Content-Type: application/json

{
  "name": "Item Name",
  "description": "Description",
  "price": 10.99,
  "image": "image-url",
  "available": 100,
  "category_id": 1
}
```

#### Update Menu Item (Admin)
```
PUT /api/menu/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated Description",
  "price": 12.99,
  "image": "image-url",
  "available": 50,
  "category_id": 1
}
```

#### Delete Menu Item (Admin)
```
DELETE /api/menu/:id
```

### Order Management

#### Get Live Orders (Paginated)
```
GET /api/live-orders?limit=50&offset=0
```
Returns all non-completed/non-canceled orders with their items.
- Query params: `limit` (default: 50, max: 200), `offset` (default: 0)
- Returns total count in `X-Total-Count` header

#### Create Order
```
POST /api/orders
Content-Type: application/json

{
  "customerName": "John Doe",
  "tableNumber": 5,
  "items": [
    { "id": 1, "name": "Item 1", "quantity": 2 },
    { "id": 2, "name": "Item 2", "quantity": 1 }
  ]
}
```
Automatically decreases inventory for ordered items.

#### Update Order Status
```
PUT /api/orders/:id/status
Content-Type: application/json

{
  "status": "Completed"
}
```
Valid statuses: `Waiting`, `Preparing`, `Ready`, `Completed`, `Canceled`

### Transaction Management

#### Get Transaction History (Paginated)
```
GET /api/history?limit=50&offset=0
```
Returns all completed transactions with items.
- Query params: `limit` (default: 50, max: 200), `offset` (default: 0)
- Returns total count in `X-Total-Count` header

#### Create Transaction (Complete Order)
```
POST /api/transactions
Content-Type: application/json

{
  "cart": [
    { "id": 1, "name": "Item 1", "quantity": 2, "price": 10.99 }
  ],
  "customerName": "John Doe",
  "tableNumber": 5,
  "subtotal": 21.98,
  "tax": 2.20,
  "total": 24.18,
  "orderId": 1
}
```
Automatically:
- Creates transaction record
- Updates sold count for items
- Marks order as completed

## WebSocket Connection

Connect to WebSocket at: `ws://localhost:5000`

### Events Broadcasted

All changes broadcast a message to connected clients:
```json
{
  "type": "UPDATE_ALL",
  "message": "Description of the change"
}
```

Events include:
- New menu item added
- Menu item updated/deleted
- New order created
- Order status changed
- Transaction completed

## Database Schema

### Tables

- **categories** - Menu item categories
- **menu_items** - Menu items with pricing and inventory
- **orders** - Customer orders with status tracking
- **order_items** - Line items for each order
- **transaction_history** - Completed transaction records
- **transaction_items** - Line items for each transaction

### Database Features

- Foreign key constraints enabled
- WAL (Write-Ahead Logging) mode for better concurrency
- Automatic indexing on frequently queried columns
- Transaction support for data integrity
- Auto-seeding with initial data

## Project Structure

```
back-end-pos/
├── database.js         # Database setup and schema
├── index.js            # Main server and API routes
├── mockData.js         # Seed data for categories and menu items
├── package.json        # Dependencies and scripts
├── pos-database.db     # SQLite database file (auto-generated)
└── README.md           # This file
```

## Environment Variables

Currently uses hardcoded values. For production, consider using environment variables:

- `PORT` - Server port (default: 5000)
- `DB_SOURCE` - Database file path (default: pos-database.db)
- `NODE_ENV` - Environment mode (development/production)

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `404` - Not found
- `500` - Server error

Error responses include a message:
```json
{
  "error": "Error description"
}
```

## Performance Optimizations

- Response caching headers on read-only endpoints
- Database connection pooling
- Compression middleware for responses
- Query result pagination
- Database indexes on frequently queried columns
- SQLite WAL mode for concurrent reads/writes

## Development

### Adding New Endpoints

1. Add route handler in `index.js`
2. Use `broadcast()` function to notify WebSocket clients of changes
3. Wrap database operations in transactions for data consistency

### Modifying Database Schema

1. Update table creation queries in `database.js`
2. Consider adding migration scripts for existing databases
3. Update seed data in `mockData.js` if needed

## License

ISC
