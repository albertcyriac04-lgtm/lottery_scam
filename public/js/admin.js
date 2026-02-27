// ========================================
// MegaDraw India - Admin Panel
// ========================================

let allRegistrations = [];

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
});

// ===== CHECK SESSION =====
async function checkSession() {
    try {
        const res = await fetch('/api/admin/check');
        if (res.ok) {
            showDashboard();
        }
    } catch (err) {
        // Not logged in, show login form
    }
}

// ===== LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;
    const btn = document.getElementById('loginBtn');

    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            showDashboard();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Login failed. Please try again.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.innerHTML = 'Login to Dashboard';
    }
}

// ===== SHOW DASHBOARD =====
function showDashboard() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'inline-flex';
    refreshData();
}

// ===== REFRESH DATA =====
async function refreshData() {
    await Promise.all([loadStats(), loadRegistrations()]);
}

// ===== LOAD STATS =====
async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (data.success) {
            document.getElementById('statTotal').textContent = data.stats.total;
            document.getElementById('statWinners').textContent = data.stats.winners;
            document.getElementById('statSlots').textContent = data.stats.slotsRemaining;
            document.getElementById('statNonWinners').textContent = data.stats.nonWinners;
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// ===== LOAD REGISTRATIONS =====
async function loadRegistrations() {
    try {
        const res = await fetch('/api/admin/registrations');
        const data = await res.json();
        if (data.success) {
            allRegistrations = data.registrations;
            renderTable(allRegistrations);
        }
    } catch (err) {
        console.error('Failed to load registrations:', err);
    }
}

// ===== RENDER TABLE =====
function renderTable(registrations) {
    const tbody = document.getElementById('tableBody');

    if (registrations.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No registrations found.
        </td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = registrations.map((r, i) => {
        const date = new Date(r.created_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const formattedAadhar = r.aadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');

        return `
      <tr>
        <td>${r.id}</td>
        <td class="name-cell">${escapeHtml(r.name)}</td>
        <td>${r.phone}</td>
        <td>${formattedAadhar}</td>
        <td>
          ${r.is_winner
                ? '<span class="badge badge-winner">🏆 Winner</span>'
                : '<span class="badge badge-participant">Participant</span>'
            }
        </td>
        <td style="color: ${r.is_winner ? 'var(--gold-400)' : 'var(--text-muted)'}; font-weight: ${r.is_winner ? '700' : '400'};">
          ${r.is_winner ? '₹' + r.prize_amount.toLocaleString('en-IN') : '—'}
        </td>
        <td>${date}</td>
      </tr>
    `;
    }).join('');
}

// ===== SEARCH =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
        renderTable(allRegistrations);
        return;
    }
    const filtered = allRegistrations.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.phone.includes(query) ||
        r.aadhar.includes(query)
    );
    renderTable(filtered);
}

// ===== LOGOUT =====
async function logout() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) { }
    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('loginForm').reset();
}

// ===== UTILITIES =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
