export const notFound = (req, res, _next) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, _req, res, _next) => {
  console.error("[Error]", err?.message || err);

  // Multer errors
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Maximum size is 50 MB." });
  }
  if (err?.message?.startsWith("File type not allowed")) {
    return res.status(400).json({ error: err.message });
  }

  // Mongoose validation errors
  if (err?.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages[0] });
  }

  // Mongoose duplicate key
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ error: `${field} already exists` });
  }

  // JWT errors
  if (err?.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (err?.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }

  // CORS errors
  if (err?.message?.startsWith("CORS:")) {
    return res.status(403).json({ error: err.message });
  }

  const status  = Number(err?.statusCode || err?.status || 500);
  const message = err?.message || "Internal server error";

  res.status(status).json({ error: message });
};