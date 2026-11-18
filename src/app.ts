import express from "express";
import productRoutes from "./controllers/products/router";

const app = express();

app.use(express.json());

app.use("/api/products", productRoutes);

export default app;