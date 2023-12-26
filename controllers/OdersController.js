import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const submitOrder = async (req, res) => {
  try {
    const { uid, username, orderDetails, location } = req.body;

    const { nm_product, qty, price, name , url } = orderDetails;

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
            price: formattedPrice,
            name,
            url,
            status:"pending",
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

    res.status(201).json({ success: true, order , status:201 });
  } catch (error) {
    console.error("Error submitting order:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" , status:500 });
  } finally {
    await prisma.$disconnect();
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { username } = req.body;

    const orders = await prisma.order.findMany({
      where: {
        username: username,
      },
      include: {
        orderDetails: true,
        location: true,
      },
    });

    if (orders.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          error: "No orders found for the given username",
          status:404,
        });
    }

    const ordersJSON = { success: true, data:orders , status:200 };

    res.status(200).json(ordersJSON);
  } catch (error) {
    console.error("Error fetching orders:", error);

    res.status(500).json({ success: false, error: "Internal Server Error" , status:500});
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Error disconnecting Prisma:", disconnectError);
    }
  }
};
