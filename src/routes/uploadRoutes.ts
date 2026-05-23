import path from "path";
import { Router, Request, Response } from "express";
import multer, { FileFilterCallback } from "multer";

const router = Router();

// 1. Storage Configuration (File kahan save hogi aur naam kya hoga)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/"); // Ye folder backend root mein hona chahiye
  },
  filename(req, file, cb) {
    // File ka naam unique banane ke liye: fieldname-timestamp.extension
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// 2. File Filter (Sirf Images allowed hain)
function checkFileType(file: Express.Multer.File, cb: FileFilterCallback) {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Images only! (jpg, jpeg, png, webp)"));
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// 3. Upload Endpoint
router.post("/", upload.single("image"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }
  // Frontend ko batana ke file is raste par save hui hai
  res.send({
    message: "Image uploaded successfully",
    image: `/${req.file.path.replace(/\\/g, "/")}`, // Windows compatibility fix
  });
});

export default router;