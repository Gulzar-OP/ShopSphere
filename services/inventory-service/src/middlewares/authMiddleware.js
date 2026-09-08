
export const requireAdmin = (req,res,next) => {
    const userId = req.header['X-User-id'];
    const userRole = req.header['X-User-role'];
    if(!userId){
        return res.status(401).json({ message: "Authentication required" });
    }
    if(userRole !== "admin"){
        return res.status(403).json({ message: "Admin permission required",});
    }
    req.user = {
        id: userId,
        role: userRole,
    };
    return next();
};
