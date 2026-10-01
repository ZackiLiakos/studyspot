const API_URL = '/api';

// Fetch and display study rooms when the page loads
async function fetchRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`);
        const result = await response.json();
        
        if (result.message === 'success') {
            displayRooms(result.data);
        }
    } catch (error) {
        console.error('Could not fetch rooms:', error);
    }
}

// Display rooms in the HTML structure
function displayRooms(rooms) {
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';

    if (rooms.length === 0) {
        roomList.innerHTML = '<p>No study rooms available at the moment.</p>';
        return;
    }

    rooms.forEach(room => {
        const card = document.createElement('div');
        card.classList.add('room-card');
        card.innerHTML = `
            <h3>${room.name}</h3>
            <p><strong>Capacity:</strong> ${room.capacity} people</p>
            <p><strong>Features:</strong> ${room.features || 'None specified'}</p>
            <button onclick="alert('Booking function for room ${room.name} will be connected soon!')">Book Room</button>
        `;
        roomList.appendChild(card);
    });
}

// Run the function on startup
fetchRooms();