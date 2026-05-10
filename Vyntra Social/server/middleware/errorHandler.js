export function notFoundHandler(req, res) {
  res.status(404).json({ message: 'API route not found' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error.status || error.statusCode || 500;
  const payload = {
    message: error.message || 'Unexpected server error'
  };

  if (error.details) payload.details = error.details;
  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    payload.stack = error.stack;
  }

  res.status(status).json(payload);
}
