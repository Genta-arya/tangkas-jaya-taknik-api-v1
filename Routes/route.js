import express from "express";
import { getAllOrders, submitOrder } from "../controllers/OdersController.js";
import {
  HandleLogin,
  HandleRegister,
  checkJwt,
  logout,
} from "../controllers/AuthController.js";

import { getHistory } from "../controllers/HistoryController.js";


import * as ProductController from "../controllers/ProductController.js";
const { createCategory, createProduct, getAllProduct } = ProductController;

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello, this is the root path!");
});

router.post("/order", submitOrder);
router.get("/get-orders", getAllOrders);
router.post("/register", HandleRegister);
router.post("/login", HandleLogin);
router.get("/checkJwt", checkJwt);
router.post("/logout", logout);
router.post("/create-category", createCategory);
router.post("/create-product", createProduct);
router.get("/product", getAllProduct);
router.get("/history/:username", getHistory);

export default router;
