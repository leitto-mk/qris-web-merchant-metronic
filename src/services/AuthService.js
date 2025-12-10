import axios from 'axios';
import { toast } from 'sonner';
import moment from 'moment';
import { API_URL, APP_ENV } from '@/config/runtime';

const API = API_URL + '/api/v1/mrchadmin';
const ENV = APP_ENV;

const AuthService = {
  async login(formData) {
    try {
      const [token, data] = await axios.post(API + '/login', formData).then((response) => [response.headers['x-bsg-webmrch-token'], response.data.data]);

      localStorage.setItem('qris-web-merchant-token', token);
      localStorage.setItem('qris-web-merchant-data', JSON.stringify(data));

      toast.success('Selamat Datang, ' + data.kd_user);

      return data;
    } catch (error) {
      const msg = error.response?.data?.error_msg || 'Login Gagal';
      toast.error(msg);
    }
  },
  async confirmReset(formData) {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      return await axios({
        url: API + '/user/reset',
        headers: {
          'Content-Type': 'application/json',
          'X-BSG-WEBMRCH-TOKEN': localStorage.getItem('qris-web-merchant-token') || 'unused'
        },
        responseType: 'json',
        responseEncoding: 'utf-8',
        withCredentials: ENV === 'production',
        method: 'POST',
        data: {
          kdUser: data.kd_user,
          new_password: formData.new_password,
          confirm_new_password: formData.confirm_new_password
        }
      }).then((response) => {
        toast.success(response?.data?.message || 'Reset password Berhasil');
        return response.data;
      });
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
        headers: {
          'Content-Type': 'application/json',
          'X-BSG-WEBMRCH-TOKEN': localStorage.getItem('qris-web-merchant-token') || 'unused'
        },
        responseType: 'json',
        responseEncoding: 'utf-8',
        withCredentials: ENV === 'production',
        // make validateStatus synchronous and let axios reject for non-200
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
    }
  },
  async logout() {
    try {
      const data = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
      await axios({
        url: API + '/user/logout',
        headers: {
          'Content-Type': 'application/json',
          'X-BSG-WEBMRCH-TOKEN': localStorage.getItem('qris-web-merchant-token') || 'unused'
        },
        responseType: 'json',
        responseEncoding: 'utf-8',
        withCredentials: ENV === 'production',
        method: 'POST',
        validateStatus: (code) => {
          switch (code) {
            case 200:
            case 401:
            case 403:
              return true;
            default:
              return false;
          }
        },
        data: {
          kdUser: data.kd_user
        }
      });
    } finally {
      this.removeSession();
    }
  },
  isSessionValid() {
    if (!localStorage.getItem('qris-web-merchant-data')) {
      return false;
    }

    let expire_in = JSON.parse(localStorage.getItem('qris-web-merchant-data')).expire_in;
    if (moment().isSameOrAfter(moment.unix(expire_in))) {
      this.removeSession();
      return false;
    }

    return true;
  },
  retrieveSession() {
    return JSON.parse(localStorage.getItem('qris-web-merchant-data'));
  },
  removeSession() {
    localStorage.removeItem('qris-web-merchant-token');
    localStorage.removeItem('qris-web-merchant-data');
  }
};

export default AuthService;
