import axios from 'axios';
import { toast } from 'sonner';
import moment from 'moment';
import { API_URL, APP_ENV } from '@/config/runtime';

const API = API_URL + '/api/v1/mrchadmin';
const ENV = APP_ENV;

// Helper to create headers object conditionally
const getApiHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (ENV !== 'production') {
    headers['X-BSG-WEBMRCH-TOKEN'] = localStorage.getItem('qris-web-merchant-token') || 'unused';
  }

  return headers;
};

const AuthService = {
  async login(formData) {
    try {
      const response = await axios.post(API + '/login', formData, {
        withCredentials: ENV === 'production' // Required for cross-origin cookies
      });
      const data = response.data.data;

      if (ENV !== 'production') {
        const token = response.headers['x-bsg-webmrch-token'];
        if (!token) {
          // In development, we expect a token. Fail fast if it's missing.
          throw new Error('Development login response did not include the required auth token.');
        }
        localStorage.setItem('qris-web-merchant-token', token);
      }

      localStorage.setItem('qris-web-merchant-data', JSON.stringify(data));
      toast.success('Selamat Datang, ' + data.kd_user);
      return data;
    } catch (error) {
      const msg = error.response?.data?.error_msg || error.message || 'Login Gagal';
      toast.error(msg);
      throw new Error(msg); // Re-throw to allow UI to handle login failure
    }
  },

  async confirmReset(formData) {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      const response = await axios({
        url: API + '/user/reset',
        headers: getApiHeaders(),
        responseType: 'json',
        responseEncoding: 'utf-8',
        withCredentials: ENV === 'production',
        method: 'POST',
        data: {
          kdUser: data.kd_user,
          new_password: formData.new_password,
          confirm_new_password: formData.confirm_new_password
        }
      });
      toast.success(response?.data?.message || 'Reset password Berhasil');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error_msg || "Something's Wrong";
      toast.error(msg);
      throw new Error(msg);
    }
  },

  async confirmPassword(password) {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      const response = await axios({
        url: API + '/user/confirm',
        headers: getApiHeaders(),
        responseType: 'json',
        responseEncoding: 'utf-8',
        withCredentials: ENV === 'production',
        validateStatus: (code) => code === 200,
        method: 'POST',
        data: {
          kdUser: data.kd_user,
          confirm: password
        }
      });
      toast.success(response?.data?.message || 'Konfirmasi Password Berhasil');
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        AuthService.removeSession();
      }
      const errMsg = error?.response?.data?.error_msg || error?.message || "Something's Wrong";
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  },

  async logout() {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      await axios({
        url: API + '/user/logout',
        headers: getApiHeaders(),
        responseType: 'json',
        responseEncoding: 'utf-8',
        withCredentials: ENV === 'production',
        method: 'POST',
        validateStatus: (code) => [200, 401, 403].includes(code),
        data: {
          kdUser: data.kd_user
        }
      });
    } finally {
      this.removeSession();
    }
  },

  isSessionValid() {
    const sessionData = localStorage.getItem('qris-web-merchant-data');
    if (!sessionData) {
      return false;
    }

    const expire_in = JSON.parse(sessionData).expire_in;
    if (moment().isSameOrAfter(moment.unix(expire_in))) {
      this.removeSession();
      return false;
    }

    return true;
  },

  retrieveSession() {
    const sessionData = localStorage.getItem('qris-web-merchant-data');
    return sessionData ? JSON.parse(sessionData) : null;
  },

  removeSession() {
    localStorage.removeItem('qris-web-merchant-data');
    if (ENV !== 'production') {
      localStorage.removeItem('qris-web-merchant-token');
    }
  }
};

export default AuthService;
