import multer from "multer";
import path from "path";
import fs from "fs";

// Define upload directories
const uploadDir = "uploads";
const profilePhotoDir = path.join(uploadDir, "profile_photos");
const resumeDir = path.join(uploadDir, "resumes");
const logoDir = path.join(uploadDir, "logos");

// Create directories if they don’t exist
[uploadDir, profilePhotoDir, resumeDir, logoDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, resumeDir);
        } else if (file.mimetype.startsWith("image/")) {
            if (req.baseUrl.includes("company")) {
                cb(null, logoDir);
            } else {
                cb(null, profilePhotoDir);
            }
        } else {
            cb(new Error("Invalid file type"), null);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const singleUpload = multer({ storage }).single("file");
