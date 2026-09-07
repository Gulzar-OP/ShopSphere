import Product from "../models/Product.js";
import escapeRegex from "../utils/escapeRegex.js";

export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      description,
      shortDescription,
      brand,
      category,
      subcategory,
      price,
      discountPercentage,
      currency,
      images,
      specifications,
      tags,
      variants,
      status,
      isFeatured,
    } = req.body;

    const product = await Product.create({
      name,
      sku,
      description,
      shortDescription,
      brand,
      category,
      subcategory,
      price,
      discountPercentage,
      currency,
      images,
      specifications,
      tags,
      variants,
      status,
      isFeatured,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    return next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      minRating,
      featured,
      sort = "newest",
    } = req.query;

    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 50)
        : 12;

    const filter = {
      status: "active",
    };

    if (search?.trim()) {
      const safeSearch = escapeRegex(search.trim());

      filter.$or = [
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          tags: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    if (category) {
      filter.category = category.toLowerCase();
    }

    if (subcategory) {
      filter.subcategory = subcategory.toLowerCase();
    }

    if (brand?.trim()) {
      filter.brand = {
        $regex: `^${escapeRegex(brand.trim())}$`,
        $options: "i",
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};

      const parsedMinPrice = Number(minPrice);
      const parsedMaxPrice = Number(maxPrice);

      if (
        minPrice !== undefined &&
        Number.isFinite(parsedMinPrice) &&
        parsedMinPrice >= 0
      ) {
        filter.price.$gte = parsedMinPrice;
      }

      if (
        maxPrice !== undefined &&
        Number.isFinite(parsedMaxPrice) &&
        parsedMaxPrice >= 0
      ) {
        filter.price.$lte = parsedMaxPrice;
      }

      if (Object.keys(filter.price).length === 0) {
        delete filter.price;
      }
    }

    if (minRating !== undefined) {
      const parsedRating = Number(minRating);

      if (
        Number.isFinite(parsedRating) &&
        parsedRating >= 0 &&
        parsedRating <= 5
      ) {
        filter["rating.average"] = {
          $gte: parsedRating,
        };
      }
    }

    if (featured === "true") {
      filter.isFeatured = true;
    }

    const sortOptions = {
      newest: {
        createdAt: -1,
      },
      oldest: {
        createdAt: 1,
      },
      "price-low": {
        price: 1,
      },
      "price-high": {
        price: -1,
      },
      rating: {
        "rating.average": -1,
        "rating.count": -1,
      },
      name: {
        name: 1,
      },
    };

    const selectedSort =
      sortOptions[sort] || sortOptions.newest;

    const skip = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .sort(selectedSort)
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),

      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getProductBySlug = async (req, res, next) => {
  try {
    const normalizedSlug = req.params.slug
      .trim()
      .toLowerCase();

    const product = await Product.findOne({
      slug: normalizedSlug,
      status: "active",
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const allowedFields = [
      "name",
      "description",
      "shortDescription",
      "brand",
      "category",
      "subcategory",
      "price",
      "discountPercentage",
      "currency",
      "images",
      "specifications",
      "tags",
      "variants",
      "status",
      "isFeatured",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    return next(error);
  }
};

export const archiveProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.status === "archived") {
      return res.status(200).json({
        success: true,
        message: "Product is already archived",
        product,
      });
    }

    product.status = "archived";
    product.isFeatured = false;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product archived successfully",
      product,
    });
  } catch (error) {
    return next(error);
  }
};

export const permanentlyDeleteProduct = async (
  req,
  res,
  next
) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.status !== "draft") {
      return res.status(409).json({
        success: false,
        message:
          "Only draft products can be permanently deleted. Archive published products instead",
      });
    }

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Draft product permanently deleted",
    });
  } catch (error) {
    return next(error);
  }
};