const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(UPLOAD_DIR);

// 文件类型白名单 & 存储子目录
const ALLOWED_TYPES = {
  photo: {
    dir: 'photos',
    mime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
    maxSize: 20 * 1024 * 1024 // 20MB
  },
  voice: {
    dir: 'voices',
    mime: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/amr', 'audio/webm'],
    maxSize: 50 * 1024 * 1024 // 50MB
  },
  video: {
    dir: 'videos',
    mime: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    maxSize: MAX_FILE_SIZE
  },
  document: {
    dir: 'documents',
    mime: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 30 * 1024 * 1024 // 30MB
  },
  other: {
    dir: 'others',
    mime: [],
    maxSize: MAX_FILE_SIZE
  }
};

/**
 * 根据 MIME 类型判断文件类别
 */
function detectCategory(mimetype) {
  for (const [cat, cfg] of Object.entries(ALLOWED_TYPES)) {
    if (cfg.mime.includes(mimetype)) return cat;
  }
  // audio/wav 有时记为 audio/x-wav
  if (mimetype.startsWith('audio/')) return 'voice';
  if (mimetype.startsWith('image/')) return 'photo';
  if (mimetype.startsWith('video/')) return 'video';
  return 'other';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = detectCategory(file.mimetype);
    const typeDir = path.join(UPLOAD_DIR, ALLOWED_TYPES[category].dir);
    ensureDir(typeDir);
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    // 保留原始扩展名，UUID 防冲突
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 9 // 批量最多9张
  },
  fileFilter: (req, file, cb) => {
    // 严格模式：拒绝未知 MIME 类型
    const category = detectCategory(file.mimetype);
    if (category === 'other' && !file.mimetype.startsWith('application/octet-stream')) {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    } else {
      cb(null, true);
    }
  }
});

/**
 * POST /api/upload
 * 单文件上传
 * 参数: file (FormData)
 * 返回: { filePath, originalName, size, mimetype, category }
 */
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '文件大小超过限制（最大100MB）' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: '文件字段名不正确' });
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.file) return res.status(400).json({ error: '未选择文件' });

    const category = detectCategory(req.file.mimetype);
    const filePath = `/uploads/${ALLOWED_TYPES[category].dir}/${req.file.filename}`;

    res.json({
      filePath,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      category
    });
  });
});

/**
 * POST /api/upload/photos
 * 批量上传照片（最多9张）
 * 参数: photos[] (FormData)
 */
router.post('/photos', (req, res, next) => {
  upload.array('photos', 9)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '文件大小超过限制' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: '字段名应为 photos' });
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '未选择文件' });
    }
    const files = req.files.map(f => ({
      filePath: `/uploads/photos/${f.filename}`,
      originalName: f.originalname,
      size: f.size,
      mimetype: f.mimetype
    }));
    res.json(files);
  });
});

/**
 * GET /api/upload/:filename
 * 获取上传文件信息（只遍历已知子目录，避免递归全量扫描）
 */
router.get('/:filename', (req, res) => {
  const subDirs = ['photos', 'voices', 'videos', 'file', 'documents', 'others'];
  const filename = req.params.filename;

  // 先查根目录（如 .gitkeep）
  const rootPath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(rootPath)) {
    const stat = fs.statSync(rootPath);
    return res.json({
      filename,
      path: `/uploads/${filename}`,
      size: stat.size,
      createdAt: stat.birthtime
    });
  }

  // 再查子目录
  for (const sub of subDirs) {
    const fullPath = path.join(UPLOAD_DIR, sub, filename);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      return res.json({
        filename,
        path: `/uploads/${sub}/${filename}`,
        size: stat.size,
        createdAt: stat.birthtime
      });
    }
  }
  res.status(404).json({ error: '文件不存在' });
});

module.exports = router;
