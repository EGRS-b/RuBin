const APP_STARTED_AT = Date.now();

function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  next();
}

function buildHealthPayload({ version = '1.0.0', pinsCount = 0, boardsCount = 0 } = {}) {
  const uptimeSeconds = Math.max(0, Math.floor((Date.now() - APP_STARTED_AT) / 1000));
  return {
    status: 'ok',
    service: 'RuBin API',
    version,
    uptimeSeconds,
    moderationMode: 'deterministic-rf-dictionary-no-ai',
    moderationLabel: 'Словарная фильтрация РФ (без ИИ)',
    storageReady: true,
    pinsCount,
    boardsCount,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  securityHeadersMiddleware,
  buildHealthPayload
};