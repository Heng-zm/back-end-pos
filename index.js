const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create an HTTP server from the Express app to attach the WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Function to broadcast a message to all connected WebSocket clients
const broadcast = (data) => {
    console.log("Broadcasting update:", data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

wss.on('connection', ws => {
    console.log('Client connected to WebSocket');
    ws.on('close', () => console.log('Client disconnected from WebSocket'));
});

// --- API ROUTES ---

// GET: Fetch all menu items with their category names
app.get('/api/menu', (req, res) => {
    const sql = `SELECT mi.*, c.name as category_name FROM menu_items mi JOIN categories c ON mi.category_id = c.id ORDER BY mi.id`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// GET: Fetch all categories
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// GET: Fetch all non-completed/non-canceled orders
app.get('/api/live-orders', (req, res) => {
    const sql = "SELECT * FROM orders WHERE status != 'Completed' AND status != 'Canceled' ORDER BY created_at DESC";
    db.all(sql, [], (err, orders) => {
        if (err || !orders || orders.length === 0) return res.json({ data: [] });
        const promises = orders.map(order => new Promise((resolve, reject) => {
            const itemSql = "SELECT mi.*, oi.quantity FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = ?";
            db.all(itemSql, [order.id], (e, items) => e ? reject(e) : resolve({ ...order, items }));
        }));
        Promise.all(promises).then(results => res.json({ data: results })).catch(error => res.status(500).json({ error: error.message }));
    });
});

// GET: Fetch all transaction history
app.get('/api/history', (req, res) => {
    const sql = `
        SELECT th.*, json_group_array(json_object('name', mi.name, 'quantity', ti.quantity, 'price_at_sale', ti.price_at_sale)) as items
        FROM transaction_history th
        LEFT JOIN transaction_items ti ON ti.transaction_history_id = th.id
        LEFT JOIN menu_items mi ON mi.id = ti.menu_item_id
        GROUP BY th.id ORDER BY th.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const results = rows.map(row => ({ ...row, items: JSON.parse(row.items || '[]').filter(i => i.name) }));
        res.json({ data: results });
    });
});

// --- ADMIN ROUTES for Menu Management ---
app.post('/api/menu', (req, res) => {
    const { name, description, price, image, available, category_id } = req.body;
    db.run(`INSERT INTO menu_items (name, description, price, image, available, category_id, sold) VALUES (?,?,?,?,?,?,0)`, [name, description, price, image, available, category_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        broadcast({ type: 'UPDATE_ALL', message: `New item '${name}' was added.` });
        res.status(201).json({ id: this.lastID, message: "Menu item created successfully." });
    });
});

app.put('/api/menu/:id', (req, res) => {
    const { name, description, price, image, available, category_id } = req.body;
    db.run('UPDATE menu_items SET name=?,description=?,price=?,image=?,available=?,category_id=? WHERE id=?', [name, description, price, image, available, category_id, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        broadcast({ type: 'UPDATE_ALL', message: `Item '${name}' was updated.` });
        res.json({ message: "Menu item updated successfully." });
    });
});

app.delete('/api/menu/:id', (req, res) => {
    db.run('DELETE FROM menu_items WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        broadcast({ type: 'UPDATE_ALL', message: 'An item was deleted.' });
        res.json({ message: "Menu item deleted successfully." });
    });
});

// --- ORDER & TRANSACTION ROUTES ---
app.post('/api/orders', (req, res) => {
    const { customerName, tableNumber, items } = req.body;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run('INSERT INTO orders (order_uid, customer_name, table_number) VALUES (?, ?, ?)', [`#${Date.now()}`, customerName, tableNumber], function(err) {
            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
            const orderId = this.lastID;
            const itemPromises = items.map(item => new Promise((resolve, reject) => db.run('INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)', [orderId, item.id, item.quantity], e => e ? reject(e) : resolve())));
            const inventoryPromises = items.map(item => new Promise((resolve, reject) => db.run('UPDATE menu_items SET available = available - ? WHERE id = ? AND available >= ?', [item.quantity, item.id, item.quantity], function(e) { (e || this.changes === 0) ? reject(new Error(`Not enough stock for ${item.name}`)) : resolve(); })));
            Promise.all([...itemPromises, ...inventoryPromises]).then(() => {
                db.run("COMMIT");
                broadcast({ type: 'UPDATE_ALL', message: `New order for Table ${tableNumber}!` });
                res.status(201).json({ message: "Order created successfully." });
            }).catch(error => { db.run("ROLLBACK"); res.status(500).json({ error: error.message }); });
        });
    });
});

app.put('/api/orders/:id/status', (req, res) => {
    db.run('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        broadcast({ type: 'UPDATE_ALL', message: `Order status changed to ${req.body.status}` });
        res.json({ message: "Status updated." });
    });
});

app.post('/api/transactions', (req, res) => {
    const { cart, customerName, tableNumber, subtotal, tax, total, orderId } = req.body;
    db.get('SELECT order_uid FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err || !order) return res.status(404).json({ error: "Order not found." });
        const transactionUID = `#T${Date.now()}`;
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run('INSERT INTO transaction_history (transaction_uid,order_uid,customer_name,table_number,total,tax,subtotal) VALUES (?,?,?,?,?,?,?)', [transactionUID, order.order_uid, customerName, tableNumber, total, tax, subtotal], function(e){
                if (e) { db.run("ROLLBACK"); return res.status(500).json({ error: e.message }); }
                const transId = this.lastID;
                Promise.all([
                    ...cart.map(i => new Promise((rs,rj)=>db.run('INSERT INTO transaction_items (transaction_history_id,menu_item_id,quantity,price_at_sale) VALUES (?,?,?,?)',[transId,i.id,i.quantity,i.price],e=>e?rj(e):rs()))),
                    ...cart.map(i => new Promise((rs,rj)=>db.run('UPDATE menu_items SET sold=sold+? WHERE id=?',[i.quantity,i.id],e=>e?rj(e):rs()))),
                    new Promise((rs,rj)=>db.run('UPDATE orders SET status=? WHERE id=?',['Completed', orderId],e=>e?rj(e):rs()))
                ]).then(() => {
                    db.run("COMMIT");
                    broadcast({ type: 'UPDATE_ALL', message: `Bill for Table ${tableNumber} settled.` });
                    res.status(201).json({ data: { transaction_uid: transactionUID } });
                }).catch(error => { db.run("ROLLBACK"); res.status(500).json({ error: error.message }); });
            });
        });
    });
});

// --- SERVER START ---
server.listen(PORT, () => console.log(`Server with WebSocket running on http://localhost:${PORT}`));