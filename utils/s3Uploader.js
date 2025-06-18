require("dotenv").config();
const path = require("path");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * factory(folderFn) → multer instance
 * folderFn(req, file) returns a string prefix for the key
 */
module.exports = (folderFn, limits = { files: 10 }) =>
  multer({
    limits,
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET, // `my-app-uploads`
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (_req, file, cb) => cb(null, { field: file.fieldname }),
      key: (req, file, cb) => {
        const prefix = folderFn(req, file); // e.g. offers/<email>/video
        const unique = Date.now() + "-" + file.originalname;
        cb(null, path.posix.join(prefix, unique)); // S3 uses `/`, not `\`
      },
    }),
  });
