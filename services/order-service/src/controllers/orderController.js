import Order from "../models/Order.js";
import ApiError from "../utils/ApiError.js";
import {
  validateOrderItems,
} from "../services/productClient.js";
import {
  reserveStock,
  releaseStock,
} from "../services/inventoryClient.js";

const generateOrderNumber = () => {
  const timestamp = Date.now();
  const randomNumber = Math.floor(
    1000 + Math.random() * 9000
  );

  return `ORD-${timestamp}-${randomNumber}`;
};

export const createOrder = async (req, res, next) => {
  let order = null;
  const reservedItems = [];

  try {
    const userId = req.headers["x-user-id"];

    const {
      items,
      shippingAddress,
    } = req.body;

    // User authentication check
    if (!userId) {
      throw new ApiError(
        401,
        "Authentication required"
      );
    }

    // Basic items validation
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(
        400,
        "At least one order item is required"
      );
    }

    if (!shippingAddress) {
      throw new ApiError(
        400,
        "Shipping address is required"
      );
    }

    // Client se sirf SKU aur quantity accept karenge
    const requestedItems = items.map((item) => {
      const quantity = Number(item.quantity);

      if (
        !item.sku ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        throw new ApiError(
          400,
          "Every item requires a valid SKU and quantity"
        );
      }

      return {
        sku: item.sku.trim(),
        quantity,
      };
    });

    /*
     * Product Service se:
     * - product verify
     * - current price
     * - name
     * - productId
     * - image
     */
    const productResult =
      await validateOrderItems(requestedItems);

    const validatedItems =
      productResult.items ||
      productResult.data?.items;

    if (
      !Array.isArray(validatedItems) ||
      validatedItems.length === 0
    ) {
      throw new ApiError(
        502,
        "Invalid response from Product Service"
      );
    }

    // Trusted product information se order items banana
    const orderItems = validatedItems.map((item) => {
      const quantity = Number(item.quantity);
      const price = Number(item.price);

      return {
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        image: item.image || null,
        price,
        quantity,
        subtotal: price * quantity,
      };
    });

    const subtotal = orderItems.reduce(
      (total, item) => total + item.subtotal,
      0
    );

    // Abhi simple calculation rakh rahe hain
    const shippingFee = subtotal >= 500 ? 0 : 50;
    const tax = 0;
    const totalAmount =
      subtotal + shippingFee + tax;

    /*
     * Draft order pehle create karenge,
     * taaki reservation ke paas orderId ho.
     */
    order = await Order.create({
      orderNumber: generateOrderNumber(),
      userId,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingFee,
      tax,
      totalAmount,
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    /*
     * Items ko one-by-one reserve karenge.
     *
     * Sequential reserve ka benefit:
     * hume exact pata rahega kaunsa item
     * successfully reserve hua.
     */
    for (const item of orderItems) {
      await reserveStock({
        sku: item.sku,
        quantity: item.quantity,
        orderId: order._id.toString(),
      });

      reservedItems.push(item);
    }

    return res.status(201).json({
      success: true,
      message:
        "Order created and stock reserved successfully",
      order,
    });
  } catch (error) {
    /*
     * Agar kuch items reserve hone ke baad
     * next item fail hua, pehle reserved items
     * ko release kar denge.
     */
    if (order && reservedItems.length > 0) {
      const rollbackResults =
        await Promise.allSettled(
          reservedItems.map((item) =>
            releaseStock({
              sku: item.sku,
              orderId: order._id.toString(),
            })
          )
        );

      rollbackResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Stock rollback failed for SKU ${reservedItems[index].sku}:`,
            result.reason?.message
          );
        }
      });
    }

    // Failed draft order ko cancelled mark karna
    if (order) {
      try {
        order.orderStatus = "cancelled";
        order.cancellationReason =
          error.message ||
          "Order creation failed";

        await order.save();
      } catch (saveError) {
        console.error(
          "Failed to cancel draft order:",
          saveError.message
        );
      }
    }

    next(error);
  }
};

export const getMyOrders = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      throw new ApiError(
        401,
        "Authentication required"
      );
    }

    const page = Math.max(
      Number.parseInt(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit) || 10,
        1
      ),
      50
    );

    const skip = (page - 1) * limit;

    const filter = { userId };

    const [orders, totalOrders] =
      await Promise.all([
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Order.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(
          totalOrders / limit
        ),
        totalOrders,
        limit,
      },
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrderById = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.headers["x-user-id"];
    const { orderId } = req.params;

    if (!userId) {
      throw new ApiError(
        401,
        "Authentication required"
      );
    }

    /*
     * userId bhi condition mein hai.
     * Isliye user kisi aur ka order nahi dekh sakta.
     */
    const order = await Order.findOne({
      _id: orderId,
      userId,
    }).lean();

    if (!order) {
      throw new ApiError(
        404,
        "Order not found"
      );
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelMyOrder = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.headers["x-user-id"];
    const { orderId } = req.params;
    const {
      reason = "Cancelled by customer",
    } = req.body;

    if (!userId) {
      throw new ApiError(
        401,
        "Authentication required"
      );
    }

    const order = await Order.findOne({
      _id: orderId,
      userId,
    });

    if (!order) {
      throw new ApiError(
        404,
        "Order not found"
      );
    }

    // Repeated request ko safely handle karna
    if (order.orderStatus === "cancelled") {
      return res.status(200).json({
        success: true,
        message: "Order is already cancelled",
        order,
      });
    }

    /*
     * Customer sirf pending order cancel
     * kar sakta hai.
     */
    if (order.orderStatus !== "pending") {
      throw new ApiError(
        409,
        `Order cannot be cancelled in ${order.orderStatus} status`
      );
    }

    /*
     * Paid order ke liye direct cancellation nahi.
     * Uske liye refund workflow chahiye.
     */
    if (order.paymentStatus !== "pending") {
      throw new ApiError(
        409,
        "Paid order requires a refund before cancellation"
      );
    }

    /*
     * Har item ki inventory reservation release.
     */
    const releaseResults =
      await Promise.allSettled(
        order.items.map((item) =>
          releaseStock({
            sku: item.sku,
            orderId: order._id.toString(),
          })
        )
      );

    const failedReleases =
      releaseResults
        .map((result, index) => ({
          result,
          sku: order.items[index].sku,
        }))
        .filter(
          ({ result }) =>
            result.status === "rejected"
        );

    if (failedReleases.length > 0) {
      failedReleases.forEach(
        ({ result, sku }) => {
          console.error(
            `Inventory release failed for ${sku}:`,
            result.reason?.message
          );
        }
      );

      throw new ApiError(
        503,
        "Could not release all reserved inventory"
      );
    }

    order.orderStatus = "cancelled";
    order.cancellationReason =
      String(reason).trim().slice(0, 500);
    order.cancelledAt = new Date();

    order.statusHistory.push({
      status: "cancelled",
      note: order.cancellationReason,
      changedAt: new Date(),
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled and inventory released successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
};