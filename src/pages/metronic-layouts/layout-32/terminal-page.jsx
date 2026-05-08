import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext.jsx';
import generateTransactionHistory from '@/mocks/transactionHistoryMock.js';
import { CheckCircle2, Download, LoaderCircleIcon, Printer, RotateCcw, X } from 'lucide-react';
import moment from 'moment';
import { useTheme } from 'next-themes';
import QRCode from 'qrcode';
import AuthService from '@/services/AuthService.js';
import axiosInstance from '@/services/AxiosInstance.js';
import ImagePrintService from '@/services/ImagePrintService.js';
import QRService from '@/services/QRService.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card.jsx';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input, InputWrapper } from '@/components/ui/input.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading, ToolbarPageTitle } from '@/components/layouts/layout-32/components/toolbar.jsx';


/**
 * Layout 32 Page Component
 *
 * @returns {React.JSX.Element}
 * @constructor
 */
export function TerminalPage() {
  const { theme } = useTheme();
  const { merchant, outlets, loading: appLoading } = useAppData();

  const [tab, setTab] = useState('outlet');
  const [timer, setTimer] = useState(null);
  const [formattedTime, setFormattedTime] = useState('');
  const [generate, setGenerate] = useState(false);
  const [payment, setPayment] = useState({
    currentTime: null,
    outlet: null,
    qr: null,
    nmid: null,
    expiresInMs: null,
    amount: 0,
    display: null,
  });
  const [paymentQrSrc, setPaymentQrSrc] = useState('');

  // Amount input state (formatted and numeric)
  const [amount, setAmount] = useState('');
  const [amountNumber, setAmountNumber] = useState(0);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const handlePrintReceipt = (tx) => {
    setSelectedTx(tx);
    setReceiptModalOpen(true);
  };

  // History states
  const startOfToday = () => moment().startOf('day').toDate();
  const [dateFrom, setDateFrom] = useState(() => startOfToday());
  const [dateTo, setDateTo] = useState(() => moment().endOf('day').toDate());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState('');
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({
    timestamprq: '',
    amount: { operator: 'eq', value: '' },
    issuer: '',
    outlet: '',
    terminal: '',
    rrn: '',
    fromname: '',
    fromacc: '',
    toacc: '',
  });

  const session = AuthService.retrieveSession();
  const outlet = Array.isArray(outlets) ? outlets[0] : outlets;

  const clearTimer = useCallback(() => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  }, [timer]);

  const broadcastPayment = useCallback((payload) => {
    try {
      const channel = new BroadcastChannel('bsgqr-payment');
      const sanitizedPayload = JSON.parse(JSON.stringify(payload));
      channel.postMessage(sanitizedPayload);
      channel.close();

      // Fallback for environments without BroadcastChannel:
      // trigger same-origin tabs via localStorage 'storage' event
      try {
        const withTs = { ...sanitizedPayload, __ts: Date.now() };
        localStorage.setItem('bsgqr-payment-sync', JSON.stringify(withTs));
      } catch (e) {
        console.error(e.message || e);
      }
    } catch (e) {
      console.error(e.message || e);
      // this.$toast?.add?.({
      //   severity: 'error',
      //   summary: 'Error',
      //   detail: 'QR Dinamis tidak bisa ditampilkan',
      //   life: 5000
      // });
    }
  }, []);

  const startNewCountDown = useCallback(
    (expiresMs) => {
      clearTimer();

      const endTime = moment().add(expiresMs ?? payment.expiresInMs, 'millisecond');

      const tick = () => {
        const diff = endTime.diff(moment());
        if (diff > 0) {
          const duration = moment.duration(diff);
          const minutes = String(duration.minutes()).padStart(2, '0');
          const seconds = String(duration.seconds()).padStart(2, '0');
          setFormattedTime(`${minutes}:${seconds}`);
        } else {
          const next = { ...payment, display: false };
          setPayment(next);
          broadcastPayment(next);
          clearTimer();
        }
      };

      tick();
      setTimer(setInterval(tick, 1000));
    },
    [payment, broadcastPayment, clearTimer]
  );

  const getQRData = useCallback(async () => {
    try {
      const response = await axiosInstance().post('/qr/create', {
        kdUser: session.kd_user,
        amount: amountNumber.toString(),
        isTip: '0',
        tipAmount: '0',
        tipPersen: '0',
      });
      return response.data;
    } catch (e) {
      console.error(e.message || e);
      setGenerate(false);
      return null;
    }
  }, [session.kd_user, amountNumber]);

  const startPayment = useCallback(async () => {
    setGenerate(true);
    const QRData = await getQRData();

    if(!QRData) return;

    const JSONData = {
      domain: 'ID.CO.BANKSULUTGO.WWW',
      domain2: 'ID.CO.QRIS.WWW',
      outletName: outlet?.namapendek,
      terminalID: outlet?.terminal?.[0]?.TerminalID,
      MID: outlet?.MID,
      NMID: outlet?.nmid,
      MPAN: outlet?.MPAN,
      MCC: outlet?.mcc,
      kriteria: outlet?.kriteria,
      currency: '360',
      country: 'ID',
      address: outlet?.kota,
      postal: outlet?.kdPost,
      billing: QRData.billing,
      amount: QRData.set_amount,
      withTip: '01',
      tipAmount: '0',
      tipPersen: '0',
    };

    const tlvData = QRService.toTLV(JSONData);
    const qrSrc = await QRCode.toDataURL(tlvData, {
      errorCorrectionLevel: 'L',
      width: 800,
      margin: 1,
    });

    const newPayment = {
      currentTime: moment().format('YYYY-MM-DD HH:mm'),
      outlet: outlet?.outlatName,
      qr: tlvData,
      nmid: outlet?.nmid,
      expiresInMs: 180000,
      amount: amountNumber,
      display: true,
    };

    setPaymentQrSrc(qrSrc);
    setPayment(newPayment);
    startNewCountDown(newPayment.expiresInMs);
    broadcastPayment(newPayment);

    setGenerate(false);
  }, [getQRData, outlet, amountNumber, startNewCountDown, broadcastPayment]);

  // Format input to Indonesian Rupiah thousands separator as user types
  const handleAmountChange = (e) => {
    const raw = e.target.value || '';
    // Keep only digits
    const digits = raw.replace(/\D/g, '');
    // Limit to max 15 digits to avoid overflow
    const limited = digits.slice(0, 15);
    if (!limited) {
      setAmount('');
      setAmountNumber(0);
      return;
    }
    const numeric = Number(limited);
    const formatted = numeric.toLocaleString('id-ID'); // e.g., 1.000.000
    setAmount(formatted);
    setAmountNumber(numeric);
  };

  // Trigger payment when pressing Enter on the amount input
  const handleAmountKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!generate) {
        startPayment();
      }
    }
  };

  // Helpers for keypad operations
  const formatIdr = (n) => (n && n > 0 ? n.toLocaleString('id-ID') : '');

  const appendDigits = (digitsStr) => {
    if (!digitsStr) return;

    // Prevent leading zeros when current value is 0 and only zeros pressed
    if (amountNumber === 0 && /^0+$/.test(digitsStr)) {
      setAmount('');
      setAmountNumber(0);
      return;
    }
    const nextStr = (String(amountNumber) + digitsStr).slice(0, 15);
    const next = Number(nextStr);
    setAmount(formatIdr(next));
    setAmountNumber(next);
  };

  const backspaceDigit = () => {
    const nextStr = String(amountNumber);
    const trimmed = nextStr.length > 1 ? nextStr.slice(0, -1) : '';
    const next = trimmed ? Number(trimmed) : 0;
    setAmount(formatIdr(next));
    setAmountNumber(next);
  };

  const clearAll = () => {
    setAmount('');
    setAmountNumber(0);
  };

  const formatIDR = useCallback(
    (n) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(Number(n || 0)),
    []
  );

  const maskAcc = (acc) => (acc ? String(acc).replace(/(\d{4})\d+(\d{4})/, '$1••••$2') : '-');

  const uniqueIssuers = useMemo(() => {
    if (!history.length) return [];
    const issuers = new Set(history.map(item => item.issuer).filter(Boolean));
    return ['All', ...Array.from(issuers)];
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!history.length) return [];
    return history
      .slice()
      .sort((a, b) => new Date(b.timestamprq) - new Date(a.timestamprq))
      .filter((item) => {
        if (filters.timestamprq && !new Date(item.timestamprq).toLocaleString('id-ID').toLowerCase().includes(filters.timestamprq.toLowerCase())) {
          return false;
        }
        const amountValue = parseFloat(filters.amount.value);
        if (!isNaN(amountValue)) {
          const itemAmount = Number(item.amount);
          if (filters.amount.operator === 'gte' && itemAmount < amountValue) return false;
          if (filters.amount.operator === 'lte' && itemAmount > amountValue) return false;
          if (filters.amount.operator === 'gt' && itemAmount <= amountValue) return false;
          if (filters.amount.operator === 'lt' && itemAmount >= amountValue) return false;
          if (filters.amount.operator === 'eq' && itemAmount !== amountValue) return false;
        }
        if (filters.issuer && filters.issuer !== 'All' && item.issuer !== filters.issuer) return false;
        if (filters.outlet && filters.outlet !== 'All' && item.outlet !== filters.outlet) return false;
        if (filters.terminal && filters.terminal !== 'All' && item.terminal !== filters.terminal) return false;
        if (filters.rrn && !String(item.rrn || '').toLowerCase().includes(filters.rrn.toLowerCase())) return false;
        if (filters.fromname && !String(item.fromname || '').toLowerCase().includes(filters.fromname.toLowerCase())) return false;
        if (filters.fromacc && !String(item.fromacc || '').toLowerCase().includes(filters.fromacc.toLowerCase())) return false;
        if (filters.toacc && !String(item.toacc || '').toLowerCase().includes(filters.toacc.toLowerCase())) return false;
        return true;
      });
  }, [history, filters]);

  const isFiltered = useMemo(() => {
    return Object.values(filters).some(val => {
      if (typeof val === 'string') return val.length > 0 && val !== 'All';
      if (typeof val === 'object' && val !== null) return val.value.length > 0;
      return false;
    });
  }, [filters]);

  const filteredTotals = useMemo(() => {
    const totalAmount = filteredHistory.reduce((prev, cur) => prev + Number(cur.amount || 0), 0);
    const count = filteredHistory.length;
    return { totalAmount, count };
  }, [filteredHistory]);

  const handleFilterChange = (columnId, value) => {
    setFilters((prev) => ({ ...prev, [columnId]: value }));
  };

  const handleAmountFilterChange = (key, value) => {
    if (key === 'value') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFilters(prev => ({
        ...prev,
        amount: { ...prev.amount, [key]: numericValue }
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        amount: { ...prev.amount, [key]: value }
      }));
    }
  };

  const handleTransactionHistory = useCallback(async () => {
    try {
      setErrorHistory('');
      setLoadingHistory(true);
      const sess = AuthService.retrieveSession();
      if (!sess?.kd_user) throw new Error('Sesi kadaluarsa.');
      const merchantId = merchant?.XID;
      if (!merchantId) throw new Error('Merchant tidak tersedia.');

      const payload = {
        kdUser: sess.kd_user,
        date_from: moment(dateFrom).format('YYYY-MM-DD'),
        date_to: moment(dateTo).format('YYYY-MM-DD'),
        terminal: outlet?.terminal?.[0]?.TerminalID ?? null
      };

      if (window.APP_ENV === 'development') {
        const mock = generateTransactionHistory({ count: 50, from: dateFrom, to: dateTo, merchant });
        setHistory(mock);
        return;
      }

      const { data } = await axiosInstance().post(`/history/${merchantId}/trx`, payload);
      const transactionsArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const mapped = transactionsArray.map((tx) => ({
        ...tx,
        issuer: tx?.issuer === 'QRISAJ' ? 'OFF-US' : tx?.issuer,
      }));
      setHistory(mapped);
    } catch (e) {
      console.error(e);
      setErrorHistory('Gagal mengambil data.');
    } finally {
      setLoadingHistory(false);
    }
  }, [merchant, dateFrom, dateTo]);

  const exportToCsv = () => {
    if (filteredHistory.length === 0) return;
    const headers = ['Tanggal', 'Amount', 'Issuer', 'Outlet', 'Terminal', 'RRN', 'From Name', 'From Acc', 'To Acc'];
    const rows = filteredHistory.map(item => [
      `"${new Date(item.timestamprq).toLocaleString('id-ID')}"`,
      item.amount,
      `"${item.issuer || ''}"`,
      `"${item.outlet || ''}"`,
      `"${item.terminal || ''}"`,
      `"${item.rrn || ''}"`,
      `"${item.fromname || ''}"`,
      `"${item.fromacc || ''}"`,
      `"${item.toacc || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `terminal_transaction_history.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (merchant && !appLoading) {
      handleTransactionHistory();
    }
  }, [merchant, appLoading, handleTransactionHistory]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [payment?.qr, payment?.display]);

  // Wait for app context data ready before rendering/using it
  if (appLoading) {
    return (
      <div className="p-6">
        <Toolbar>
          <ToolbarPageTitle>Terminal</ToolbarPageTitle>
        </Toolbar>
        <div className="space-y-4 mt-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const openCustomerDisplay = async () => {
    const popupUrl = '/terminal/qr-display';

    const buildFeatures = (screenLike) => {
      const left = screenLike?.availLeft ?? screenLike?.left ?? 0;
      const top = screenLike?.availTop ?? screenLike?.top ?? 0;
      const width = screenLike?.availWidth ?? screenLike?.width ?? window.screen.availWidth ?? 1200;
      const height = screenLike?.availHeight ?? screenLike?.height ?? window.screen.availHeight ?? 900;

      return [
        `left=${left}`,
        `top=${top}`,
        `width=${width}`,
        `height=${height}`,
        'popup=yes',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'status=no',
        'scrollbars=yes',
        'resizable=yes',
      ].join(',');
    };

    try {
      let targetScreen = window.screen;

      if ('getScreenDetails' in window) {
        const screenDetails = await window.getScreenDetails();

        if (screenDetails?.screens?.length > 1) {
          targetScreen =
            screenDetails.screens.find((screen) => !screen.isPrimary) ||
            screenDetails.screens[1];
        }
      }

      const customerWindow = window.open(
        popupUrl,
        'customer-display',
        buildFeatures(targetScreen)
      );

      if (!customerWindow) {
        console.warn('Customer display popup was blocked by the browser.');
        return;
      }

      customerWindow.focus();
      customerWindow?.postMessage({ type: 'ENTER_FULLSCREEN' }, window.location.origin);
    } catch (error) {
      console.error('Failed to detect secondary display:', error);

      const fallbackWindow = window.open(
        popupUrl,
        'customer-display',
        buildFeatures(window.screen)
      );

      fallbackWindow?.focus();
    }
  };

  const finishPayment = () => {
    const next = { ...payment, display: false };
    setPayment(next);
    broadcastPayment(next);
  };

  const QRIS_LOGO = '/media/bsg/qris-logo-dark.png';
  const hasQR = !!outlet?.qris?.qr_base64;

  const formattedTimeSeverity = (() => {
    const [mm] = (formattedTime || '00:00').split(':');
    const minutes = Number(mm) || 0;
    return minutes > 0 ? 'text-gray-800' : 'text-red-500';
  })();

  return (
    <>
      {merchant && outlet && (
        <Toolbar>
          <ToolbarHeading>
            <div className="flex items-center gap-2 uppercase">
              <ToolbarPageTitle>{merchant.MRCName}</ToolbarPageTitle>
            </div>
            <ToolbarDescription>
              <Badge
                size="md"
                appearance="light"
                variant="success"
                className="uppercase font-bold"
              >
                {session?.kd_user || 'N/A'}
              </Badge>
            </ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <Button
              variant={tab === 'outlet' ? 'mono' : 'outline'}
              onClick={() => setTab('outlet')}
            >
              Outlet
            </Button>
            <Button
              variant={tab === 'transaksi' ? 'mono' : 'outline'}
              onClick={() => setTab('transaksi')}
            >
              Transaksi
            </Button>
          </ToolbarActions>
        </Toolbar>
      )}

      {!outlet ? (
        <Skeleton
          className="rounded-lg grow h-[calc(100vh-10rem)] mt-10 mb-5 border border-dashed border-input bg-background text-subtle-stroke relative text-border"
          style={{
            backgroundImage:
              'repeating-linear-gradient(125deg, transparent, transparent 5px, currentcolor 5px, currentcolor 6px)',
          }}
        ></Skeleton>
      ) : (
        <>
          {tab === 'outlet' && (
            <div className="container">
              <div className="flex 2xl:flex-row flex-col md:flex-row gap-7 my-5">
                {/* QR IMAGE (show only when available) */}
                {hasQR && (
                  <div className="flex flex-col md:basis-2/6 gap-3">
                    <div className="group/overlay relative h-full">
                      <div className="absolute inset-0 rounded-xl bg-black/50 items-center justify-center opacity-0 transition-opacity duration-300 hidden lg:flex group-hover/overlay:opacity-100">
                        <Button
                          className="text-xs md:text-sm xl:text-base"
                          variant="outline"
                          onClick={() =>
                            ImagePrintService.base64(outlet?.qris?.qr_base64)
                          }
                        >
                          Print / Download
                        </Button>
                      </div>
                      <img
                        src={outlet?.qris?.qr_base64}
                        aria-label="QRIS Image"
                        className="w-full h-full object-contain rounded-xl"
                        alt="Qris-Image"
                      />
                    </div>

                    <Button
                      className="w-full lg:hidden"
                      variant="outline"
                      onClick={() =>
                        ImagePrintService.base64(outlet?.qris?.qr_base64)
                      }
                    >
                      Print / Download
                    </Button>
                  </div>
                )}

                {/* OUTLET INFOS */}
                <div
                  className={`flex flex-col 2xl:flex-row gap-5 ${hasQR ? 'md:basis-4/6' : 'basis-full'}`}
                >
                  {/* LEFT CARD */}
                  <Card className="inline-block w-full h-full" variant="accent">
                    <CardHeader>
                      <CardHeading>
                        <div className="font-bold uppercase">Outlet Info</div>
                      </CardHeading>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>Cabang</span>
                        <Badge>{outlet?.branchInfo?.ket ?? '-'}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>Nama Outlet</span>
                        <span className="uppercase">{outlet?.outlatName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>Tipe Usaha</span>
                        <span>
                          {outlet?.tipe_usaha === 'INDIVIDU'
                            ? 'INDIVIDU'
                            : 'BADAN USAHA'}
                        </span>
                      </div>
                      {outlet?.tipe_usaha === 'BADAN_USAHA' && (
                        <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                          <span>Institusi</span>
                          <span>{outlet?.nama_institusi || '-'}</span>
                        </div>
                      )}
                      {outlet?.tipe_usaha === 'BADAN_USAHA' &&
                        outlet?.kategori === 'PEMDA' && (
                          <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                            <span>PEMDA</span>
                            <span>{outlet?.pemda || '-'}</span>
                          </div>
                        )}
                      {outlet?.tipe_usaha === 'BADAN_USAHA' &&
                        outlet?.kategori === 'PEMDA' && (
                          <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                            <span>DINAS</span>
                            <span>{outlet?.dinas || '-'}</span>
                          </div>
                        )}
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>Kategori</span>
                        <span>{outlet?.kategori || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>Kriteria Merchant</span>
                        <Badge>{outlet?.kriteria}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>MCC</span>
                        <Badge variant="secondary">{outlet?.mcc || '-'}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>MPAN</span>
                        <span>{outlet?.MPAN || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>MID</span>
                        <span>{outlet?.MID || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                        <span>NMID</span>
                        <span>{outlet?.nmid || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {tab === 'transaksi' && (
            // Expand container width for large screens so the Transaksi tab doesn't look cramped on >1080p
            <div className="container max-w-[1600px] 2xl:max-w-[1800px] mb-10">
              <div className="flex flex-wrap lg:flex-nowrap justify-center gap-5 mt-5">
                {/* NOMINAL SUBMIT or QR PAYMENT DISPLAY */}
                <div className="card flex flex-col gap-4">
                  {!payment?.display ? (
                    <>
                      <div className="font-semibold text-xl xl:text-2xl 2xl:text-3xl">
                        Masukan Nominal
                      </div>
                      <div className="flex flex-row items-start justify-center gap-4">
                        <div className="w-96 xl:w-[28rem] 2xl:w-[32rem]">
                          <InputWrapper className="h-12 xl:h-16 2xl:h-20 border-xl">
                            <span className="font-semibold text-lg xl:text-xl 2xl:text-2xl">
                              Rp.&nbsp;&nbsp;
                            </span>
                            <Input
                              className="text-white font-semibold uppercase text-lg xl:text-xl 2xl:text-2xl"
                              variant="lg"
                              type="text"
                              inputMode="numeric"
                              disabled={generate}
                              value={amount}
                              onChange={handleAmountChange}
                              onKeyDown={handleAmountKeyDown}
                            />
                          </InputWrapper>
                          {/* Keypad */}
                          <div className="mt-4 select-none">
                            <div className="grid grid-cols-3 gap-2 xl:gap-4">
                              {[
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                              ].map((digit) => (
                                <Button
                                  size="lg"
                                  key={digit}
                                  variant="outline"
                                  disabled={generate}
                                  className="h-12 xl:text-2xl 2xl:text-3xl"
                                  onClick={() => appendDigits(digit)}
                                >
                                  {digit}
                                </Button>
                              ))}
                              <Button
                                aria-label="add zero zero"
                                variant="outline"
                                disabled={generate}
                                className="xl:h-16 2xl:h-20 xl:text-2xl 2xl:text-3xl"
                                onClick={() => appendDigits('00')}
                              >
                                00
                              </Button>
                              <Button
                                aria-label="add zero"
                                variant="outline"
                                disabled={generate}
                                className="xl:h-16 2xl:h-20 xl:text-2xl 2xl:text-3xl"
                                onClick={() => appendDigits('0')}
                              >
                                0
                              </Button>
                              <Button
                                aria-label="add triple zero"
                                variant="outline"
                                disabled={generate}
                                className="xl:h-16 2xl:h-20 xl:text-2xl 2xl:text-3xl"
                                onClick={() => appendDigits('000')}
                              >
                                000
                              </Button>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 xl:gap-4 mb-5">
                              <Button
                                className="w-full col-start-1 xl:h-16 2xl:h-20 xl:text-xl 2xl:text-2xl"
                                aria-label="backspace"
                                variant="outline"
                                size="lg"
                                disabled={generate}
                                onClick={backspaceDigit}
                              >
                                {'<<'}
                              </Button>
                              <Button
                                className="w-full col-start-3 xl:h-16 2xl:h-20 xl:text-xl 2xl:text-2xl"
                                aria-label="clear"
                                variant="outline"
                                size="lg"
                                disabled={generate}
                                onClick={clearAll}
                              >
                                <RotateCcw />
                              </Button>
                              <Button
                                className="col-span-full xl:h-16 2xl:h-20 xl:text-xl 2xl:text-2xl"
                                size="lg"
                                disabled={generate}
                                type="submit"
                                onClick={() => startPayment()}
                              >
                                {generate ? (
                                  <>
                                    <LoaderCircleIcon className="animate-spin size-4" />
                                    Processing...
                                  </>
                                ) : (
                                  'Generate'
                                )}
                              </Button>
                              <Button
                                className="col-span-full xl:h-16 2xl:h-20 xl:text-xl 2xl:text-2xl"
                                size="lg"
                                variant="outline"
                                severity="secondary"
                                onClick={() => openCustomerDisplay()}
                              >
                                Display
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* QR PAYMENT DISPLAY */}
                      <div className="flex flex-col gap-5 justify-center mb-2">
                        {/* DISPLAY */}
                        <div className="flex flex-col justify-center w-auto shadow-lg pt-5 pl-5 pb-5 border-2 border-dashed border-rose-600 bg-white rounded-3xl">
                          {/* HEADER */}
                          <div className="flex flex-col text-center">
                            <h2 className="text-3xl font-extrabold text-slate-800">
                              {payment.outlet}
                            </h2>
                            <p className="text-xl font-bold text-gray-700">
                              {payment.currentTime}
                            </p>
                          </div>

                          {/* QR IMAGE*/}
                          <div className="flex flex-row gap-5 mb-5">
                            <div className="text-center basis-1/12 ml-3">
                              <img src={QRIS_LOGO} alt="qris-logo" />
                              <div className="bg-white w-[300px]">
                                {paymentQrSrc ? (
                                  <img src={paymentQrSrc} alt="QR Code" />
                                ) : null}
                              </div>
                              <div className="text-md text-gray-900 mt-2">
                                NMID: {payment.nmid}
                              </div>
                            </div>
                            <div className="flex flex-col text-center justify-center basis-11/12 m-20">
                              <p className="text-2xl font-bold text-gray-600">
                                Pembayaran
                              </p>
                              <p className="text-5xl font-bold text-gray-800 mb-3">
                                Rp
                                {new Intl.NumberFormat('id-ID').format(
                                  payment?.amount || 0,
                                )}
                              </p>
                              <div className="flex flex-row justify-center gap-1">
                                <i className="text-xl pi pi-clock text-gray-800"></i>
                                <p
                                  className={`text-xl font-bold ${formattedTimeSeverity}`}
                                >
                                  {formattedTime}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BUTTON DISPLAY */}
                        <div className="flex flex-wrap h-14 justify-center">
                          <Button
                            className={
                              'bg-red-900 hover:bg-red-500 xl:h-16 2xl:h-20 xl:text-xl 2xl:text-2xl'
                            }
                            size="lg"
                            onClick={finishPayment}
                          >
                            <X /> Tutup Pembayaran
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* TRANSACTION TABLE */}
                <div className="flex-1 min-w-0">
                  <Card>
                    <CardHeader className="py-3.5 flex flex-row items-center justify-between">
                      <CardHeading>
                        <div className="font-bold uppercase">
                          Daftar Transaksi Hari Ini
                        </div>
                      </CardHeading>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTransactionHistory}
                          disabled={loadingHistory}
                        >
                          {loadingHistory ? 'Loading...' : 'Refresh'}
                        </Button>
                        <Button
                          className={
                            'bg-orange-400 hover:bg-orange-600 text-white'
                          }
                          onClick={exportToCsv}
                          variant="outline"
                          size="sm"
                          disabled={
                            loadingHistory || filteredHistory.length === 0
                          }
                        >
                          <Download className="size-3.5" />
                          <span>Export CSV</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {errorHistory && (
                        <div className="text-red-500 mb-2">{errorHistory}</div>
                      )}
                      {history.length === 0 && !loadingHistory ? (
                        <div className="text-sm text-muted-foreground py-10 text-center">
                          Belum ada data transaksi hari ini.
                        </div>
                      ) : (
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b border-dashed">
                              <th className="py-2 pr-4 text-center">Action</th>
                              <th className="py-2 pr-4">Tanggal</th>
                              <th className="py-2 pr-4 text-right">Amount</th>
                              <th className="py-2 pr-4">Issuer</th>
                              <th className="py-2 pr-4">RRN</th>
                              <th className="py-2 pr-4">From Name</th>
                              <th className="py-2 pr-4">From Acc</th>
                              <th className="py-2 pr-4">To Acc</th>
                            </tr>
                            <tr className="text-left">
                              <td className="py-2 pr-4"></td>
                              <td className="py-2 pr-4">
                                <Input
                                  placeholder="Filter..."
                                  className="h-8"
                                  value={filters.timestamprq}
                                  onChange={(e) =>
                                    handleFilterChange(
                                      'timestamprq',
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <div className="flex items-center gap-1">
                                  <select
                                    className="h-8 border border-input bg-background rounded-md px-2 text-xs"
                                    value={filters.amount.operator}
                                    onChange={(e) =>
                                      handleAmountFilterChange(
                                        'operator',
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="eq">=</option>
                                    <option value="gte">≥</option>
                                    <option value="lte">≤</option>
                                    <option value="gt">&gt;</option>
                                    <option value="lt">&lt;</option>
                                  </select>
                                  <Input
                                    type="text"
                                    placeholder="Value..."
                                    className="h-8"
                                    value={formatIDR(filters.amount.value)
                                      .replace('IDR', '')
                                      .trim()}
                                    onChange={(e) =>
                                      handleAmountFilterChange(
                                        'value',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                              </td>
                              <td className="py-2 pr-4">
                                <select
                                  className="h-8 border border-input bg-background rounded-md px-2 w-full"
                                  value={filters.issuer}
                                  onChange={(e) =>
                                    handleFilterChange('issuer', e.target.value)
                                  }
                                >
                                  {uniqueIssuers.map((val) => (
                                    <option key={val} value={val}>
                                      {val}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 pr-4">
                                <Input
                                  placeholder="Filter..."
                                  className="h-8"
                                  value={filters.rrn}
                                  onChange={(e) =>
                                    handleFilterChange('rrn', e.target.value)
                                  }
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <Input
                                  placeholder="Filter..."
                                  className="h-8"
                                  value={filters.fromname}
                                  onChange={(e) =>
                                    handleFilterChange(
                                      'fromname',
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <Input
                                  placeholder="Filter..."
                                  className="h-8"
                                  value={filters.fromacc}
                                  onChange={(e) =>
                                    handleFilterChange(
                                      'fromacc',
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <Input
                                  placeholder="Filter..."
                                  className="h-8"
                                  value={filters.toacc}
                                  onChange={(e) =>
                                    handleFilterChange('toacc', e.target.value)
                                  }
                                />
                              </td>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHistory.map((row, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-dashed last:border-0"
                              >
                                <td className="py-2 pr-4 text-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => handlePrintReceipt(row)}
                                      >
                                        <Printer className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Print Receipt</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </td>
                                <td className="py-2 pr-4 whitespace-nowrap">
                                  {new Date(row.timestamprq).toLocaleString(
                                    'id-ID',
                                  )}
                                </td>
                                <td className="py-2 pr-4 text-right font-mono">
                                  {formatIDR(row.amount)}
                                </td>
                                <td className="py-2 pr-4">
                                  {row.issuer.toUpperCase()}
                                </td>
                                <td className="py-2 pr-4 font-mono">
                                  {row.rrn}
                                </td>
                                <td className="py-2 pr-4">
                                  {row.fromname.toUpperCase() ?? 'N/A'}
                                </td>
                                <td className="py-2 pr-4 font-mono">
                                  {maskAcc(row.fromacc)}
                                </td>
                                <td className="py-2 pr-4 font-mono">
                                  {maskAcc(row.toacc)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {isFiltered && (
                            <tfoot>
                              <tr className="border-t border-dashed">
                                <td></td>
                                <td className="py-2 pr-4 font-bold">
                                  Total Filtered
                                </td>
                                <td className="py-2 pr-4 text-right font-mono font-bold">
                                  {formatIDR(filteredTotals.totalAmount)}
                                </td>
                                <td
                                  colSpan="7"
                                  className="py-2 pr-4 text-right font-bold"
                                >
                                  {filteredTotals.count} records
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Bukti Pembayaran</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div
              id="receipt-content"
              className="bg-white text-slate-800 font-sans relative overflow-hidden w-full"
            >
              {/* Watermark */}
              <div
                className="absolute inset-[-50%] z-0 opacity-[0.03] pointer-events-none m-10"
                style={{
                  backgroundImage: `url('/media/bsg/logo-master-dark.png')`,
                  backgroundSize: '150px',
                  backgroundRepeat: 'repeat',
                  backgroundPosition: 'center',
                  backgroundOrigin: 'content-box',
                  transform: 'rotate(-15deg)',
                }}
              />

              <div className="relative z-10 px-8 py-10 space-y-12 border-2 rounded-xl">
                {/* Header */}
                <div className="flex flex-col items-center justify-center pt-2 pb-4 border-b">
                  <div className="mb-4">
                    <img
                      src={
                        theme === 'dark'
                          ? '/media/bsg/logo-master-light.png'
                          : '/media/bsg/logo-master-dark.png'
                      }
                      alt="Logo"
                      className="h-12 w-auto receipt-logo"
                    />
                  </div>

                  <div className="bg-success/10 p-5 rounded-full mb-3">
                    <CheckCircle2 className="size-32 text-green-500" />
                  </div>

                  <h3 className="text-xl font-bold uppercase text-center">
                    {selectedTx?.outlet || merchant?.MRCName}
                  </h3>

                  <div className="mt-1">
                    <Badge
                      variant="success"
                      appearance="light"
                      className="text-[10px] font-bold px-2 py-0"
                    >
                      TRANSAKSI BERHASIL
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tanggal:</span>
                    <span className="font-medium">
                      {selectedTx
                        ? new Date(selectedTx.timestamprq).toLocaleString(
                            'id-ID',
                          )
                        : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pengirim:</span>
                    <span className="font-medium uppercase">
                      {selectedTx?.fromname || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issuer:</span>
                    <span className="font-medium">
                      {selectedTx?.issuer?.toUpperCase() || '-'}
                    </span>
                  </div>

                  <div className="flex justify-between border-t pt-3 mt-3">
                    <span className="text-muted-foreground">RRN:</span>
                    <span className="font-mono font-medium">
                      {selectedTx?.rrn || '-'}
                    </span>
                  </div>

                  <div className="flex justify-between border-t pt-4 mt-4">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-lg font-bold">
                      {formatIDR(selectedTx?.amount || 0)}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center border-t pt-4">
                  <p className="text-[10px] font-bold mt-1">Terima Kasih</p>
                </div>
              </div>
            </div>

            <style>
              {`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 0;
                  }
            
                  html,
                  body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: white !important;
                  }
            
                  body * {
                    visibility: hidden !important;
                  }
            
                  #receipt-content,
                  #receipt-content * {
                    visibility: visible !important;
                  }
            
                  /* Kill dialog constraints */
                  [role="dialog"] {
                    all: unset !important;
                    display: block !important;
                  }
            
                  #receipt-content {
                    position: fixed !important;
                    inset: 0 !important;
            
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 297mm !important;
                    max-width: none !important;
            
                    margin: 0 !important;
                    padding: 20mm !important;
            
                    border: none !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
            
                    background: white !important;
                    overflow: hidden !important;
                    transform: none !important;
            
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
            
                  .receipt-logo {
                    content: url('/media/bsg/logo-master-dark.png');
                  }
                }
              `}
            </style>
          </DialogBody>
          <DialogFooter className="sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setReceiptModalOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 size-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
