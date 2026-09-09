import ApiError from "../utils/ApiError.js";

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL;

const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY;

export const validateOrderItems = async (items) => {
  try {
    const response = await fetch(
      `${PRODUCT_SERVICE_URL}/internal/products/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": INTERNAL_API_KEY,
        },
        body: JSON.stringify({ items }),
        signal: AbortSignal.timeout(5000),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.message || "Product validation failed",
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
        "Product Service request timed out"
      );
    }

    throw new ApiError(
      503,
      "Product Service is unavailable"
    );
  }
};