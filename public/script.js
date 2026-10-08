const API_URL = 'http://localhost:3000/api';
let currentRooms = [];
let selectedDateGlobal = '';

let selectedRoomId = null;
let selectedRoomName = null;
let selectedDate = null;
let currentAuthMode = 'login'; // 'login' eller 'register'
let loggedInUser = sessionStorage.getItem('studySpotSessionUser') || null;

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('dateFilter');
    if (dateInput) {
        dateInput.value = today;
        selectedDateGlobal = today;
    }
    
    updateAuthUI();
    fetchRoomsForDate();

    const closeBtn = document.querySelector('.close-time');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('timeModal').style.display = 'none';
        });
    }

    // Hantera klick på tids-knapparna i modalen
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', async () => {
            if (!loggedInUser) {
                alert('You must be logged in to book a room.');
                openAuthModal('login');
                return;
            }

            const timeSlot = button.getAttribute('data-time');

            try {
                const bookingRes = await fetch(`${API_URL}/bookings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: loggedInUser,
                        room_id: selectedRoomId,
                        date: selectedDate,
                        time_slot: timeSlot
                    })
                });

                const data = await bookingRes.json();

                if (bookingRes.ok) {
                    alert(`Successfully booked ${selectedRoomName} for ${selectedDate} (${timeSlot})!`);
                    document.getElementById('timeModal').style.display = 'none';
                    fetchRoomsForDate();
                } else {
                    alert(data.error || 'Error creating booking.');
                }
            } catch (err) {
                console.error('Error during booking:', err);
            }
        });
    });
});

// --- AUTENTISERING & UI ---

function updateAuthUI() {
    const loggedOutView = document.getElementById('loggedOutView');
    const loggedInView = document.getElementById('loggedInView');
    const usernameDisplay = document.getElementById('currentUsernameDisplay');

    if (loggedInUser) {
        if (loggedOutView) loggedOutView.style.display = 'none';
        if (loggedInView) loggedInView.style.display = 'block';
        if (usernameDisplay) usernameDisplay.innerText = loggedInUser;
    } else {
        if (loggedOutView) loggedOutView.style.display = 'block';
        if (loggedInView) loggedInView.style.display = 'none';
    }
}

function openAuthModal(mode) {
    currentAuthMode = mode;
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (mode === 'login') {
        title.innerText = 'Log In';
        submitBtn.innerText = 'Log In';
        submitBtn.style.backgroundColor = '#3498db';
    } else {
        title.innerText = 'Register Account';
        submitBtn.innerText = 'Register';
        submitBtn.style.backgroundColor = '#2ecc71';
    }

    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    modal.style.display = 'block';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;

    const endpoint = currentAuthMode === 'login' ? `${API_URL}/login` : `${API_URL}/register`;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            if (currentAuthMode === 'register') {
                alert('Account created successfully! You are now logged in.');
            } else {
                alert('Logged in successfully!');
            }
            loggedInUser = username;
            sessionStorage.setItem('studySpotSessionUser', username);
            updateAuthUI();
            closeAuthModal();
        } else {
            alert(data.error || 'Authentication failed.');
        }
    } catch (err) {
        console.error('Error during auth:', err);
        alert('An error occurred. Please check server connection.');
    }
}

function logout() {
    loggedInUser = null;
    sessionStorage.removeItem('studySpotSessionUser');
    updateAuthUI();
    alert('Logged out successfully.');
}

// --- RUM OCH BOKNINGAR ---

async function fetchRoomsForDate() {
    const dateInput = document.getElementById('dateFilter');
    selectedDateGlobal = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    try {
        const roomsRes = await fetch(`${API_URL}/rooms`);
        const roomsData = await roomsRes.json();
        currentRooms = roomsData.data;

        const bookedRes = await fetch(`${API_URL}/bookings/date/${selectedDateGlobal}`);
        const bookedData = await bookedRes.json();
        const roomBookings = bookedData.roomBookings || {};

        currentRooms = currentRooms.map(room => ({
            ...room,
            bookedSlots: roomBookings[room.id] || []
        }));

        filterRooms();
    } catch (err) {
        console.error('Error fetching rooms:', err);
    }
}

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

function displayRooms(rooms, selectedDate) {
    const roomList = document.getElementById('roomList');
    if (!roomList) return;
    
    roomList.innerHTML = '';

    if (rooms.length === 0) {
        roomList.innerHTML = '<p>No study rooms found matching your criteria.</p>';
        return;
    }

    rooms.sort((a, b) => {
        if (a.floor !== b.floor) {
            return (a.floor || 0) - (b.floor || 0);
        }
        return a.name.localeCompare(b.name);
    });

    let currentFloor = null;

    rooms.forEach(room => {
        if (room.floor !== currentFloor) {
            currentFloor = room.floor;
            
            if (roomList.children.length > 0) {
                const hr = document.createElement('hr');
                hr.style.gridColumn = '1 / -1';
                hr.style.margin = '30px 0 15px 0';
                hr.style.border = '0';
                hr.style.borderTop = '2px solid #ddd';
                roomList.appendChild(hr);
            }

            const floorHeader = document.createElement('h2');
            floorHeader.style.gridColumn = '1 / -1';
            floorHeader.style.color = '#333';
            floorHeader.style.marginTop = '10px';
            floorHeader.textContent = currentFloor ? `Floor ${currentFloor}` : 'Other Rooms';
            roomList.appendChild(floorHeader);
        }

        const card = document.createElement('div');
        card.classList.add('room-card');
        
        const allSlots = ['6-9', '9-12', '12-15', '15-18', '18-21'];
        const isFullyBooked = allSlots.every(slot => room.bookedSlots.includes(slot));

        let buttonHTML = '';
        if (isFullyBooked) {
            buttonHTML = `<button disabled style="background-color: gray; cursor: not-allowed;">Fully Booked</button>`;
        } else {
            const bookedSlotsStr = encodeURIComponent(JSON.stringify(room.bookedSlots));
            buttonHTML = `<button onclick="bookRoom(${room.id}, '${room.name}', '${selectedDate}', '${bookedSlotsStr}')">Book Time Slot</button>`;
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

function bookRoom(roomId, roomName, date, bookedSlotsEncoded) {
    if (!loggedInUser) {
        alert('Please log in first to book a room.');
        openAuthModal('login');
        return;
    }

    selectedRoomId = roomId;
    selectedRoomName = roomName;
    selectedDate = date;

    let bookedSlots = [];
    try {
        bookedSlots = JSON.parse(decodeURIComponent(bookedSlotsEncoded));
    } catch (e) {
        bookedSlots = [];
    }

    document.getElementById('modalRoomName').innerText = roomName;
    document.getElementById('modalDate').innerText = date;

    document.querySelectorAll('.time-btn').forEach(button => {
        const timeSlot = button.getAttribute('data-time');
        
        if (bookedSlots.includes(timeSlot)) {
            button.style.display = 'none';
        } else {
            button.style.display = 'block';
            if (timeSlot === '6-9') button.innerText = '06:00 - 09:00';
            if (timeSlot === '9-12') button.innerText = '09:00 - 12:00';
            if (timeSlot === '12-15') button.innerText = '12:00 - 15:00';
            if (timeSlot === '15-18') button.innerText = '15:00 - 18:00';
            if (timeSlot === '18-21') button.innerText = '18:00 - 21:00';
        }
    });

    document.getElementById('timeModal').style.display = 'block';
}

function openMyBookingsModal() {
    if (!loggedInUser) {
        alert('Please log in to view your bookings.');
        openAuthModal('login');
        return;
    }
    fetchUserBookings();
    document.getElementById('myBookingsModal').style.display = 'block';
}

function closeMyBookingsModal() {
    document.getElementById('myBookingsModal').style.display = 'none';
}

async function fetchUserBookings() {
    const listContainer = document.getElementById('userBookingsList');
    listContainer.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/user-bookings/${loggedInUser}`);
        const bookings = await res.json();

        if (bookings.length === 0) {
            listContainer.innerHTML = '<p>No bookings found for your account.</p>';
            return;
        }

        bookings.forEach(b => {
            const div = document.createElement('div');
            div.style.border = '1px solid #ccc';
            div.style.margin = '10px 0';
            div.style.padding = '10px';
            div.innerHTML = `
                <p><strong>Room:</strong> ${b.room_name}</p>
                <p><strong>Date:</strong> ${b.date}</p>
                <p><strong>Time:</strong> ${b.time_slot}</p>
                <button onclick="cancelBooking(${b.id})" style="background-color: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">Cancel</button>
            `;
            listContainer.appendChild(div);
        });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        listContainer.innerHTML = '<p style="color:red;">An error occurred while fetching bookings.</p>';
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        const res = await fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert('Booking has been cancelled.');
            fetchUserBookings();
            fetchRoomsForDate();
        } else {
            alert('Could not cancel booking.');
        }
    } catch (err) {
        console.error('Error cancelling booking:', err);
    }
}