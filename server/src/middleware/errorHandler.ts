import axios from 'axios';
import type { NextFunction, Request, Response } from 'express';

/**
 * One place that converts any thrown error into a consistent JSON shape.
 *
 * The client should never see a TMDB error body or a stack trace — it sees
 * { error: { code, message } } and can render a retry state from that alone.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (axios.isAxiosError(err)) {
    const upstreamStatus = err.response?.status;

    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: { code: 'UPSTREAM_TIMEOUT', message: 'The movie service took too long to respond.' },
      });
    }

    if (upstreamStatus === 429) {
      return res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
      });
    }

    if (upstreamStatus === 404) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'That movie could not be found.' },
      });
    }

    return res.status(502).json({
      error: { code: 'UPSTREAM_ERROR', message: 'The movie service is unavailable right now.' },
    });
  }

  console.error('[unhandled]', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' },
  });
}
