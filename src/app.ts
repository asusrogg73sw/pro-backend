import "./config/envConfig";

import express, { Application, Request, Response } from "express";
import path from "path";

// Database
import connectDB from "./config/db";

// Routes
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import adminRoutes from "./routes/adminRoutes";

// Middleware
import { errorHandler } from "./middlewares/errorMiddleware";

// Security Packages
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { handleStripeWebhook } from "./controllers/paymentController";
import cookieParser from "cookie-parser";

connectDB();

const app: Application = express();

// 🛑 IMPORTANT: Webhook route express.json() se PEHLE aayega
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }), // Sirf is route ke liye raw parser
  handleStripeWebhook,
);

// =======================
// 🔐 Security Middlewares
// =======================

// NEW FIX: Helmet ko is tarah config kiya hai ke ye cross-origin resource sharing (CORS) par images ko block na kare.
// Is se Cart, Product List, aur Edit pages par broke icons ka masla permanent hal ho jayega.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting (10 minutes mein 100 requests per IP)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 10 minutes",
});

app.use("/api", limiter);

// =======================
// 📦 Body Parsers
// =======================
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/admin", adminRoutes);

// =======================
// 📁 Static Folder (Uploads)
// =======================

// NEW FIX: Pehle /uploads folder do jagah alag alag tareeqe se define tha jo clash kar raha tha.
// Ab humne use aik hi makhsoos aur secure jagah par absolute path ke sath serve kar diya hai.
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
    `Server running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`,
  );
});