require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const db = require('./database.js');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://front-end-pos-pi.vercel.app,https://back-end-pos.onrender.com,https://your-frontend-domain.com')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const ALLOWED_REGEX = ALLOWED_ORIGINS.map(pat => {
    // Turn wildcard patterns into regex, escape regex specials first, then replace * with .*
    const esc = pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^' + esc.replace(/\\\*/g, '.*').replace(/\*/g, '.*') + '$');
});

// Middleware
const ALLOW_ALL_ORIGINS = ((process.env.ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true') || ((process.env.ALLOW_ALL_ORIGINS || '') === '1');
const corsOptions = {
    origin: ALLOW_ALL_ORIGINS ? true : (origin, callback) => {
        // Allow non-browser requests (no Origin) and all in non-production
        if (!origin || NODE_ENV !== 'production') return callback(null, true);
        const ok = ALLOWED_REGEX.some(rx => rx.test(origin));
        if (ok) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
// Respond to preflight requests
app.options('*', cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(compression());

// Create an HTTP server from the Express app to attach the WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Function to broadcast a message to all connected WebSocket clients
const broadcast = (data) => {
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

// Root route
app.get('/', (req, res) => {
    const xfProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
    const isHttps = xfProto ? xfProto === 'https' : !!req.secure;
    const host = req.get('host');
    const wsUrl = `${isHttps ? 'wss' : 'ws'}://${host}`;

    res.json({ 
        message: 'POS System Backend API',
        version: '1.0.0',
        status: 'running',
        ws: wsUrl,
        endpoints: {
            menu: '/api/menu',
            categories: '/api/categories',
            orders: '/api/live-orders',
            history: '/api/history',
            notifications: '/api/notifications'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// GET: Fetch all menu items with their category names
app.get('/api/menu', (req, res) => {
    const sql = `SELECT mi.*, c.name as category_name FROM menu_items mi JOIN categories c ON mi.category_id = c.id ORDER BY mi.id`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.set('Cache-Control', 'public, max-age=60');
        res.json({ data: rows });
    });
});

// GET: Fetch all categories
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.set('Cache-Control', 'public, max-age=60');
        res.json({ data: rows });
    });
});

// GET: Fetch all non-completed/non-canceled orders (paginated + aggregated)
app.get('/api/live-orders', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const countSql = "SELECT COUNT(*) as total FROM orders WHERE status != 'Completed' AND status != 'Canceled'";
    const dataSql = `
        SELECT o.*, 
               json_group_array(
                    json_object(
                        'id', mi.id,
                        'name', mi.name,
                        'price', mi.price,
                        'quantity', oi.quantity
                    )
               ) as items
        FROM (
            SELECT * FROM orders 
            WHERE status != 'Completed' AND status != 'Canceled'
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ) o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;
    db.get(countSql, [], (cntErr, cntRow) => {
        if (cntErr) return res.status(500).json({ error: cntErr.message });
        db.all(dataSql, [limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const data = rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]').filter(i => i && i.name) }));
            res.set('X-Total-Count', String(cntRow?.total || 0));
            res.json({ data });
        });
    });
});

// GET: Fetch all transaction history (paginated + aggregated)
app.get('/api/history', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const countSql = "SELECT COUNT(*) as total FROM transaction_history";
    const dataSql = `
        SELECT th.*, 
               json_group_array(
                   json_object(
                       'name', mi.name, 
                       'quantity', ti.quantity, 
                       'price_at_sale', ti.price_at_sale
                   )
               ) as items
        FROM (
            SELECT * FROM transaction_history 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ) th
        LEFT JOIN transaction_items ti ON ti.transaction_history_id = th.id
        LEFT JOIN menu_items mi ON mi.id = ti.menu_item_id
        GROUP BY th.id
        ORDER BY th.created_at DESC
    `;
    db.get(countSql, [], (cntErr, cntRow) => {
        if (cntErr) return res.status(500).json({ error: cntErr.message });
        db.all(dataSql, [limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const results = rows.map(row => ({ ...row, items: JSON.parse(row.items || '[]').filter(i => i && i.name) }));
            res.set('X-Total-Count', String(cntRow?.total || 0));
            res.json({ data: results });
        });
    });
});

// --- NOTIFICATION ROUTES ---
// GET: List notifications (paginated)
app.get('/api/notifications', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const countSql = 'SELECT COUNT(*) as total FROM notifications';
    const dataSql = `SELECT * FROM notifications ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`;
    db.get(countSql, [], (cntErr, cntRow) => {
        if (cntErr) return res.status(500).json({ error: cntErr.message });
        db.all(dataSql, [limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.set('X-Total-Count', String(cntRow?.total || 0));
            res.json({ data: rows });
        });
    });
});

// POST: Create and broadcast a notification
// Body: { level?: 'info'|'success'|'warning'|'error', message: string }
app.post('/api/notifications', (req, res) => {
    const level = (req.body.level || 'info').toString();
    const message = (req.body.message || '').toString().trim();
    if (!message) return res.status(400).json({ error: 'message is required' });

    db.run('INSERT INTO notifications(level, message) VALUES(?, ?)', [level, message], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const id = this.lastID;
        db.get('SELECT * FROM notifications WHERE id = ?', [id], (e, row) => {
            if (e || !row) return res.status(201).json({ id, level, message });
            broadcast({ type: 'NOTIFICATION', level: row.level, message: row.message, id: row.id, created_at: row.created_at });
            res.status(201).json({ data: row });
        });
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
