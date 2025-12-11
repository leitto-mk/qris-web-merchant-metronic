import { useAppData } from '@/context/AppDataContext.jsx';
import { useMemo, useState } from 'react';
import moment from 'moment';
import AuthService from '@/services/AuthService.js';
import axiosInstance from '@/services/AxiosInstance.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge.jsx';
import * as Recharts from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart.jsx';
import generateTransactionHistory from '@/mocks/transactionHistoryMock.js';

export function MerchantReportPage() {
  const { merchant } = useAppData();

  // Local UI state
  const startOfToday = () => moment().startOf('day').toDate();

  const [dateFrom, setDateFrom] = useState(() => startOfToday());
  const [dateTo, setDateTo] = useState(() => new Date());
  const [selectedPreset, setSelectedPreset] = useState('today'); // 'today' | '7d' | '30d' | '90d' | 'custom'
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  // Helpers
  const pad = (n) => String(n).padStart(2, '0');
  const formatDateTimeLocal = (d) => {
    const m = moment(d);
    return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : '';
  };

  const toInputLocal = (d) => {
    // for input type="datetime-local" -> yyyy-MM-ddTHH:mm
    const m = moment(d);
    return m.isValid() ? m.format('YYYY-MM-DDTHH:mm') : '';
  };

  const fromInputLocal = (val) => {
    // val like yyyy-MM-ddTHH:mm
    if (!val) return new Date();
    const m = moment(val);
    return m.isValid() ? m.toDate() : new Date();
  };

  // Quick range presets (relative to now, local time)
  const nowLocal = () => moment().toDate();
  const minusDays = (base, days) => moment(base).subtract(days, 'days').toDate();
  const getRange = (key) => {
    const now = nowLocal();
    if (key === 'today') return { from: startOfToday(), to: now };
    if (key === '7d') return { from: minusDays(now, 7), to: now };
    if (key === '30d') return { from: minusDays(now, 30), to: now };
    if (key === '90d') return { from: minusDays(now, 90), to: now };
    return { from: dateFrom, to: dateTo };
  };
  const applyPreset = (key) => {
    const { from, to } = getRange(key);
    setSelectedPreset(key);
    setError('');
    setDateFrom(from);
    setDateTo(to);
  };

  const formatIDR = (n) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const maskAcc = (acc) => (acc ? String(acc).replace(/(\d{4})\d+(\d{4})/, '$1••••$2') : '-');

  // Derived metrics
  const totals = useMemo(() => {
    const totalAmount = history.reduce((sum, it) => sum + Number(it.amount || 0), 0);
    const count = history.length;
    const avg = count ? totalAmount / count : 0;
    const byDevice = history.reduce((m, it) => {
      const key = it.device || '-';
      m[key] = (m[key] || 0) + 1;
      return m;
    }, {});
    const byTerminal = history.reduce((m, it) => {
      const key = it.terminal || '-';
      m[key] = (m[key] || 0) + 1;
      return m;
    }, {});
    return { totalAmount, count, avg, byDevice, byTerminal };
  }, [history]);

  // Simple daily bucket for the chart (local time)
  const chartData = useMemo(() => {
    const buckets = new Map();
    for (const it of history) {
      const m = moment(it.timestamprq); // local time per spec
      if (!m.isValid()) continue;
      const key = m.format('YYYY-MM-DD');
      const prev = buckets.get(key) || 0;
      buckets.set(key, prev + Number(it.amount || 0));
    }
    const arr = Array.from(buckets.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    return arr;
  }, [history]);

  const deviceChips = useMemo(() => Object.entries(totals.byDevice || {}), [totals.byDevice]);

  const isMockEnabled = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mockHistory') === '1') return true;
      return String(import.meta.env?.VITE_USE_MOCK_HISTORY).toLowerCase() === 'true';
    } catch (_) {
      return false;
    }
  };

  const handleTransactionHistory = async () => {
    try {
      setError('');
      // basic validation
      if (dateFrom > dateTo) {
        setError('Tanggal From tidak boleh lebih besar dari To.');
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
        date_from: formatDateTimeLocal(dateFrom),
        date_to: formatDateTimeLocal(dateTo),
      };

      // Mock mode: generate 50 dummy records locally
      if (isMockEnabled()) {
        const mock = generateTransactionHistory({ count: 50, from: dateFrom, to: dateTo, merchant });
        setHistory(mock);
        return;
      }

      const { data } = await axiosInstance().post(`/history/${merchantId}/trx`, payload);
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Gagal mengambil riwayat transaksi:', error?.response?.data?.errors ?? error);
      setError('Gagal mengambil data. Coba lagi.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTransactionHistoryMock = () => {
    try {
      setError('');
      if (dateFrom > dateTo) {
        setError('Tanggal From tidak boleh lebih besar dari To.');
        return;
      }
      setLoadingHistory(true);
      const mock = generateTransactionHistory({ count: 50, from: dateFrom, to: dateTo, merchant });
      setHistory(mock);
    } catch (e) {
      setError('Gagal membuat data dummy.');
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
                <div className="font-mono text-sm">{formatDateTimeLocal(dateFrom)}</div>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="rounded-md border px-3 py-2">
                <div className="text-xs text-muted-foreground">Sampai</div>
                <div className="font-mono text-sm">{formatDateTimeLocal(dateTo)}</div>
              </div>
            </div>
            {/* Preset range buttons */}
            <div className="flex flex-wrap gap-2">
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
                variant={selectedPreset === '90d' ? 'mono' : 'dashed'}
                onClick={() => applyPreset('90d')}
                disabled={loadingHistory}
              >
                3 Bulan
              </Button>
            </div>
            <div className="flex-1" />
            <Button onClick={handleTransactionHistory} disabled={loadingHistory}>
              {loadingHistory ? 'Mengambil...' : 'Ambil Report'}
            </Button>
            <Button variant="dashed" onClick={handleTransactionHistoryMock} disabled={loadingHistory}>
              Gunakan Dummy (50)
            </Button>
          </div>
          {error ? (
            <div className="text-red-500 text-sm">{error}</div>
          ) : null}
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="accent">
          <CardHeader className="py-3.5">
            <CardTitle>Total Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.count}</CardContent>
        </Card>
        <Card variant="accent">
          <CardHeader className="py-3.5">
            <CardTitle>Total Amount</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatIDR(totals.totalAmount)}</CardContent>
        </Card>
        <Card variant="accent">
          <CardHeader className="py-3.5">
            <CardTitle>Rata-rata</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatIDR(totals.avg)}</CardContent>
        </Card>
      </div>

      {/* Device chips */}
      {deviceChips.length > 0 && (
        <Card variant="accent">
          <CardHeader className="py-3.5">
            <CardTitle>Perangkat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {deviceChips.map(([name, cnt]) => (
              <Badge key={name} variant="secondary">{name}: {cnt}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {history.length > 0 && (
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
                <Recharts.AreaChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <Recharts.YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Recharts.Area type="monotone" dataKey="amount" stroke="#22c55e" fill="#22c55e33" />
                  <ChartLegend content={<ChartLegendContent />} />
                </Recharts.AreaChart>
              </Recharts.ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3.5">
          <CardTitle>Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada data. Silakan pilih preset rentang tanggal lalu klik Ambil Report.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-dashed">
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">Outlet</th>
                  <th className="py-2 pr-4">Terminal</th>
                  <th className="py-2 pr-4">RRN</th>
                  <th className="py-2 pr-4">From Name</th>
                  <th className="py-2 pr-4">From Acc</th>
                  <th className="py-2 pr-4">To Acc</th>
                </tr>
              </thead>
              <tbody>
                {history
                  .slice()
                  .sort((a, b) => new Date(b.timestamprq) - new Date(a.timestamprq))
                  .map((it, idx) => (
                    <tr key={idx} className="border-b border-dashed last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(it.timestamprq).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right font-mono">{formatIDR(it.amount)}</td>
                      <td className="py-2 pr-4">{it.device}</td>
                      <td className="py-2 pr-4">{it.outlet}</td>
                      <td className="py-2 pr-4">{it.terminal}</td>
                      <td className="py-2 pr-4 font-mono">{it.rrn}</td>
                      <td className="py-2 pr-4">{it.fromname}</td>
                      <td className="py-2 pr-4 font-mono">{maskAcc(it.fromacc)}</td>
                      <td className="py-2 pr-4 font-mono">{maskAcc(it.toacc)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
