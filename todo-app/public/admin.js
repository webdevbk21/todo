const API_URL = "/api/orders";

async function loadOrders() {
    try {
        const response = await fetch(API_URL);
        const orders = await response.json();
        
        const list = document.getElementById("ordersList");
        list.innerHTML = "";
        
        if (orders.length === 0) {
            list.innerHTML = '<div class="empty-state">No orders found.</div>';
            return;
        }

        orders.forEach(order => {
            const card = document.createElement("div");
            card.className = `order-card ${order.status === 'processed' ? 'processed' : ''}`;
            
            card.innerHTML = `
                <div class="order-header">
                    <span class="order-id">Order #${order.id}</span>
                    <span class="order-status status-${order.status}">${order.status}</span>
                </div>
                <div class="order-details">
                    <div class="detail-item">
                        <span class="label">File Name</span>
                        <span class="value">${order.file_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Contact</span>
                        <span class="value">${order.contact_number || 'N/A'}</span>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <span class="label">Specifications</span>
                        <span class="value">${order.specifications || 'N/A'}</span>
                    </div>
                    ${order.amount ? `
                    <div class="detail-item">
                        <span class="label">Amount Set</span>
                        <span class="value">₹${order.amount}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">UPI ID</span>
                        <span class="value">${order.upi_id}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="admin-actions">
                    <div class="input-group">
                        <span class="label">Set Amount (₹)</span>
                        <input type="number" id="amt-${order.id}" placeholder="e.g. 50" value="${order.amount || ''}">
                    </div>
                    <div class="input-group">
                        <span class="label">UPI ID</span>
                        <input type="text" id="upi-${order.id}" placeholder="e.g. name@upi" value="${order.upi_id || ''}">
                    </div>
                    <button class="btn btn-primary" onclick="processOrder(${order.id})">
                        ${order.status === 'processed' ? 'Update & Resend' : 'Send Payment QR'}
                    </button>
                </div>
                <button class="btn btn-danger" onclick="deleteOrder(${order.id})">Delete Order</button>
            `;
            list.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading orders:", error);
    }
}

async function processOrder(id) {
    const amount = document.getElementById(`amt-${id}`).value;
    const upi_id = document.getElementById(`upi-${id}`).value;

    if (!amount || !upi_id) {
        alert("Please fill both amount and UPI ID");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, upi_id })
        });

        if (response.ok) {
            alert("Payment details sent to student!");
            loadOrders();
        }
    } catch (error) {
        console.error("Error processing order:", error);
    }
}

async function deleteOrder(id) {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            loadOrders();
        }
    } catch (error) {
        console.error("Error deleting order:", error);
    }
}

// Auto-refresh every 30 seconds
setInterval(loadOrders, 30000);
loadOrders();
