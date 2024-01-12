import express from "express";
import {
  chartData,
  getAllOrders,
  getNotifications,
  passwordMiddleware,
  postDeskripsiService,
  submitOrder,
  updateStatus,
} from "../controllers/OdersController.js";
import {
  HandleLogin,
  HandleRegister,
  changePassowrd,
  checkJwt,
  deleteUser,
  getAllUsers,
  handleGoogleLogin,
  logout,
  passwordProtectionMiddleware,
  resetPassword,
  sendOTP,
  verifOTP,
} from "../controllers/AuthController.js";

import {
  getHistory,
  searchByUsername,
} from "../controllers/HistoryController.js";

import * as ProductController from "../controllers/ProductController.js";
import {
  getAllComment,
  postComment,
} from "../controllers/CommentController.js";
import { sendEmail } from "../controllers/EmailController.js";
import {
  deleteImage,
  editImage,
  getAllImage,
  uploadImage,
} from "../controllers/ImageController.js";
import {
  UseVoucher,
  createDiscount,
  getVouchersByAuthId,
  verifyVoucherByUsername,
} from "../controllers/DiscountController.js";
const { createCategory, createProduct, getAllProduct } = ProductController;

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello, this is the root path!");
});

router.post("/order", submitOrder);
router.get("/get-orders", getAllOrders);
router.post("/register", HandleRegister);
router.post("/login", HandleLogin);
router.post("/login-google", handleGoogleLogin);
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
router.post("/send-otp", sendOTP);
router.post("/verify", verifOTP);
router.get("/notifications/:username", getNotifications);
router.post("/change-password", changePassowrd);
router.post("/send-email", sendEmail);
router.get("/notifikasi/:username", getNotifications);
router.post("/upload/dokument", uploadImage);
router.put("/edit/dokument/:id", editImage);
router.delete("/delete/dokument/:id", deleteImage);
router.get("/users", passwordProtectionMiddleware, getAllUsers);
router.get("/search/:username", searchByUsername);
router.post("/reset-password/:uid", resetPassword);
router.delete("/delete/:uid", deleteUser);
router.get("/chart", passwordMiddleware, chartData);
router.post("/desc", postDeskripsiService);
router.post("/discount", createDiscount);
router.get("/vouchers/:username", getVouchersByAuthId);
router.post("/verify-voucher", verifyVoucherByUsername);
router.post("/useVoucher", UseVoucher);
router.get("/image", getAllImage);
export default router;
