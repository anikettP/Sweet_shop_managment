/**
 * Sweet Shop Management System - Backend API
 * Theme: Mithai & More
 * * Setup:
 * 1. Initialize project: `npm init -y`
 * 2. Install dependencies: `npm install express sqlite3 bcryptjs jsonwebtoken cors`
 * 3. Run: `node server.js`
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = "super_secret_mithai_key"; // In production, use process.env.SECRET_KEY

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection (Persistent File)
const dbPath = path.resolve(__dirname, 'sweets.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database " + dbPath + ": " + err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// Database Initialization
db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    )`);

    // 2. Sweets Table
    db.run(`CREATE TABLE IF NOT EXISTS sweets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        price REAL,
        quantity INTEGER,
        description TEXT
    )`);

    // 3. Seed Data (Only if empty)
    db.get("SELECT count(*) as count FROM sweets", [], (err, row) => {
        if (err) console.error(err);
        if (row && row.count === 0) {
            console.log("Seeding database with initial inventory...");
            const stmt = db.prepare("INSERT INTO sweets (name, category, price, quantity, description) VALUES (?, ?, ?, ?, ?)");
            
            // Mithai
            stmt.run("Kaju Katli", "Mithai", 850.00, 20, "Premium diamond-shaped cashew fudge with silver leaf.");
            stmt.run("Gulab Jamun (1kg)", "Mithai", 350.00, 15, "Soft berry-sized balls dunked in rose flavored sugar syrup.");
            stmt.run("Motichoor Ladoo", "Mithai", 400.00, 30, "Tiny droplets of chickpea flour fried and dipped in syrup.");
            
            // Chocolate
            stmt.run("Dark Hazelnut Bar", "Chocolate", 150.00, 50, "70% Cocoa with roasted hazelnuts.");
            
            // Beverages
            stmt.run("Masala Chai Mix", "Beverage", 250.00, 40, "Authentic spice blend for the perfect tea.");
            
            stmt.finalize();
        }
    });
    
    // 4. Create Admin User (admin@mithai.com / admin123)
    db.get("SELECT * FROM users WHERE email = 'admin@mithai.com'", [], (err, row) => {
        if (!row) {
            const hash = bcrypt.hashSync("admin123", 8);
            db.run("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", ["admin@mithai.com", hash, "admin"]);
            console.log("Admin user created: admin@mithai.com / admin123");
        }
    });
});

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }
    next();
};

// --- API Endpoints ---

// 1. Authentication
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({error: "Email and password are required"});
    
    const hashedPassword = bcrypt.hashSync(password, 8);
    const role = email.includes('admin') ? 'admin' : 'user'; // Simple role logic for demo
    
    db.run("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [email, hashedPassword, role], function(err) {
        if (err) return res.status(400).json({ error: "User already exists" });
        
        // Auto-login after register
        const token = jwt.sign({ id: this.lastID, email, role }, SECRET_KEY, { expiresIn: '24h' });
        res.status(201).json({ token, user: { id: this.lastID, email, role } });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err || !user) return res.status(400).json({ error: "User not found" });
        
        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Invalid password" });
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    });
});

// 2. Sweets Management
// Get all sweets
app.get('/api/sweets', authenticateToken, (req, res) => {
    db.all("SELECT * FROM sweets ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Search sweets
app.get('/api/sweets/search', authenticateToken, (req, res) => {
    const { q, maxPrice } = req.query;
    let sql = "SELECT * FROM sweets WHERE (name LIKE ? OR category LIKE ?)";
    const params = [`%${q}%`, `%${q}%`];

    if (maxPrice) {
        sql += " AND price <= ?";
        params.push(maxPrice);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add sweet (Admin Only)
app.post('/api/sweets', authenticateToken, isAdmin, (req, res) => {
    const { name, category, price, quantity, description } = req.body;
    db.run("INSERT INTO sweets (name, category, price, quantity, description) VALUES (?, ?, ?, ?, ?)", 
        [name, category, price, quantity, description], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

// Update sweet (Admin Only)
app.put('/api/sweets/:id', authenticateToken, isAdmin, (req, res) => {
    const { name, category, price, description } = req.body;
    db.run(
        `UPDATE sweets SET 
            name = COALESCE(?, name), 
            category = COALESCE(?, category), 
            price = COALESCE(?, price), 
            description = COALESCE(?, description) 
        WHERE id = ?`,
        [name, category, price, description, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Sweet not found" });
            res.json({ message: "Product updated successfully" });
        }
    );
});

// Delete sweet (Admin Only)
app.delete('/api/sweets/:id', authenticateToken, isAdmin, (req, res) => {
    db.run("DELETE FROM sweets WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product removed from inventory" });
    });
});

// 3. Inventory Operations
// Purchase (Decrease quantity)
app.post('/api/sweets/:id/purchase', authenticateToken, (req, res) => {
    const { quantity = 1 } = req.body;
    
    db.serialize(() => {
        db.get("SELECT quantity, name FROM sweets WHERE id = ?", [req.params.id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: "Product not found" });
            
            if (row.quantity < quantity) {
                return res.status(400).json({ error: `Insufficient stock. Only ${row.quantity} left.` });
            }
            
            db.run("UPDATE sweets SET quantity = quantity - ? WHERE id = ?", [quantity, req.params.id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ 
                    message: "Purchase successful", 
                    product: row.name,
                    quantityPurchased: quantity,
                    remainingStock: row.quantity - quantity 
                });
            });
        });
    });
});

// Restock (Increase quantity - Admin Only)
app.post('/api/sweets/:id/restock', authenticateToken, isAdmin, (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    
    db.run("UPDATE sweets SET quantity = quantity + ? WHERE id = ?", [amount, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Restocked successfully. Added ${amount} units.` });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test with: http://localhost:${PORT}/api/sweets`);
});
