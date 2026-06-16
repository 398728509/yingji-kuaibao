const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const typeDir = path.join(UPLOAD_DIR, file.fieldname || 'others');
    if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 上传文件
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  res.json({
    filePath: `/uploads/${req.file.fieldname || 'others'}/${req.file.filename}`,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// 批量上传照片
router.post('/photos', upload.array('photos', 9), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: '未上传文件' });
  const files = req.files.map(f => ({
    filePath: `/uploads/${f.fieldname || 'photos'}/${f.filename}`,
    originalName: f.originalname,
    size: f.size
  }));
  res.json(files);
});

module.exports = router;
