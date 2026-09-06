import User from "../models/User.js";
import sendTokenResponse from "../utils/sendTokenResponse.js";
import clearTokenCookie from "../utils/clearTokenCookie.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
    });

    sendTokenResponse(user, 201, res, "User registered successfully");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }
    return next(error);
  }
};

// login
export const login = async(req, res, next) =>{
    try{
        const { email, password } = req.body;
        if(!email || !password){
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }
        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail }).select("+password");
        if(!user){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        const isPasswordCorrect = await user.comparePassword(password);
        if(!isPasswordCorrect){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        if(!user.isActive){
            return res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
        }
        sendTokenResponse(user, 200, res, "User logged in successfully");
    }catch(error){
        return next(error);
    }
}

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const logout = async (req, res) => {
  clearTokenCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

export const adminCheck = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin access granted",
    user: req.user,
  });
};