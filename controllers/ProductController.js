import { readFileSync } from "fs";
import fs from "fs/promises";
import { type } from "os";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";
import { bucket } from "../lib/Firebase.js";
import { createClient } from "@supabase/supabase-js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const prisma = new PrismaClient();
dotenv.config();
const MAX_FILE_SIZE_MB = 5;

export const editProduct = async (req, res) => {
  try {
    const { id, nm_product, desc, categoryId, price } = req.body;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return res.status(400).json({ error: "ID produk harus berupa angka" });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }

    const priceValue = parseInt(price, 10);
    if (isNaN(priceValue)) {
      return res.status(400).json({ error: "Price harus berupa angka" });
    }

    const thumbnailFile = req.files?.thumbnail;

    if (thumbnailFile) {
      const fileSizeInBytes = thumbnailFile.size;
      const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

      function sanitizeFileName(input) {
        return input.replace(/[^a-zA-Z0-9_-]/g, "_");
      }

      const sanitizedNmProduct = sanitizeFileName(nm_product);
      const thumbnailFileName = `image_${sanitizedNmProduct}_thumbnail.jpg`;

      const thumbnailFileBuffer = thumbnailFile.data;
      const thumbnailFilePath = `Images/${thumbnailFileName}`;
      const thumbnailFileFirebase = bucket.file(thumbnailFilePath);

      await thumbnailFileFirebase.save(thumbnailFileBuffer, {
        metadata: {
          contentType: "image/jpeg",
        },
      });

      const thumbnailURL = `https://firebasestorage.googleapis.com/v0/b/ac-service-34683.appspot.com/o/${encodeURIComponent(
        thumbnailFilePath
      )}?alt=media`;

      const categoryIdValue = parseInt(categoryId, 10);

      const updatedProductData = {
        nm_product,
        desc,
        price: priceValue,
        categoryId: categoryIdValue,
        thumbnail: thumbnailFileName,
        url: thumbnailURL,
      };

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: updatedProductData,
      });

      return res.status(200).json({
        product: { ...updatedProduct, url: thumbnailURL },
        message: "success",
        status: 200,
      });
    } else {
      // If no thumbnail file provided, use the existing thumbnail information
      const categoryIdValue = parseInt(categoryId, 10);

      const updatedProductData = {
        nm_product,
        desc,
        price: priceValue,
        categoryId: categoryIdValue,
        // Retain the existing thumbnail information
        thumbnail: existingProduct.thumbnail || null,
        url: existingProduct.url || null,
      };

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: updatedProductData,
      });

      return res.status(200).json({
        product: updatedProduct,
        message: "success",
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error editing product:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengedit produk",
    });
  } finally {
    await prisma.$disconnect();
  }
};

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

    const thumbnailFileBuffer = thumbnailFile.data;
    const thumbnailFilePath = `Images/${thumbnailFileName}`;
    const thumbnailFileFirebase = bucket.file(thumbnailFilePath);

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
        
        discount: true, // Menyertakan data diskon
      },
    });

    return res.status(200).json({
      products: allProducts.map((product) => ({
        id: product.id,
        nm_product: product.nm_product,
        sold: product.sold,
        desc: product.desc,
        price: product.price,
        thumbnail: product.thumbnail,
        url: product.url,
        categoryId: product.categoryId,
        category: product.category,
        discount: product.discount,
        
      })),
      message: "success",
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengambil produk",
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const getAllCategory = async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    return res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res
      .status(500)
      .json({ error: "Terjadi kesalahan saat mengambil kategori" });
  } finally {
    await prisma.$disconnect();
  }
};

export const EditCategory = async (req, res) => {
  const { categoryId } = req.params;
  const { nm_category } = req.body;

  try {
    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(categoryId) },
      data: {
        nm_category,
      },
    });

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const DeleteCategory = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: {
        id: parseInt(categoryId),
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    await prisma.category.delete({
      where: {
        id: parseInt(categoryId),
      },
    });

    res.status(200).json({ message: "Kategori berhasil dihapus" });
  } catch (error) {
    console.error(error);

    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProduct = await prisma.product.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({
      product: deletedProduct,
      message: "Product deleted successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Internal server error", status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};
export const createDiscountProduct = async (req, res) => {
  try {
    const { productId, discountPercentage, expirationDate } = req.body;
    const formattedExpirationDate = new Date(`${expirationDate}T00:00:00Z`);

    const existingDiscount = await prisma.discountProduct.findUnique({
      where: {
        productId: productId,
      },
    });

    if (existingDiscount) {
      res
        .status(404)
        .json({ message: "Produk sudah memiliki diskon", status: 404 });
      return;
    }
    const discountProduct = await prisma.discountProduct.create({
      data: {
        productId,
        discountPercentage,
        expirationDate: formattedExpirationDate,
      },
    });

    res.status(201).json({ data: discountProduct, status: 201 });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  } finally {
    await prisma.$disconnect();
  }
};

export const getDiscountProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const discountProduct = await prisma.discountProduct.findUnique({
      where: {
        productId: Number(id),
      },
    });

    if (!discountProduct) {
      return res.status(404).json({ error: "Discount product not found" });
    }

    res.status(200).json({ data: discountProduct });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};












export const editDiscountProductById = async (req, res) => {
  try {
    const { productId } = req.body;
    const id = parseInt(productId.productId, 10);
    console.log(productId);
    const formattedExpirationDate = new Date(
      `${productId.expirationDate}T00:00:00Z`
    );

    const existingDiscountProduct = await prisma.discountProduct.findUnique({
      where: {
        productId: id,
      },
    });

    if (!existingDiscountProduct) {
      return res.status(404).json({ message: "Discount product not found" });
    }

    const updatedDiscountProduct = await prisma.discountProduct.update({
      where: {
        productId: id,
      },
      data: {
        discountPercentage: productId.newDiscount,
        expirationDate: formattedExpirationDate,
      },
    });

    res.status(200).json(updatedDiscountProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

export const deleteDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;

    // Check if discountId is provided
    if (!discountId) {
      return res.status(400).json({ message: "Discount ID is required" });
    }

    const id = parseInt(discountId, 10);

    try {
      const existingDiscount = await prisma.discountProduct.findUnique({
        where: {
          productId: id,
        },
      });

      if (!existingDiscount) {
        res.status(404).json({ message: "Produk ini belum mempunyai diskon" });
        return;
      }

      const deletedDiscount = await prisma.discountProduct.delete({
        where: {
          productId: id,
        },
      });

      res.status(200).json({
        message: "Discount deleted successfully",
        deletedDiscount,
        status: 200,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

