import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getHistory = async (req, res) => {
  const { username } = req.params;
  const { page = 1, perPage = 5 } = req.query;

  const skip = (page - 1) * perPage;

  try {
    const orders = await prisma.order.findMany({
      where: {
        username: username,
      },
      include: {
        orderDetails: true,
        location: true,
      },
      skip: skip,
      take: parseInt(perPage),
    });

    const totalOrders = await prisma.order.count({
      where: {
        username: username,
      },
    });

    const totalPages = Math.ceil(totalOrders / perPage);

    res.json({
      orders,
      currentPage: parseInt(page),
      totalPages,
    });
  } catch (error) {
    console.error("Error retrieving orders:", error);
    res.status(500).send("Internal Server Error");
  }
};
