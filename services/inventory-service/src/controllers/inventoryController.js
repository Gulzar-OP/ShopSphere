import Inventory from "../models/Inventory.js";

export const createInventory = async (req, res, next) =>{
    try{
        const {
            productId,
            sku,
            variantId,
            quantity,
            lowStockThreshold,
            location
        } = req.body;
        const inventory = await Inventory.create({
            productId,
            sku,
            variantId,
            quantity,
            reservedQuantity: 0,
            lowStockThreshold,
            location,
            createdBy: req.user.id
        });
        return res.status(201).json({ 
            success: true,
            message: "Inventory created successfully",
            inventory
        });
    } catch (error) {
        return next(error);
    }
}

export const getStockBySku = async (req, res, next) => {
    try {
        const { sku } = req.params.sku
        .trim().toUpperCase();
        const inventory = await Inventory.findOne({ sku,isActive: true });
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found"
            });
        }
    return res.status(200).json({
      success: true,
      stock: {
        productId: inventory.productId,
        sku: inventory.sku,
        variantId: inventory.variantId,
        availableQuantity:
          inventory.availableQuantity,
        isLowStock: inventory.isLowStock,
        isOutOfStock: inventory.isOutOfStock,
      },
    });

    } catch (error) {
        return next(error);
    }
};

export const updateInventory = async (req, res, next) => {
    try {
        const { sku } = req.params.sku.trim().toUpperCase();
        const allowedFields = ["isActive", "lowStockThreshold", "location"];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }
        if(Object.keys(updates).length === 0){
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update"
            });
        }
        updates.updatedBy = req.user.id;

        const inventory = await Inventory.findOneAndUpdate({ sku }, updates, { new: true, runValidators: true });
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Inventory updated successfully",
            inventory
        });
    } catch (error) {
        return next(error);
    }
};


export const adjustStock = async (
  req,
  res,
  next
) => {
  try {
    const sku = req.params.sku
      .trim()
      .toUpperCase();

    const adjustment = Number(req.body.adjustment);

    if (
      !Number.isInteger(adjustment) ||
      adjustment === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Adjustment must be a non-zero integer",
      });
    }

    const inventory =
      await Inventory.findOneAndUpdate(
        {
          sku,
          isActive: true,

          $expr: {
            $gte: [
              {
                $add: [
                  "$quantity",
                  adjustment,
                ],
              },
              "$reservedQuantity",
            ],
          },
        },
        {
          $inc: {
            quantity: adjustment,
          },
          $set: {
            updatedBy: req.user.id,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!inventory) {
      const existing =
        await Inventory.findOne({ sku });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Inventory not found",
        });
      }

      if (!existing.isActive) {
        return res.status(409).json({
          success: false,
          message:
            "Inactive inventory cannot be adjusted",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Stock cannot be reduced below reserved quantity",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        adjustment > 0
          ? "Stock added successfully"
          : "Stock removed successfully",
      inventory,
    });
  } catch (error) {
    return next(error);
  }
};