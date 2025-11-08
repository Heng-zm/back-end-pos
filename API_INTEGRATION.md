# API Integration Guide - Frontend & Backend Compatibility

This document explains how the frontend and backend communicate and ensures they work together seamlessly.

## Frontend Configuration

The frontend expects these environment variables (from `App.js`):

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://back-end-pos.onrender.com/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'wss://back-end-pos.onrender.com';
```

### Frontend `.env` file (Development):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
```

### Frontend `.env` file (Production):
```env
REACT_APP_API_URL=https://back-end-pos.onrender.com/api
REACT_APP_WS_URL=wss://back-end-pos.onrender.com
```

## API Endpoints Match

### ✅ 1. Get Menu Items
**Frontend Call** (App.js:52):
```javascript
fetch(`${API_URL}/menu`)
```

**Backend Route** (index.js:64):
```javascript
app.get('/api/menu', (req, res) => {
    // Returns: { data: [{ id, name, description, price, image, available, sold, category_name }] }
})
```

**Response Format:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Crispy Dory Sambal Matah",
      "description": "...",
      "price": 101.00,
      "image": "https://...",
      "available": 12,
      "sold": 6,
      "category_id": 1,
      "category_name": "Main course"
    }
  ]
}
```

### ✅ 2. Get Categories
**Frontend Call** (App.js:53):
```javascript
fetch(`${API_URL}/categories`)
```

**Backend Route** (index.js:68):
```javascript
app.get('/api/categories', (req, res) => {
    // Returns: { data: [{ id, name }] }
})
```

**Response Format:**
```json
{
  "data": [
    { "id": 1, "name": "Appetizer" },
    { "id": 2, "name": "Main course" },
    { "id": 3, "name": "Dessert" },
    { "id": 4, "name": "Beverage" }
  ]
}
```

### ✅ 3. Get Live Orders
**Frontend Call** (App.js:53):
```javascript
fetch(`${API_URL}/live-orders`)
```

**Backend Route** (index.js:75):
```javascript
app.get('/api/live-orders', (req, res) => {
    // Returns orders with status != 'Completed' and != 'Canceled'
    // Includes aggregated items array
})
```

**Response Format:**
```json
{
  "data": [
    {
      "id": 1,
      "order_uid": "#1699123456789",
      "customer_name": "John Doe",
      "table_number": 5,
      "status": "Waiting",
      "created_at": "2024-01-01 12:30:00",
      "items": [
        {
          "id": 1,
          "name": "Crispy Dory",
          "price": 101.00,
          "quantity": 2
        }
      ]
    }
  ]
}
```

### ✅ 4. Get Transaction History
**Frontend Call** (App.js:52):
```javascript
fetch(`${API_URL}/history`)
```

**Backend Route** (index.js:111):
```javascript
app.get('/api/history', (req, res) => {
    // Returns all completed transactions with items
})
```

**Response Format:**
```json
{
  "data": [
    {
      "id": 1,
      "transaction_uid": "#T1699123456789",
      "order_uid": "#1699123456789",
      "customer_name": "John Doe",
      "table_number": 5,
      "total": 222.20,
      "tax": 20.20,
      "subtotal": 202.00,
      "created_at": "2024-01-01 12:30:00",
      "items": [
        {
          "name": "Crispy Dory",
          "quantity": 2,
          "price_at_sale": 101.00
        }
      ]
    }
  ]
}
```

### ✅ 5. Create Order
**Frontend Call** (App.js:107):
```javascript
await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        customerName: "John Doe",
        tableNumber: 5,
        items: [
            { id: 1, name: "Item 1", quantity: 2 }
        ]
    })
})
```

**Backend Route** (index.js:173):
```javascript
app.post('/api/orders', (req, res) => {
    // Creates order and order_items
    // Decreases inventory (available count)
    // Returns: { message: "Order created successfully." }
})
```

**Request Body:**
```json
{
  "customerName": "John Doe",
  "tableNumber": 5,
  "items": [
    { "id": 1, "name": "Crispy Dory", "quantity": 2 }
  ]
}
```

**Response:**
```json
{
  "message": "Order created successfully."
}
```

### ✅ 6. Update Order Status
**Frontend Call** (App.js:132):
```javascript
await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: "Completed" })
})
```

**Backend Route** (index.js:191):
```javascript
app.put('/api/orders/:id/status', (req, res) => {
    // Updates order status
    // Valid statuses: Waiting, Preparing, Ready, Completed, Canceled
})
```

### ✅ 7. Create Transaction (Complete Payment)
**Frontend Call** (App.js:122):
```javascript
await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        cart: [{ id: 1, name: "Item", quantity: 2, price: 101.00 }],
        customerName: "John Doe",
        tableNumber: 5,
        subtotal: 202.00,
        tax: 20.20,
        total: 222.20,
        orderId: 1
    })
})
```

**Backend Route** (index.js:199):
```javascript
app.post('/api/transactions', (req, res) => {
    // Creates transaction_history and transaction_items
    // Updates sold count for items
    // Marks order as Completed
    // Returns: { data: { transaction_uid: "#T..." } }
})
```

**Response:**
```json
{
  "data": {
    "transaction_uid": "#T1699123456789"
  }
}
```

### ✅ 8. Admin - Create Menu Item
**Frontend Call** (App.js:139):
```javascript
await fetch(`${API_URL}/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: "New Item",
        description: "Description",
        price: 99.99,
        image: "https://...",
        available: 10,
        category_id: 1
    })
})
```

**Backend Route** (index.js:146):
```javascript
app.post('/api/menu', (req, res) => {
    // Creates new menu item
    // Broadcasts update to WebSocket clients
})
```

### ✅ 9. Admin - Update Menu Item
**Frontend Call** (App.js:139):
```javascript
await fetch(`${API_URL}/menu/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: "Updated Item",
        description: "New description",
        price: 99.99,
        image: "https://...",
        available: 5,
        category_id: 1
    })
})
```

**Backend Route** (index.js:155):
```javascript
app.put('/api/menu/:id', (req, res) => {
    // Updates menu item
    // Broadcasts update to WebSocket clients
})
```

### ✅ 10. Admin - Delete Menu Item
**Frontend Call** (App.js:146):
```javascript
await fetch(`${API_URL}/menu/${id}`, {
    method: 'DELETE'
})
```

**Backend Route** (index.js:164):
```javascript
app.delete('/api/menu/:id', (req, res) => {
    // Deletes menu item
    // Broadcasts update to WebSocket clients
})
```

### ✅ 11. Notifications

- List notifications (paginated):
```http
GET /api/notifications?limit=50&offset=0
```
Response:
```json
{
  "data": [
    { "id": 1, "level": "info", "message": "System started", "created_at": "2025-01-01 10:00:00" }
  ]
}
```

- Create and broadcast a notification:
```http
POST /api/notifications
Content-Type: application/json

{ "level": "success", "message": "Daily report generated" }
```
Response:
```json
{
  "data": { "id": 2, "level": "success", "message": "Daily report generated", "created_at": "2025-01-01 11:00:00" }
}
```

WebSocket broadcast payload:
```json
{
  "type": "NOTIFICATION",
  "level": "success",
  "message": "Daily report generated",
  "id": 2,
  "created_at": "2025-01-01 11:00:00"
}
```

## WebSocket Real-Time Updates

### Frontend WebSocket Connection (App.js:66):
```javascript
const ws = new WebSocket(WS_URL);

ws.onopen = () => console.log('WebSocket connected.');

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    // Shows toast notification
    // Refreshes all data
    toast.success(msg.message || 'System data updated!');
    fetchData();
};
```

### Backend WebSocket Broadcast (index.js:23):
```javascript
const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};
```

### Broadcast Events:
All mutations trigger a broadcast:
- New menu item added
- Menu item updated/deleted
- New order created
- Order status changed
- Transaction completed
- Notification created (type: NOTIFICATION)

**Message Format:**
```json
{
  "type": "UPDATE_ALL",
  "message": "New order for Table 5!"
}
```

## Data Flow Example: Complete Order Process

### 1. Customer Places Order
```
Frontend: POST /api/orders
Backend: Creates order, decreases inventory
Backend: Broadcasts "New order for Table X!"
Frontend: Receives WebSocket message, refreshes data
```

### 2. Order Status Updates
```
Frontend: PUT /api/orders/:id/status (status: "Ready")
Backend: Updates order status
Backend: Broadcasts "Order status changed to Ready"
Frontend: Receives WebSocket message, refreshes data
```

### 3. Customer Pays Bill
```
Frontend: POST /api/transactions
Backend: Creates transaction, updates sold count, marks order completed
Backend: Broadcasts "Bill for Table X settled"
Frontend: Receives WebSocket message, refreshes data, shows receipt
```

## Error Handling

Both frontend and backend use consistent error responses:

**Backend Error Format:**
```json
{
  "error": "Error message describing what went wrong"
}
```

**Frontend Error Handling (App.js:143):**
```javascript
try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error((await res.json()).error);
    return true;
} catch(err) {
    toast.error(err.message);
    return false;
}
```

## HTTP Status Codes

- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `404` - Not Found
- `500` - Server Error

## Testing the Integration

### 1. Start Backend:
```bash
cd back-end-pos
npm install
npm start
```

### 2. Start Frontend:
```bash
cd front-end-pos
npm install
npm start
```

### 3. Verify Connection:
- Frontend should connect at `http://localhost:3000`
- Backend should be running at `http://localhost:5000`
- Check browser console for "WebSocket connected" message
- Check terminal for "Client connected to WebSocket" message

### 4. Test a Complete Flow:
1. Add items to cart
2. Place an order
3. Check if order appears in "Live Orders"
4. Settle the bill
5. Verify transaction in "History"

## Common Integration Issues

### Issue 1: CORS Errors
**Problem:** Frontend can't connect to backend
**Solution:** Check CORS configuration in backend `index.js`:
```javascript
app.use(cors({
    origin: '*', // For development
    credentials: true
}));
```

### Issue 2: WebSocket Connection Fails
**Problem:** WebSocket shows disconnected
**Solution:** 
- Check `WS_URL` in frontend matches backend port
- Use `ws://` for development, `wss://` for production
- Verify backend WebSocket server is running

### Issue 3: Data Not Refreshing
**Problem:** Changes don't appear immediately
**Solution:**
- Check WebSocket connection is active
- Verify backend is broadcasting updates
- Check frontend `fetchData()` is called on WebSocket message

### Issue 4: Environment Variables Not Working
**Problem:** Frontend uses wrong API URL
**Solution:**
- Create `.env` file in frontend root
- Restart development server after changing `.env`
- Verify with `console.log(process.env.REACT_APP_API_URL)`

## Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend environment variables updated with production URLs
- [ ] CORS configured with production frontend URL
- [ ] WebSocket using `wss://` (secure)
- [ ] Database persistence configured
- [ ] Health check endpoint working (`/health`)
- [ ] Error logging configured
- [ ] Rate limiting enabled (optional but recommended)

## Performance Optimization

### Backend:
- ✅ Compression middleware enabled
- ✅ Response caching headers on GET requests
- ✅ Database indexes on frequently queried columns
- ✅ SQLite WAL mode for better concurrency
- ✅ Pagination support on large datasets

### Frontend:
- ✅ useMemo for expensive calculations
- ✅ Debounced search input
- ✅ Lazy loading components
- ✅ WebSocket for real-time updates (no polling)
- ✅ Toast notifications for user feedback

## Conclusion

The backend is fully compatible with the frontend. All API endpoints, data formats, and WebSocket communication are aligned and working together seamlessly.
