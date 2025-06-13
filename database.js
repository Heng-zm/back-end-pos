const sqlite3 = require('sqlite3').verbose();
const { menuItemsData, categoriesData } = require('./mockData');

const DB_SOURCE = "pos-database.db";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) { console.error(err.message); throw err; }
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;');
        db.run(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)`, (err) => { if (err) console.error(err.message); seedCategories(); });
        db.run(`CREATE TABLE IF NOT EXISTS menu_items (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT, price REAL NOT NULL, image TEXT, available INTEGER NOT NULL, sold INTEGER NOT NULL DEFAULT 0, category_id INTEGER, FOREIGN KEY (category_id) REFERENCES categories (id))`, (err) => { if (err) console.error(err.message); seedMenuItems(); });
        db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_uid TEXT NOT NULL UNIQUE, customer_name TEXT, table_number INTEGER, status TEXT NOT NULL DEFAULT 'Waiting', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, menu_item_id INTEGER, quantity INTEGER NOT NULL, FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE, FOREIGN KEY (menu_item_id) REFERENCES menu_items (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS transaction_history (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_uid TEXT NOT NULL UNIQUE, order_uid TEXT, customer_name TEXT, table_number INTEGER, total REAL NOT NULL, tax REAL NOT NULL, subtotal REAL NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS transaction_items (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_history_id INTEGER, menu_item_id INTEGER, quantity INTEGER NOT NULL, price_at_sale REAL NOT NULL, FOREIGN KEY (transaction_history_id) REFERENCES transaction_history (id) ON DELETE CASCADE, FOREIGN KEY (menu_item_id) REFERENCES menu_items (id))`);
    });
});

function seedCategories() {
    db.get(`SELECT COUNT(*) as count FROM categories`, [], (err, row) => {
        if (!err && row.count === 0) {
            console.log('Seeding categories...');
            const stmt = db.prepare(`INSERT INTO categories (id, name) VALUES (?, ?)`);
            categoriesData.forEach(cat => stmt.run(cat.id, cat.name));
            stmt.finalize();
        }
    });
}
function seedMenuItems() {
    db.get(`SELECT COUNT(*) as count FROM menu_items`, [], (err, row) => {
        if (!err && row.count === 0) {
            console.log('Seeding menu_items...');
            const stmt = db.prepare(`INSERT INTO menu_items (id, name, description, price, image, available, sold, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT id FROM categories WHERE name = ?))`);
            menuItemsData.forEach(item => stmt.run(item.id, item.name, item.description, item.price, item.image, item.available, item.sold, item.category));
            stmt.finalize();
        }
    });
}

module.exports = db;