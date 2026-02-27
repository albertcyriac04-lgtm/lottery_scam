require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const {
    insertRegistration,
    getWinnerCount,
    getAllRegistrations,
    getRegistrationByPhone,
    getRegistrationByAadhar,
    getTotalCount,
    getWinners,
    getStats,
    PRIZE_TIERS
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

// ---- PUBLIC API ----

// Get contest status (slots remaining, etc.)
app.get('/api/status', (req, res) => {
    try {
        const { count } = getWinnerCount.get();
        const total = getTotalCount.get().count;
        res.json({
            success: true,
            totalRegistrations: total,
            winnersSelected: count,
            slotsRemaining: Math.max(0, 10 - count),
            contestActive: count < 10,
            prizeTiers: PRIZE_TIERS
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Register a participant
app.post('/api/register', (req, res) => {
    try {
        const { name, phone, aadhar } = req.body;

        // Validation
        if (!name || !phone || !aadhar) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const cleanName = name.trim();
        const cleanPhone = phone.trim().replace(/\s/g, '');
        const cleanAadhar = aadhar.trim().replace(/\s/g, '');

        if (cleanName.length < 2) {
            return res.status(400).json({ success: false, message: 'Please enter a valid name.' });
        }

        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
        }

        if (!/^\d{12}$/.test(cleanAadhar)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid 12-digit Aadhaar number.' });
        }

        // Check duplicates
        if (getRegistrationByPhone.get(cleanPhone)) {
            return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
        }

        if (getRegistrationByAadhar.get(cleanAadhar)) {
            return res.status(409).json({ success: false, message: 'This Aadhaar number is already registered.' });
        }

        // Check if still eligible for prize
        const { count } = getWinnerCount.get();
        const isWinner = count < 10;
        const prizeAmount = isWinner ? PRIZE_TIERS[count] : 0;

        insertRegistration.run({
            name: cleanName,
            phone: cleanPhone,
            aadhar: cleanAadhar,
            is_winner: isWinner ? 1 : 0,
            prize_amount: prizeAmount
        });

        if (isWinner) {
            res.json({
                success: true,
                winner: true,
                position: count + 1,
                prize: prizeAmount,
                message: `🎉 Congratulations ${cleanName}! You are Winner #${count + 1} and have won ₹${prizeAmount.toLocaleString('en-IN')}!`
            });
        } else {
            res.json({
                success: true,
                winner: false,
                message: `Thank you for registering, ${cleanName}. Unfortunately, all 10 prize slots have been filled. Better luck next time!`
            });
        }
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
});

// Get public winners list (masked info)
app.get('/api/winners', (req, res) => {
    try {
        const winners = getWinners.all().map((w, i) => ({
            position: i + 1,
            name: w.name.substring(0, 2) + '***',
            phone: w.phone.substring(0, 3) + '****' + w.phone.substring(7),
            prize: w.prize_amount,
            date: w.created_at
        }));
        res.json({ success: true, winners });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ---- ADMIN API ----

// Admin auth middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Unauthorized. Please login as admin.' });
}

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === adminUser && password === adminPass) {
        req.session.isAdmin = true;
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// Check admin session
app.get('/api/admin/check', requireAdmin, (req, res) => {
    res.json({ success: true, isAdmin: true });
});

// Get all registrations (admin only)
app.get('/api/admin/registrations', requireAdmin, (req, res) => {
    try {
        const registrations = getAllRegistrations.all();
        res.json({ success: true, registrations });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get stats (admin only)
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    try {
        const stats = getStats.get();
        res.json({
            success: true,
            stats: {
                total: stats.total,
                winners: stats.winners,
                nonWinners: stats.non_winners,
                slotsRemaining: Math.max(0, 10 - stats.winners)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Serve pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`🎰 Lucky Draw server running at http://localhost:${PORT}`);
    console.log(`🔐 Admin panel: http://localhost:${PORT}/admin`);
});
