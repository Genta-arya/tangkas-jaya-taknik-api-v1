import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const postComment = async (req, res) => {
    try {
        const { username, review, rating } = req.body;
    

        const user = await prisma.auth.findUnique({
          where: { username: String(username) },
        });
   
    
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
    
        
        const comment = await prisma.comment.create({
          data: {
            uid: user.uid,
            review,
            rating,
          },
        });
    
        return res.status(201).json(comment);
      } catch (error) {
        console.error("Error posting comment:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      } finally {
        await prisma.$disconnect();
      }
};

export const getAllComment = async (req, res) => {
    try {
      const comments = await prisma.comment.findMany({
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      });
  
      return res.status(200).json({ comments });
    } catch (error) {
      console.error("Error fetching comments:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    } finally {
      await prisma.$disconnect();
    }
  };