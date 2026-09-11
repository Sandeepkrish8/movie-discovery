import axios from 'axios';

import { getDeviceId } from './deviceId';

/**
 * Empty in development, so requests go to "/api/..." and Vite's proxy forwards
 * them to Express. In production this is the deployed API origin.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20_000,
});

/**
 * Attach the anonymous device identity to every request in one place, so no
 * individual hook has to remember to send it.
 */
api.interceptors.request.use((config) => {
  config.headers.set('x-device-id', getDeviceId());
  return config;
});

export interface ApiErrorShape {
  code: string;
  message: string;
}

/**
 * Every error the UI renders passes through here, so components never have to
 * know whether a failure came from axios, the network, or our own error handler.
 */
export function toApiError(error: unknown): ApiErrorShape {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: ApiErrorShape } | undefined;
    if (payload?.error) return payload.error;

    if (error.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: 'That took too long. Check your connection and try again.' };
    }

    return { code: 'NETWORK_ERROR', message: 'Could not reach the server. Please try again.' };
  }

  return { code: 'UNKNOWN', message: 'Something went wrong.' };
}
