import axios from 'axios';
import { toast } from 'sonner';
import AuthService from '@/services/AuthService';
import { API_URL, APP_ENV } from '@/config/runtime';

const API = API_URL + '/api/v1/mrchadmin';
const ENV = APP_ENV;


/**
 * Used on all requests outside Authentication
 *
 * @returns {AxiosInstance}
 */
const axiosInstance = () => {
  /**
   * Centralized toastable endpoint patterns. Use `{param}`
   * to match any single non-empty segment
   */
  const TOAST_PATTERNS = [
        'merchant/reset/password',
        'terminal/create',
        'terminal/reset/device',
        'terminal/reset/password',
        'terminal/{id}/delete',
        'history/{merchant}/trx'
    ];

  /**
   * Compute API path prefix once
   */
  const API_PATH_PREFIX = (() => {
    return new URL(API).pathname.replace(/\/+$/, '');
  })();

  /**
   * URI Processor Helpers
   */
  const normalizePath = (u) => {
      if (!u) return '';
      let raw = String(u);

      // strip query/hash
      raw = raw.split('#')[0].split('?')[0];

      // extract pathname if absolute URL
      if (/^https?:\/\//i.test(raw)) {
          raw = new URL(raw).pathname;
      }

      // strip base API path if present
      if (API_PATH_PREFIX && raw.startsWith(API_PATH_PREFIX + '/')) {
          raw = raw.substring(API_PATH_PREFIX.length + 1);
      }

      // trim leading/trailing slashes
      raw = raw.replace(/^\/+/, '').replace(/\/+$/, '');
      return raw;
  };

  /**
   * Match a pattern against a path. Returns true
   * if the pattern matches the path exactly,
   * or if the pattern contains no segments.
   */
  const matchPattern = (pattern, path) => {
      const p1 = String(pattern || '').replace(/^\/+|\/+$/g, '');
      const p2 = String(path || '').replace(/^\/+|\/+$/g, '');
      if (!p1 && !p2) return true;
      const a = p1.split('/');
      const b = p2.split('/');
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
          const seg = a[i];
          const val = b[i];
          const isParam = /^\{[^}]+\}$/.test(seg);
          if (isParam) {
              if (!val) return false; // must be non-empty
          } else if (seg !== val) {
              return false;
          }
      }
      return true;
  };

  /**
   * Public helper for interceptors: determine if a URL should trigger a toast
   */
  const shouldToastForUrl = (url) => {
      const path = normalizePath(url || '');
      return TOAST_PATTERNS.some((pt) => matchPattern(pt, path));
  };

  /**
   * Create Axios Instance, setup for any request
   */
  const instance = axios.create({
      baseURL: API,
      headers: {
        'Content-Type': 'application/json',
        ...(ENV !== 'production' && {
          'X-BSG-WEBMRCH-TOKEN': localStorage.getItem('qris-web-merchant-token') ?? 'unused',
        }),
      },
      responseType: 'json',
      responseEncoding: 'utf-8',
      withCredentials: ENV === 'production',
      /** Must be synchronous and return boolean */
      validateStatus: (status) => {
          return status >= 200 && status < 300;
      }
  });


  /**
   * Intercepts Response Code to force session be removed and redirected to /login
   * when the received code is either 401 or 403
   */
  instance.interceptors.response.use(
    (response) => {
      // const msg = response?.data?.message || 'Success';

      const shouldToast = shouldToastForUrl(response?.config?.url);
      if (shouldToast) {
        toast.success('Permintaan Berhasil');
      }

      return response;
    },
    async (error) => {
      const status = error?.response?.status;
      // const msg = error?.response?.data?.message || error.response.data.errors || 'Terjadi kesalahan';

      if (status === 401 || status === 403) {
        AuthService.removeSession();
      }

      const shouldToast = shouldToastForUrl(error?.config?.url);
      if (shouldToast) {
        toast.error('Proses Gagal');
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export default axiosInstance;
