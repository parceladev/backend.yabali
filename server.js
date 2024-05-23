import express from 'express';
import mysql from 'mysql';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'degbii4qg',
  api_key: '292118278849614',
  api_secret: 'ZiWC1QjMjdMPj2eMYfT-xpkIlqY',
});

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db_yabali',
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get('/listdonation', (req, res) => {
  const query = 'SELECT * FROM donations';
  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.post('/newdonation', upload.single('proof_donation'), async (req, res) => {
  const {
    email,
    donatur_name,
    total_donate,
    phone_number,
    message,
    donation_date,
  } = req.body;

  let proofDonationPath = null;

  if (req.file) {
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'donations',
            transformation: [{ fetch_format: 'auto', quality: 'auto:low' }],
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      proofDonationPath = uploadResult.secure_url;
    } catch (error) {
      console.error('Error during Cloudinary upload:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload proof donation image',
        error,
      });
    }
  }

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
    donation_date: donation_date || new Date().toISOString(),
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
