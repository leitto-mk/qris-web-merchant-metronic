import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';

// Public assets (placed under /public). Use absolute paths so they work in a popup window, too.
const QRIS_LOGO = '/media/bsg/qris-logo-dark.png';
const BSG_LOGO = '/media/bsg/logo-master-light.png';
const BSG_ICON = '/media/bsg/icon.png';

export function TerminalQRDisplay() {
  const [payment, setPayment] = useState({
    display: false,
    currentTime: null,
    outlet: null,
    qr: null,
    nmid: null,
    amount: 0,
    expiresInMs: 0,
  });

  const [formattedTime, setFormattedTime] = useState('00:00');
  const [formattedTimeSeverity, setFormattedTimeSeverity] = useState('text-gray-800');
  const [qrSrc, setQrSrc] = useState('');
  const endTimeRef = useRef(null);
  const intervalRef = useRef(null);

  // Format currency once per amount change
  const formattedAmount = useMemo(() => {
    const v = payment?.amount || 0;
    try {
      return new Intl.NumberFormat('id-ID').format(v);
    } catch {
      return String(v);
    }
  }, [payment?.amount]);

  // Update severity when time string changes
  useEffect(() => {
    const [mm] = (formattedTime || '00:00').split(':');
    const minutes = Number(mm) || 0;
    setFormattedTimeSeverity(minutes > 0 ? 'text-gray-800' : 'text-red-500');
  }, [formattedTime]);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startNewCountdown = useCallback((expiresInMs) => {
    clearTimer();
    if (!expiresInMs || expiresInMs <= 0) {
      setFormattedTime('00:00');
      return;
    }
    endTimeRef.current = Date.now() + Number(expiresInMs);

    const tick = () => {
      const diff = Math.max(0, (endTimeRef.current ?? Date.now()) - Date.now());
      if (diff > 0) {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        setFormattedTime(`${mm}:${ss}`);
      } else {
        setPayment((prev) => ({ ...prev, display: false }));
        clearTimer();
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
  }, []);

  const handleIncoming = useCallback(
    (raw) => {
      const data = raw || {};
      setPayment({
        display: !!data.display,
        currentTime: data.currentTime ?? null,
        outlet: data.outlet ?? null,
        qr: data.qr ?? null,
        nmid: data.nmid ?? null,
        amount: Number(data.amount) || 0,
        expiresInMs: Number(data.expiresInMs) || 0,
      });
      if (data.display) {
        startNewCountdown(Number(data.expiresInMs) || 0);
      }
    },
    [startNewCountdown]
  );

  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel('bsgqr-payment');
      channel.onmessage = (event) => {
        handleIncoming(event?.data || {});
      };
    } catch (e) {
      console.error('BroadcastChannel error:', e?.message || e);
    }

    const onStorage = (e) => {
      if (e?.key !== 'bsgqr-payment-sync' || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        handleIncoming(parsed);
      } catch {
        // ignore parse errors
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearTimer();
      if (channel) {
        try {
          channel.close();
        } catch {
          /* ignore */
        }
      }
      window.removeEventListener('storage', onStorage);
    };
  }, [handleIncoming]);

  useEffect(() => {
    if (!payment.display) {
      clearTimer();
      setFormattedTime('00:00');
      setQrSrc('');
      setPayment((prev) => ({
        ...prev,
        currentTime: null,
        amount: 0,
        qr: null,
        nmid: null,
        expiresInMs: 0,
      }));
    }
  }, [payment.display]);

  useEffect(() => {
    let cancelled = false;

    const buildQrImage = async () => {
      if (!payment?.qr || !payment?.display) {
        setQrSrc('');
        return;
      }

      try {
        const nextQrSrc = await QRCode.toDataURL(payment.qr, {
          errorCorrectionLevel: 'L',
          width: 300,
          margin: 0,
        });

        if (!cancelled) {
          setQrSrc(nextQrSrc);
        }
      } catch (e) {
        if (!cancelled) {
          setQrSrc('');
        }
        console.error(e?.message || e);
      }
    };

    buildQrImage();

    return () => {
      cancelled = true;
    };
  }, [payment?.qr, payment?.display]);

  return (
    <div className="flex flex-row justify-center py-20 min-h-screen w-full bg-slate-900">
      {payment?.display ? (
        <div className="flex flex-col w-fit h-fit justify-center shadow-lg pt-5 pl-6 pb-5 border-2 border-dashed border-rose-600 bg-white rounded-3xl relative">
          {/* HEADER */}
          <div className="flex flex-col text-center">
            <h2 className="text-3xl font-extrabold text-slate-800">{payment.outlet}</h2>
            <p className="text-xl font-bold text-gray-700">{payment.currentTime}</p>
          </div>

          {/* QR IMAGE*/}
          <div className="flex flex-row gap-5 mb-5">
            <div className="text-center basis-1/12 ml-3">
              <img src={QRIS_LOGO} alt="qris-logo" />
              <div className="bg-white w-[300px]">
                {qrSrc ? <img src={qrSrc} alt="QR Code" /> : null}
              </div>
              <div className="text-md text-gray-900 mt-2">NMID: {payment.nmid}</div>
            </div>
            <div className="flex flex-col text-center justify-center basis-11/12 m-20">
              <p className="text-2xl font-bold text-gray-600">Pembayaran</p>
              <p className="text-5xl font-bold text-gray-800 mb-3">
                Rp{new Intl.NumberFormat('id-ID').format(payment?.amount || 0)}
              </p>
              <div className="flex flex-row justify-center gap-1">
                <i className="text-xl pi pi-clock text-gray-800"></i>
                <p className={`text-xl font-bold ${formattedTimeSeverity}`}>{formattedTime}</p>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex flex-row justify-center items-center">
            <div className="text-center text-sm mr-1">Powered by</div>
            <div className="flex flex-row gap-1">
              <img src={BSG_ICON} className="w-5 h-5" alt="BSG Icon" />
              <div className="text-sm">BSGMerchant</div>
            </div>
          </div>
        </div>
      ) : (
        // DEFAULT LOGO
        <div className="w-[30%] mt-[21%]">
          <img src={BSG_LOGO} alt="BSG Merchant" className="w-full h-auto object-contain" />
        </div>
      )}
    </div>
  );
}
