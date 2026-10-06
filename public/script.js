const API_URL = 'http://localhost:3000/api';
let currentRooms = []; // Sparar alla rum här för filtrering
let selectedDateGlobal = '';

// Kör när sidan laddas
document.addEventListener('DOMContentLoaded', () => {
    // Sätt dagens datum som standard i datumväljaren
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('dateFilter');
    if (dateInput) {
        dateInput.value = today;
        selectedDateGlobal = today;
    }
    fetchRoomsForDate();
});

// Hämta rum och vilka som är bokade ett visst datum
async function fetchRoomsForDate() {
    const dateInput = document.getElementById('dateFilter');
    selectedDateGlobal = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    try {
        // Hämta alla rum
        const roomsRes = await fetch(`${API_URL}/rooms`);
        const roomsData = await roomsRes.json();
        currentRooms = roomsData.data;

        // Hämta vilka rum som är bokade det valda datumet
        const bookedRes = await fetch(`${API_URL}/bookings/date/${selectedDateGlobal}`);
        const bookedData = await bookedRes.json();
        const bookedRoomIds = bookedData.bookedRoomIds || [];

        // Markera vilka rum som är bokade
        currentRooms = currentRooms.map(room => ({
            ...room,
            isBooked: bookedRoomIds.includes(room.id)
        }));

        filterRooms(); // Kör filtreringen direkt efter hämtning
    } catch (err) {
        console.error('Fel vid hämtning av rum:', err);
    }
}

// Filtrera rum baserat på sökord och våningsplan
function filterRooms() {
    const searchInput = document.getElementById('searchInput');
    const floorSelect = document.getElementById('floorFilter');
    
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedFloor = floorSelect ? floorSelect.value : '';

    const filtered = currentRooms.filter(room => {
        const matchesSearch = room.name.toLowerCase().includes(query) || 
            (room.features && room.features.toLowerCase().includes(query));
        
        const matchesFloor = selectedFloor === '' || (room.floor && room.floor.toString() === selectedFloor);

        return matchesSearch && matchesFloor;
    });

    displayRooms(filtered, selectedDateGlobal);
}

// Skriv ut rummen på skärmen
function displayRooms(rooms, selectedDate) {
    const roomList = document.getElementById('roomList');
    if (!roomList) return;
    
    roomList.innerHTML = '';

    if (rooms.length === 0) {
        roomList.innerHTML = '<p>No study rooms found matching your criteria.</p>';
        return;
    }

    rooms.forEach(room => {
        const card = document.createElement('div');
        card.classList.add('room-card');
        
        let buttonHTML = '';
        if (room.isBooked) {
            buttonHTML = `<button disabled style="background-color: gray; cursor: not-allowed;">Already Booked</button>`;
        } else {
            buttonHTML = `<button onclick="bookRoom(${room.id}, '${room.name}', '${selectedDate}')">Book for ${selectedDate}</button>`;
        }

        card.innerHTML = `
            <h3>${room.name}</h3>
            <p><strong>Floor:</strong> ${room.floor ? 'Floor ' + room.floor : 'Not specified'}</p>
            <p><strong>Capacity:</strong> ${room.capacity} people</p>
            <p><strong>Features:</strong> ${room.features || 'None specified'}</p>
            ${buttonHTML}
        `;
        roomList.appendChild(card);
    });
}

// Boka ett rum
async function bookRoom(roomId, roomName, date) {
    const username = prompt("Enter your username to book:");
    if (!username) return;

    try {
        // 1. Kolla om användaren finns, annars skapa den
        let userRes = await fetch(`${API_URL}/users`);
        let usersData = await userRes.json();
        let user = usersData.data.find(u => u.username === username);

        let userId;
        if (!user) {
            const createUserRes = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, role: 'user' })
            });
            const createdUserData = await createUserRes.json();
            userId = createdUserData.data.id;
        } else {
            userId = user.id;
        }

        // 2. Skapa bokningen
        const bookingRes = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                room_id: roomId,
                date: date,
                time_slot: '9-12' // Standardtidslucka
            })
        });

        if (bookingRes.ok) {
            alert(`Successfully booked ${roomName} for ${date}!`);
            fetchRoomsForDate(); // Uppdatera listan
        } else {
            alert('Error creating booking.');
        }
    } catch (err) {
        console.error('Fel vid bokning:', err);
    }
}

// Modal-funktioner för "My Bookings"
function openMyBookingsModal() {
    document.getElementById('myBookingsModal').style.display = 'block';
}

function closeMyBookingsModal() {
    document.getElementById('myBookingsModal').style.display = 'none';
}

async function fetchUserBookings() {
    const username = document.getElementById('usernameInput').value.trim();
    const listContainer = document.getElementById('userBookingsList');
    listContainer.innerHTML = '';

    if (!username) {
        listContainer.innerHTML = '<p style="color:red;">Please enter a username.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/user-bookings/${username}`);
        const bookings = await res.json();

        if (bookings.length === 0) {
            listContainer.innerHTML = '<p>No bookings found for this user.</p>';
            return;
        }

        bookings.forEach(b => {
            const div = document.createElement('div');
            div.style.border = '1px solid #ccc';
            div.style.margin = '10px 0';
            div.style.padding = '10px';
            div.innerHTML = `
                <p><strong>Rum:</strong> ${b.room_name}</p>
                <p><strong>Datum:</strong> ${b.date}</p>
                <p><strong>Tid:</strong> ${b.time_slot}</p>
                <button onclick="cancelBooking(${b.id})" style="background-color: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">Avboka</button>
            `;
            listContainer.appendChild(div);
        });
    } catch (err) {
        console.error('Fel vid hämtning av bokningar:', err);
        listContainer.innerHTML = '<p style="color:red;">Ett fel uppstod vid hämtning.</p>';
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Är du säker på att du vill avboka?')) return;

    try {
        const res = await fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert('Bokningen har tagits bort.');
            fetchUserBookings(); // Uppdatera modalen
            fetchRoomsForDate(); // Uppdatera huvudvyn
        } else {
            alert('Kunde inte avboka.');
        }
    } catch (err) {
        console.error('Fel vid avbokning:', err);
    }
}