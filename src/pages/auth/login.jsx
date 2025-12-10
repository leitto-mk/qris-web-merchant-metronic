import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeClosed, Key, LoaderCircleIcon, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import AuthService from '@/services/AuthService';
import { Button } from '@/components/ui/button.jsx';
import { GradientBackground } from '@/components/ui/gradient-background.jsx';
import { Input, InputWrapper } from '@/components/ui/input.jsx';


export function LoginPage() {
  const navigate = useNavigate();
  const [reset, setReset] = useState(false);
  const [onShow, setOnShow] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Set custom browser tab title
  useEffect(() => {
    document.title = reset ? 'Pergantian Password | BSGMerchant' : 'Login | BSGMerchant';
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

  const handleLogin = async (values) => {
    setInvalid(false);
    setLoading(true);
    try {
      await AuthService.login({ username: values.username, password: values.password });
      navigate('/terminal/outlet');
    } catch (e) {
      setInvalid(true);
      setInvalidMessage(e?.message || 'Login failed');
    } finally {
      setLoading(false);
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
      setReset(false);
    } catch (e) {
      setInvalid(true);
      setInvalidMessage(e?.message || "Unable to reset Password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#13131a] overflow-hidden shadow-2xl flex flex-col md:flex-row">
      {/* Left Section */}
      <div className="w-full md:w-1/2 relative">
        <span className="absolute top-6 left-6 text-slate-200/90 text-4xl font-bold z-10">BSGMerchant</span>
        <div className="relative h-full">
          <div className="absolute inset-0 bg-gray-600/10"></div>
          <img src="media/images/2600x1600/bg-2.png" alt="Desert landscape" className="w-full h-screen object-cover" />
          <div className="absolute bottom-8 left-12 text-white">
            <h2 className="text-2xl md:text-3xl font-semibold text-white/45">BERINTEGRITAS</h2>
            <h2 className="text-2xl md:text-3xl font-semibold text-white/55">STANDARD KERJA TINGGI</h2>
            <h2 className="text-2xl md:text-3xl font-semibold text-white/65">GOTONG ROYONG</h2>
            <h2 className="text-2xl md:text-3xl font-semibold text-white/75">ORIENTASI PELANGGAN</h2>
          </div>
        </div>
      </div>

      {/* Right Section */}
        <div className="w-full md:w-1/2 p-6 md:p-12 from-slate-900 via-slate-600 to-slate-950" transition={{ duration: 15, ease: 'easeInOut', repeat: Infinity }} >
          <div className="mt-44">
              <div className="max-w-md mx-auto">
                {/* Login Header */}
                <h1 className="text-white text-2xl md:text-4xl font-semibold mb-2">{ !reset ? 'Selamat Datang' : 'Pergantian Password' }</h1>
                <p className="text-gray-400 mb-8">
                  { !reset ? 'Silahkan memasukan user dan password' : 'Silahkan mengganti Password dengan password yang baru' }
                </p>

                {/* Login */}
                {!reset ? (
                  <form onSubmit={form.handleSubmit(handleLogin)} className="flex flex-col gap-4">
                    <InputWrapper className="h-11 border-xl">
                      <User  />
                      <Input className="text-white font-semibold uppercase" disabled={loading} type="text" placeholder="USERNAME" {...form.register('username')} />
                    </InputWrapper>
                    <InputWrapper className="h-11 border-xl">
                      <Key />
                      <Input className="text-white font-semibold" disabled={loading} type={ onShow ? 'text' : 'password'} placeholder="PASSWORD" {...form.register('password')} />
                      <div className="hover:cursor-pointer" onClick={() => setOnShow(!onShow)}>
                        { onShow ? <EyeClosed /> : <Eye />}
                      </div>
                    </InputWrapper>
                    <Button disabled={loading} type="submit" severity="success" className="w-full transition-colors bg-lime-600 hover:bg-lime-500 text-white rounded-lg mt-2">
                      {loading ? <LoaderCircleIcon className="animate-spin size-4" /> : null}
                      {loading ? 'Logging in...' : 'Login'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={form.handleSubmit(handleReset)} className="flex flex-col gap-4">
                    <InputWrapper className="h-11 border-xl">
                      <Key />
                      <Input className="text-white font-semibold" disabled={loading} variant="lg" type="password" placeholder="PASSWORD BARU" {...form.register('new_password')} />
                      <div className="hover:cursor-pointer" onClick={() => setOnShow(!onShow)}>
                        { onShow ? <EyeClosed /> : <Eye />}
                      </div>
                    </InputWrapper>
                    <InputWrapper className="h-11 border-xl">
                      <Key />
                      <Input className="text-white font-semibold" disabled={loading} variant="lg" type="password" placeholder="KONFIRMASI PASSWORD" {...form.register('confirm_new_password')} />
                      <div className="hover:cursor-pointer" onClick={() => setOnShow(!onShow)}>
                        { onShow ? <EyeClosed /> : <Eye />}
                      </div>
                    </InputWrapper>
                    <Button disabled={loading} type="submit" severity="info" className="w-full transition-colors bg-lime-600 hover:bg-lime-500 text-white rounded-lg mt-2">
                      {loading ? <LoaderCircleIcon className="animate-spin size-4" /> : null}
                      {loading ? 'Confirming...' : 'Confirm'}
                    </Button>
                  </form>
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
