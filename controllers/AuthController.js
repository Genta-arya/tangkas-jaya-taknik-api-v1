import { PrismaClient } from "@prisma/client";

import bcrypt from "bcrypt";
import { generateJWTToken } from "../lib/index.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export const HandleRegister = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await prisma.auth.findFirst({
      where: {
        OR: [{ username: username }, { email: email }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        status: 409,
        success: false,
        error: "Username or email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.auth.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
        role: "user",
        token_jwt: generateJWTToken({ username, email }),
      },
    });

    res
      .status(201)
      .json({ status: 201, success: true, token: newUser.token_jwt });
  } catch (error) {
    console.error("Error handling registration:", error);

    res
      .status(500)
      .json({ status: 500, success: false, error: "Internal Server Error" });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Error disconnecting Prisma:", disconnectError);
    }
  }
};

export const HandleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.auth.findUnique({
      where: { username: username },
    });

    if (!user) {
      return res.status(401).json({
        status: 401,
        success: false,
        error: "Invalid username or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        status: 401,
        success: false,
        error: "Invalid username or password",
      });
    }

    // Generate a new token
    const newToken = generateJWTToken(user);

    // Update the token in the database
    await prisma.auth.update({
      where: { username: user.username },
      data: { token_jwt: newToken },
    });

    res.status(200).json({
      status: 200,
      success: true,
      token: newToken,
      username: user.username,
      role: user.role,
      email: user.email,
    });
  } catch (error) {
    console.error("Error handling login:", error);

    res
      .status(500)
      .json({ status: 200, success: false, error: "Internal Server Error" });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Error disconnecting Prisma:", disconnectError);
    }
  }
};

export const handleGoogleLogin = async (req, res) => {
  try {
    const userData = req.body;

    const existingUser = await prisma.auth.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      const newToken = generateJWTToken(existingUser);
      await prisma.auth.update({
        where: { uid: existingUser.uid },
        data: { token_jwt: newToken },
      });

      return res.status(200).json({
        success: true,
        token: newToken,
        username: existingUser.username,
        role: existingUser.role,
        email: existingUser.email,
      });
    } else {
      const newUser = await prisma.auth.create({
        data: {
          username: userData.username,
          email: userData.email,

          password: userData.password || "",
          role: "user",
          token_jwt: generateJWTToken({
            username: userData.username,
            email: userData.email,
          }),
        },
      });

      return res.status(200).json({
        success: true,
        token: newUser.token_jwt,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email,
      });
    }
  } catch (error) {
    console.error("Error saving Google user data:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const getUserRoleByUsername = async (username) => {
  try {
    const user = await prisma.auth.findUnique({
      where: { username },
      select: { role: true },
    });

    return user ? user.role : null;
  } catch (error) {
    console.error("Error retrieving user role:", error);
    return null;
  }
};

export const checkJwt = async (req, res) => {
  const name = req.query.username;
  try {
    const token = req.headers.authorization.split(" ")[1];

    const decodedToken = jwt.verify(token, "secretKey");

    const role = await getUserRoleByUsername(name);

    res.status(200).json({ status: 200, success: true, name, role });
  } catch (error) {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    const { username } = req.body;

    if (!token || !username) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid token or username" });
    }

    const updatedAuth = await prisma.auth.update({
      where: { username: username },
      data: { token_jwt: { set: null } },
    });

    if (!updatedAuth) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "tangkasjayateknik@gmail.com",
    pass: "vykllsqaorkbgzqy",
  },
});

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await prisma.auth.findUnique({
      where: { email },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "Email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.auth.update({
      where: { email },
      data: { otp },
    });

    const mailOptions = {
      from: "tangkas_jaya_teknik@gmail.com",
      to: email,
      subject: "Your OTP for Reset Password",
      html: `
      <html>
        <head>
          <style>
            /* Tambahkan CSS kustom Anda di sini */
            body {
              font-family: Arial, sans-serif;
              background-color: #f0f0f0;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
            }
            .header {
              background-color: #007BFF;
              color: #ffffff;
              padding: 10px 0;
              text-align: center;
            }
            .content {
              padding: 20px;
            }
            .footer {
              background-color: #007BFF;
              color: #ffffff;
              padding: 10px 0;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Password</h1>
            </div>
            <div class="content">
              <p>Halo,</p>
              <p>Anda telah meminta untuk mereset password Anda. Gunakan token berikut untuk mereset password:</p>
              <p><strong>Token:</strong> ${otp}</p>
              <p>Jika Anda tidak melakukan permintaan ini, silakan abaikan email ini.</p>
              <p>Salam,</p>
              <p>Terima Kasih</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Tangkas Jaya Teknik
            </div>
          </div>
        </body>
      </html>
    `,
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({ success: true, message: "OTP generated and sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const verifOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    const auth = await prisma.auth.findFirst({
      where: {
        otp: {
          equals: otp,
        },
      },
      select: {
        email: true,
      },
    });

    if (auth) {
      return res.status(200).json({ email: auth.email });
    } else {
      return res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    if (error.code === "P2025") {
      console.error("Prisma Error:", error.message);
      return res.status(500).json({ message: "Internal server error" });
    }

    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

export const changePassowrd = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Temukan pengguna berdasarkan alamat email
    const user = await prisma.auth.findUnique({
      where: {
        email: email,
      },
    });

    // Periksa apakah pengguna ditemukan
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash kata sandi baru sebelum menyimpannya
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Perbarui kata sandi pengguna
    await prisma.auth.update({
      where: {
        email: email,
      },
      data: {
        password: hashedPassword,
        otp: null, // Jika Anda ingin menghapus OTP setelah mengganti kata sandi
      },
    });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    // Tutup koneksi PrismaClient setelah selesai
    await prisma.$disconnect();
  }
};

const requiredPassword = "tangkasjayateknik_password";

export const passwordProtectionMiddleware = (req, res, next) => {
  try {
    const providedPassword = req.headers["x-access-password"];

    if (!providedPassword || providedPassword !== requiredPassword) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Incorrect password",
      });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    passwordProtectionMiddleware(req, res, async () => {
      const users = await prisma.auth.findMany({
        select: {
          uid: true,
          username: true,
          email: true,
          role: true,
        },
      });
      const reversedOrders = users.reverse();

      res.status(200).json({
        success: true,
        data: reversedOrders,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { uid } = req.params;
    const { newPassword } = req.body;

    const parsedUid = parseInt(uid);

    const user = await prisma.auth.findUnique({
      where: { uid: parsedUid },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        status: 404,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.auth.update({
      where: { uid: parsedUid },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;
    const parsedUid = parseInt(uid);

    const user = await prisma.auth.findUnique({
      where: { uid : parsedUid },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await prisma.auth.delete({
      where: { uid : parsedUid},
    });

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};
