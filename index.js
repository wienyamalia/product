const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql');
const fs = require('fs');


const app = express();
const upload = multer({ dest: 'uploads/' });

const storage = new Storage({
    keyFilename: 'capstonec23-ps118-bbac9b349534.json', // Ganti dengan nama file kunci GCP Anda
    projectId: 'capstonec23-ps118.appspot.com', // Ganti dengan ID proyek Google Cloud Anda
});

const dbConfig = {
    host: '34.28.108.156',
    user: 'root', // Ganti dengan username database Anda
    password: '123', // Ganti dengan password database Anda
    database: 'products', // Ganti dengan nama database Anda
};

const bucketName = 'capstonec23-ps118.appspot.com'; // Ganti dengan nama bucket Google Cloud Storage Anda
const bucket = storage.bucket(bucketName);

// Koneksi ke database
const connection = mysql.createConnection(dbConfig);
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to database.');
    }
});

// Menambahkan product baru
app.post('/product', upload.single('foto'), (req, res) => {
    const { nama, deskripsi } = req.body;
    const fotoPath = req.file.path;

    // Upload foto ke penyimpanan cloud
    const bucket = storage.bucket(bucketName);
    const fotoFileName = `${Date.now()}_${req.file.originalname}`;
    const fotoFile = bucket.file(fotoFileName);
    const fotoStream = fotoFile.createWriteStream({
        metadata: {
            contentType: req.file.mimetype,
        },
    });

    fotoStream.on('error', (err) => {
        console.error('Error uploading foto:', err);
        res.status(500).json({ error: 'Failed to upload foto.' });
    });

    fotoStream.on('finish', () => {
        const fotoUrl = `https://storage.googleapis.com/${bucketName}/${fotoFileName}`;

        // Simpan informasi product ke database
        const insertQuery = `INSERT INTO product (nama, deskripsi, foto) VALUES (?, ?, ?)`;
        connection.query(insertQuery, [nama, deskripsi, fotoUrl], (error) => {
            if (error) {
                console.error('Error inserting into database:', error);
                res.status(500).json({ error: 'Failed to insert into database.' });
            } else {
                console.log('Product added successfully.');
                res.status(200).json({ message: 'Product added successfully.' });
            }
        });
    });

    // Mulai proses upload foto
    fs.createReadStream(fotoPath).pipe(fotoStream);
});

// Menghapus product berdasarkan ID
app.delete('/product/:id', (req, res) => {
    const produkId = req.params.id;

    // Hapus product dari database
    const deleteQuery = 'DELETE FROM product WHERE id = ?';
    connection.query(deleteQuery, [produkId], (error, results) => {
        if (error) {
            console.error('Error deleting from database:', error);
            res.status(500).json({ error: 'Failed to delete from database.' });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ error: 'Product not found.' });
        } else {
            console.log('Product deleted successfully.');
            res.status(200).json({ message: 'Product deleted successfully.' });
        }
    });
});

// Mendapatkan semua product
app.get('/product', (req, res) => {
    // Ambil semua product dari database
    const selectQuery = 'SELECT * FROM product';
    connection.query(selectQuery, (error, results) => {
        if (error) {
            console.error('Error retrieving data from database:', error);
            res.status(500).json({ error: 'Failed to retrieve data from database.' });
        } else {
            res.status(200).json(results);
        }
    });
});

// Jalankan server pada port tertentu
const port = 8080;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});