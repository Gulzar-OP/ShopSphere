import mongoose from "mongoose";
import crypto from "crypto";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, "Product ID is required"],
      trim: true,
    },

    sku: {
      type: String,
      required: [true, "SKU is required"],
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    image: {
      type: String,
      default: null,
      trim: true,
    },

    variantId: {
      type: String,
      default: null,
      trim: true,
    },

    variantName: {
      type: String,
      default: null,
      trim: true,
    },

    quantity: {
      type: Number,
      required: [true, "Item quantity is required"],
      min: [1, "Item quantity must be at least 1"],
    },

    originalPrice: {
      type: Number,
      required: [
        true,
        "Original item price is required",
      ],
      min: [0, "Original price cannot be negative"],
    },

    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },

    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },

    reservationId: {
      type: String,
      required: [true, "Reservation ID is required"],
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please provide a valid Indian phone number",
      ],
    },

    addressLine1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
    },

    addressLine2: {
      type: String,
      default: "",
      trim: true,
    },

    landmark: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },

    district: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },

    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
      trim: true,
      match: [
        /^[1-9][0-9]{5}$/,
        "Please provide a valid postal code",
      ],
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    changedBy: {
      type: String,
      default: "system",
      trim: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },

    userId: {
      type: String,
      required: [true, "User ID is required"],
      trim: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      validate: {
        validator(items) {
          return items.length > 0;
        },
        message:
          "Order must contain at least one item",
      },
    },

    shippingAddress: {
      type: addressSchema,
      required: [
        true,
        "Shipping address is required",
      ],
    },

    itemsTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: [0, "Shipping fee cannot be negative"],
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: [0, "Tax amount cannot be negative"],
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    grandTotal: {
      type: Number,
      required: true,
      min: [0, "Grand total cannot be negative"],
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "card", "upi"],
      required: [
        true,
        "Payment method is required",
      ],
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "cod_pending",
        "paid",
        "failed",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    payment: {
      paymentId: {
        type: String,
        default: null,
      },

      provider: {
        type: String,
        default: null,
      },

      transactionId: {
        type: String,
        default: null,
      },

      paidAt: {
        type: Date,
        default: null,
      },

      failureReason: {
        type: String,
        default: null,
      },
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "stock_reserved",
        "payment_pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "payment_failed",
      ],
      default: "pending",
      index: true,
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    cancellation: {
      reason: {
        type: String,
        default: null,
      },

      cancelledBy: {
        type: String,
        default: null,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },
    },

    deliveredAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
        },

        cancelledAt: {
        type: Date,
        default: null,
        },
    },
  {
    timestamps: true,
    versionKey: false,
  }
);
// Order number generate karenge
orderSchema.pre("validate", function () {
  if (this.isNew && !this.orderNumber) {
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

    const randomCode = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

    this.orderNumber =
      `ORD-${date}-${randomCode}`;
  }
});
// Totals automatically calculate karenge
orderSchema.pre("validate", function () {
  this.items.forEach((item) => {
    item.subtotal = Number(
      (item.unitPrice * item.quantity).toFixed(2)
    );
  });

  this.itemsTotal = Number(
    this.items
      .reduce(
        (total, item) =>
          total + item.subtotal,
        0
      )
      .toFixed(2)
  );

  const total =
    this.itemsTotal +
    this.shippingFee +
    this.taxAmount -
    this.discountAmount;

  this.grandTotal = Number(
    Math.max(total, 0).toFixed(2)
  );
});
// Initial status history add karenge
orderSchema.pre("save", function () {
  if (
    this.isNew &&
    this.statusHistory.length === 0
  ) {
    this.statusHistory.push({
      status: this.orderStatus,
      note: "Order created",
      changedBy: "system",
    });
  }
});

orderSchema.index({
  userId: 1,
  createdAt: -1,
});

orderSchema.index({
  orderStatus: 1,
  createdAt: -1,
});

orderSchema.index({
  paymentStatus: 1,
  createdAt: -1,
});

const Order = mongoose.model(
  "Order",
  orderSchema
);

export default Order;