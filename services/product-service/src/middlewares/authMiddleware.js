export const requireAdmin = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (userRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin permission required",
    });
  }

  req.user = {
    id: userId,
    role: userRole,
  };

  return next();
};