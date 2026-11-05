import { useCallback, useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext.jsx';
import generateTransactionHistory from '@/mocks/transactionHistoryMock.js';
import { CheckCircle2, ChevronDown, Download, Landmark, Printer } from 'lucide-react';
import moment from 'moment';
import { useTheme } from 'next-themes';
import * as Recharts from 'recharts';
import AuthService from '@/services/AuthService.js';
import axiosInstance from '@/services/AxiosInstance.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card.jsx';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart.jsx';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.jsx';

// Issuer name (uppercased, as inst_qris.name spells it) → logo file in /media/banks.
// Logos are from Wikimedia Commons; issuers without one fall back to initials.
const BANK_LOGO_FILES = {
  'BANK BCA': ['bca.svg', 3.19],
  'BANK DIGITAL BCA': ['bca-digital.svg', 6.19],
  'BANK BCA SYARIAH': ['bca-syariah.svg', 5.83],
  'BANK BRI': ['bri.svg', 1.0],
  'BRIS PAY': ['bri-syariah.svg', 4.27],
  'BANK RAYA': ['raya.svg', 1.84],
  'BANK BNI': ['bni.svg', 3.45],
  'MANDIRI PAY': ['livin.svg', 1.74],
  'MANDIRI TASPEN': ['mandiri-taspen.svg', 1.88],
  'BANK SYARIAH INDONESIA': ['bsi.svg', 3.59],
  'BANK BTN': ['btn.svg', 6.36],
  'BANK DANAMON': ['danamon.svg', 2.61],
  'BANK PERMATA': ['permata.svg', 4.05],
  'CIMB NIAGA': ['cimb.svg', 6.53],
  'OCBC NISP': ['ocbc.svg', 3.71],
  'BANK OCBC NISP': ['ocbc.svg', 3.71],
  MAYBANK: ['maybank.png', 3.46],
  'BANK PANIN': ['panin.svg', 8.06],
  'BANK PANIN DUBAY SYARIAH': ['panin-syariah.png', 5.33],
  'BANK UOB': ['uob.svg', 3.57],
  CCBI: ['ccbi.png', 9.48],
  'BANK ARTHA GRAHA INTERNASIONAL': ['artha-graha.png', 5.12],
  'BANK CAPITAL INDONESIA TBK': ['capital.png', 9.48],
  'BANK BUMI ARTA': ['bumi-arta.svg', 7.55],
  'BANK JTRUST': ['jtrust.svg', 6.51],
  'BANK MUAMALAT': ['muamalat.png', 3.56],
  'BANK SHINHAN': ['shinhan.svg', 5.93],
  'BANK SINARMAS': ['sinarmas.png', 4.2],
  'BANK GANESHA': ['ganesha.png', 10.24],
  'BANK QNB INDONESIA': ['qnb.svg', 3.43],
  'BANK WOORI SAUDARA': ['woori.png', 3.06],
  'BANK MEGA': ['mega.svg', 1.71],
  'BANK MEGA SYARIAH': ['mega-syariah.png', 1.34],
  'BANK KB BUKOPIN': ['kb-bukopin.svg', 6.84],
  'BANK KB BUKOPIN SYARIAH': ['kb-bukopin-syariah.png', 3.37],
  'BANK KEB HANA': ['hana.svg', 4.57],
  'BANK INA PERDANA': ['ina.png', 4.2],
  'BANK AMAR INDONESIA': ['amar.png', 1.96],
  'BANK BTPN SYARIAH': ['btpn-syariah.png', 1.77],
  'BANK MAYORA': ['hibank.svg', 2.0], // Bank Mayora now trades as hibank
  'BANK INDEX SELINDO': ['index.png', 5.57],
  'BANK VICTORIA': ['victoria.png', 7.31],
  'BANK ALADIN SYARIAH': ['aladin.png', 2.37],
  'BANK JAGO': ['jago.svg', 2.37],
  'BANK NEO COMMERCE': ['neo.png', 2.17],
  SEABANK: ['seabank.svg', 3.11],
  SUPERBANK: ['superbank.svg', 6.33],
  'ALLO BANK INDONESIA': ['allo.svg', 4.66],
  'KROM BANK': ['krom.png', 3.71],
  // Regional development banks
  'BANK DKI': ['dki.svg', 6.28],
  'BANK JATIM': ['jatim.svg', 2.0],
  'BPD JAMBI': ['jambi.png', 3.56],
  'BANK ACEH SYARIAH': ['aceh-syariah.png', 4.49],
  'BANK NAGARI': ['nagari.svg', 2.96],
  'BANK RIAU KEPRI': ['riau-kepri.png', 2.29],
  'BANK LAMPUNG': ['lampung.png', 3.51],
  'BANK KALSEL': ['kalsel.png', 3.29],
  'BANK KALBAR': ['kalbar.png', 4.57],
  'BANK KALTIMTARA': ['kaltimtara.png', 2.0],
  'BANK SULSELBAR': ['sulselbar.png', 1.85],
  'BANK NTT': ['ntt.png', 1.67],
  'BPD MALUKU & MALUKU UTARA': ['maluku.png', 4.02],
  'BANK PAPUA': ['papua.png', 4.88],
  'BPD SULTRA': ['sultra.png', 4.0],
  'BJB SYARIAH': ['bjb-syariah.png', 1.37],
  // E-wallets
  GOPAY: ['gopay.svg', 4.29],
  OVO: ['ovo.svg', 3.21],
  DANA: ['dana.svg', 3.5],
  SHOPEEPAY: ['shopee.svg', 0.7],
  LINKAJA: ['linkaja.svg', 1.0],
  TRUEMONEY: ['truemoney.png', 2.13],
  PAYTREN: ['paytren.png', 3.37],
  // Short names used by the mock data
  BCA: ['bca.svg', 3.19],
  BRI: ['bri.svg', 1.0],
  BNI: ['bni.svg', 3.45],
  MANDIRI: ['mandiri.svg', 3.43],
  DANAMON: ['danamon.svg', 2.61],
  PERMATA: ['permata.svg', 4.05],
};

// name → { src, ratio }, ratio being the file's width / height
const BANK_LOGOS = {
  ...Object.fromEntries(
    Object.entries(BANK_LOGO_FILES).map(([name, [file, ratio]]) => [name, { src: `/media/banks/${file}`, ratio }])
  ),
  // BSG: inst_qris has no row for NNS 93600127, so the API sends the raw code (or BANK SULUTGO if a row is added)
  '93600127': { src: '/media/bsg/icon.png', ratio: 1 },
  'BANK SULUTGO': { src: '/media/bsg/icon.png', ratio: 1 },
  BSG: { src: '/media/bsg/icon.png', ratio: 1 },
};

// Logos are sized to the same area so wide wordmarks and square marks look equally heavy,
// then shrunk to fit the 72×32 space inside the tile.
const LOGO_AREA = 1000;
const LOGO_MAX_W = 72;
const LOGO_MAX_H = 32;
const logoSize = (ratio) => {
  const h = Math.sqrt(LOGO_AREA / ratio);
  const scale = Math.min(1, LOGO_MAX_W / (h * ratio), LOGO_MAX_H / h);
  return { width: h * ratio * scale, height: h * scale };
};

const initialsOf = (name) =>
  String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// Logo if we have one and it loads; otherwise initials, or a generic bank icon when the
// name has no letters (a raw NNS like 93600123 that inst_qris couldn't resolve).
function IssuerLogo({ name }) {
  const [failed, setFailed] = useState(false);
  const logo = BANK_LOGOS[String(name).toUpperCase()];
  if (logo && !failed) {
    return (
      <img src={logo.src} alt="" style={logoSize(logo.ratio)} className="object-contain" onError={() => setFailed(true)} />
    );
  }
  if (!/[a-z]/i.test(name)) return <Landmark className="size-5" />;
  return initialsOf(name);
}

/**
 * Layout 1 Merchant Report Page Component
 *
 * @returns {React.JSX.Element}
 * @constructor
 */
export function MerchantReportPage() {
  const { theme } = useTheme();
  const { merchant } = useAppData();

  // Local UI state
  const startOfToday = () => moment().startOf('day').toDate();

  const [dateFrom, setDateFrom] = useState(() => startOfToday());
  const [dateTo, setDateTo] = useState(() => new Date());
  const [selectedPreset, setSelectedPreset] = useState('today'); // 'today' | '1d' | '7d' | '30d' | 'custom'
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
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

  const [collapsed, setCollapsed] = useState({ outlet: false, issuer: false });
  const toggleCollapse = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const collapseButton = (key) => (
    <CardToolbar>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        // no onClick: the click bubbles to the card header, which does the toggle
        aria-expanded={!collapsed[key]}
        aria-label={collapsed[key] ? 'Expand' : 'Collapse'}
      >
        <ChevronDown className={`size-4 transition-transform ${collapsed[key] ? '' : 'rotate-180'}`} />
      </Button>
    </CardToolbar>
  );

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const handlePrintReceipt = (tx) => {
    setSelectedTx(tx);
    setReceiptModalOpen(true);
  };

  // Helpers
  const formatDateLocal = (d) => {
    const m = moment(d);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
  };

  const isRangeExceedingOneMonth = (from, to) => {
    if (!from || !to) return false;
    return moment(to).isAfter(moment(from).add(30, 'days'));
  };

  const handleCustomDateChange = (field, value) => {
    const nextDate = value ? moment(value).toDate() : null;
    if (!nextDate || Number.isNaN(nextDate.getTime())) {
      return;
    }

    setError('');
    setSelectedPreset('custom');

    if (field === 'from') {
      setDateFrom(nextDate);
      return;
    }

    setDateTo(nextDate);
  };

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

  // Quick range presets (relative to now, local time)
  const getRange = (key) => {
  const endOfToday = moment().endOf('day').toDate();

  if (key === 'today')
    return {
      from: startOfToday(),
      to: endOfToday
    };
  if (key === '1d') {
    return {
      from: moment().subtract(1, 'day').startOf('day').toDate(),
      to: moment().subtract(1, 'day').endOf('day').toDate(),
    };
  }
  if (key === '7d')
    return {
      from: moment().subtract(6, 'days').startOf('day').toDate(),
      to: endOfToday
    };

if (key === '30d')
  return {
    from: moment().subtract(29, 'days').startOf('day').toDate(),
    to: endOfToday
  };

  return { from: dateFrom, to: dateTo };
};
  const applyPreset = (key) => {
    const { from, to } = getRange(key);
    setSelectedPreset(key);
    setError('');
    setDateFrom(from);
    setDateTo(to);
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

  const uniqueOutlets = useMemo(() => {
    if (!history.length) return [];
    const outlets = new Set(history.map(item => item.outlet).filter(Boolean));
    return ['All', ...Array.from(outlets)];
  }, [history]);

  const uniqueTerminals = useMemo(() => {
    if (!history.length) return [];
    const terminals = new Set(history.map(item => item.terminal).filter(Boolean));
    return ['All', ...Array.from(terminals)];
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!history.length) return [];
    return history
      .slice()
      .sort((a, b) => new Date(b.timestamprq) - new Date(a.timestamprq))
      .filter((item) => {
        // Date filter
        // match against the same text the table shows
        if (filters.timestamprq && !moment(item.timestamprq).format('DD MMM YYYY HH:mm:ss').toLowerCase().includes(filters.timestamprq.toLowerCase())) {
          return false;
        }

        // Amount filter
        const amountValue = parseFloat(filters.amount.value);
        if (!isNaN(amountValue)) {
          const itemAmount = Number(item.amount);
          if (filters.amount.operator === 'gte' && itemAmount < amountValue) {
            return false;
          }
          if (filters.amount.operator === 'lte' && itemAmount > amountValue) {
            return false;
          }
          if (filters.amount.operator === 'gt' && itemAmount <= amountValue) {
            return false;
          }
          if (filters.amount.operator === 'lt' && itemAmount >= amountValue) {
            return false;
          }
          if (filters.amount.operator === 'eq' && itemAmount !== amountValue) {
            return false;
          }
        }

        // Select filters
        if (filters.issuer && filters.issuer !== 'All' && item.issuer !== filters.issuer) {
          return false;
        }
        if (filters.outlet && filters.outlet !== 'All' && item.outlet !== filters.outlet) {
          return false;
        }
        if (filters.terminal && filters.terminal !== 'All' && item.terminal !== filters.terminal) {
          return false;
        }

        // Text filters
        if (filters.rrn && !String(item.rrn || '').toLowerCase().includes(filters.rrn.toLowerCase())) {
          return false;
        }
        if (filters.fromname && !String(item.fromname || '').toLowerCase().includes(filters.fromname.toLowerCase())) {
          return false;
        }
        if (filters.fromacc && !String(item.fromacc || '').toLowerCase().includes(filters.fromacc.toLowerCase())) {
          return false;
        }
        if (filters.toacc && !String(item.toacc || '').toLowerCase().includes(filters.toacc.toLowerCase())) {
          return false;
        }

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

  // Derived metrics
  const totals = useMemo(() => {
    const data = isFiltered ? filteredHistory : history;
    const totalAmount = data.reduce((prev, cur) => prev + Number(cur.amount || 0), 0);
    const count = data.length;
    const avg = count ? totalAmount / count : 0;
    // field value → { amount, count }, largest amount first
    const groupBy = (field) =>
      Object.entries(
        data.reduce((prev, cur) => {
          const key = cur[field] || '-';
          prev[key] ??= { amount: 0, count: 0 };
          prev[key].amount += Number(cur.amount || 0);
          prev[key].count += 1;
          return prev;
        }, {})
      ).sort((a, b) => b[1].amount - a[1].amount);
    return { totalAmount, count, avg, byIssuer: groupBy('issuer'), byOutlet: groupBy('outlet') };
  }, [history, filteredHistory, isFiltered]);

  // Simple daily bucket for the chart (local time)
  const chartData = useMemo(() => {
    const histories = isFiltered ? filteredHistory : history;
    const buckets = new Map();
    for (const hist of histories) {
      const localTime = moment(hist.timestamprq); // local time per spec
      if (!localTime.isValid()) continue;
      const key = localTime.format('YYYY-MM-DD');
      const prev = buckets.get(key) || 0;
      buckets.set(key, prev + Number(hist.amount || 0));
    }

    return Array.from(buckets.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [history, filteredHistory, isFiltered]);

  const isMockEnabled = () => {
    return window.APP_ENV === 'development';
  };

  const handleTransactionHistory = async () => {
    try {
      setError('');
      // basic validation
      if (dateFrom > dateTo) {
        setError('Tanggal `Dari` tidak boleh melebihi tanggal `Sampai`');
        return;
      }
      if (isRangeExceedingOneMonth(dateFrom, dateTo)) {
        setError('Range report tidak boleh melebihi rentang 1 bulan.');
        return;
      }
      setLoadingHistory(true);
      const session = AuthService.retrieveSession();
      if (!session?.kd_user) {
        throw new Error('Sesi kadaluarsa. Silakan login kembali.');
      }
      const merchantId = merchant?.XID;
      if (!merchantId) {
        throw new Error('Merchant tidak tersedia.');
      }

      const payload = {
        kdUser: session.kd_user,
        date_from: formatDateLocal(dateFrom),
        date_to: formatDateLocal(dateTo),
      };

      // Mock mode: generate 50 dummy records locally
      if (isMockEnabled()) {
        const mock = generateTransactionHistory({ count: 50, from: dateFrom, to: dateTo, merchant });
        setHistory(mock);
        return;
      }

      const { data } = await axiosInstance().post(`/history/${merchantId}/trx`, payload);
      
      // Check if the actual array is inside data.data (from the API response structure), 
      // otherwise fallback to data if the API ever returns a direct array.
      const transactionsArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

      setHistory(transactionsArray.map((tx) => ({
        ...tx,
        issuer: tx?.issuer === 'QRISAJ' ? 'OFF-US' : tx?.issuer,
      })));
    } catch (error) {
      console.error('Gagal mengambil riwayat transaksi:', error?.response?.data?.errors ?? error);
      setError('Gagal mengambil data. Coba lagi.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const exportToCsv = () => {
    if (filteredHistory.length === 0) return;

    const headers = [
      'Tanggal', 'Amount', 'Issuer', 'Outlet', 'Terminal', 'RRN', 'From Name', 'From Acc', 'To Acc'
    ];

    // Using filtered and sorted data
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
    const from = moment(dateFrom).format('YYYYMMDD');
    const to = moment(dateTo).format('YYYYMMDD');
    link.setAttribute('download', `merchant_transaction_history_${from}_${to}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTransactionHistoryMock = () => {
    try {
      setError('');
      if (dateFrom > dateTo) {
        setError('Tanggal `Dari` tidak boleh melebihi tanggal `Sampai`');
        return;
      }
      if (isRangeExceedingOneMonth(dateFrom, dateTo)) {
        setError('Range report tidak boleh melebihi rentang 1 bulan.');
        return;
      }
      setLoadingHistory(true);
      const mock = generateTransactionHistory({ count: 50, from: dateFrom, to: dateTo, merchant });
      setHistory(mock);
    } catch (e) {
      setError('Gagal membuat data dummy: ' + e.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="my-2 mx-8 flex flex-col gap-5">
      {/* Header controls */}
      <Card>
        <CardHeader className="py-3.5">
          <CardTitle>Laporan Transaksi Merchant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col 2xl:flex-row gap-3 items-start 2xl:items-end">
            {/* Preset range buttons */}
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                variant={selectedPreset === 'today' ? 'mono' : 'dashed'}
                onClick={() => applyPreset('today')}
                disabled={loadingHistory}
              >
                Hari Ini
              </Button>
              <Button
                type="button"
                variant={selectedPreset === '1d' ? 'mono' : 'dashed'}
                onClick={() => applyPreset('1d')}
                disabled={loadingHistory}
              >
                Kemarin
              </Button>
              <Button
                type="button"
                variant={selectedPreset === '7d' ? 'mono' : 'dashed'}
                onClick={() => applyPreset('7d')}
                disabled={loadingHistory}
              >
                7 Hari
              </Button>
              <Button
                type="button"
                variant={selectedPreset === '30d' ? 'mono' : 'dashed'}
                onClick={() => applyPreset('30d')}
                disabled={loadingHistory}
              >
                30 Hari
              </Button>
              <Button
                type="button"
                variant={selectedPreset === 'custom' ? 'mono' : 'dashed'}
                onClick={() => {
                  setSelectedPreset('custom');
                  setError('');
                }}
                disabled={loadingHistory}
              >
                Rentang
              </Button>

              {selectedPreset === 'custom' && (
                <>
                  <Input
                    type="date"
                    lang="en-GB"
                    className="w-auto"
                    value={formatDateLocal(dateFrom)}
                    onChange={(e) =>
                      handleCustomDateChange('from', e.target.value)
                    }
                    disabled={loadingHistory}
                  />
                  <Input
                    type="date"
                    lang="en-GB"
                    className="w-auto"
                    value={formatDateLocal(dateTo)}
                    onChange={(e) =>
                      handleCustomDateChange('to', e.target.value)
                    }
                    disabled={loadingHistory}
                  />
                </>
              )}
            </div>

            <div className="flex-1" />
            <Button
              onClick={handleTransactionHistory}
              disabled={loadingHistory}
            >
              {loadingHistory ? 'Mengambil...' : 'Ambil Report'}
            </Button>
            {isMockEnabled() && (
              <Button
                variant="dashed"
                onClick={handleTransactionHistoryMock}
                disabled={loadingHistory}
              >
                Gunakan Dummy (50)
              </Button>
            )}
          </div>

          {error ? <div className="text-red-500 text-sm">{error}</div> : null}
        </CardContent>
      </Card>
      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="accent">
          <CardHeader className="py-3.5">
            <CardTitle>Total Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {totals.count}
          </CardContent>
        </Card>
        <Card variant="accent">
          <CardHeader className="py-3.5">
            <CardTitle>Total Amount</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatIDR(totals.totalAmount)}
          </CardContent>
        </Card>
        <Card variant="accent">
          <CardHeader className="py-3.5">
            <CardTitle>Rata-rata</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatIDR(totals.avg)}
          </CardContent>
        </Card>
      </div>

      {/* Per-outlet and per-issuer breakdowns */}
      {[
        { key: 'outlet', title: 'Rincian per Outlet', rows: totals.byOutlet },
        { key: 'issuer', title: 'Issuer', rows: totals.byIssuer, withLogo: true },
      ].map(({ key, title, rows, withLogo }) => rows.length > 0 && (
        <Card key={key} variant="accent">
          <CardHeader className="py-3.5 cursor-pointer select-none" onClick={() => toggleCollapse(key)}>
            <CardTitle>{title}</CardTitle>
            {collapseButton(key)}
          </CardHeader>
          {!collapsed[key] && (
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map(([name, { amount, count }]) => {
              const pct = totals.totalAmount ? (amount / totals.totalAmount) * 100 : 0;
              return (
                <div key={name} className="rounded-lg border p-4 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {withLogo && (
                      // white backing keeps multi-colour logos readable in dark mode
                      <span className="flex shrink-0 items-center justify-center h-10 w-20 rounded-md border bg-white p-0.5 text-xs font-bold text-slate-700">
                        <IssuerLogo name={name} />
                      </span>
                    )}
                    <span className="text-sm font-medium uppercase truncate" title={name}>
                      {name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold">{formatIDR(amount)}</span>
                    <Badge variant="secondary">{count} trx</Badge>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* py-1 widens the hover target around the thin bar */}
                      <div className="py-1 -my-1 cursor-default">
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{name}: {pct.toFixed(1)}%</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-xs text-muted-foreground">
                    {pct.toFixed(1)}% dari total
                  </div>
                </div>
              );
            })}
          </CardContent>
          )}
        </Card>
      ))}

      {/* Chart */}
      {history.length > 1 && selectedPreset !== 'today' && (
        <Card>
          <CardHeader className="py-3.5">
            <CardTitle>Tren Amount per Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ amount: { label: 'Amount', color: '#22c55e' } }}
              className="w-full h-56 md:h-64 xl:h-72"
            >
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.AreaChart
                  data={chartData}
                  margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                >
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Recharts.YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat('id-ID').format(Number(value || 0))
                    }
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Recharts.Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#22c55e"
                    fill="#22c55e33"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </Recharts.AreaChart>
              </Recharts.ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3.5 flex flex-row items-center justify-between">
          <CardTitle>Daftar Transaksi</CardTitle>
          <Button
            className={'bg-orange-400 hover:bg-orange-600 text-white'}
            onClick={exportToCsv}
            variant="outline"
            size="sm"
            disabled={loadingHistory || filteredHistory.length === 0}
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada data. Silakan pilih preset rentang tanggal lalu klik
              Ambil Report.
            </div>
          ) : (
            <>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-dashed">
                    <th className="py-2 pr-4">Tanggal</th>
                    <th className="py-2 pr-4">From Name</th>
                    <th className="py-2 pr-4">Issuer</th>
                    <th className="py-2 pr-4">Outlet</th>
                    <th className="py-2 pr-4">Terminal</th>
                    <th className="py-2 pr-4">RRN</th>
                    <th className="py-2 pr-4">From Acc</th>
                    <th className="py-2 pr-4">To Acc</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4 text-center">Action</th>
                  </tr>
                  <tr className="text-left">
                    <td className="py-2 pr-4">
                      <Input
                        placeholder="Filter..."
                        className="h-8"
                        value={filters.timestamprq}
                        onChange={(e) =>
                          handleFilterChange('timestamprq', e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <Input
                        placeholder="Filter..."
                        className="h-8"
                        value={filters.fromname}
                        onChange={(e) =>
                          handleFilterChange('fromname', e.target.value)
                        }
                      />
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
                      <select
                        className="h-8 border border-input bg-background rounded-md px-2 w-full"
                        value={filters.outlet}
                        onChange={(e) =>
                          handleFilterChange('outlet', e.target.value)
                        }
                      >
                        {uniqueOutlets.map((outlet) => (
                          <option key={outlet} value={outlet}>
                            {outlet}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        className="h-8 border border-input bg-background rounded-md px-2 w-full"
                        value={filters.terminal}
                        onChange={(e) =>
                          handleFilterChange('terminal', e.target.value)
                        }
                      >
                        {uniqueTerminals.map((t) => (
                          <option key={t} value={t}>
                            {t}
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
                        value={filters.fromacc}
                        onChange={(e) =>
                          handleFilterChange('fromacc', e.target.value)
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
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1">
                        <select
                          className="h-8 border border-input bg-background rounded-md px-2 text-xs"
                          value={filters.amount.operator}
                          onChange={(e) =>
                            handleAmountFilterChange('operator', e.target.value)
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
                            handleAmountFilterChange('value', e.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-4"></td>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-dashed last:border-0"
                    >
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {moment(row.timestamprq).format('DD MMM YYYY')}{' '}
                        <span className="text-muted-foreground">
                          {moment(row.timestamprq).format('HH:mm:ss')}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {row.fromname?.toUpperCase() ?? 'N/A'}
                      </td>
                      <td className="py-2 pr-4">{row.issuer?.toUpperCase()}</td>
                      <td className="py-2 pr-4">{row.outlet}</td>
                      <td className="py-2 pr-4">{row.terminal}</td>
                      <td className="py-2 pr-4 font-mono">{row.rrn}</td>
                      <td className="py-2 pr-4 font-mono">
                        {maskAcc(row.fromacc)}
                      </td>
                      <td className="py-2 pr-4 font-mono">
                        {maskAcc(row.toacc)}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono whitespace-nowrap">
                        {formatIDR(row.amount)}
                      </td>
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
                    </tr>
                  ))}
                </tbody>
                {isFiltered && (
                  <tfoot>
                    <tr className="border-t border-dashed">
                      <td className="py-2 pr-4 font-bold">Total Filtered</td>
                      <td
                        colSpan="7"
                        className="py-2 pr-4 text-right font-bold"
                      >
                        {filteredTotals.count} records
                      </td>
                      <td className="py-2 pr-4 text-right font-mono font-bold whitespace-nowrap">
                        {formatIDR(filteredTotals.totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {filteredHistory.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Tidak ada data yang cocok dengan filter.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
