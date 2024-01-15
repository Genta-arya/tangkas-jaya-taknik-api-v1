import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import router from "./Routes/route.js";
import fileUpload from "express-fileupload";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(express.static("public"));

app.delete("/discounts/expired", async (req, res) => {
  try {
    const discountProducts = await prisma.discountProduct.findMany();
    const currentDate = new Date();
    const currentDateWithoutTime = currentDate.toLocaleDateString();

    const discountProductsToDelete = discountProducts.filter(
      async (product) => {
        const productExpirationDate = new Date(product.expirationDate);
        const currentDataDateWithoutTime =
          productExpirationDate.toLocaleDateString();

        if (currentDataDateWithoutTime <= currentDateWithoutTime) {
          await prisma.discountProduct.delete({
            where: {
              id: product.id,
            },
          });
          return res
            .status(200)
            .json({ message: "Discount deleted" });
        }

        return res
          .status(201)
          .json({ message: "Discount not expired" });
      }
    );

    if (discountProductsToDelete.length === 0) {
      return res
        .status(404)
        .json({ message: "No expired discount products found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use(fileUpload());
app.use(express.json());
app.use(cors());
app.use(router);

const httpserver = createServer(app);

httpserver.listen(process.env.APP_PORT, () => {
  console.log("Server running on port " + process.env.APP_PORT);
});
