import Product from "../models/Product.js";

export const validateOrderItems = async (
  req,
  res,
  next
) => {
  try {
    const { items } = req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one order item is required",
      });
    }

    const normalizedItems = [];

    for (const item of items) {
      const sku =
        typeof item.sku === "string"
          ? item.sku.trim().toUpperCase()
          : "";

      const quantity = Number(item.quantity);

      if (
        !sku ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each item requires a valid SKU and positive integer quantity",
        });
      }

      normalizedItems.push({
        sku,
        quantity,
      });
    }

    const uniqueSkus = new Set(
      normalizedItems.map((item) => item.sku)
    );

    if (
      uniqueSkus.size !==
      normalizedItems.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Duplicate SKUs are not allowed in an order",
      });
    }

    const requestedSkus = [
      ...uniqueSkus,
    ];

    const products = await Product.find({
      status: "active",

      $or: [
        {
          sku: {
            $in: requestedSkus,
          },
        },
        {
          "variants.sku": {
            $in: requestedSkus,
          },
        },
      ],
    });

    const validatedItems = [];

    for (const requestedItem of normalizedItems) {
      const product = products.find(
        (currentProduct) =>
          currentProduct.sku ===
            requestedItem.sku ||
          currentProduct.variants.some(
            (variant) =>
              variant.sku ===
                requestedItem.sku &&
              variant.isActive
          )
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Active product not found for SKU: ${requestedItem.sku}`,
        });
      }

      const variant =
        product.variants.find(
          (currentVariant) =>
            currentVariant.sku ===
              requestedItem.sku &&
            currentVariant.isActive
        ) || null;

      const additionalPrice =
        variant?.additionalPrice || 0;

      const originalPrice = Number(
        (
          product.price +
          additionalPrice
        ).toFixed(2)
      );

      const discountAmount =
        (originalPrice *
          product.discountPercentage) /
        100;

      const unitPrice = Number(
        (
          originalPrice -
          discountAmount
        ).toFixed(2)
      );

      validatedItems.push({
        productId:
          product._id.toString(),

        sku: requestedItem.sku,

        name: product.name,

        image:
          variant?.image ||
          product.images[0]?.url ||
          null,

        variantId:
          variant?._id?.toString() ||
          null,

        variantName:
          variant?.name || null,

        quantity:
          requestedItem.quantity,

        originalPrice,

        unitPrice,

        subtotal: Number(
          (
            unitPrice *
            requestedItem.quantity
          ).toFixed(2)
        ),
      });
    }

    const itemsTotal = Number(
      validatedItems
        .reduce(
          (total, item) =>
            total + item.subtotal,
          0
        )
        .toFixed(2)
    );

    return res.status(200).json({
      success: true,
      items: validatedItems,
      itemsTotal,
      currency: "INR",
    });
  } catch (error) {
    return next(error);
  }
};