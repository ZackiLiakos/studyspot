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

// Globala variabler
let currentRooms = [];
let selectedDateGlobal = '';

// Hämta rum baserat på valt datum
async function fetchRoomsForDate() {
    const dateInput = document.getElementById('dateFilter');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    selectedDateGlobal = selectedDate;
    
    try {
        const roomsRes = await fetch(`${API_URL}/rooms`);
        const roomsResult = await roomsRes.json();

        const bookingsRes = await fetch(`${API_URL}/bookings/date/${selectedDate}`);
        const bookingsResult = await bookingsRes.json();

        if (roomsResult.message === 'success' && bookingsResult.message === 'success') {
            const allRooms = roomsResult.data;
            const bookedIds = bookingsResult.bookedRoomIds || [];

            // Filtrera bort rum som redan är bokade det datumet
            currentRooms = allRooms.filter(room => !bookedIds.includes(room.id));
            displayRooms(currentRooms, selectedDate);
        }
    } catch (error) {
        console.error('Error fetching available rooms:', error);
    }
}

// Fallback om datumväljare saknas
async function fetchRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`);
        const result = await response.json();
        if (result.message === 'success') {
            currentRooms = result.data;
            displayRooms(currentRooms, new Date().toISOString().split('T')[0]);
        }
    } catch (error) {
        console.error('Could not fetch rooms:', error);
    }
}

// Sökfunktion som filtrerar på namn eller funktioner
function filterRooms() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const filtered = currentRooms.filter(room => 
        room.name.toLowerCase().includes(query) || 
        (room.features && room.features.toLowerCase().includes(query))
    );
    displayRooms(filtered, selectedDateGlobal);
}

// Visa rummen i HTML-strukturen
function displayRooms(rooms, selectedDate) {
    const roomList = document.getElementById('roomList');
    if (!roomList) return;
    
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

    const timeSlot = prompt(`Choose a time slot for ${roomName}:\n1: 6-9\n2: 9-12\n3: 12-15\n4: 15-18\n5: 18-21\n\nType the time slot (e.g. 9-12):`);
    
    const validSlots = ["6-9", "9-12", "12-15", "15-18", "18-21"];
    if (!validSlots.includes(timeSlot)) {
        alert('Invalid time slot chosen. Please choose one of: 6-9, 9-12, 12-15, 15-18, 18-21');
        return;
    }

    try {
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

// --- "MY BOOKINGS" MODAL FUNKTIONER ---

function openMyBookings() {
    const modal = document.getElementById('bookingsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeMyBookings() {
    const modal = document.getElementById('bookingsModal');
    if (modal) {
        modal.style.display = 'none';
        const modalInput = document.getElementById('modalUsername');
        const modalList = document.getElementById('modalBookingsList');
        if (modalInput) modalInput.value = '';
        if (modalList) modalList.innerHTML = '';
    }
}

async function fetchModalBookings() {
    const usernameInput = document.getElementById('modalUsername');
    const listContainer = document.getElementById('modalBookingsList');
    
    if (!usernameInput || !listContainer) return;
    
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Vänligen ange ett användarnamn.');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/user-bookings/${username}`);
        const result = await res.json();
        const bookings = Array.isArray(result) ? result : (result.data || []);

        listContainer.innerHTML = '';

        if (bookings.length === 0) {
            listContainer.innerHTML = `<p style="color: #666; text-align: center;">Inga bokningar hittades för "${username}".</p>`;
            return;
        }

        bookings.forEach(b => {
            const item = document.createElement('div');
            item.style.cssText = "background: #f4f6f8; padding: 10px; margin-bottom: 8px; border-radius: 6px; font-size: 0.9rem;";
            item.innerHTML = `
                <strong>Rum:</strong> ${b.room_name}<br>
                <strong>Datum:</strong> ${b.date}<br>
                <strong>Tid:</strong> ${b.time_slot}<br>
                <button onclick="cancelBooking(${b.id})" style="margin-top: 6px; padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; width: auto;">Avboka</button>
            `;
            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error('Kunde inte hämta bokningar:', error);
        listContainer.innerHTML = `<p style="color: red; text-align: center;">Ett fel uppstod vid hämtning.</p>`;
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Är du säker på att du vill ta bort denna bokning?')) return;

    try {
        const res = await fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        const result = await res.json();

        if (res.ok && result.success) {
            alert('Bokningen har tagits bort!');
            fetchModalBookings(); 
            if (typeof fetchRoomsForDate === 'function') {
                fetchRoomsForDate(); 
            }
        } else {
            alert('Kunde inte ta bort bokningen.');
        }
    } catch (error) {
        console.error('Fel vid avbokning:', error);
    }
}