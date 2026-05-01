const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
    product: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    shipping: {
        type: Number,
        default: 300
    },
    total: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: String,
    phone: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Order", OrderSchema);
