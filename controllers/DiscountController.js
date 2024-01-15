import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import nodemailer from "nodemailer";
import { database, firebase } from "../lib/Firebase.js";
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "tangkasjayateknik@gmail.com",
    pass: "vykllsqaorkbgzqy",
  },
});

export const createDiscount = async (req, res) => {
  try {
    const {
      code,
      exp,
      status,
      disc,
      select,
      email,
      username,
      categoryIds,
      name,
    } = req.body;

    const exp_format = new Date(exp).toISOString();
    const currentDate = new Date().toISOString();
    const categoryId = parseInt(categoryIds);

    let finalStatus = status;
    if (exp_format <= currentDate) {
      finalStatus = "inactive";
    }

    const disc_float = parseFloat(disc) / 100;
    const newDiscount = await prisma.discount.create({
      data: {
        code,
        exp: exp_format,
        status: finalStatus,
        username,
        disc: disc_float,
        auth: {
          connect: {
            uid: select,
          },
        },
      },
    });

    await prisma.categoryOnDiscount.create({
      data: {
        discountId: newDiscount.id,
        categoryId: categoryId,
      },
    });

    const message = "tesat";

    const databaseRef = database.ref(`/voucher/${username}-${code}`);
    await databaseRef.set({
      message,
    });

    let mailOptions = {
      from: "tangkasjayateknik@gmail.com",
      to: email,
      subject: "Kode Voucher",
      html: `
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
          }
          h1 {
            color: green;
            font-size: 20px;
          }
          p {
            color: black;
            margin: 5px;
           
          }
          span {
            color: black;
            margin: 25px 0 5px 0; /* Atur margin-top menjadi 10px */
          }
          
          .footer {
            margin-top: 20px;
            text-align: center;
            color: #888888;
            font-size: 12px;
          }
          button {
            background-color: blue;
            color: white;
            padding: 10px;
            border: none;
            cursor: pointer;
          }
          #voucherCode {
          
            color: orange;
            font-size: 20px;
            padding: 5px;
           
            cursor: pointer; /* Menambahkan cursor pointer */
          }
        </style>
        <script>
          function copyToClipboard() {
            var spanElement = document.querySelector('#voucherCode');
            var range = document.createRange();
            range.selectNode(spanElement);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
            alert('Teks berhasil disalin ke clipboard!');
          }
        </script>
      </head>
      <body>
        <h1>Selamat, Anda mendapatkan voucher discount sebesar ${disc}%</h1>
        <p>Gunakan Voucher ini untuk mendapatkan Discount Biaya Service ${name}</P>
        <p>Berikut kode voucher Anda: <br><span id="voucherCode" onclick="copyToClipboard()"> ${code}</span></p>
        <p>Expired ${exp} </P
        <p> Terima kasih :)
        <div class="footer">
            &copy; ${new Date().getFullYear()} Tangkas Jaya Teknik
          </div>
      </body>
    </html>
    
    
      `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
      } else {
      }
    });

    res.status(201).json(newDiscount);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error("Error handling login:", error);
  }
};

export const getVouchersByAuthId = async (req, res) => {
  try {
    const { username } = req.params;

    const vouchers = await prisma.discount.findMany({
      where: {
        username: username,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!vouchers.length) {
      return res
        .status(404)
        .json({ message: "No vouchers found for this authId" });
    }

    const currentDate = new Date();

    const vouchersWithCategoryDetails = vouchers.map(async (voucher) => {
 
      const expirationDate = new Date(voucher.exp);
      if (expirationDate < currentDate) {
   
        await prisma.discount.update({
          where: {
            id: voucher.id,
          },
          data: {
            status: "inactive",
          },
        });
      }

      const categoryDetails = voucher.categories.map((categoryOnDiscount) => {
        return {
          name: categoryOnDiscount.category.nm_category,
          id: categoryOnDiscount.categoryId,
        };
      });

      return { ...voucher, categories: categoryDetails };
    });

    res.status(200).json({ data: vouchersWithCategoryDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error("Error handling getVouchersByAuthId:", error);
  }
};

export const verifyVoucherByUsername = async (req, res) => {
  try {
    const username = req.body.username;
    const voucherCode = req.body.voucherCode;
    const CategoryId = req.body.categoryId;

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
        categories: true, // Include categories in the selected fields
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
        res.json({
          message: `${username} memiliki voucher ${voucherCode}`,
          data: voucher,
        });
      } else {
        let message = "";
        if (voucher.exp <= new Date()) {
          message += `Voucher ${voucherCode} sudah kadaluarsa`;
        }
        if (voucher.status !== "active") {
          message += `Voucher ${voucherCode} Sudah digunakan`;
        }
        res.json({ message: message });
      }
    } else {
      res.json({
        message: `Voucher tidak ditemukan ${voucherCode}`,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const UseVoucher = async (req, res) => {
  try {
    const username = req.body.username;
    const voucherCode = req.body.voucherCode;

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
      },
    });

    if (voucher) {
      if (voucher.exp > new Date() && voucher.status === "active") {
        await prisma.discount.update({
          where: { id: voucher.id },
          data: { status: "inactive" },
        });

        res.json({
          message: `${username} memiliki voucher ${voucherCode}`,
          data: voucher,
        });
      } else {
        let message = "";
        if (voucher.exp <= new Date()) {
          message += `Voucher ${voucherCode} sudah kadaluarsa`;
        }
        if (voucher.status !== "active") {
          message += `Voucher ${voucherCode} Sudah digunakan`;
        }
        res.json({ message: message });
      }
    } else {
      res.json({
        message: `Voucher tidak ditemukan ${voucherCode}`,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
