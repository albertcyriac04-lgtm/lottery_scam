// ========================================
// MegaDraw India - Frontend Application
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initScrollAnimations();
    loadContestStatus();
    loadWinners();
    initForm();
    // Auto-refresh status every 15 seconds
    setInterval(loadContestStatus, 15000);
    setInterval(loadWinners, 15000);
});

// ===== NAVBAR SCROLL EFFECT =====
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ===== LOAD CONTEST STATUS =====
async function loadContestStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.success) {
            animateNumber('slotsLeft', data.slotsRemaining);
            animateNumber('totalRegistered', data.totalRegistrations);

            // Update CTA if contest is over
            if (!data.contestActive) {
                const badge = document.querySelector('.hero-badge');
                if (badge) {
                    badge.innerHTML = '<span class="dot" style="background: var(--rose-400);"></span> All 10 Slots Filled — Contest Closed';
                }
            }
        }
    } catch (err) {
        console.error('Failed to load status:', err);
    }
}

// ===== ANIMATE NUMBERS =====
function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 600;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(current + (target - current) * eased);
        el.textContent = value;
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

// ===== LOAD WINNERS =====
async function loadWinners() {
    try {
        const res = await fetch('/api/winners');
        const data = await res.json();
        const container = document.getElementById('winnersList');

        if (data.success && data.winners.length > 0) {
            container.innerHTML = data.winners.map(w => `
        <div class="winner-row">
          <div class="winner-info">
            <div class="winner-pos">${w.position}</div>
            <div>
              <div class="winner-name">${w.name}</div>
              <div class="winner-phone">${w.phone}</div>
            </div>
          </div>
          <div class="winner-prize">₹${w.prize.toLocaleString('en-IN')}</div>
        </div>
      `).join('');
        } else {
            container.innerHTML = '<div class="no-winners">No winners yet. Be the first to register and win! 🎯</div>';
        }
    } catch (err) {
        console.error('Failed to load winners:', err);
    }
}

// ===== FORM HANDLING =====
function initForm() {
    const form = document.getElementById('registerForm');
    const phoneInput = document.getElementById('phoneNumber');
    const aadharInput = document.getElementById('aadharNumber');

    // Auto-format phone (only digits)
    phoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
    });

    // Auto-format Aadhaar with spaces: XXXX XXXX XXXX
    aadharInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 12);
        let formatted = '';
        for (let i = 0; i < val.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += val[i];
        }
        e.target.value = formatted;
    });

    form.addEventListener('submit', handleRegistration);
}

async function handleRegistration(e) {
    e.preventDefault();

    const name = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phoneNumber').value.trim();
    const aadhar = document.getElementById('aadharNumber').value.replace(/\s/g, '').trim();
    const agreed = document.getElementById('agreeTerms').checked;
    const submitBtn = document.getElementById('submitBtn');

    // Clear errors
    document.querySelectorAll('.form-input').forEach(i => i.classList.remove('error'));

    // Validate
    let hasError = false;

    if (name.length < 2) {
        document.getElementById('fullName').classList.add('error');
        hasError = true;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
        document.getElementById('phoneNumber').classList.add('error');
        hasError = true;
    }

    if (!/^\d{12}$/.test(aadhar)) {
        document.getElementById('aadharNumber').classList.add('error');
        hasError = true;
    }

    if (!agreed) {
        showToast('Please agree to the Terms & Conditions', 'error');
        return;
    }

    if (hasError) {
        showToast('Please fix the highlighted fields', 'error');
        return;
    }

    // Submit
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<span class="spinner"></span> Verifying...';

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, aadhar })
        });

        const data = await res.json();

        if (data.success) {
            if (data.winner) {
                showWinnerModal(data);
                launchConfetti();
            } else {
                showResultModal('😊', 'Thank You!', data.message);
            }
            document.getElementById('registerForm').reset();
            loadContestStatus();
            loadWinners();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Something went wrong. Please try again.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = '🎯 Register & Check My Luck';
    }
}

// ===== MODAL =====
function showWinnerModal(data) {
    document.getElementById('modalIcon').textContent = '🎉';
    document.getElementById('modalTitle').textContent = `Winner #${data.position}!`;
    document.getElementById('modalPrize').textContent = `₹${data.prize.toLocaleString('en-IN')}`;
    document.getElementById('modalPrize').style.display = 'block';
    document.getElementById('modalMessage').textContent = data.message;
    document.getElementById('resultModal').classList.add('active');
}

function showResultModal(icon, title, message) {
    document.getElementById('modalIcon').textContent = icon;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalPrize').style.display = 'none';
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('resultModal').classList.add('active');
}

function closeModal() {
    document.getElementById('resultModal').classList.remove('active');
}

// ===== CONFETTI =====
function launchConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#fbbf24', '#f59e0b', '#6366f1', '#34d399', '#fb7185', '#fcd34d', '#a78bfa'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = (Math.random() * 8 + 5) + 'px';
        confetti.style.height = (Math.random() * 8 + 5) + 'px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = (Math.random() * 1.5) + 's';
        container.appendChild(confetti);
    }

    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// ===== TOAST =====
function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
