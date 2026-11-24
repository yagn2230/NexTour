const crypto = require("node:crypto");
const path = require("node:path");
const mongoose = require("mongoose");
const { removeUploadedFile } = require("../middleware/uploadMiddleware");

const PROFILE_IMAGE_PREFIX = "/uploads/profiles/";
const PROFILE_IMAGE_BUCKET = "profileImages";
const imageContentTypes = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const profileImageNamePattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.(?:jpg|png|webp)$/i;

const getProfileImageBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error("MongoDB must be connected before accessing profile images.");
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: PROFILE_IMAGE_BUCKET,
  });
};

const storeProfileImage = async (file) => {
  const extension = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  }[file.mimetype];
  if (!Buffer.isBuffer(file.buffer) || !extension) {
    throw new Error("A validated JPEG, PNG, or WebP profile image is required.");
  }

  const filename = `${crypto.randomUUID()}${extension}`;
  const uploadStream = getProfileImageBucket().openUploadStream(filename, {
    metadata: { contentType: file.mimetype },
  });
  await new Promise((resolve, reject) => {
    uploadStream.once("error", reject);
    uploadStream.once("finish", resolve);
    uploadStream.end(file.buffer);
  });
  return `${PROFILE_IMAGE_PREFIX}${filename}`;
};

const removeProfileImage = async (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith(PROFILE_IMAGE_PREFIX)) return;
  const filename = imageUrl.slice(PROFILE_IMAGE_PREFIX.length);
  if (!profileImageNamePattern.test(filename)) return;

  const bucket = getProfileImageBucket();
  const files = await bucket.find({ filename }).toArray();
  await Promise.all(files.map((file) => bucket.delete(file._id)));
  await removeUploadedFile(path.join(__dirname, "..", "uploads", "profiles", filename));
};

const serveProfileImage = async (req, res, next) => {
  const { filename } = req.params;
  if (!profileImageNamePattern.test(filename)) return next();

  const bucket = getProfileImageBucket();
  const file = await bucket.find({ filename }).sort({ uploadDate: -1 }).limit(1).next();
  if (!file) return next();

  res.setHeader("Content-Type", imageContentTypes[path.extname(filename).toLowerCase()]);
  res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");
  bucket.openDownloadStream(file._id).on("error", next).pipe(res);
};

module.exports = {
  removeProfileImage,
  serveProfileImage,
  storeProfileImage,
};
