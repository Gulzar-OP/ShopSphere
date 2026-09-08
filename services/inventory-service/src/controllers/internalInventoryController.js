import Inventory from "../models/Inventory.js";

export const reserveStock = async (
  req,
  res,
  next
) => {
  try {
    const {
      reservationId,
      orderId,
      sku,
      quantity,
    } = req.body;

    const requestedQuantity = Number(quantity);

    if (
      !reservationId ||
      !sku ||
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "reservationId, sku and positive integer quantity are required",
      });
    }

    const normalizedSku =
      sku.trim().toUpperCase();

    const expiryMinutes = Number(
      process.env.RESERVATION_EXPIRES_MINUTES ||
        15
    );

    const expiresAt = new Date(
      Date.now() +
        expiryMinutes * 60 * 1000
    );

    const inventory =
      await Inventory.findOneAndUpdate(
        {
          sku: normalizedSku,
          isActive: true,

          "reservations.reservationId": {
            $ne: reservationId,
          },

          $expr: {
            $gte: [
              {
                $subtract: [
                  "$quantity",
                  "$reservedQuantity",
                ],
              },
              requestedQuantity,
            ],
          },
        },
        {
          $inc: {
            reservedQuantity:
              requestedQuantity,
          },

          $push: {
            reservations: {
              reservationId,
              orderId: orderId || null,
              quantity: requestedQuantity,
              status: "reserved",
              expiresAt,
            },
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!inventory) {
      const existing =
        await Inventory.findOne({
          sku: normalizedSku,
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Inventory not found",
        });
      }

      const previousReservation =
        existing.reservations.find(
          (reservation) =>
            reservation.reservationId ===
            reservationId
        );

      if (previousReservation) {
        if (
          previousReservation.quantity !==
          requestedQuantity
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Reservation ID already exists with a different quantity",
          });
        }

        return res.status(200).json({
          success: true,
          message:
            "Stock was already reserved",
          reservation:
            previousReservation,
        });
      }

      return res.status(409).json({
        success: false,
        message: "Insufficient stock",
        availableQuantity:
          existing.availableQuantity,
      });
    }

    const reservation =
      inventory.reservations.find(
        (item) =>
          item.reservationId ===
          reservationId
      );

    return res.status(200).json({
      success: true,
      message: "Stock reserved successfully",
      reservation,
      stock: {
        sku: inventory.sku,
        availableQuantity:
          inventory.availableQuantity,
      },
    });
  } catch (error) {
    return next(error);
  }
};


export const releaseStock = async (
  req,
  res,
  next
) => {
  try {
    const { reservationId, sku } = req.body;

    if (!reservationId || !sku) {
      return res.status(400).json({
        success: false,
        message:
          "reservationId and sku are required",
      });
    }

    const normalizedSku =
      sku.trim().toUpperCase();

    const existing =
      await Inventory.findOne({
        sku: normalizedSku,
        "reservations.reservationId":
          reservationId,
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    const reservation =
      existing.reservations.find(
        (item) =>
          item.reservationId ===
          reservationId
      );

    if (reservation.status === "released") {
      return res.status(200).json({
        success: true,
        message: "Stock was already released",
      });
    }

    if (reservation.status === "committed") {
      return res.status(409).json({
        success: false,
        message:
          "Committed stock cannot be released",
      });
    }

    const inventory =
      await Inventory.findOneAndUpdate(
        {
          sku: normalizedSku,
          reservations: {
            $elemMatch: {
              reservationId,
              status: "reserved",
            },
          },
        },
        {
          $inc: {
            reservedQuantity:
              -reservation.quantity,
          },

          $set: {
            "reservations.$.status":
              "released",

            "reservations.$.processedAt":
              new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!inventory) {
      return res.status(409).json({
        success: false,
        message:
          "Reservation could not be released",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Stock released successfully",
      stock: {
        sku: inventory.sku,
        availableQuantity:
          inventory.availableQuantity,
      },
    });
  } catch (error) {
    return next(error);
  }
};


export const commitStock = async (
  req,
  res,
  next
) => {
  try {
    const { reservationId, sku } = req.body;

    if (!reservationId || !sku) {
      return res.status(400).json({
        success: false,
        message:
          "reservationId and sku are required",
      });
    }

    const normalizedSku =
      sku.trim().toUpperCase();

    const existing =
      await Inventory.findOne({
        sku: normalizedSku,
        "reservations.reservationId":
          reservationId,
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    const reservation =
      existing.reservations.find(
        (item) =>
          item.reservationId ===
          reservationId
      );

    if (reservation.status === "committed") {
      return res.status(200).json({
        success: true,
        message: "Stock was already committed",
      });
    }

    if (reservation.status === "released") {
      return res.status(409).json({
        success: false,
        message:
          "Released stock cannot be committed",
      });
    }

    const inventory =
      await Inventory.findOneAndUpdate(
        {
          sku: normalizedSku,
          reservations: {
            $elemMatch: {
              reservationId,
              status: "reserved",
            },
          },
        },
        {
          $inc: {
            quantity: -reservation.quantity,
            reservedQuantity:
              -reservation.quantity,
          },

          $set: {
            "reservations.$.status":
              "committed",

            "reservations.$.processedAt":
              new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!inventory) {
      return res.status(409).json({
        success: false,
        message:
          "Reservation could not be committed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Stock committed successfully",
      stock: {
        sku: inventory.sku,
        availableQuantity:
          inventory.availableQuantity,
      },
    });
  } catch (error) {
    return next(error);
  }
};