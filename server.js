import express from 'express';
import mysql from 'mysql';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use('/media', express.static(path.join(__dirname, 'media')));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db_yabali',
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'media');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.get('/listdonation', (req, res) => {
  const query = 'SELECT * FROM donations';
  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.post('/newdonation', upload.single('proof_donation'), (req, res) => {
  const {
    email,
    donatur_name,
    total_donate,
    phone_number,
    message,
    donation_date,
  } = req.body;
  const proofDonationPath = req.file ? `${req.file.filename}` : null;

  const sanitizeInput = (input) => {
    if (typeof input === 'string') {
      // eslint-disable-next-line no-control-regex
      return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    }
    return input;
  };

  const sanitizedData = {
    email: sanitizeInput(email),
    donatur_name: sanitizeInput(donatur_name),
    total_donate: sanitizeInput(total_donate),
    phone_number: sanitizeInput(phone_number),
    message: sanitizeInput(message),
    donation_date: sanitizeInput(donation_date),
    proof_donation: proofDonationPath,
  };

  const query =
    'INSERT INTO donations (email, donatur_name, total_donate, phone_number, message, donation_date, proof_donation) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(
    query,
    [
      sanitizedData.email,
      sanitizedData.donatur_name,
      sanitizedData.total_donate,
      sanitizedData.phone_number,
      sanitizedData.message,
      sanitizedData.donation_date,
      sanitizedData.proof_donation,
    ],
    (err, results) => {
      if (err) {
        console.error('Error adding donation:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to add donation',
          error: err,
        });
      } else {
        res.json({
          success: true,
          message: 'Donation added successfully',
          id: results.insertId,
        });
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
