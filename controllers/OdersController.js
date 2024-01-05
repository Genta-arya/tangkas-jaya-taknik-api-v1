import { PrismaClient } from "@prisma/client";

import pkg from "firebase-admin";
import { database, firebase } from "../lib/Firebase.js";
const prisma = new PrismaClient();

export const submitOrder = async (req, res) => {
  try {
    const { uid, username, orderDetails, location } = req.body;

    const { nm_product, qty, price, name, url, telp } = orderDetails;

    const {
      address,
      koordinat: { lat, lng },
    } = location;

    const formattedPrice = parseInt(price);

    const order = await prisma.order.create({
      data: {
        uid,
        username,
        orderDetails: {
          create: {
            nm_product,
            qty,
            username: username,
            price: formattedPrice,
            name,
            url,
            telp,
            status: "pending",
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

    res.status(201).json({ success: true, order, status: 201 });
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
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const perPage = 5; // Jumlah item per halaman

  try {
    const totalOrders = await prisma.order.count();
    const totalPages = Math.ceil(totalOrders / perPage);

    const orders = await prisma.order.findMany({
      include: {
        orderDetails: true,
        location: true,
      },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No orders found for the given page",
        status: 404,
      });
    }

    const ordersJSON = {
      success: true,
      data: orders,
      status: 200,
      currentPage: page, // Menambahkan nomor halaman saat ini
      totalPages,
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
