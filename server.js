const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Middleware för att kunna läsa JSON-data i anrop
app.use(express.json());

// Anslut till (eller skapa) lokal SQLite-databas
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Fel vid anslutning till databasen:', err.message);
    } else {
        console.log('Ansluten till SQLite-databasen.');
        createTables();
    }
});

// Funktion som skapar tabellerna (Users, Rooms, Bookings) om de inte finns
function createTables() {
    db.serialize(() => {
        // 1. Användartabell
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'user'
        )`);

        // 2. Studierumstabell
        db.run(`CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            features TEXT
        )`);

        // 3. Bokningstabell med kopplingar (Foreign Keys)
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            room_id INTEGER,
            date TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )`, (err) => {
            if (err) {
                console.error('Fel vid skapande av tabeller:', err.message);
            } else {
                console.log('Alla databastabeller är skapade eller kontrollerade!');
            }
        });
    });
}

// En enkel test-route för att kolla att servern lever
app.get('/', (req, res) => {
    res.send('StudySpot API är igång!');
});

// ==========================================
// ROOMS API (CRUD)
// ==========================================

// 1. Hämta alla studierum (GET)
app.get('/api/rooms', (req, res) => {
    const sql = 'SELECT * FROM rooms';
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// 2. Lägg till ett nytt studierum (POST)
app.post('/api/rooms', (req, res) => {
    const { name, capacity, features } = req.body;
    
    if (!name || !capacity) {
        res.status(400).json({ error: 'Name and capacity is mandatory!' });
        return;
    }

    const sql = 'INSERT INTO rooms (name, capacity, features) VALUES (?, ?, ?)';
    const params = [name, capacity, features];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: { id: this.lastID, name, capacity, features }
        });
    });
});

// ==========================================
// USERS API
// ==========================================

app.post('/api/users', (req, res) => {
    const { username, role } = req.body;
    
    if (!username) {
        res.status(400).json({ error: 'Username is mandatory!' });
        return;
    }

    const sql = 'INSERT INTO users (username, role) VALUES (?, ?)';
    const params = [username, role || 'user'];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: { id: this.lastID, username, role: role || 'user' }
        });
    });
});

// ==========================================
// BOOKINGS API (CRUD)
// ==========================================

app.get('/api/bookings', (req, res) => {
    const sql = `
        SELECT bookings.id, bookings.date, users.username, rooms.name AS room_name 
        FROM bookings
        JOIN users ON bookings.user_id = users.id
        JOIN rooms ON bookings.room_id = rooms.id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

app.post('/api/bookings', (req, res) => {
    const { user_id, room_id, date } = req.body;

    if (!user_id || !room_id || !date) {
        res.status(400).json({ error: 'user_id, room_id och date is mandatory!' });
        return;
    }

    const sql = 'INSERT INTO bookings (user_id, room_id, date) VALUES (?, ?, ?)';
    const params = [user_id, room_id, date];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: { id: this.lastID, user_id, room_id, date }
        });
    });
});

// Starta servern
app.listen(PORT, () => {
    console.log(`Servern körs på http://localhost:${PORT}`);
});