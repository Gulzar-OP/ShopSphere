import mongoose from "mongoose";
import slugify from "slugify";

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },
    publicId: {
      type: String,
      default: null,
      trim: true,
    },
    alt: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, "Variant SKU is required"],
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Variant name is required"],
      trim: true,
    },
    options: {
      type: Map,
      of: String,
      default: {},
    },
    additionalPrice: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must contain at least 2 characters"],
      maxlength: [150, "Product name cannot exceed 150 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    sku: {
      type: String,
      required: [true, "Product SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [
        10,
        "Product description must contain at least 10 characters",
      ],
      maxlength: [
        5000,
        "Product description cannot exceed 5000 characters",
      ],
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: [
        300,
        "Short description cannot exceed 300 characters",
      ],
      default: "",
    },

    brand: {
      type: String,
      required: [true, "Product brand is required"],
      trim: true,
      maxlength: [100, "Brand cannot exceed 100 characters"],
    },

    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: {
        values: [
          "electronics",
          "fashion",
          "home-kitchen",
          "beauty",
          "grocery",
          "sports",
        ],
        message: "{VALUE} is not a supported category",
      },
      index: true,
    },

    subcategory: {
      type: String,
      required: [true, "Product subcategory is required"],
      lowercase: true,
      trim: true,
      index: true,
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Product price cannot be negative"],
    },

    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be below 0"],
      max: [90, "Discount cannot exceed 90 percent"],
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },

    images: {
      type: [imageSchema],
      validate: {
        validator(images) {
          return images.length > 0 && images.length <= 8;
        },
        message: "A product must contain between 1 and 8 images",
      },
    },

    specifications: {
      type: Map,
      of: String,
      default: {},
    },

    tags: {
      type: [String],
      default: [],
      set(tags) {
        return [
          ...new Set(
            tags.map((tag) =>
              tag.trim().toLowerCase()
            ).filter(Boolean)
          ),
        ];
      },
    },

    variants: {
      type: [variantSchema],
      default: [],
    },

    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: String,
      required: [true, "Creator user ID is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.pre("validate", function () {
  if (this.isNew && this.name && this.sku && !this.slug) {
    this.slug = slugify(`${this.name}-${this.sku}`, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
});

productSchema.path("variants").validate(function (variants) {
  const variantSkus = variants.map((variant) =>
    variant.sku.toUpperCase()
  );

  return new Set(variantSkus).size === variantSkus.length;
}, "Variant SKUs must be unique within a product");

productSchema.virtual("finalPrice").get(function () {
  const discountAmount =
    (this.price * this.discountPercentage) / 100;

  return Number((this.price - discountAmount).toFixed(2));
});

productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
  tags: "text",
});

const Product = mongoose.model("Product", productSchema);

export default Product;