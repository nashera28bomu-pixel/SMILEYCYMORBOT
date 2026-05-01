const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../public")));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

// Import Model
const Order = require("./models/Order");

// Create Order
app.post("/api/order", async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.json({ message: "Order saved successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Orders
app.get("/api/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stats
app.get("/api/stats", async (req, res) => {
    try {
        const orders = await Order.find();
        const total = orders.reduce((sum, o) => sum + o.total, 0);

        res.json({
            totalOrders: orders.length,
            totalEarnings: total
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
