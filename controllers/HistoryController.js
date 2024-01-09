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
          images: true,
        },
        orderBy: {
          createdAt: 'asc', // Display oldest orders first
        },
      });

      const reversedOrders = orders.reverse(); // Reverse the order of the array

      res.json({
        orders: reversedOrders,
        currentPage: 0,
        totalPages: 1,
      });
    } catch (error) {
      console.error("Error retrieving orders:", error);
      res.status(500).send("Internal Server Error");
    }
  } else {
   
    const skip = (parseInt(page) - 1) * parseInt(perPage);

    try {
      const orders = await prisma.order.findMany({
        where: {
          username: username,
        },
        include: {
          orderDetails: true,
          location: true,
          images: true,
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

      const reversedOrders = orders.reverse(); // Reverse the order of the array

      res.json({
        orders: reversedOrders,
        currentPage: parseInt(page),
        totalPages,
      });
    } catch (error) {
      console.error("Error retrieving orders:", error);
      res.status(500).send("Internal Server Error");
    }
  }
};


export const searchByUsername = async (req, res) => {
  const { username } = req.params;

  try {
    const orders = await prisma.order.findMany({
      where: {
        username: {
          contains: username,
          mode: 'insensitive', // Case-insensitive search
        },
      },
      include: {
        orderDetails: true,
        location: true,
        images: true,
      },
    });

    res.json({ orders });
  } catch (error) {
    console.error('Error searching orders by username:', error);
    res.status(500).send('Internal Server Error');
  }
};