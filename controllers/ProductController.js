
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";
import ServiceAccount from "../lib/akunFirebase.json" assert { type: "json" };
const prisma = new PrismaClient();
const MAX_FILE_SIZE_MB = 5;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { readFileSync } from "fs";
import fs from "fs/promises";
import { type } from "os";

import pkg from "firebase-admin";
pkg.initializeApp({
  credential: pkg.credential.cert(ServiceAccount),
  storageBucket: "ac-service-34683.appspot.com",
});

const bucket = pkg.storage().bucket();

export const createProduct = async (req, res) => {
  try {
    const { nm_product, desc } = req.body;

    const categoryId = parseInt(req.body.categoryId, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: "CategoryId harus berupa angka" });
    }

    const price = parseInt(req.body.price, 10);
    if (isNaN(price)) {
      return res.status(400).json({ error: "Price harus berupa angka" });
    }

    if (!req.files || !req.files.thumbnail) {
      return res.status(400).json({ error: "File thumbnail harus diunggah" });
    }

    const thumbnailFile = req.files.thumbnail;

    const fileSizeInBytes = thumbnailFile.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

    if (fileSizeInMB > MAX_FILE_SIZE_MB) {
      return res.status(400).json({
        error: `Ukuran file thumbnail tidak boleh lebih dari ${MAX_FILE_SIZE_MB} MB`,
      });
    }

    function sanitizeFileName(input) {
      return input.replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    const sanitizedNmProduct = sanitizeFileName(nm_product);

    const thumbnailFileName = `image_${sanitizedNmProduct}_thumbnail.jpg`;

    // Gantilah dengan kode untuk mengunggah thumbnail ke Firebase Storage
    const thumbnailFileBuffer = thumbnailFile.data;
    const thumbnailFilePath = `Images/${thumbnailFileName}`;
    const thumbnailFileFirebase = bucket.file(thumbnailFilePath);

    function generateRandomUID(length) {
      const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let uid = "";

      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        uid += charset[randomIndex];
      }

      return uid;
    }
    const uid = generateRandomUID(16);

    await thumbnailFileFirebase.save(thumbnailFileBuffer, {
      metadata: {
        contentType: "image/jpeg",
      },
    });

    const thumbnailURL = `https://firebasestorage.googleapis.com/v0/b/ac-service-34683.appspot.com/o/${encodeURIComponent(
      thumbnailFilePath
    )}?alt=media`;

    const newProduct = await prisma.product.create({
      data: {
        nm_product,
        desc,
        price,
        thumbnail: thumbnailFileName,
        categoryId,
        url: thumbnailURL,
      },
    });

    return res.status(201).json({
      product: { ...newProduct, url: thumbnailURL },
      message: "success",
      status: 201,
    });
  } catch (error) {
    console.error("Error creating product:", error);

    return res
      .status(500)
      .json({ error: "Terjadi kesalahan saat membuat produk" });
  } finally {
    await prisma.$disconnect();
  }
};

export const createCategory = async (req, res) => {
  try {
    const { nm_category } = req.body;

    if (!nm_category) {
      return res.status(400).json({ error: "Nama kategori harus diisi" });
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        nm_category: nm_category,
      },
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "Kategori dengan nama yang sama sudah ada" });
    }

    const newCategory = await prisma.category.create({
      data: {
        nm_category,
      },
    });

    return res
      .status(201)
      .json({ category: newCategory, message: "success", status: 201 });
  } catch (error) {
    console.log("Error creating category:", error);

    return res
      .status(500)
      .json({ error: "Terjadi kesalahan saat membuat kategori" });
  } finally {
    await prisma.$disconnect();
  }
};

// export const createProduct = async (req, res) => {
//   try {
//     const { nm_product, desc } = req.body;

//     const categoryId = parseInt(req.body.categoryId, 10);
//     if (isNaN(categoryId)) {
//       return res.status(400).json({ error: "CategoryId harus berupa angka" });
//     }

//     const price = parseInt(req.body.price, 10);
//     if (isNaN(price)) {
//       return res.status(400).json({ error: "Price harus berupa angka" });
//     }

//     if (!req.files || !req.files.thumbnail) {
//       return res.status(400).json({ error: "File thumbnail harus diunggah" });
//     }

//     const thumbnailFile = req.files.thumbnail;

//     const fileSizeInBytes = thumbnailFile.size;
//     const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

//     if (fileSizeInMB > MAX_FILE_SIZE_MB) {
//       return res.status(400).json({
//         error: `Ukuran file thumbnail tidak boleh lebih dari ${MAX_FILE_SIZE_MB} MB`,
//       });
//     }

//     const publicFolderPath = join(__dirname, "../public/Images");
//     function sanitizeFileName(input) {
//       return input.replace(/[^a-zA-Z0-9_-]/g, "_");
//     }

//     const sanitizedNmProduct = sanitizeFileName(nm_product);

//     const thumbnailPath = join(
//       publicFolderPath,
//       `image_${sanitizedNmProduct}_thumbnail.jpg`
//     );

//     const thumbnailFileName = `image_${sanitizedNmProduct}_thumbnail.jpg`;

//     const thumbnailURL = `https://api-cleaning.vercel.app/Images/${thumbnailFileName}`;

//     await fs.mkdir(publicFolderPath, { recursive: true });

//     const newProduct = await prisma.product.create({
//       data: {
//         nm_product,
//         desc,
//         price,
//         thumbnail: thumbnailFileName,
//         categoryId,
//         url: thumbnailURL,
//       },
//     });

//     await thumbnailFile.mv(thumbnailPath);

//     return res.status(201).json({
//       product: { ...newProduct, url: thumbnailURL },
//       message: "success",
//       status: 201,
//     });
//   } catch (error) {
//     console.error("Error creating product:", error);

//     return res
//       .status(500)
//       .json({ error: "Terjadi kesalahan saat membuat produk" });
//   } finally {
//     await prisma.$disconnect();
//   }
// };

export const getAllProduct = async (req, res) => {
  try {
    const allProducts = await prisma.product.findMany({
      include: {
        category: true,
      },
    });

    return res
      .status(200)
      .json({ products: allProducts, message: "success", status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res
      .status(500)
      .json({ error: "Terjadi kesalahan saat mengambil produk" });
  } finally {
    await prisma.$disconnect();
  }
};
