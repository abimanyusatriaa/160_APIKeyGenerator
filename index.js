// index.js
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./db/connection'); // pastikan file ini ada
const adminRoutes = require('./admin'); // router admin (register, login, apikeys, users, delete)
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// mount api admin routes (register/login/data/delete)
app.use('/admin', adminRoutes);

// ===============================
// 🚀 CREATE API Key
//  - membuat api_keys entry, mengembalikan apiKey dan id
// ===============================
app.post('/api/keys', (req, res) => {
  const apiKey = `SK-SM-V1-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

  const query = 'INSERT INTO api_keys (api_key) VALUES (?)';
  db.query(query, [apiKey], (err, result) => {
    if (err) {
      console.error('ERR insert api_keys:', err);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan API key' });
    }
    res.json({ success: true, id: result.insertId, apiKey });
  });
});

// ===============================
// SAVE USER (dipanggil setelah generate api key)
// body: { first_name, last_name, email, api_key }
// ===============================
app.post('/api/users/save', (req, res) => {
    const { first_name, last_name, email, api_key } = req.body;

    if (!first_name || !last_name || !email || !api_key) {
        return res.status(400).json({ success: false, message: "Semua field wajib diisi" });
    }

    const sql = `
        INSERT INTO users (first_name, last_name, email, api_key)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [first_name, last_name, email, api_key], (err, result) => {
        if (err) {
            console.error('ERR insert users:', err);
            return res.status(500).json({
                success: false,
                message: `Gagal menyimpan user: ${err.sqlMessage || err.message}`
            });
        }

        res.json({ success: true, message: "User berhasil disimpan ke database" });
    });
});

// ===============================
// READ ALL API Keys (untuk keperluan lain)
// ===============================
app.get('/api/keys', (req, res) => {
  const query = 'SELECT * FROM api_keys ORDER BY id DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('ERR select api_keys:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengambil data' });
    }
    res.json({ success: true, data: results });
  });
});

// ===============================
// CEK API KEY
// ===============================
app.post('/api/cekapi', (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ success: false, message: 'API key tidak dikirim' });
  }

  const query = 'SELECT * FROM api_keys WHERE api_key = ? LIMIT 1';
  db.query(query, [apiKey], (err, results) => {
    if (err) {
      console.error('Error saat mengecek API key:', err);
      return res.status(500).json({ success: false, message: 'Kesalahan server' });
    }

    if (results.length > 0) {
      res.json({ success: true, message: 'API key valid' });
    } else {
      res.status(401).json({ success: false, message: 'API key tidak valid' });
    }
  });
});

// ===============================
// ROUTE TAMPILAN DASHBOARD (kirim file HTML)
// ===============================
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ===============================
// DATA DASHBOARD (untuk AJAX di dashboard.html)
// Menghitung expired berdasarkan created_at (>=30 hari = expired)
// ===============================
app.get("/admin/dashboard-data", (req, res) => {
    const sql = `
        SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.api_key,
            k.created_at,
            IF(k.created_at IS NULL, 1, IF(TIMESTAMPDIFF(DAY, k.created_at, NOW()) >= 30, 1, 0)) AS expired
        FROM users u
        LEFT JOIN api_keys k ON k.api_key = u.api_key
        ORDER BY u.id DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error('ERR dashboard-data:', err);
            return res.json({ success: false, message: "Gagal mengambil data dashboard" });
        }
        res.json({ success: true, data: rows });
    });
});

// ===============================
// START SERVER
// ===============================
app.listen(port, () => {
  console.log(`✅ Server berjalan di http://localhost:${port}`);
});
