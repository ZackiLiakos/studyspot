const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public')); // Gör så att filer i 'public'-mappen visas

// Anslut till SQLite-databas (skapar en fil som heter database.sqlite)
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Kunde inte ansluta till databasen:', err.message);
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
            time_slot TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )`, (err) => {
            if (err) {
                console.error('Fel vid skapande av tabeller:', err.message);
            } else {
                console.log('Alla databastabeller är skapade eller kontrollerade!');
                seedData(); // Kör testdata när tabellerna är klara
            }
        });
    });
}

// Funktion som lägger till lite testdata automatiskt om det är tomt
function seedData() {
    db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO rooms (name, capacity, features) VALUES ('Room A101', 6, 'Whiteboard')`);
            db.run(`INSERT INTO rooms (name, capacity, features) VALUES ('Silent Room B', 4, 'Quiet area')`);
            db.run(`INSERT INTO rooms (name, capacity, features) VALUES ('Group Lab C', 10, 'Projector, Whiteboard')`);
            console.log('Testrum tillagda i databasen!');
        }
    });
}

// --- API ROUTES ---

// 1. Hämta alla rum (GET)
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

// 2. Lägg till ett rum (POST)
app.post('/api/rooms', (req, res) => {
    const { name, capacity, features } = req.body;
    const sql = 'INSERT INTO rooms (name, capacity, features) VALUES (?, ?, ?)';
    const params = [name, capacity, features];
    
    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: { id: this.lastID, name, capacity, features }
        });
    });
});

// 3. Hämta alla användare (GET)
app.get('/api/users', (req, res) => {
    const sql = 'SELECT * FROM users';
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

// 4. Lägg till en användare (POST)
app.post('/api/users', (req, res) => {
    const { username, role } = req.body;
    const sql = 'INSERT INTO users (username, role) VALUES (?, ?)';
    db.run(sql, [username, role || 'user'], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: { id: this.lastID, username, role: role || 'user' }
        });
    });
});

// 5. Hämta alla bokningar (GET)
app.get('/api/bookings', (req, res) => {
    const sql = `
        SELECT bookings.id, bookings.date, bookings.time_slot, users.username, rooms.name AS room_name 
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

// 6. Skapa en bokning (POST)
app.post('/api/bookings', (req, res) => {
    const { user_id, room_id, date, time_slot } = req.body;
    const sql = 'INSERT INTO bookings (user_id, room_id, date, time_slot) VALUES (?, ?, ?, ?)';
    db.run(sql, [user_id, room_id, date, time_slot], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: { id: this.lastID, user_id, room_id, date, time_slot }
        });
    });
});

// 7. Hämta bokade rum för ett specifikt datum (GET)
app.get('/api/bookings/date/:date', (req, res) => {
    const targetDate = req.params.date;
    const sql = 'SELECT room_id FROM bookings WHERE date = ?';
    
    db.all(sql, [targetDate], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const bookedRoomIds = rows.map(row => row.room_id);
        res.json({
            message: 'success',
            bookedRoomIds: bookedRoomIds
        });
    });
});

// Starta servern
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});