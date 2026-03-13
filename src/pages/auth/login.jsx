import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeClosed, Key, LoaderCircleIcon, Monitor, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import AuthService from '@/services/AuthService';
import CryptoService from '@/services/CryptoService';
import { Button } from '@/components/ui/button.jsx';
import { Input, InputWrapper } from '@/components/ui/input.jsx';


export function LoginPage() {
  const navigate = useNavigate();
  const [reset, setReset] = useState(false);
  const [onShow, setOnShow] = useState(false);
  const [userData, setUserData] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAccessTypeSelection, setShowAccessTypeSelection] = useState(false);

  // Set the browser tab title and check for existing keys
  useEffect(() => {
    document.title = reset ? 'Pergantian Password | BSGMerchant' : 'Login | BSGMerchant';

    const checkAccessType = async () => {
      const hasKeys = await CryptoService.hasAnyKeys();
      
      if (hasKeys) {
        setShowAccessTypeSelection(true);
      }
    };

    if (!reset) {
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
      new_password: z.string().min(6, 'Password must be at least 6 characters'),
      confirm_new_password: z.string().min(6, 'Password confirmation required'),
    })
    .refine((data) => data.new_password === data.confirm_new_password, {
      message: 'Passwords do not match',
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
  });

  const performKeyPairFlow = async (userKd) => {
    const generated = await CryptoService.generateKeyPair();
    const publicKey = generated.publicKey;
    const privateKey = generated.privateKey;

    // 1. Submit Public Key to Backend
    await AuthService.registerPublicKey(publicKey);

    // Save to IndexedDB
    await CryptoService.saveKeys(userKd, privateKey, publicKey);

    // 2. Get Challenge from Backend
    const { challenge: newChallenge } = await AuthService.getChallenge();

    // 3. Sign Challenge with Private Key
    const newSignature = await CryptoService.signChallenge(
      privateKey,
      newChallenge,
    );

    // 4. Verify Signature with Backend
    const verifyRes = await AuthService.verifySignature(newSignature);
    return { verifyRes, privateKey };
  };

  const performTerminalRegistration = async (kdUser, access_type) => {
    if(access_type === 'TRM') {
      setIsVerifying(true);

      let keys = await CryptoService.getKeys(kdUser);
      let privateKey = keys?.privateKey;

      if (!keys) {
        const { verifyRes } = await performKeyPairFlow(kdUser);
        if (verifyRes.error === 'CHALLENGE_EXPIRED') {
          AuthService.removeSession();
          setShowAccessTypeSelection(true);
          throw new Error('Sesi challenge kadaluarsa. Silahkan login kembali.');
        }

        if (verifyRes.error) {
          throw new Error(verifyRes.error);
        }

        return; // Success
      }

      // 2. Get Challenge from Backend
      const { challenge } = await AuthService.getChallenge();

      // 3. Sign Challenge with Private Key
      const signature = await CryptoService.signChallenge(
        privateKey,
        challenge,
      );

      // 4. Verify Signature with Backend
      const { error } = await AuthService.verifySignature(signature);
      let verifyError;

      if (error === 'IS_REVOKED') {
        const { verifyRes } = await performKeyPairFlow(kdUser);
        verifyError = verifyRes.error;
      }

      if (error === 'CHALLENGE_EXPIRED' || (verifyError && verifyError === 'CHALLENGE_EXPIRED')) {
        AuthService.removeSession();
        setShowAccessTypeSelection(true);
        throw new Error('Sesi challenge kadaluarsa. Silahkan login kembali.');
      }

      if (error && error !== 'IS_REVOKED' && error !== 'CHALLENGE_EXPIRED') {
        throw new Error(error);
      }
      if (verifyError) {
        throw new Error(verifyError);
      }
    }
  };

  const handleLogin = async (values) => {
    setInvalid(false);
    setLoading(true);
    try {
      const data = await AuthService.login({ username: values.username.toUpperCase(), password: values.password });

      if(data.status === 3) {
        if(data.access_type === 'TRM') {
          await performTerminalRegistration(data.kd_user, data.access_type);
          navigate('/terminal/outlet');
          return;
        }

        setUserData(data);
        setReset(true);
        return;
      }

      navigate('/terminal/outlet');
    } catch (e) {
      setInvalid(true);
      setInvalidMessage(e?.message || 'Login failed');
      setShowAccessTypeSelection(false);
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const handleReset = async (values) => {
    setInvalid(false);
    setLoading(true);
    try {
      await AuthService.confirmReset({
        new_password: values.new_password,
        confirm_new_password: values.confirm_new_password,
      });

      const kdUser = userData?.kd_user;
      const access_type = userData?.access_type;

      await performTerminalRegistration(kdUser, access_type);

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
      const sessionData = localStorage.getItem('qris-web-merchant-data');
      let kdUser;
      
      if (sessionData) {
        kdUser = JSON.parse(sessionData).kd_user;
      } else {
        // If session data is missing, try to find kdUser from stored keys
        const storedKeys = await CryptoService.getAllStoredKeys();
        
        if (storedKeys && storedKeys.length > 0) {
          // Assume the first key found is the one to use if multiple exist, 
          // or just pick one since we don't have username yet.
          kdUser = storedKeys[0];
          // We should probably store a "last used kdUser" or something if we want to be robust,
          // but for now, picking the first one available in IndexedDB is a reasonable fallback.
        }
      }

      if (!kdUser) {
        throw new Error('Sesi tidak ditemukan dan tidak ada device terdaftar. Silahkan login sebagai Admin terlebih dahulu.');
      }

      let keys = await CryptoService.getKeys(kdUser);
      let privateKey = keys?.privateKey;

      if (!keys) {
        throw new Error('Device tidak terdaftar. Silahkan login sebagai Admin untuk mendaftarkan device ini.');
      }

      // Ensure kd_user is in local storage if it was missing but found in IndexedDB
      if (!sessionData) {
        localStorage.setItem('qris-web-merchant-data', JSON.stringify({ kd_user: kdUser }));
      }

      // 2. Get Challenge from Backend
      const { challenge } = await AuthService.getChallenge();

      // 3. Sign Challenge with Private Key
      const signature = await CryptoService.signChallenge(
        privateKey,
        challenge,
      );

      // 4. Verify Signature with Backend
      const { error } = await AuthService.verifySignature(signature);
      console.log(error);
      let verifyError;
      if (error === 'IS_REVOKED') {
        const { verifyRes } = await performKeyPairFlow(kdUser);
        verifyError = verifyRes.error;
      }

      if (error === 'CHALLENGE_EXPIRED' || (verifyError && verifyError === 'CHALLENGE_EXPIRED')) {
        AuthService.removeSession();
        setShowAccessTypeSelection(true);
        throw new Error('Sesi challenge kadaluarsa. Silahkan login kembali.');
      } else if (error && error !== 'IS_REVOKED') {
        throw new Error(error);
      } else if (verifyError) {
        throw new Error(verifyError);
      }

      navigate('/terminal/outlet');
    } catch (e) {
      setInvalid(true);
      setInvalidMessage(e?.message || 'Verifikasi Terminal Gagal');
      setShowAccessTypeSelection(false);
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-[#13131a] flex h-screen w-full overflow-hidden">
      {/* Left Section - Decorative, hidden on small screens */}
      <div className="hidden md:block md:w-2/4 h-full overflow-hidden shrink-0">
        <img
          src="media/bsg/login1.png"
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
                  Admin
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
                        className="text-white font-semibold uppercase"
                        disabled={loading}
                        type="text"
                        placeholder="USERNAME"
                        {...form.register('username')}
                      />
                    </InputWrapper>
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
                    <Button
                      disabled={loading}
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
                        type="password"
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
                    <InputWrapper className="h-11 border-xl">
                      <Key />
                      <Input
                        className="text-white font-semibold"
                        disabled={loading}
                        variant="lg"
                        type="password"
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
                    <Button
                      disabled={loading}
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
