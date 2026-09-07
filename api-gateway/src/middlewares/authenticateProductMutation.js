const authenticateProductMutation = async (
  req,
  res,
  next
) => {
  // Public product-reading requests
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return next();
  }

  try {
    const headers = {
      "x-internal-api-key": process.env.INTERNAL_API_KEY,
    };

    if (req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }

    const response = await fetch(
      `${process.env.AUTH_SERVICE_URL}/internal/verify`,
      {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5000),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || "Authentication failed",
      });
    }

    if (data.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin permission required",
      });
    }

    req.authenticatedUser = data.user;

    return next();
  } catch (error) {
    console.error(
      `Gateway authentication failed: ${error.message}`
    );

    return res.status(503).json({
      success: false,
      message: "Authentication Service is unavailable",
    });
  }
};

export default authenticateProductMutation;