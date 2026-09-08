const authenticateMutation = async (
  req,
  res,
  next
) => {
  // Public read-only requests
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return next();
  }

  try {
    const headers = {
      "x-internal-api-key":
        process.env.INTERNAL_API_KEY,
    };

    // Forward cookie if present
    if (req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

    // Forward Bearer token if present
    if (req.headers.authorization) {
      headers.authorization =
        req.headers.authorization;
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

    // Authentication failed
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message:
          data.message || "Authentication failed",
      });
    }

    // Safety check
    if (!data.user) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    // Store verified user
    req.authenticatedUser = data.user;

    return next();
  } catch (error) {
    console.error(
      `Gateway authentication failed: ${error.message}`
    );

    return res.status(503).json({
      success: false,
      message:
        "Authentication Service is unavailable",
    });
  }
};

export default authenticateMutation;