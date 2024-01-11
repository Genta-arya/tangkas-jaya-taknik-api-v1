import { PrismaClient } from "@prisma/client";

import pkg from "firebase-admin";
import { database, firebase } from "../lib/Firebase.js";
import { UseVoucher } from "./DiscountController.js";
const prisma = new PrismaClient();

export const submitOrder = async (req, res) => {
  try {
    const { uid, username, orderDetails, location, voucherCode, CategoryId } =
      req.body;

    const { nm_product, qty, price, name, url, telp, ket } = orderDetails;

    const {
      address,
      koordinat: { lat, lng },
    } = location;

    const formattedPrice = parseInt(price);

    const generateRandomServiceId = () => {
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const idLength = 5;

      let randomId = "service_";

      for (let i = 0; i < idLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomId += characters.charAt(randomIndex);
      }

      return randomId;
    };

    const order = await prisma.order.create({
      data: {
        uid,
        username,
        orderDetails: {
          create: {
            uuid: generateRandomServiceId(),

            nm_product,
            qty,
            username: username,
            price: formattedPrice,
            name,
            url,
            telp,
            desc: "-",
            status: "pending",
            ket: ket,
          },
        },
        location: {
          create: {
            address,
            latitude: lat,
            longitude: lng,
          },
        },
      },
      include: {
        orderDetails: true,
        location: true,
      },
    });

    const voucher = await prisma.discount.findFirst({
      where: {
        username: username,
        code: voucherCode,
      },
      select: {
        id: true,
        exp: true,
        status: true,
        disc: true,
        categories: true,
      },
    });

    if (voucher) {
      const isValidCategory = voucher.categories[0]?.categoryId === CategoryId;

      if (!isValidCategory) {
        return res.json({
          message: `Voucher ${voucherCode} tidak sesuai Kategori.`,
        });
      }

      if (voucher.exp > new Date() && voucher.status === "active") {
        await prisma.discount.update({
          where: { id: voucher.id },
          data: { status: "inactive" },
        });
        return res.status(201).json({ success: true, order, status: 201 });
      } else {
        let message = "";
        if (voucher.exp <= new Date()) {
          message += `Voucher ${voucherCode} sudah kadaluarsa`;
        }
        if (voucher.status !== "active") {
          message += `Voucher ${voucherCode} Sudah digunakan`;
        }
        return res.json({ message: message });
      }
    } else {
      return res.json({
        message: `Voucher tidak ditemukan ${voucherCode}`,
      });
    }
  } catch (error) {
    console.error("Error submitting order:", error);
    res
      .status(500)
      .json({ success: false, error: "Internal Server Error", status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};
export const getAllOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;
  const q = req.query.q || "";

  let whereClause = {};

  if (q) {
    whereClause = {
      username: {
        contains: q,
        mode: "insensitive",
      },
    };
  }

  try {
    const totalOrders = await prisma.order.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalOrders / perPage);

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderDetails: {
          include: {
            images: true, // Assuming "images" is the field within orderDetails that refers to the images
          },
        },
        location: true,
      },
      skip: (page - 1) * perPage,
      take: perPage,
    });
    const reversedOrders = orders.reverse();

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No orders found for the given search and page",
        status: 404,
      });
    }

    const ordersJSON = {
      success: true,
      data: reversedOrders,
      item: perPage,
      status: 200,
      currentPage: page,
      totalPages,
      totalRows: totalOrders,
    };

    res.status(200).json(ordersJSON);
  } catch (error) {
    console.error("Error fetching orders:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      status: 500,
    });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Error disconnecting Prisma:", disconnectError);
    }
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;

    if (!orderId || !newStatus) {
      return res
        .status(400)
        .json({ error: "Both orderId and newStatus are required" });
    }

    const existingOrder = await prisma.orderDetails.findUnique({
      where: {
        id: orderId,
      },
      select: {
        nm_product: true,
        url: true,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const { nm_product, url } = existingOrder;

    // Update order status in the database
    await prisma.orderDetails.update({
      where: {
        id: orderId,
      },
      data: {
        status: newStatus,
        orderId: orderId,
        nm_product: nm_product,
        url: url,
      },
    });

    let message = "";
    switch (newStatus) {
      case "konfirmasi":
        message = `Pesananmu dengan ID ${orderId} (${nm_product}) sudah dikonfirmasi. Tunggu informasi selanjutnya atau hubungi admin melalui WhatsApp. `;
        break;
      case "pending":
        message = `Pesananmu dengan ID ${orderId} (${nm_product}) akan segera kami konfirmasi.`;
        break;
      case "selesai":
        message = `Pesananmu dengan ID ${orderId} (${nm_product}) telah selesai. Terima kasih sudah mempercayai kami untuk memperbaiki AC Anda.`;
        break;

      default:
        break;
    }

    const databaseRef = database.ref(`/notifications/${orderId}`);
    await databaseRef.set({
      message,
    });

    return res.status(200).json({ message: "Status berhasil diganti" });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

export const getNotifications = async (req, res) => {
  try {
    const { username } = req.params;

    const orders = await prisma.order.findMany({
      where: {
        username: username,
      },
      include: {
        orderDetails: true,
      },
    });

    if (!orders || !orders.length) {
      return res
        .status(404)
        .json({ error: "No orders found for the given username", status: 404 });
    }

    const notifications = await Promise.all(
      orders.map(async (order) => {
        const orderDetails = order.orderDetails;

        if (orderDetails) {
          const snapshot = await firebase
            .database()
            .ref(`/notifications/${orderDetails.orderId}`)
            .once("value");
          const notificationData = snapshot.val();

          return {
            orderId: orderDetails.orderId,

            additionalData: notificationData,
          };
        }

        return null;
      })
    );

    return res.status(200).json({ status: 200, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", status: 500 });
  }
};

export const passwordMiddleware = (req, res, next) => {
  const expectedPassword = "tangkas"; // Change this to your desired password

  const providedPassword = req.headers.authorization;

  if (!providedPassword || providedPassword !== expectedPassword) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

export const chartData = async (req, res) => {
  try {
    const completedOrders = await prisma.orderDetails.findMany({
      where: { status: "selesai" },
      include: {
        order: {
          select: {
            id: true,
          },
        },
      },
    });

    const ordersGroupedByMonth = completedOrders.reduce((acc, order) => {
      const month = order.createdAt
        .toISOString()
        .split("-")
        .slice(0, 2)
        .join("-");
      acc[month] = acc[month] || [];
      acc[month].push(order);
      return acc;
    }, {});

    const monthlyEarnings = Object.keys(ordersGroupedByMonth).map((month) => {
      const orders = ordersGroupedByMonth[month];
      const totalEarnings = orders.reduce((acc, order) => acc + order.price, 0);
      return { month, totalEarnings };
    });

    res.json({ monthlyEarnings });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
};

export const postDeskripsiService = async (req, res) => {
  try {
    const { uuid, desc /* other fields */ } = req.body;

    const orderDetails = await prisma.orderDetails.findFirst({
      where: {
        uuid: uuid,
      },
    });

    if (!orderDetails) {
      return res
        .status(404)
        .json({ success: false, error: "Order details not found" });
    }

    // Now you have the orderDetails, you can update the desc field or do other operations
    const updatedOrderDetails = await prisma.orderDetails.update({
      where: {
        id: orderDetails.id,
      },
      data: {
        desc: desc,
      },
    });

    res.status(200).json({ success: true, message: "Berhasil", status: 200 });
  } catch (error) {
    console.error("Error updating order details:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
