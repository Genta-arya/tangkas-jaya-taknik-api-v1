import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import router from "./Routes/route.js";
import fileUpload from "express-fileupload";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(express.static("public"));
// app.use((req, res) => {
//   res.status(404).send("Not Found");
// });
app.use(fileUpload());
app.use(express.json());
app.use(cors());
app.use(router);

const httpserver = createServer(app);

httpserver.listen(process.env.APP_PORT, () => {
  console.log("Server running on port " + process.env.APP_PORT);
});
