import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeClosed, Key, LoaderCircleIcon, Monitor, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import AuthService from '@/services/AuthService';
import CryptoService from '@/services/CryptoService';
import { Button } from '@/components/ui/button.jsx';
import { Input, InputWrapper } from '@/components/ui/input.jsx';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp.jsx';


export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reset, setReset] = useState(false);
  const [onShow, setOnShow] = useState(false);
  const [userData, setUserData] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAccessTypeSelection, setShowAccessTypeSelection] = useState(false);
  // Set when the username has a pending password reset: the password field becomes the emailed 6-digit PIN
  const [pinExpiredAt, setPinExpiredAt] = useState(location.state?.expiredAt ?? null);
  const [now, setNow] = useState(Date.now());
  const pinSecondsLeft = pinExpiredAt ? Math.max(0, Math.ceil((Date.parse(pinExpiredAt) - now) / 1000)) : 0;

  useEffect(() => {
    if (!pinExpiredAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pinExpiredAt]);

  // Set the browser tab title and check for existing keys
  useEffect(() => {
    document.title = reset ? 'Pergantian Password | BSGMerchant' : 'Login | BSGMerchant';

    const checkAccessType = async () => {
      const hasKeys = await CryptoService.hasAnyKeys();
      
      if (hasKeys) {
        setShowAccessTypeSelection(true);
      }
    };

    // Coming from a self reset: go straight to the PIN form
    if (!reset && !location.state?.username) {
      checkAccessType();
    }
  }, [reset]);

  const loginSchema = z
    .object({
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required'),
    })
    .refine((data) => data.username.length > 0 && data.password.length > 0, {
      message: 'Username and password are required',
      path: ['username', 'password'],
    });

  const resetSchema = z
    .object({
      new_password: z
        .string()
        .min(8, 'Password minimal diisi 8 karakter')
        .regex(/[A-Z]/, 'Password harus mengandung 1 huruf besar')
        .regex(/[a-z]/, 'Password harus mengandung 1 huruf kecil')
        .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password harus mengandung 1 karakter spesial'),
      confirm_new_password: z.string().min(8, 'Konfirmasi password harus diisi'),
    })
    .refine((data) => data.new_password === data.confirm_new_password, {
      message: 'Password tidak cocok',
      path: ['confirm_new_password'], // error shown in this field
    });

  const form = useForm({
    resolver: zodResolver(reset ? resetSchema : loginSchema),
    defaultValues: {
      username: '',
      password: '',
      new_password: '',
      confirm_new_password: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (location.state?.username) form.setValue('username', location.state.username);
  }, []);

  const checkPendingReset = async (username) => {
    form.setValue('password', '');
    setPinExpiredAt(username ? await AuthService.checkReset(username) : null);
  };

  const handleLogin = async (values) => {
    setInvalid(false);
    setLoading(true);
    try {
      const storedKeys = await CryptoService.getKeys();
      const kdUser = storedKeys?.kdUser ?? values.username;

      let data;
      try {
        data = await AuthService.login({
          username: values.username,
          password: values.password,
          terminal_origin: kdUser
        });
      } catch (e) {
        if (e.message !== 'CHALLENGE_REQUIRED') throw e;

        // Password is right but the terminal is bound: only the browser holding its key may log in
        if (storedKeys?.kdUser?.toLowerCase() !== values.username.toLowerCase()) {
          throw new Error('User Terminal tidak terdaftar untuk Device ini.');
        }

        await handleTerminalLogin();
        return;
      }

      if(data.status === 3) {
        setPinExpiredAt(null);
        setUserData(data);
        setReset(true);
        return;
      }

      if(data.access_type === 'TRM' && data.web_status === 'INACTIVE') {
        if (!(await performTerminalRegistration(data.kd_user, data.access_type, true, values.password))) return;
      }

      navigate('/');
    } catch (e) {
      setInvalid(true);
      setInvalidMessage(e?.message || 'Login failed');
      setShowAccessTypeSelection(false);
      AuthService.removeSession();
      if (pinExpiredAt) form.setValue('password', '');
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const handleReset = async (values) => {
    setInvalid(false);
    setLoading(true);
    try {
      const kdUser = userData?.kd_user;
      const access_type = userData?.access_type;

      await AuthService.confirmReset(kdUser, {
        new_password: values.new_password,
        confirm_new_password: values.confirm_new_password,
      });

      if(access_type === 'TRM') {
        // login() drops the session data of a status 3 user, but key registration reads kd_user from it
        localStorage.setItem('qris-web-merchant-data', JSON.stringify(userData));

        if (!(await performTerminalRegistration(kdUser, access_type, true, values.new_password))) return;
        navigate('/terminal/outlet');
        return;
      }

      const currentUsername = form.getValues('username');

      form.reset({
        username: currentUsername,
        password: '',
        new_password: '',
        confirm_new_password: '',
      });

      setReset(false);
    } catch (e) {
      setInvalid(true);
      setInvalidMessage(e?.message || 'Browser tidak terdaftar pada User ini, pastikan Browser sesuai atau silahkan melakukan request Reset Device');
      setShowAccessTypeSelection(false);
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const handleTerminalLogin = async () => {
    setInvalid(false);
    setLoading(true);
    setIsVerifying(true);
    try {
      const sessionData = AuthService.retrieveSession();
      let kdUser;

      if (sessionData) {
        kdUser = sessionData.kd_user;
      } else {
        // If session data is missing, try to find kdUser from stored keys
        const storedKeys = await CryptoService.getKeys();
        kdUser = storedKeys?.kdUser;
      }

      if (!kdUser) {
        throw new Error(
          'Sesi tidak ditemukan dan tidak ada device terdaftar. Silahkan login sebagai Admin terlebih dahulu.',
        );
      }

      let keys = await CryptoService.getKeys(kdUser);
      let privateKey = keys?.privateKey;

      if (!keys) {
        throw new Error(
          'Device tidak terdaftar. Silahkan login sebagai Admin untuk mendaftarkan device ini.',
        );
      }

      // Ensure kd_user is in local storage if it was missing but found in IndexedDB
      if (!sessionData) {
        localStorage.setItem(
          'qris-web-merchant-data',
          JSON.stringify({ kd_user: kdUser }),
        );
      }

      // 2. Get Challenge from Backend
      const { challenge } = await AuthService.getChallenge();

      // 3. Sign Challenge with Private Key
      const signature = await CryptoService.signChallenge(
        privateKey,
        challenge,
      );

      // 4. Verify Signature with Backend
      await AuthService.verifySignature(signature, challenge);

      navigate('/terminal/outlet');
    } catch (e) {
      AuthService.removeSession();
      setShowAccessTypeSelection(false);
      setInvalid(true);

      switch (e.message) {
        case 'IS_REVOKED':
        case 'INVALID_SIGNATURE':
          await CryptoService.clearKeys();
          setInvalidMessage(
            'Device Terminal ini telah di reset. Silahkan login kembali atau kontak Admin untuk pengaktifan Terminal',
          );
          break;
        case 'CHALLENGE_EXPIRED':
          setInvalidMessage('Sesi Kadaluarsa. Silahkan login kembali.');
          break;
        case 'KEY_EXPIRED':
          await CryptoService.clearKeys();
          setInvalidMessage('Masa berlaku Device Terminal telah habis. Silahkan login menggunakan password untuk mendaftarkan ulang.');
          break;
        case 'PASSWORD_RESET_REQUIRED':
          setInvalidMessage('Password telah di reset. Silahkan login menggunakan password dari email.');
          break;
        default:
          setInvalidMessage(e?.message || 'Verifikasi Terminal Gagal');
          break;
      }
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  // password: the backend only registers a key against the user's current password
  const performKeyPairFlow = async (userKd, password) => {
    const generated = await CryptoService.generateKeyPair();
    const publicKey = generated.publicKey;
    const privateKey = generated.privateKey;

    // 1. Submit Public Key to Backend
    await AuthService.registerPublicKey(publicKey, password);

    // Save to IndexedDB
    await CryptoService.saveKeys(userKd, privateKey);

    // 2. Get Challenge from Backend
    const { challenge: newChallenge } = await AuthService.getChallenge();

    // 3. Sign Challenge with Private Key
    const newSignature = await CryptoService.signChallenge(
      privateKey,
      newChallenge,
    );

    // 4. Verify Signature with Backend
    const verifyRes = await AuthService.verifySignature(newSignature, newChallenge);
    return { verifyRes, privateKey };
  };

  const performTerminalRegistration = async (kdUser, access_type, should_regenerate, password) => {
      try {
        setIsVerifying(true);

        let keys = await CryptoService.getKeys();
        let devOwner = keys?.kdUser;
        let privateKey = keys?.privateKey;

        // 1. Generate the Keys
        if (!keys || should_regenerate) {
          const { verifyRes } = await performKeyPairFlow(kdUser, password);
          if (verifyRes.error === 'CHALLENGE_EXPIRED') {
            AuthService.removeSession();
            setShowAccessTypeSelection(true);
            throw new Error('Sesi challenge kadaluarsa. Silahkan login kembali.');
          }

          if (verifyRes.error) {
            throw new Error(verifyRes.error);
          }

          return true;
        }

        if(kdUser !== devOwner) {
          throw new Error('User tidak terdaftar untuk Device ini.');
        }

        // 2. Get Challenge from Backend
        const { challenge } = await AuthService.getChallenge();

        // 3. Sign Challenge with Private Key
        const signature = await CryptoService.signChallenge(
          privateKey,
          challenge,
        );

        // 4. Verify Signature with Backend
        await AuthService.verifySignature(signature, challenge);
        return true;
      } catch (e) {
        AuthService.removeSession();
        setShowAccessTypeSelection(false);
        setInvalid(true);

        switch(e.message) {
          case 'IS_REVOKED':
          case 'INVALID_SIGNATURE':
            await CryptoService.clearKeys();
            setInvalidMessage('Device Terminal ini telah di reset. Silahkan login kembali atau kontak Admin untuk pengaktifan Terminal');
            break;
          case 'CHALLENGE_EXPIRED':
            setInvalidMessage('Sesi Kadaluarsa. Silahkan login kembali.');
            break;
          default:
            setInvalidMessage(e?.message || 'Verifikasi Terminal Gagal');
            break;
        }
        return false;
      } finally {
        setIsVerifying(false);
      }
  };

  const loginImageRandomizer = () => {
    const images = [
      'media/bsg/login1.png',
      'media/bsg/login2.png'
    ];

    //Match Milliseconds with the current Epoch Timestamp
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    const period = Math.floor(Date.now() / TWO_WEEKS_MS);
    const index = period % images.length;

    return images[index];
  }

  return (
    <div className="bg-[#13131a] flex h-screen w-full overflow-hidden">
      {/* Left Section - Decorative, hidden on small screens */}
      <div className="hidden md:block md:w-2/4 h-full overflow-hidden shrink-0">
        <img
          src={loginImageRandomizer()}
          alt="BSG Web Merchant"
          className="w-full h-full"
        />
      </div>

      {/* Right Section - Login Form, full width on small screens */}
      <div className="w-full md:w-2/4 p-6 md:p-12 from-slate-900 via-slate-600 to-slate-950 flex flex-col justify-center items-center h-full overflow-y-auto shrink-0">
        <div className="w-full max-w-md">
          <div className="md:hidden text-center mb-8">
            <span className="text-slate-200/90 text-3xl font-bold">
              BSGMerchant
            </span>
          </div>
          <div className="max-w-md mx-auto">
            {/* Login Header */}
            <h1 className="text-white text-2xl md:text-4xl font-semibold mb-2">
              {showAccessTypeSelection && !reset
                ? 'Pilih Akses'
                : !reset
                  ? 'Selamat Datang'
                  : 'Pergantian Password'}
            </h1>
            <p className="text-gray-400 mb-8">
              {showAccessTypeSelection && !reset
                ? 'Silahkan pilih tipe akses anda'
                : !reset
                  ? 'Silahkan memasukan user and password'
                  : 'Silahkan mengganti Password dengan password yang baru'}
            </p>

            {/* Access Type Selection */}
            {showAccessTypeSelection && !reset ? (
              <div className="flex flex-row gap-4">
                <Button
                  disabled={loading}
                  onClick={() => setShowAccessTypeSelection(false)}
                  className="w-full transition-colors bg-blue-600 hover:bg-blue-500 text-white rounded-lg h-12 text-lg font-semibold"
                >
                  <User className="size-5 mr-2" />
                  Login
                </Button>
                <Button
                  disabled={loading}
                  onClick={handleTerminalLogin}
                  className="w-full transition-colors bg-lime-600 hover:bg-lime-500 text-white rounded-lg h-12 text-lg font-semibold"
                >
                  {isVerifying ? (
                    <LoaderCircleIcon className="animate-spin size-4 mr-2" />
                  ) : (
                    <Monitor className="size-5 mr-2" />
                  )}
                  {isVerifying ? 'Verifying Terminal...' : 'Terminal'}
                </Button>
              </div>
            ) : (
              <>
                {/* Login */}
                {!reset ? (
                  <form
                    onSubmit={form.handleSubmit(handleLogin)}
                    className="flex flex-col gap-4"
                  >
                    <InputWrapper className="h-11 border-xl">
                      <User />
                      <Input
                        className="text-white font-semibold"
                        disabled={loading}
                        type="text"
                        placeholder="USERNAME"
                        {...form.register('username', {
                          onBlur: (e) => checkPendingReset(e.target.value.trim()),
                        })}
                      />
                    </InputWrapper>
                    {pinExpiredAt ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-gray-400 text-sm">Masukan PIN yang dikirim ke email</span>
                        <InputOTP
                          maxLength={6}
                          pattern="^[0-9]*$"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          disabled={loading || pinSecondsLeft === 0}
                          value={form.watch('password')}
                          onChange={(value) => form.setValue('password', value, { shouldValidate: true })}
                          aria-label="PIN"
                        >
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot
                                key={i}
                                index={i}
                                className="size-12 rounded-lg border text-white text-xl font-semibold"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                        <span className={pinSecondsLeft > 60 ? 'text-gray-400 text-sm' : 'text-red-500 text-sm'}>
                          {pinSecondsLeft > 0
                            ? `PIN berlaku ${String(Math.floor(pinSecondsLeft / 60)).padStart(2, '0')}:${String(pinSecondsLeft % 60).padStart(2, '0')}`
                            : 'PIN telah kadaluarsa, silahkan melakukan reset password kembali'}
                        </span>
                      </div>
                    ) : (
                    <InputWrapper className="h-11 border-xl">
                      <Key />
                      <Input
                        className="text-white font-semibold"
                        disabled={loading}
                        type={onShow ? 'text' : 'password'}
                        placeholder="PASSWORD"
                        {...form.register('password')}
                      />
                      <div
                        className="hover:cursor-pointer"
                        onClick={() => setOnShow(!onShow)}
                      >
                        {onShow ? <EyeClosed /> : <Eye />}
                      </div>
                    </InputWrapper>
                    )}
                    <Button
                      disabled={loading || (pinExpiredAt && (pinSecondsLeft === 0 || form.watch('password').length < 6))}
                      type="submit"
                      severity="success"
                      className="w-full transition-colors bg-lime-600 hover:bg-lime-500 text-white rounded-lg mt-2"
                    >
                      {loading ? (
                        <LoaderCircleIcon className="animate-spin size-4" />
                      ) : null}
                      {loading ? 'Logging in...' : 'Login'}
                    </Button>
                  </form>
                ) : (
                  <form
                    onSubmit={form.handleSubmit(handleReset)}
                    className="flex flex-col gap-4"
                  >
                    <InputWrapper className="h-11 border-xl">
                      <Key />
                      <Input
                        className="text-white font-semibold"
                        disabled={loading}
                        variant="lg"
                        type={onShow ? 'text' : 'password'}
                        placeholder="Password Baru"
                        {...form.register('new_password')}
                      />
                      <div
                        className="hover:cursor-pointer"
                        onClick={() => setOnShow(!onShow)}
                      >
                        {onShow ? <EyeClosed /> : <Eye />}
                      </div>
                    </InputWrapper>
                    {form.formState.errors.new_password && (
                      <span className="text-red-500 text-xs">
                        {form.formState.errors.new_password.message}
                      </span>
                    )}
                    <InputWrapper className="h-11 border-xl">
                      <Key />
                      <Input
                        className="text-white font-semibold"
                        disabled={loading}
                        variant="lg"
                        type={onShow ? 'text' : 'password'}
                        placeholder="Konfirmasi Password"
                        {...form.register('confirm_new_password')}
                      />
                      <div
                        className="hover:cursor-pointer"
                        onClick={() => setOnShow(!onShow)}
                      >
                        {onShow ? <EyeClosed /> : <Eye />}
                      </div>
                    </InputWrapper>
                    {form.formState.errors.confirm_new_password && (
                      <span className="text-red-500 text-xs">
                        {form.formState.errors.confirm_new_password.message}
                      </span>
                    )}
                    <Button
                      disabled={loading || !form.formState.isValid}
                      type="submit"
                      severity="info"
                      className="w-full transition-colors bg-lime-600 hover:bg-lime-500 text-white rounded-lg mt-2"
                    >
                      {loading ? (
                        <LoaderCircleIcon className="animate-spin size-4" />
                      ) : null}
                      {isVerifying
                        ? 'Verifying Security...'
                        : loading
                          ? 'Confirming...'
                          : 'Confirm'}
                    </Button>
                  </form>
                )}
              </>
            )}

            {invalid && (
              <div className="text-red-600/90 font-normal leading-snug text-center mb-9 p-5 w-full border border-slate-500 rounded-xl border-dashed flex items-center justify-center uppercase mt-8">
                {invalidMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
