import express from "express";
import {
  getAllOrders,
  getNotifications,
  submitOrder,
  updateStatus,
} from "../controllers/OdersController.js";
import {
  HandleLogin,
  HandleRegister,
  checkJwt,
  logout,
} from "../controllers/AuthController.js";

import { getHistory } from "../controllers/HistoryController.js";

import * as ProductController from "../controllers/ProductController.js";
import {
  getAllComment,
  postComment,
} from "../controllers/CommentController.js";
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
router.get("/category", ProductController.getAllCategory);
router.put("/category/:categoryId", ProductController.EditCategory);
router.delete("/category/:categoryId", ProductController.DeleteCategory);
router.post("/create-product", createProduct);
router.put("/edit-product", ProductController.editProduct);
router.delete("/products/:id", ProductController.deleteProduct);
router.get("/product", getAllProduct);
router.get("/history/:username", getHistory);
router.post("/comment", postComment);
router.get("/comment", getAllComment);
router.put("/update-status", updateStatus);

router.get("/notifications/:username", getNotifications);
export default router;
