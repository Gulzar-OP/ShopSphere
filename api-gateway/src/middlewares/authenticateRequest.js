const authenticateRequest = async (
  req,
  res,
  next
) => {
  try {
    // Client ke fake identity headers remove karo
    delete req.headers["x-user-id"];
    delete req.headers["x-user-role"];

    const headers = {
      "x-internal-api-key":
        process.env.INTERNAL_API_KEY,
    };

    if (req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

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

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message:
          data.message || "Authentication failed",
      });
    }

    const userId =
      data.user.id || data.user._id;

    req.headers["x-user-id"] =
      userId.toString();

    req.headers["x-user-role"] =
      data.user.role;

    return next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error.message
    );

    if (error.name === "TimeoutError") {
      return res.status(504).json({
        success: false,
        message:
          "Authentication Service timed out",
      });
    }

    return res.status(503).json({
      success: false,
      message:
        "Authentication Service is unavailable",
    });
  }
};

export default authenticateRequest;