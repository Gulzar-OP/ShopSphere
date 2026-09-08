import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      required: true,
      trim: true,
    },

    orderId: {
      type: String,
      default: null,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["reserved", "committed", "released"],
      default: "reserved",
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
    timestamps: true,
  }
);


const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, "Product ID is required"],
      trim: true,
      index: true,
    },

    sku: {
      type: String,
      required: [true, "SKU is required"],
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    variantId: {
      type: String,
      default: null,
      trim: true,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },

    reservedQuantity: {
      type: Number,
      min: [0, "Reserved quantity cannot be negative"],
      default: 0,
    },
    reservations: {
  type: [reservationSchema],
  default: [],
},

    lowStockThreshold: {
      type: Number,
      min: [0, "Low-stock threshold cannot be negative"],
      default: 5,
    },

    location: {
      type: String,
      trim: true,
      default: "main-warehouse",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: String,
      required: [true, "Creator user ID is required"],
      trim: true,
    },

    updatedBy: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

inventorySchema.pre("validate", function () {
  if (this.reservedQuantity > this.quantity) {
    this.invalidate(
      "reservedQuantity",
      "Reserved quantity cannot exceed total quantity"
    );
  }
});

inventorySchema.virtual("availableQuantity").get(
  function () {
    return this.quantity - this.reservedQuantity;
  }
);

inventorySchema.virtual("isLowStock").get(function () {
  const available =
    this.quantity - this.reservedQuantity;

  return available <= this.lowStockThreshold;
});

inventorySchema.virtual("isOutOfStock").get(function () {
  return (
    this.quantity - this.reservedQuantity === 0
  );
});

inventorySchema.index({
  productId: 1,
  location: 1,
});

inventorySchema.index({
  isActive: 1,
  quantity: 1,
});

const Inventory = mongoose.model(
  "Inventory",
  inventorySchema
);

export default Inventory;