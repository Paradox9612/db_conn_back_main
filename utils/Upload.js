// utils/upload.js
const multer = require("multer");

// Store file in memory (buffer), not disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, or PDF files are allowed"));
    }
  },
});

module.exports = upload;
