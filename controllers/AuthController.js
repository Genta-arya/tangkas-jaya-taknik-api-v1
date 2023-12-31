import { PrismaClient } from "@prisma/client";

import bcrypt from "bcrypt";
import { generateJWTToken } from "../lib/index.js";
import jwt from "jsonwebtoken";

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
    console.log(newToken);

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
    console.error("Error during logout:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
};
