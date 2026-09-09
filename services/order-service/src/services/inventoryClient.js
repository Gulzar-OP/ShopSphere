import ApiError from "../utils/ApiError.js";

const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL;

const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY;

const sendInventoryRequest = async (
  endpoint,
  payload
) => {
  try {
    const response = await fetch(
      `${INVENTORY_SERVICE_URL}${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": INTERNAL_API_KEY,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.message || "Inventory request failed",
        data.errors
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === "TimeoutError") {
      throw new ApiError(
        504,
        "Inventory Service request timed out"
      );
    }

    throw new ApiError(
      503,
      "Inventory Service is unavailable"
    );
  }
};

export const reserveStock = async ({
  sku,
  quantity,
  orderId,
}) => {
  return sendInventoryRequest(
    "/inventory/internal/reserve",
    {
      sku,
      quantity,
      orderId,
    }
  );
};

export const releaseStock = async ({
  sku,
  orderId,
}) => {
  return sendInventoryRequest(
    "/inventory/internal/release",
    {
      sku,
      orderId,
    }
  );
};

export const commitStock = async ({
  sku,
  orderId,
}) => {
  return sendInventoryRequest(
    "/inventory/internal/commit",
    {
      sku,
      orderId,
    }
  );
};