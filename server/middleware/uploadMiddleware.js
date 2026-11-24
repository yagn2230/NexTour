const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");

const uploadRoot = path.join(__dirname, "..", "uploads");
const profileRoot = path.join(uploadRoot, "profiles");
const verificationRoot = path.join(uploadRoot, "verification");
const noShowEvidenceRoot = path.join(uploadRoot, "no-show-evidence");
fs.mkdirSync(profileRoot, { recursive: true });
fs.mkdirSync(verificationRoot, { recursive: true });
fs.mkdirSync(noShowEvidenceRoot, { recursive: true });

const imageExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const documentExtensions = {
  ...imageExtensions,
  "application/pdf": ".pdf",
};

const createStorage = (destination, extensions) => multer.diskStorage({
  destination,
  filename: (req, file, callback) => {
    const extension = extensions[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const imageUpload = multer({
  storage: createStorage(profileRoot, imageExtensions),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      return callback(new Error("Only JPEG, PNG, and WebP image files are allowed."));
    }
    callback(null, true);
  },
});

const verificationUpload = multer({
  storage: createStorage(verificationRoot, documentExtensions),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, callback) => {
    if (!documentExtensions[file.mimetype]) {
      return callback(new Error("Verification files must be PDF, JPEG, PNG, or WebP."));
    }
    callback(null, true);
  },
});

const noShowEvidenceUpload = multer({
  storage: createStorage(noShowEvidenceRoot, documentExtensions),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!documentExtensions[file.mimetype]) {
      return callback(new Error("Appeal evidence must be PDF, JPEG, PNG, or WebP."));
    }
    callback(null, true);
  },
});

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  const resolved = path.resolve(filePath);
  const root = path.resolve(uploadRoot) + path.sep;
  if (!resolved.startsWith(root)) {
    throw new Error("Refusing to remove a file outside the upload directory.");
  }
  await fs.promises.unlink(resolved).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
};

const validateUploadedContent = async (req, res, next) => {
  const files = [
    ...(req.file ? [req.file] : []),
    ...Object.values(req.files || {}).flat(),
  ];
  try {
    for (const file of files) {
      const handle = await fs.promises.open(file.path, "r");
      const header = Buffer.alloc(12);
      let bytesRead;
      try {
        ({ bytesRead } = await handle.read(header, 0, header.length, 0));
      } finally {
        await handle.close();
      }
      const data = header.subarray(0, bytesRead);
      const valid = file.mimetype === "image/jpeg"
        ? data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
        : file.mimetype === "image/png"
          ? data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : file.mimetype === "image/webp"
            ? data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF"
              && data.toString("ascii", 8, 12) === "WEBP"
            : file.mimetype === "application/pdf"
              ? data.toString("ascii", 0, 5) === "%PDF-"
              : false;
      if (!valid) {
        await Promise.all(files.map((uploaded) => removeUploadedFile(uploaded.path)));
        return res.status(400).json({
          success: false,
          message: "Uploaded file content does not match an allowed file type.",
        });
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

const storedFileUrl = (file) =>
  `/uploads/${path.basename(path.dirname(file.path))}/${path.basename(file.path)}`;

module.exports = {
  profileImageUpload: imageUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  validateUploadedContent,
  verificationDocumentUpload: verificationUpload.fields([
    { name: "governmentId", maxCount: 1 },
    { name: "passport", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]),
  noShowEvidenceUpload: noShowEvidenceUpload.single("evidence"),
  removeUploadedFile,
  storedFileUrl,
  verificationRoot,
  noShowEvidenceRoot,
};
