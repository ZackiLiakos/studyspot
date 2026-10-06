const API_URL = '/api';

// Sätt dagens datum som standard i datumväljaren när sidan laddas och hämta rum
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('dateFilter');
    if (dateInput) {
        dateInput.value = today;
        fetchRoomsForDate(); 
    } else {
        fetchRooms(); 
    }
});

// Global variabel för att spara alla tillgängliga rum för sökfunktionen
let currentRooms = [];
let selectedDateGlobal = '';

// Hämta rum baserat på valt datum
async function fetchRoomsForDate() {
    const selectedDate = document.getElementById('dateFilter').value;
    selectedDateGlobal = selectedDate;
    
    try {
        // 1. Hämta alla rum
        const roomsRes = await fetch(`${API_URL}/rooms`);
        const roomsResult = await roomsRes.json();

        // 2. Hämta bokade rum ID:n för det valda datumet
        const bookingsRes = await fetch(`${API_URL}/bookings/date/${selectedDate}`);
        const bookingsResult = await bookingsRes.json();

        if (roomsResult.message === 'success' && bookingsResult.message === 'success') {
            const allRooms = roomsResult.data;
            const bookedIds = bookingsResult.bookedRoomIds;

            // 3. Filtrera bort de rum som redan är bokade det datumet
            currentRooms = allRooms.filter(room => !bookedIds.includes(room.id));

            displayRooms(currentRooms, selectedDate);
        }
    } catch (error) {
        console.error('Error fetching available rooms:', error);
    }
}

// Enkel sökfunktion som filtrerar på namn eller funktioner
function filterRooms() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = currentRooms.filter(room => 
        room.name.toLowerCase().includes(query) || 
        (room.features && room.features.toLowerCase().includes(query))
    );
    displayRooms(filtered, selectedDateGlobal);
}

// Visa rummen i HTML-strukturen
function displayRooms(rooms, selectedDate) {
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';

    if (rooms.length === 0) {
        roomList.innerHTML = `<p>No study rooms available on ${selectedDate}.</p>`;
        return;
    }

    rooms.forEach(room => {
        const card = document.createElement('div');
        card.classList.add('room-card');
        card.innerHTML = `
            <h3>${room.name}</h3>
            <p><strong>Capacity:</strong> ${room.capacity} people</p>
            <p><strong>Features:</strong> ${room.features || 'None specified'}</p>
            <button onclick="bookRoom(${room.id}, '${room.name}', '${selectedDate}')">Book for ${selectedDate}</button>
        `;
        roomList.appendChild(card);
    });
}

// Bokningsfunktionen med tidsintervall
async function bookRoom(roomId, roomName, selectedDate) {
    const username = prompt(`Enter your username to book ${roomName} on ${selectedDate}:`);
    if (!username) return;

    // Låt användaren välja tidsintervall
    const timeSlot = prompt(`Choose a time slot for ${roomName}:\n1: 6-9\n2: 9-12\n3: 12-15\n4: 15-18\n5: 18-21\n\nType the time slot (e.g. 9-12):`);
    
    const validSlots = ["6-9", "9-12", "12-15", "15-18", "18-21"];
    if (!validSlots.includes(timeSlot)) {
        alert('Invalid time slot chosen. Please choose one of: 6-9, 9-12, 12-15, 15-18, 18-21');
        return;
    }

    try {
        // Skapa eller hämta användare
        await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });
        
        const allUsersRes = await fetch(`${API_URL}/users`);
        const allUsersData = await allUsersRes.json();
        const user = allUsersData.data.find(u => u.username === username);

        if (!user) {
            alert('Could not identify user.');
            return;
        }

        // Skicka bokningen med både datum och tidssintervall
        const bookingRes = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                room_id: roomId,
                date: selectedDate,
                time_slot: timeSlot
            })
        });

        const bookingResult = await bookingRes.json();

        if (bookingRes.ok) {
            alert(`Success! Room ${roomName} booked for ${selectedDate} kl ${timeSlot}.`);
            fetchRoomsForDate(); 
        } else {
            alert('Booking failed: ' + (bookingResult.error || 'Unknown error'));
        }

    } catch (error) {
        console.error('Error making booking:', error);
        alert('Something went wrong.');
    }
}