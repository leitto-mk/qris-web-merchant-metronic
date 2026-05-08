import { useCallback, useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext.jsx';
import generateTransactionHistory from '@/mocks/transactionHistoryMock.js';
import { CheckCircle2, Download, Printer } from 'lucide-react';
import moment from 'moment';
import { useTheme } from 'next-themes';
import * as Recharts from 'recharts';
import AuthService from '@/services/AuthService.js';
import axiosInstance from '@/services/AxiosInstance.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart.jsx';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.jsx';


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

  const formatDateTimeInput = (d) => {
    const m = moment(d);
    return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : '';
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
        if (filters.timestamprq && !new Date(item.timestamprq).toLocaleString('id-ID').toLowerCase().includes(filters.timestamprq.toLowerCase())) {
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
    const byIssuer = data.reduce((prev, cur) => {
      const key = cur.issuer || '-';
      prev[key] = (prev[key] || 0) + 1;
      return prev;
    }, {});
    const byTerminal = data.reduce((prev, cur) => {
      const key = cur.terminal || '-';
      prev[key] = (prev[key] || 0) + 1;
      return prev;
    }, {});
    return { totalAmount, count, avg, byIssuer, byTerminal };
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

  const issuerChips = useMemo(() => Object.entries(totals.byIssuer || {}), [totals.byIssuer]);

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

      //Map Value
      transactionsArray.map((tx) => ({
        ...tx,
        issuer: tx?.issuer === 'QRISAJ' ? 'OFF-US' : tx?.issuer,
      }));

      setHistory(transactionsArray);
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
            {/* Stylish, read-only date range display */}
            <div className="flex items-center gap-3">
              <div className="rounded-md border px-3 py-2">
                <div className="text-xs text-muted-foreground">Dari</div>
                <div className="font-mono text-sm">
                  {formatDateTimeInput(dateFrom)}
                </div>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="rounded-md border px-3 py-2">
                <div className="text-xs text-muted-foreground">Sampai</div>
                <div className="font-mono text-sm">
                  {formatDateTimeInput(dateTo)}
                </div>
              </div>
            </div>

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

      {/* Issuer chips */}
      {issuerChips.length > 0 && (
        <Card variant="accent">
          <CardHeader className="py-3.5">
            <CardTitle>Perangkat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {issuerChips.map(([name, cnt]) => (
              <Badge key={name} variant="secondary">
                {name}: {cnt}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

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
                    <th className="py-2 pr-4 text-center">Action</th>
                    <th className="py-2 pr-4">Tanggal</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4">Issuer</th>
                    <th className="py-2 pr-4">Outlet</th>
                    <th className="py-2 pr-4">Terminal</th>
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
                          handleFilterChange('timestamprq', e.target.value)
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
                        value={filters.fromname}
                        onChange={(e) =>
                          handleFilterChange('fromname', e.target.value)
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
                      <td className="py-2 pr-4 whrowespace-nowrap">
                        {new Date(row.timestamprq).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {formatIDR(row.amount)}
                      </td>
                      <td className="py-2 pr-4">{row.issuer?.toUpperCase()}</td>
                      <td className="py-2 pr-4">{row.outlet}</td>
                      <td className="py-2 pr-4">{row.terminal}</td>
                      <td className="py-2 pr-4 font-mono">{row.rrn}</td>
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
                      <td className="py-2 pr-4 font-bold">Total Filtered</td>
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
