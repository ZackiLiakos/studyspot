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
    }
});

// En enkel test-route för att kolla att servern lever
app.get('/', (req, res) => {
    res.send('StudySpot API är igång!');
});

// Starta servern
app.listen(PORT, () => {
    console.log(`Servern körs på http://localhost:${PORT}`);
});
