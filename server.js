const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Anslut till SQLite-databas
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Kunde inte ansluta till databasen:', err.message);
    } else {
        console.log('Ansluten till SQLite-databasen.');
        createTables();
    }
});

// Funktion som skapar tabellerna om de inte finns
function createTables() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            features TEXT,
            floor INTEGER
        )`);

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
                seedData();
            }
        });
    });
}

// Funktion som lägger till testdata om det är tomt
function seedData() {
    db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E1211', 6, 'Whiteboard', 1)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E1212', 4, 'Quiet area', 1)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E1213', 10, 'Projector, Whiteboard', 1)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E1214', 8, 'Whiteboard', 1)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2211', 6, 'Quiet area', 2)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2212', 2, 'Projector', 2)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2213', 4, 'Glassed in', 2)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2214', 8, 'Projector', 2)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2311', 12, 'Computer room', 3)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2312', 8, 'Glassed in', 3)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2313', 4, 'Glassed in', 3)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2314', 4, 'Quiet area', 3)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2315', 4, 'Projector', 3)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2411', 6, 'Computer room', 4)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2412', 10, 'Projector', 4)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2413', 4, 'Quiet area, Whiteboard', 4)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2414', 2, 'Projector, Glassed in', 4)`);
            db.run(`INSERT INTO rooms (name, capacity, features, floor) VALUES ('Room E2415', 6, 'Projector', 4)`);

            console.log('Testrum tillagda med våningsplan!');
        }
    });
}

// --- API ROUTES ---

// 1. Hämta alla rum (GET)
app.get('/api/rooms', (req, res) => {
    const sql = 'SELECT * FROM rooms';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', data: rows });
    });
});

// 2. Lägg till ett rum (POST)
app.post('/api/rooms', (req, res) => {
    const { name, capacity, features, floor } = req.body;
    const sql = 'INSERT INTO rooms (name, capacity, features, floor) VALUES (?, ?, ?, ?)';
    db.run(sql, [name, capacity, features, floor], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'success', data: { id: this.lastID, name, capacity, features, floor } });
    });
});

// 3. Registrera ny användare (POST)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.run(sql, [username, hashedPassword], function(err) {
            if (err) {
                return res.status(400).json({ error: 'Username is already taken or database error.' });
            }
            res.json({ message: 'success', userId: this.lastID });
        });
    } catch (e) {
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// 4. Logga in användare (POST)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required.' });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Incorrect username or password.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({ message: 'success', username: user.username });
        } else {
            res.status(400).json({ error: 'Incorrect username or password.' });
        }
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
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', data: rows });
    });
});

// 6. Skapa en bokning (POST) - Tar emot username och letar upp user_id
app.post('/api/bookings', (req, res) => {
    const { username, room_id, date, time_slot } = req.body;

    if (!username || !room_id || !date || !time_slot) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'User not found.' });
        }

        const user_id = user.id;

        // Kolla om användaren redan har bokat detta datum
        const checkSql = 'SELECT * FROM bookings WHERE user_id = ? AND date = ?';
        db.get(checkSql, [user_id, date], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (row) {
                return res.status(400).json({ error: 'You can only make one booking per day!' });
            }

            const insertSql = 'INSERT INTO bookings (user_id, room_id, date, time_slot) VALUES (?, ?, ?, ?)';
            db.run(insertSql, [user_id, room_id, date, time_slot], function(err) {
                if (err) {
                    return res.status(400).json({ error: err.message });
                }
                res.json({
                    message: 'success',
                    data: { id: this.lastID, user_id, room_id, date, time_slot }
                });
            });
        });
    });
});

// 7. Hämta bokade rum för ett specifikt datum (GET)
app.get('/api/bookings/date/:date', (req, res) => {
    const targetDate = req.params.date;
    const sql = 'SELECT room_id, time_slot FROM bookings WHERE date = ?';
    
    db.all(sql, [targetDate], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const roomBookings = {};
        rows.forEach(row => {
            if (!roomBookings[row.room_id]) {
                roomBookings[row.room_id] = [];
            }
            roomBookings[row.room_id].push(row.time_slot);
        });

        res.json({ message: 'success', roomBookings: roomBookings });
    });
});

// 8. Hämta bokningar för en specifik användare (GET)
app.get('/api/user-bookings/:username', (req, res) => {
    const sql = `
        SELECT bookings.id, bookings.date, bookings.time_slot, rooms.name AS room_name, users.username
        FROM bookings
        JOIN users ON bookings.user_id = users.id
        JOIN rooms ON bookings.room_id = rooms.id
        WHERE users.username = ?
    `;
    db.all(sql, [req.params.username], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 9. Ta bort (avboka) en bokning (DELETE)
app.delete('/api/bookings/:id', (req, res) => {
    db.run("DELETE FROM bookings WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// Starta servern
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});