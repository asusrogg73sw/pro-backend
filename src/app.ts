import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";

// Database
import connectDB from "./config/db";

// Routes
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import paymentRoutes from "./routes/paymentRoutes";

// Middleware
import { errorHandler } from "./middlewares/errorMiddleware";

// Security Packages
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import cors from "cors";

dotenv.config();
connectDB();

const app: Application = express();

// =======================
// 🔐 Security Middlewares
// =======================

app.use(helmet()); // Secure HTTP headers
app.use(cors());   // Enable CORS

app.use(hpp());    // Prevent HTTP Parameter Pollution

// Rate Limiting (10 minutes mein 100 requests per IP)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 10 minutes",
});

app.use("/api", limiter);

// =======================
// 📦 Body Parser
// =======================
app.use(express.json());

// =======================
// 🌐 Routes
// =======================

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the Professional APIs 🚀");
});

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payment", paymentRoutes);

// =======================
// 📁 Static Folder (Uploads)
// =======================

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// =======================
// ❌ Error Middleware (Always Last)
// =======================
app.use(errorHandler);

// =======================
// 🚀 Server Start
// =======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`
  );
});