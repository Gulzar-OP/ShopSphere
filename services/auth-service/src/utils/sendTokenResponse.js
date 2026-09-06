import { generateToken } from "./jwt.js";

const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id);

  const cookieExpiresInDays = Number(
    process.env.JWT_COOKIE_EXPIRES_IN || 7
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: cookieExpiresInDays * 24 * 60 * 60 * 1000,
    path: "/",
  };

  res
    .status(statusCode)
    .cookie("accessToken", token, cookieOptions)
    .json({
      success: true,
      message,
      user,
    });
};

export default sendTokenResponse;