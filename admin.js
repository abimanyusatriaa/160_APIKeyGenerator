// admin.js
const express = require("express");
const router = express.Router();
const db = require("./db/connection");
const bcrypt = require("bcrypt");

// =====================================================================
// REGISTER ADMIN
// =====================================================================
router.post("/register", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.json({ success: false, message: "Email dan password wajib diisi" });

    try {
        const hashedPass = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO admins (email, password) VALUES (?, ?)";
        db.query(sql, [email, hashedPass], (err) => {
            if (err) {
                console.error('ERR register admin:', err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.json({ success: false, message: "Email sudah terdaftar!" });
                }
                return res.json({ success: false, message: "Gagal register admin" });
            }
            res.json({ success: true, message: "Admin berhasil terdaftar!" });
        });
    } catch (e) {
        console.error('ERR bcrypt:', e);
        res.json({ success: false, message: "Gagal proses register" });
    }
});


// =====================================================================
// LOGIN ADMIN
// =====================================================================
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM admins WHERE email = ? LIMIT 1";

    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('ERR admin login select:', err);
            return res.json({ success: false, message: "Terjadi kesalahan server" });
        }

        if (results.length === 0)
            return res.json({ success: false, message: "Email tidak ditemukan" });

        const admin = results[0];
        try {
            const match = await bcrypt.compare(password, admin.password);

            if (!match)
                return res.json({ success: false, message: "Password salah" });

            res.json({ success: true, message: "Login berhasil!" });

        } catch (e) {
            console.error('ERR bcrypt compare:', e);
            res.json({ success: false, message: "Gagal proses login" });
        }
    });
});


// =====================================================================
// DASHBOARD DATA (LIST USER)
// =====================================================================
router.get("/dashboard-data", (req, res) => {
    const sql = `
        SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.api_key,
            k.created_at,
            IF(
                k.created_at IS NULL, 
                1,
                IF(TIMESTAMPDIFF(DAY, k.created_at, NOW()) >= 30, 1, 0)
            ) AS expired
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


// =====================================================================
// LIST SEMUA API KEY
// =====================================================================
router.get('/api-keys', (req, res) => {
    const sql = `
        SELECT 
            k.api_key,
            k.created_at,
            IF(
                TIMESTAMPDIFF(DAY, k.created_at, NOW()) >= 30,
                1, 
                0
            ) AS expired,
            DATE_ADD(k.created_at, INTERVAL 30 DAY) AS expired_at,
            u.email
        FROM api_keys k
        LEFT JOIN users u ON k.api_key = u.api_key
        ORDER BY k.created_at DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error('ERR /admin/api-keys:', err);
            return res.json({
                success: false,
                message: 'Server error mengambil semua API Key'
            });
        }

        return res.json({
            success: true,
            data: rows
        });
    });
});


// =====================================================================
// DELETE USER + API KEY
// =====================================================================
router.delete("/delete/:id", (req, res) => {
    const { id } = req.params;

    const sqlGetKey = "SELECT api_key FROM users WHERE id = ? LIMIT 1";
    db.query(sqlGetKey, [id], (err, result) => {
        if (err) {
            console.error('ERR get user api_key:', err);
            return res.json({ success: false, message: "Gagal mencari user" });
        }
        if (!result || result.length === 0) {
            return res.json({ success: false, message: "User tidak ditemukan" });
        }

        const api_key = result[0].api_key;

        const sqlDeleteUser = "DELETE FROM users WHERE id = ?";
        db.query(sqlDeleteUser, [id], (err2) => {
            if (err2) {
                console.error('ERR delete user:', err2);
                return res.json({ success: false, message: "Gagal hapus user" });
            }

            if (api_key) {
                const sqlDeleteKey = "DELETE FROM api_keys WHERE api_key = ?";
                db.query(sqlDeleteKey, [api_key], (err3) => {
                    if (err3) {
                        console.error('ERR delete api_key:', err3);
                        return res.json({ success: false, message: "Gagal hapus API key" });
                    }
                    return res.json({ success: true, message: "User + API key berhasil dihapus" });
                });
            } else {
                return res.json({ success: true, message: "User berhasil dihapus" });
            }
        });
    });
});


// =====================================================================
// DELETE API KEY SAJA
// =====================================================================
router.delete("/delete-apikey/:key", (req, res) => {
    const { key } = req.params;

    const sqlDeleteKey = "DELETE FROM api_keys WHERE api_key = ?";

    db.query(sqlDeleteKey, [key], (err) => {
        if (err) {
            console.error("ERR delete single api key:", err);
            return res.json({ success: false, message: "Gagal hapus API key" });
        }

        const sqlRemoveUserKey = "UPDATE users SET api_key = NULL WHERE api_key = ?";
        db.query(sqlRemoveUserKey, [key], () => {
            return res.json({ success: true, message: "API Key berhasil dihapus" });
        });
    });
});

module.exports = router;
