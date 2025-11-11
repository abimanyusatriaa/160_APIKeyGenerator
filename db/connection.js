const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // ganti jika berbeda
  password: 'satriaadji11', // isi password MySQL kamu
  database: 'pembuat_api_key',
  port: "3309"
});

db.connect((err) => {
  if (err) {
    console.error('❌ Gagal terhubung ke database:', err.message);
  } else {
    console.log('✅ Terhubung ke database MySQL');
  }
});

module.exports = db;
