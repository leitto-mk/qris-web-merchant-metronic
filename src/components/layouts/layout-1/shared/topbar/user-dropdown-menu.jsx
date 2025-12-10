import { useEffect, useMemo, useState } from 'react';
import {
  BetweenHorizontalStart,
  Coffee,
  CreditCard,
  FileText,
  Globe,
  IdCard,
  LoaderCircleIcon,
  LockIcon,
  Moon,
  RotateCcw,
  Settings,
  Shield,
  SquareCode,
  UserCircle,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link, useNavigate } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import AuthService from '@/services/AuthService.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import axiosInstance from '@/services/AxiosInstance.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { useAppData } from '@/context/AppDataContext.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


const I18N_LANGUAGES = [
  {
    label: 'Indonesia',
    code: 'id',
    direction: 'ltr',
    flag: toAbsoluteUrl('/media/flags/indonesia.svg'),
  },
  {
    label: 'English',
    code: 'en',
    direction: 'ltr',
    flag: toAbsoluteUrl('/media/flags/united-states.svg'),
  },
];

export function UserDropdownMenu({ trigger }) {
  const navigate = useNavigate();
  const { outlets } = useAppData();
  // const currentLanguage = I18N_LANGUAGES[0];
  const { theme, setTheme } = useTheme();
  const session = JSON.parse(localStorage.getItem('qris-web-merchant-data'));
  // Separate loading states so logout and reset don't share the same flag
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const shouldShowSelect = useMemo(() => Array.isArray(outlets) && outlets.length > 1, [outlets]);

  // Build a unique (case-insensitive) list of valid outlet emails.
  // - Trim whitespace
  // - Treat different cases of the same email as duplicates
  // - Preserve the first-seen original trimmed casing for display/submission
  const outletEmails = useMemo(() => {
    const list = Array.isArray(outlets) ? outlets : (outlets ? [outlets] : []);
    const seen = new Set();
    const uniques = [];
    for (const o of list) {
      const raw = typeof o?.email === 'string' ? o.email : '';
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      uniques.push(trimmed);
    }
    return uniques;
  }, [outlets]);
  const [selectedEmail, setSelectedEmail] = useState('');



  useEffect(() => {
    if (confirmResetOpen) {
      setSelectedEmail((prev) => prev || outletEmails[0] || '');
    }
  }, [confirmResetOpen, outletEmails]);

  const handleThemeToggle = (checked) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await AuthService.logout();
    } finally {
      setLogoutLoading(false);
      navigate('/login', { replace: true });
    }
  };

  const handleResetPassword = async () => {
    try {
      setResetLoading(true);
      await axiosInstance().post('/merchant/reset/password', {
        kdUser: AuthService.retrieveSession().kd_user,
        email: selectedEmail || undefined,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <Link
                to="#"
                className="text-sm text-mono hover:text-primary font-semibold"
              >
                {session.kd_user}
              </Link>
            </div>
          </div>
          <Badge variant="success" appearance="light" size="sm">
            {' '}
            {session.access_type}{' '}
          </Badge>
        </div>

        <DropdownMenuSeparator />

        {/*/!* Menu Items *!/*/}
        {/*<DropdownMenuItem asChild>*/}
        {/*  <Link to="#" className="flex items-center gap-2">*/}
        {/*    <IdCard />*/}
        {/*    Public Profile*/}
        {/*  </Link>*/}
        {/*</DropdownMenuItem>*/}
        {/*<DropdownMenuItem asChild>*/}
        {/*  <Link to="#" className="flex items-center gap-2">*/}
        {/*    <UserCircle />*/}
        {/*    My Profile*/}
        {/*  </Link>*/}
        {/*</DropdownMenuItem>*/}

        {/*/!* My Account Submenu *!/*/}
        {/*<DropdownMenuSub>*/}
        {/*  <DropdownMenuSubTrigger className="flex items-center gap-2">*/}
        {/*    <Settings />*/}
        {/*    My Account*/}
        {/*  </DropdownMenuSubTrigger>*/}
        {/*  <DropdownMenuSubContent className="w-48">*/}
        {/*    <DropdownMenuItem asChild>*/}
        {/*      <Link to="#" className="flex items-center gap-2">*/}
        {/*        <Coffee />*/}
        {/*        Get Started*/}
        {/*      </Link>*/}
        {/*    </DropdownMenuItem>*/}
        {/*    <DropdownMenuItem asChild>*/}
        {/*      <Link to="#" className="flex items-center gap-2">*/}
        {/*        <FileText />*/}
        {/*        My Profile*/}
        {/*      </Link>*/}
        {/*    </DropdownMenuItem>*/}
        {/*    <DropdownMenuItem asChild>*/}
        {/*      <Link to="#" className="flex items-center gap-2">*/}
        {/*        <CreditCard />*/}
        {/*        Billing*/}
        {/*      </Link>*/}
        {/*    </DropdownMenuItem>*/}
        {/*    <DropdownMenuItem asChild>*/}
        {/*      <Link to="#" className="flex items-center gap-2">*/}
        {/*        <Shield />*/}
        {/*        Security*/}
        {/*      </Link>*/}
        {/*    </DropdownMenuItem>*/}
        {/*    <DropdownMenuItem asChild>*/}
        {/*      <Link to="#" className="flex items-center gap-2">*/}
        {/*        <Users />*/}
        {/*        Members & Roles*/}
        {/*      </Link>*/}
        {/*    </DropdownMenuItem>*/}
        {/*    <DropdownMenuItem asChild>*/}
        {/*      <Link to="#" className="flex items-center gap-2">*/}
        {/*        <BetweenHorizontalStart />*/}
        {/*        Integrations*/}
        {/*      </Link>*/}
        {/*    </DropdownMenuItem>*/}
        {/*  </DropdownMenuSubContent>*/}
        {/*</DropdownMenuSub>*/}

        {/*<DropdownMenuItem asChild>*/}
        {/*  <Link*/}
        {/*    to="https://devs.keenthemes.com"*/}
        {/*    className="flex items-center gap-2"*/}
        {/*  >*/}
        {/*    <SquareCode />*/}
        {/*    Dev Forum*/}
        {/*  </Link>*/}
        {/*</DropdownMenuItem>*/}

        {/*/!* Language Submenu with Radio Group *!/*/}
        {/*<DropdownMenuSub>*/}
        {/*  <DropdownMenuSubTrigger className="flex items-center gap-2 [&_[data-slot=dropdown-menu-sub-trigger-indicator]]:hidden hover:[&_[data-slot=badge]]:border-input data-[state=open]:[&_[data-slot=badge]]:border-input">*/}
        {/*    <Globe />*/}
        {/*    <span className="flex items-center justify-between gap-2 grow relative">*/}
        {/*      Language*/}
        {/*      <Badge*/}
        {/*        variant="outline"*/}
        {/*        className="absolute end-0 top-1/2 -translate-y-1/2"*/}
        {/*      >*/}
        {/*        {currentLanguage.label}*/}
        {/*        <img*/}
        {/*          src={currentLanguage.flag}*/}
        {/*          className="w-3.5 h-3.5 rounded-full"*/}
        {/*          alt={currentLanguage.label}*/}
        {/*        />*/}
        {/*      </Badge>*/}
        {/*    </span>*/}
        {/*  </DropdownMenuSubTrigger>*/}
        {/*  <DropdownMenuSubContent className="w-48">*/}
        {/*    <DropdownMenuRadioGroup value={currentLanguage.code}>*/}
        {/*      {I18N_LANGUAGES.map((item) => (*/}
        {/*        <DropdownMenuRadioItem*/}
        {/*          key={item.code}*/}
        {/*          value={item.code}*/}
        {/*          className="flex items-center gap-2"*/}
        {/*        >*/}
        {/*          <img*/}
        {/*            src={item.flag}*/}
        {/*            className="w-4 h-4 rounded-full"*/}
        {/*            alt={item.label}*/}
        {/*          />*/}

        {/*          <span>{item.label}</span>*/}
        {/*        </DropdownMenuRadioItem>*/}
        {/*      ))}*/}
        {/*    </DropdownMenuRadioGroup>*/}
        {/*  </DropdownMenuSubContent>*/}
        {/*</DropdownMenuSub>*/}

        {/*<DropdownMenuSeparator />*/}

        {/* Footer */}
        <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon />
          <div className="flex items-center gap-2 justify-between grow">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <div className="flex items-center gap-2 hover:cursor-pointer" onClick={() => setConfirmResetOpen(true)}>
            {resetLoading ? <LoaderCircleIcon className="animate-spin size-4" /> : <LockIcon/>}
            {resetLoading ? 'Resetting...' : 'Reset Password'}
          </div>
        </DropdownMenuItem>
        <div className="p-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
          >
            {logoutLoading ? (
              <LoaderCircleIcon className="animate-spin size-4" />
            ) : null}
            {logoutLoading ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
      </DropdownMenuContent>

      {/* Confirm Reset Password Dialog */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin melakukan reset password ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Email selection from outlets */}
          {shouldShowSelect ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Pilih email tujuan</div>
              <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih email" />
                </SelectTrigger>
                <SelectContent>
                  {outletEmails.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Permintaan reset akan dikirim ke <span className="font-bold">{outletEmails[0]}</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleResetPassword();
                setConfirmResetOpen(false);
              }}
              disabled={resetLoading || (shouldShowSelect && !selectedEmail)}
            >
              {resetLoading ? 'Memproses...' : 'Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
