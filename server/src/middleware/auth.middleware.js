import jwt from "jsonwebtoken";

const unauthorized = (res, message = "Authentication required") =>
  res.status(401).json({
    success: false,
    message,
  });

export const authenticateToken = (req, res, next) => {
  const authorization = req.get("authorization");
  const parts = authorization?.trim().split(/\s+/) ?? [];

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== "bearer" ||
    !parts[1]
  ) {
    return unauthorized(res);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not configured");
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }

  try {
    const payload = jwt.verify(parts[1], secret);
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.userId !== "string" ||
      !["ADMIN", "CUSTOMER"].includes(payload.role)
    ) {
      return unauthorized(res, "Invalid or expired token");
    }

    req.user = {
      id: payload.userId,
      role: payload.role,
    };

    return next();
  } catch {
    return unauthorized(res, "Invalid or expired token");
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return unauthorized(res);
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }

  return next();
};
