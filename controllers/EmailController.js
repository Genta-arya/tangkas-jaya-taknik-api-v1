import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
const prisma = new PrismaClient();

export const sendEmail = async (req, res) => {
  try {
    // Extract data from the request body
    const { email, orderData } = req.body;

    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "putrabahari1006@gmail.com",
        pass: "taletpsmoesjdjfq",
      },
    });

    // Setup email data
    const mailOptions = {
      from: "tangkasjayateknik@gmail.com", // replace with your Gmail email
      to: email,
      subject: "Pesanan Baru",
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f2f2f2;
            margin: 0;
            padding: 12;
            display: flex;
            
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
      
          .container {
            max-width: 600px;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
          }
      
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
      
          .header h1 {
            color: #333333;
            margin: 0;
          }
      
          .content {
            color: #555555;
          }
      
          .order-details {
            margin-top: 20px;
          }
      
          .order-details table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
      
          .order-details th,
          .order-details td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
          }
      
          .order-details th {
            background-color: #f2f2f2;
          }
      
          .cta-button {
            display: block;
            margin: 20px auto;
            padding: 15px 25px;
            background-color: #4caf50;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.3s ease;
            text-align: center;
          }
      
          .cta-button:hover {
            background-color: #45a049;
          }
      
          .footer {
            margin-top: 20px;
            text-align: center;
            color: #888888;
            font-size: 12px;
          }
      
          /* Styles for all <p> elements */
          p {
            margin-bottom: 10px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Tangkas Jaya Teknik - Notifikasi Pesanan</h1>
          </div>
          <div class="content">
            <p>Hai,</p>
            <p>Ada pesanan baru. Mohon untuk ditindak lanjuti untuk kenyamanan pelanggan.</p>
            <div class="order-details">
              <p>Detail Pesanan:</p>
              <table>
                <tr>
                  <th>Item</th>
                  <th>Detail</th>
                </tr>
                <tr>
                  <td><strong>Nama Produk:</strong></td>
                  <td>${orderData.orderDetails.nm_product}</td>
                </tr>
                <tr>
                  <td><strong>Jumlah:</strong></td>
                  <td>${orderData.orderDetails.qty}</td>
                </tr>
                <tr>
                  <td><strong>Total Harga:</strong></td>
                  <td>${orderData.orderDetails.price}</td>
                </tr>
                <tr>
                  <td><strong>Nama Pemesan:</strong></td>
                  <td>${orderData.orderDetails.name}</td>
                </tr>
                <tr>
                  <td><strong>Nomor Telepon:</strong></td>
                  <td>${orderData.orderDetails.telp}</td>
                </tr>
                <tr>
                  <td><strong>Alamat Pengiriman:</strong></td>
                  <td>${orderData.location.address}</td>
                </tr>
                <!-- Add more order details as needed -->
              </table>
            </div>
            <a href="http://localhost:3000/admin/dashboard" class="cta-button">
              Lihat Pesanan
            </a>
            <p>Salam,</p>
            <p>Terima Kasih</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Tangkas Jaya Teknik
          </div>
        </div>
      </body>
      </html>
      
      `,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent: " + info.response);

    // Respond to the client
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
