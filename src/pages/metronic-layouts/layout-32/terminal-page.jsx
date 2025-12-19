import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/layouts/layout-32/components/toolbar.jsx';
import { useAppData } from '@/context/AppDataContext.jsx';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card.jsx';
import ImagePrintService from '@/services/ImagePrintService.js';
import { useState, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { LoaderCircleIcon, RotateCcw, X } from 'lucide-react';
import { Input, InputWrapper } from '@/components/ui/input.jsx';
import QRService from '@/services/QRService.js';
import axiosInstance from '@/services/AxiosInstance.js';
import moment from 'moment';
import AuthService from '@/services/AuthService.js';

export function Layout32Page() {
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

  // Amount input state (formatted and numeric)
  const [amount, setAmount] = useState('');
  const [amountNumber, setAmountNumber] = useState(0);
  const session = AuthService.retrieveSession();

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

  // Select a single outlet to display/work with (use the first one if multiple)
  const outlet = Array.isArray(outlets) ? outlets[0] : outlets;

  const openCustomerDisplay = () => {
    window.open('/terminal/qr-display', '_blank', 'width=1000,height=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');
  };

  const clearTimer = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };

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
    [payment, broadcastPayment]
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

    if (QRData) {
      const JSONData = {
        domain: 'ID.CO.BANKSULUTGO.WWW',
        outletName: outlet?.outlatName,
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
        withTip: '00',
        tipAmount: '0',
        tipPersen: '0',
      };

      const newPayment = {
        currentTime: moment().format('YYYY-MM-DD HH:mm'),
        outlet: outlet?.outlatName,
        qr: QRService.toTLV(JSONData),
        nmid: outlet?.nmid,
        expiresInMs: 180000,
        amount: amountNumber,
        display: true,
      };

      setPayment(newPayment);
      startNewCountDown(newPayment.expiresInMs);
      broadcastPayment(newPayment);
    }

    setGenerate(false);
  }, [getQRData, outlet, amountNumber, startNewCountDown, broadcastPayment]);

  const finishPayment = () => {
    const next = { ...payment, display: false };
    setPayment(next);
    broadcastPayment(next);
  };

  // Format input to Indonesian Rupiah thousands separator as user types
  const handleAmountChange = (e) => {
    const raw = e.target.value || '';
    // Keep only digits
    const digits = raw.replace(/[^\d]/g, '');
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
              <Badge size="md" appearance="light" variant="success" className="uppercase">
                {session?.kd_user || 'N/A'}
              </Badge>
              {outlet?.nmid}
            </ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant={tab === 'outlet' ? 'mono' : 'outline'} onClick={() => setTab('outlet')}>
              Outlet
            </Button>
            <Button variant={tab === 'transaksi' ? 'mono' : 'outline'} onClick={() => setTab('transaksi')}>
              Transaksi
            </Button>
          </ToolbarActions>
        </Toolbar>
      )}

      {!outlet ? (
        <Skeleton
          className="rounded-lg grow h-[calc(100vh-10rem)] mt-10 mb-5 border border-dashed border-input bg-background text-subtle-stroke relative text-border"
          style={{
            backgroundImage: 'repeating-linear-gradient(125deg, transparent, transparent 5px, currentcolor 5px, currentcolor 6px)',
          }}
        ></Skeleton>
      ) : (
        <>
          {tab === 'outlet' && (
            <div className="container">
              <div className="flex 2xl:flex-row flex-col md:flex-row gap-7 my-5">
                {/* QR IMAGE (show only when available) */}
                {hasQR && (
                  <div className="flex flex-col md:basis-2/6 gap-1">
                    <div className="group/overlay relative h-full">
                      <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover/overlay:opacity-100 transition-opacity duration-300">
                        <Button
                          className="text-xs md:text-sm xl:text-base"
                          variant="outline"
                          onClick={() => ImagePrintService.base64(outlet?.qris?.qr_base64)}
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
                  </div>
                )}

                {/* OUTLET INFOS */}
                <div className={`flex flex-col 2xl:flex-row gap-5 ${hasQR ? 'md:basis-4/6' : 'basis-full'}`}>
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
                        <span>{outlet?.tipe_usaha === 'INDIVIDU' ? 'INDIVIDU' : 'BADAN USAHA'}</span>
                      </div>
                      {outlet?.tipe_usaha === 'BADAN_USAHA' && (
                        <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                          <span>Institusi</span>
                          <span>{outlet?.nama_institusi || '-'}</span>
                        </div>
                      )}
                      {outlet?.tipe_usaha === 'BADAN_USAHA' && outlet?.kategori === 'PEMDA' && (
                        <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                          <span>PEMDA</span>
                          <span>{outlet?.pemda || '-'}</span>
                        </div>
                      )}
                      {outlet?.tipe_usaha === 'BADAN_USAHA' && outlet?.kategori === 'PEMDA' && (
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
            <div className="container max-w-[1600px] 2xl:max-w-[1800px]">
              <div className="flex flex-wrap justify-center gap-5 mt-5">
                {/* NOMINAL SUBMIT or QR PAYMENT DISPLAY */}
                <div className="card flex flex-col gap-4">
                  {!payment?.display ? (
                    <>
                      <div className="font-semibold text-xl xl:text-2xl 2xl:text-3xl">Masukan Nominal</div>
                      <div className="flex flex-row items-start justify-center gap-4">
                        <div className="w-96 xl:w-[28rem] 2xl:w-[32rem]">
                          <InputWrapper className="h-12 xl:h-16 2xl:h-20 border-xl">
                            <span className="font-semibold text-lg xl:text-xl 2xl:text-2xl">Rp.&nbsp;&nbsp;</span>
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
                              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
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
                            <h2 className="text-3xl font-extrabold text-slate-800">{payment.outlet}</h2>
                            <p className="text-xl font-bold text-gray-700">{payment.currentTime}</p>
                          </div>

                          {/* QR IMAGE*/}
                          <div className="flex flex-row mb-5">
                            <div className="text-center basis-1/12">
                              <img src={QRIS_LOGO} alt="qris-logo" />
                              <div className="inline-block bg-white">
                                <QRCode value={payment.qr || ''} level="H" size={200} />
                              </div>
                              <div className="text-md text-gray-900 mt-2">NMID: {payment.nmid}</div>
                            </div>
                            <div className="flex flex-col text-center justify-center basis-11/12">
                              <p className="text-xl font-bold text-gray-500">Pembayaran</p>
                              <p className="text-4xl font-bold text-gray-800 mb-3">
                                Rp. {new Intl.NumberFormat('id-ID').format(payment?.amount || 0)}
                              </p>
                              <div className="flex flex-row justify-center gap-1">
                                <i className="text-xl pi pi-clock text-gray-800"></i>
                                <p className={`text-xl font-bold ${formattedTimeSeverity}`}>{formattedTime}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BUTTON DISPLAY */}
                        <div className="flex flex-wrap h-14 justify-center">
                          <Button
                            className={'bg-red-900 hover:bg-red-500 xl:h-16 2xl:h-20 xl:text-xl 2xl:text-2xl'}
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
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
