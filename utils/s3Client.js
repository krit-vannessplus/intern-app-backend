// utils/s3Client.js
const {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION; // e.g. "ap-southeast-1"
const BUCKET = process.env.AWS_S3_BUCKET_NAME; // your bucket name
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// 1) Initialize the S3 client
const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

// 2) Helper to turn a path or URL into an S3 key
function extractKey(pathOrUrl = "") {
  if (!pathOrUrl.startsWith("http")) {
    return pathOrUrl.replace(/^\/+/, "");
  }
  try {
    const { pathname } = new URL(pathOrUrl);
    return decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return pathOrUrl.replace(/^\/+/, "");
  }
}

// 3) Helper to build a https://… URL for a given key
const S3_BASE = `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
function urlForKey(key) {
  return `${S3_BASE}/${encodeURIComponent(key)}`;
}

// 4) Delete an object at the given path or URL
async function deleteFromS3(pathOrUrl) {
  const Key = extractKey(pathOrUrl);
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
    console.log(`[s3] deleted ${Key}`);
  } catch (err) {
    if (err.name !== "NoSuchKey") {
      console.error(`[s3] delete failed for ${Key}`, err);
    }
  }
}

// 5) Download a readable stream for the given path or URL
async function getObjectStream(pathOrUrl) {
  const Key = extractKey(pathOrUrl);
  const { Body } = await s3Client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key })
  );
  return Body; // this is a Node.js Readable stream
}

// 6) Export everything
module.exports = {
  s3Client,
  extractKey,
  urlForKey,
  deleteFromS3,
  getObjectStream,
};
