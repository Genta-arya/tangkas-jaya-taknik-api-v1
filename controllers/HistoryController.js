import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getHistory = async (req, res) => {
  const { username } = req.params;
  const { page = 1, perPage = 5 } = req.query;

  if (page === "0") {
    // Fetch all data without pagination
    try {
      const orders = await prisma.order.findMany({
        where: {
          username: username,
        },
        include: {
          orderDetails: true,
          location: true,
        },
      });

      res.json({
        orders,
        currentPage: 0, // Set currentPage to 0 to indicate all data
        totalPages: 1, // Set totalPages to 1 as there is no pagination
      });
    } catch (error) {
      console.error("Error retrieving orders:", error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    // Apply pagination for non-zero page value
    const skip = (parseInt(page) - 1) * parseInt(perPage);

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

      const totalPages = Math.ceil(totalOrders / parseInt(perPage));

      res.json({
        orders,
        currentPage: parseInt(page),
        totalPages,
      });
    } catch (error) {
      console.error("Error retrieving orders:", error);
      res.status(500).send("Internal Server Error");
    }
  }
};
