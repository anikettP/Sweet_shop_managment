/**
 * Sweet Shop Management System - Backend API (Vercel Serverless Version)
 * Theme: Mithai & More
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

// Express App
const app = express();
const SECRET_KEY = process.env.SECRET_KEY || "super_secret_mithai_key";

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database (File-Based)
const dbPath = path.resolve(process.cwd(), 'sweets.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB Error:", err.message);
    else console.log("Connected to SQLite DB:", dbPath);
});

// Initialize Tables & Seed Data
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sweets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        price REAL,
        quantity INTEGER,
        description TEXT
    )`);

    db.get("SELECT COUNT(*) AS count FROM sweets", [], (err, row) => {
        if (row && row.count === 0) {
            const stmt = db.prepare(
                "INSERT INTO sweets (name, category, price, quantity, description) VALUES (?, ?, ?, ?, ?)"
            );

            // Mithai
            stmt.run("Kaju Katli", "Mithai", 850.00, 20, "Premium cashew sweet");
            stmt.run("Gulab Jamun (1kg)", "Mithai", 350.00, 15, "Soft milk balls in sugar syrup");
            stmt.run("Motichoor Ladoo", "Mithai", 400.00, 30, "Golden ladoos");

            // Chocolate
            stmt.run("Dark Hazelnut Bar", "Chocolate", 150.00, 50, "70% Cocoa rich chocolate");

            // Beverage
            stmt.run("Masala Chai Mix", "Beverage", 250.00, 40, "Authentic spice blend");

            stmt.finalize();
        }
    });

    // Admin user
    db.get("SELECT * FROM users WHERE email = 'admin@mithai.com'", [], (err, row) => {
        if (!row) {
            const hash = bcrypt.hashSync("admin123", 8);
            db.run(
                "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
                ["admin@mithai.com", hash, "admin"]
            );
        }
    });
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const header = req.headers['authorization'];
    const token = header && header.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin')
        return res.status(403).json({ error: "Admin access required" });
    next();
};

// AUTH ROUTES
app.post('/auth/register', (req, res) => {
    const { email, password } = req.body;

    const hashed = bcrypt.hashSync(password, 8);
    const role = email.includes("admin") ? "admin" : "user";

    db.run(
        "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
        [email, hashed, role],
        function (err) {
            if (err) return res.status(400).json({ error: "User exists" });

            const token = jwt.sign(
                { id: this.lastID, email, role },
                SECRET_KEY,
                { expiresIn: "24h" }
            );

            res.json({ token, user: { id: this.lastID, email, role } });
        }
    );
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (!user) return res.status(400).json({ error: "User not found" });

        if (!bcrypt.compareSync(password, user.password))
            return res.status(400).json({ error: "Wrong password" });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.json({ token, user });
    });
});

// SWEETS ROUTES
app.get('/sweets', authenticateToken, (req, res) => {
    db.all("SELECT * FROM sweets ORDER BY name ASC", [], (err, rows) => {
        res.json(rows);
    });
});

app.post('/sweets', authenticateToken, isAdmin, (req, res) => {
    const { name, category, price, quantity, description } = req.body;

    db.run(
        "INSERT INTO sweets (name, category, price, quantity, description) VALUES (?, ?, ?, ?, ?)",
        [name, category, price, quantity, description],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            res.json({ id: this.lastID, ...req.body });
        }
    );
});

app.put('/sweets/:id', authenticateToken, isAdmin, (req, res) => {
    const { name, category, price, description } = req.body;

    db.run(
        `UPDATE sweets SET 
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            price = COALESCE(?, price),
            description = COALESCE(?, description)
        WHERE id = ?`,
        [name, category, price, description, req.params.id],
        function (err) {
            if (this.changes === 0)
                return res.status(404).json({ error: "Sweet not found" });
            
            res.json({ message: "Sweet updated" });
        }
    );
});

app.delete('/sweets/:id', authenticateToken, isAdmin, (req, res) => {
    db.run("DELETE FROM sweets WHERE id = ?", req.params.id, function (err) {
        res.json({ message: "Sweet deleted" });
    });
});

// PURCHASE
app.post('/sweets/:id/purchase', authenticateToken, (req, res) => {
    const quantity = req.body.quantity || 1;

    db.get("SELECT quantity, name FROM sweets WHERE id = ?", [req.params.id], (err, row) => {
        if (!row) return res.status(404).json({ error: "Not found" });

        if (row.quantity < quantity)
            return res.status(400).json({ error: "Not enough stock" });

        db.run(
            "UPDATE sweets SET quantity = quantity - ? WHERE id = ?",
            [quantity, req.params.id]
        );

        res.json({ 
            message: "Purchase successful",
            remaining: row.quantity - quantity
        });
    });
});

// RESTOCK
app.post('/sweets/:id/restock', authenticateToken, isAdmin, (req, res) => {
    const { amount } = req.body;

    db.run(
        "UPDATE sweets SET quantity = quantity + ? WHERE id = ?",
        [amount, req.params.id]
    );

    res.json({ message: "Restocked successfully" });
});

// REQUIRED FOR VERCEL
module.exports = app;
