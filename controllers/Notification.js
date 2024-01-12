import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getNotifikasi = async (req, res) => {
    const { username } = req.params;
  
    try {
      const orders = await prisma.order.findMany({
        where: {
          username: username,
        },
       
        select: {
          orderId: true,
          username:true,
        },
      });
  
      res.json({
        orders,
      });
    } catch (error) {
      console.error("Error retrieving orders:", error);
      res.status(500).send("Internal Server Error");
    }
  };
