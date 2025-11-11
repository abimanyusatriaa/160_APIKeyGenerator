const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./db/connection');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// 🚀 CREATE API Key
// ===============================
app.post('/api/keys', (req, res) => {
  const apiKey = `SK-SM-V1-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

  const query = 'INSERT INTO api_keys (api_key) VALUES (?)';
  db.query(query, [apiKey], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan API key' });
    }
    res.json({ success: true, id: result.insertId, apiKey });
  });
});

// ===============================
// 📖 READ (Tampilkan Semua API Key)
// ===============================
app.get('/api/keys', (req, res) => {
  const query = 'SELECT * FROM api_keys ORDER BY id DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Gagal mengambil data' });
    }
    res.json({ success: true, data: results });
  });
});

// ===============================
// ✏️ UPDATE API Key (Regenerate)
// ===============================
app.put('/api/keys/:id', (req, res) => {
  const { id } = req.params;
  const newApiKey = `SK-SM-V1-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

  const query = 'UPDATE api_keys SET api_key = ? WHERE id = ?';
  db.query(query, [newApiKey, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui API key' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'API key tidak ditemukan' });
    }
    res.json({ success: true, message: 'API key diperbarui', apiKey: newApiKey });
  });
});

// ===============================
// ❌ DELETE API Key
// ===============================
app.delete('/api/keys/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM api_keys WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Gagal menghapus API key' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'API key tidak ditemukan' });
    }
    res.json({ success: true, message: 'API key berhasil dihapus' });
  });
});

// ===============================
// 🧩 CEK VALIDITAS API KEY
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

app.listen(port, () => {
  console.log(`✅ Server berjalan di http://localhost:${port}`);
});
