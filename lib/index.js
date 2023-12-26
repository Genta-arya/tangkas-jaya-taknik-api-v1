import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./Asset"); // Path relatif dari file JavaScript
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
  
});
export const upload = multer({ storage: storage });

export async function hashPassword(password) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

export function generateJWTToken() {
  const secretKey = "secretKey";
  const token = jwt.sign({}, secretKey, { expiresIn: "24h" });
  return token;
}