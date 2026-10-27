import axios from 'axios';
import moment from 'moment';
import { toast } from 'sonner';
import { API_URL, APP_ENV } from '@/config/runtime';
import axiosInstance from '@/services/AxiosInstance';


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
  //Doesn't use AxiosInstance
  async login(formData) {
    try {
      const response = await axios.post(API + '/login', formData, {
        withCredentials: ENV === 'production', // Required for cross-origin cookies
      });
      const data = response.data.data;

      this.storeMerchantData(response, data);

      if (data.status === 3) localStorage.removeItem('qris-web-merchant-data');

      if (data.access_type !== 'TRM' && data.status === 1) {
        toast.success('Selamat Datang, ' + data.kd_user);
      }

      return data;
    } catch (error) {
      const msg = error.response?.data?.error_msg || 'Login Gagal';
      throw new Error(msg); // Re-throw to allow UI to handle login failure
    }
  },

  //Doesn't use AxiosInstance. Returns the reset PIN expiry, or null when there's no pending reset
  async checkReset(username) {
    try {
      const response = await axios.post(API + '/login/check', { username });
      return response.data.data.expired_at;
    } catch {
      return null;
    }
  },

  async confirmReset(kdUser, formData) {
    try {
      const response = await axiosInstance().post('/user/reset', {
        kdUser: kdUser,
        new_password: formData.new_password,
        confirm_new_password: formData.confirm_new_password
      });
      toast.success(response?.data?.message || 'Reset password Berhasil');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error_msg || "Reset Password Gagal";
      throw new Error(msg);
    }
  },

  async registerPublicKey(publicKey) {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      const response = await axiosInstance().post('/user/register-web-key', {
        kdUser: data.kd_user,
        public_key: publicKey
      });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error_msg || 'Gagal melakukan Verifikasi Terminal';
      throw new Error(msg);
    }
  },

  //Doesn't use AxiosInstance
  async getChallenge() {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      const response = await axios({
        url: API + '/user/challenge',
        headers: getApiHeaders(),
        responseType: 'json',
        withCredentials: ENV === 'production',
        method: 'GET',
        params: {
          kdUser: data.kd_user
        }
      });
      return response.data; // Expecting { challenge: "..." }
    } catch (error) {
      const msg = error.response?.data?.error_msg || 'Gagal mendapatkan Verifikasi Terminal';
      throw new Error(msg);
    }
  },

  //Doesn't use AxiosInstance
  async verifySignature(signature) {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      const response = await axios({
        url: API + '/user/verify-challenge',
        headers: getApiHeaders(),
        responseType: 'json',
        withCredentials: ENV === 'production',
        method: 'POST',
        data: {
          kdUser: data.kd_user,
          signature: signature
        }
      });

      this.storeMerchantData(response, data);
      toast.success('Verifikasi berhasil');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.error_msg || 'Verifikasi Terminal Tidak Sesuai';
      throw new Error(errorMsg);
    }
  },

  async confirmPassword(password) {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      const response = await axiosInstance().post('/user/confirm', {
        kdUser: data.kd_user,
        confirm: password
      });
      toast.success(response?.data?.message || 'Konfirmasi Password Berhasil');
      return response.data;
    } catch (error) {
      const errMsg = error?.response?.data?.error_msg || error?.message || "Konfirmasi Password Gagal";
      throw new Error(errMsg);
    }
  },

  async logout() {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      await axiosInstance().post('/user/logout', {
        kdUser: data.kd_user
      });
    } finally {
      this.removeSession();
    }
  },

  storeMerchantData(response, data) {
    if (ENV !== 'production') {
      const token = response.headers['x-bsg-webmrch-token'];
      if (!token) {
        // In development, we expect a token. Fail fast if it's missing.
        throw new Error('Development login response did not include the required auth token.');
      }
      localStorage.setItem('qris-web-merchant-token', token);
    }

    localStorage.setItem('qris-web-merchant-data', JSON.stringify(data));
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
    localStorage.removeItem('qris-web-merchant-signature');
    if (ENV !== 'production') {
      localStorage.removeItem('qris-web-merchant-token');
    }
  }
};

export default AuthService;
