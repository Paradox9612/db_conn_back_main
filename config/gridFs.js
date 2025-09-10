const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
const multer = require('multer');

Grid.mongo = mongoose.mongo;

let gfs;

const initGridFS = (conn) => {
  gfs = Grid(conn.db);
  gfs.collection('uploads');
  return gfs;
};

const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: 'uploads'
    };
  }
});

const upload = multer({ storage });

module.exports = { upload, initGridFS, gfs };
