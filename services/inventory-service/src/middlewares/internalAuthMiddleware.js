import crypto from "crypto";

export const requireInternalKey = (
  req,
  res,
  next
) => {
  const receivedKey =
    req.headers["x-internal-api-key"];
      const expectedKey =
    process.env.INTERNAL_API_KEY;

    console.log("Received key exists:", !!receivedKey);
console.log("Expected key exists:", !!expectedKey);
console.log("Received length:", receivedKey?.length);
console.log("Expected length:", expectedKey?.length);


  if (!receivedKey || !expectedKey) {
    return res.status(401).json({
      success: false,
      message: "Internal authentication required",
    });
  }

  const receivedBuffer =
    Buffer.from(receivedKey);

  const expectedBuffer =
    Buffer.from(expectedKey);

  const valid =
    receivedBuffer.length ===
      expectedBuffer.length &&
    crypto.timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    );

  if (!valid) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid internal authentication key",
    });
  }

  return next();
};