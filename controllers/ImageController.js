import { PrismaClient } from "@prisma/client";
import { bucket } from "../lib/Firebase.js";

const prisma = new PrismaClient();

export const uploadImage = async (req, res) => {
  const { nm_product, orderId, orderDetailId, limit } = req.body;
  try {
    const thumbnailFiles = Array.isArray(req.files.thumbnail)
      ? req.files.thumbnail
      : [req.files.thumbnail];

    if (!thumbnailFiles) {
      return res.status(400).json({
        error: "image tidak boleh kosong",
      });
    }
    if (thumbnailFiles.length > limit) {
      return res.status(400).json({
        error: `Maaf pesanan ini sudah memiliki ${limit} gambar`,
      });
    }

    const orderImageCount = await prisma.image.count({
      where: {
        orderId: parseInt(orderId),
      },
    });

    const orderDetailsImageCount = await prisma.image.count({
      where: {
        orderDetailsId: parseInt(orderDetailId),
      },
    });

    if (
      orderImageCount + thumbnailFiles.length > limit ||
      orderDetailsImageCount + thumbnailFiles.length > limit
    ) {
      return res.status(400).json({
        error: `Maaf pesanan ini sudah memiliki ${limit} gambar`,
      });
    }

    const uploadPromises = thumbnailFiles.map(async (thumbnailFile) => {
      const fileSizeInBytes = thumbnailFile.size;
      const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

      const MAX_FILE_SIZE_MB = 5;

      if (fileSizeInMB > MAX_FILE_SIZE_MB) {
        throw new Error(
          `Ukuran file thumbnail tidak boleh lebih dari ${MAX_FILE_SIZE_MB} MB`
        );
      }

      function generateRandomString(length) {
        const characters =
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let randomString = "";

        for (let i = 0; i < length; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          randomString += characters.charAt(randomIndex);
        }

        return randomString;
      }

      // Example usage to generate a random string of length 8
      const randomString = generateRandomString(8);

      const sanitizedNmProduct = nm_product.replace(/[^a-zA-Z0-9_-]/g, "_");
      const sanitizedNmProductWithRandom = `nm_product_dokumentasi_${randomString}`;

      const thumbnailFileName = `image_${sanitizedNmProductWithRandom}_thumbnail.jpg`;

      const thumbnailFileBuffer = thumbnailFile.data;
      const thumbnailFilePath = `Dokumentasi/${thumbnailFileName}`;
      const thumbnailFileFirebase = bucket.file(thumbnailFilePath);

      // Upload gambar ke Firebase Storage
      await thumbnailFileFirebase.save(thumbnailFileBuffer, {
        metadata: {
          contentType: "image/jpeg",
        },
      });

      const thumbnailURL = `https://firebasestorage.googleapis.com/v0/b/ac-service-34683.appspot.com/o/${encodeURIComponent(
        thumbnailFilePath
      )}?alt=media`;

      const createdImage = await prisma.image.create({
        data: {
          imageUrl: thumbnailURL,
          path: thumbnailFileName,
          orderId: parseInt(orderId),
          orderDetailsId: parseInt(orderDetailId),
        },
      });

      return {
        success: true,
        message: "Gambar berhasil diunggah",
        imageUrl: thumbnailURL,
        imageId: createdImage.id,
      };
    });

    const results = await Promise.all(uploadPromises);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server internal",
    });
  }
};

export const editImage = async (req, res) => {
  try {
    const { imageId, newNmProduct } = req.body;

    const existingImage = await prisma.image.findUnique({
      where: {
        id: parseInt(imageId),
      },
    });

    if (!existingImage) {
      return res.status(404).json({
        error: "Gambar tidak ditemukan",
      });
    }

    const currentFilePath = existingImage.imageUrl.split("?")[0];
    const newFilePath = currentFilePath.replace(
      new RegExp(existingImage.nm_product, "g"),
      newNmProduct
    );

    await bucket.file(currentFilePath).move(newFilePath);

    const updatedImage = await prisma.image.update({
      where: {
        id: parseInt(imageId),
      },
      data: {
        nm_product: newNmProduct,
        imageUrl: existingImage.imageUrl.replace(
          existingImage.nm_product,
          newNmProduct
        ),
      },
    });

    res.status(200).json({
      success: true,
      message: "Gambar berhasil diubah",
      updatedImage,
    });
  } catch (error) {
    console.error("Error editing image:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server internal",
    });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const imagesToDelete = await prisma.image.findMany({
      where: {
        orderId: orderId,
      },
      select: {
        id: true,
        path: true,
      },
    });

    if (!imagesToDelete || imagesToDelete.length === 0) {
      return res.status(404).json({
        error: "No images found with the given orderId",
      });
    }

    const folder = "Dokumentasi/";
    for (const imageToDelete of imagesToDelete) {
      const filePath = folder + imageToDelete.path;
      await bucket.file(filePath).delete();

      // Delete the image from the database
      await prisma.image.delete({
        where: {
          id: imageToDelete.id,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `All images with orderId ${orderId} have been deleted`,
    });
  } catch (error) {
    console.error("Error deleting images:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllImage = async (req, res) => {
  try {
    const prisma = new PrismaClient();
    const allImages = await prisma.image.findMany();
    const shuffledImages = allImages.sort(() => 0.5 - Math.random());
    const selectedImages = shuffledImages.slice(0, 6);
    const imageUrls = selectedImages.map((image) => image.imageUrl);
    res.json({ data: imageUrls });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};
