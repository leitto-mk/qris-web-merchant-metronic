import { useAppData } from '@/context/AppDataContext.jsx';
import { useMemo, useState, useCallback } from 'react';
import moment from 'moment';
import AuthService from '@/services/AuthService.js';
import axiosInstance from '@/services/AxiosInstance.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Download } from 'lucide-react';
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
  const [filters, setFilters] = useState({
    timestamprq: '',
    amount: { operator: 'eq', value: '' },
    device: '',
    outlet: '',
    terminal: '',
    rrn: '',
    fromname: '',
    fromacc: '',
    toacc: '',
  });

  // Helpers
  const formatDateTimeLocal = (d) => {
    const m = moment(d);
    return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : '';
  };

  const handleFilterChange = (columnId, value) => {
    setFilters((prev) => ({ ...prev, [columnId]: value }));
  };

  const handleAmountFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      amount: { ...prev.amount, [key]: value }
    }));
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

  const uniqueDevices = useMemo(() => {
    if (!history.length) return [];
    const devices = new Set(history.map(item => item.device).filter(Boolean));
    return ['All', ...Array.from(devices)];
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
        if (filters.device && filters.device !== 'All' && item.device !== filters.device) {
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

  const filteredTotals = useMemo(() => {
    const totalAmount = filteredHistory.reduce((sum, it) => sum + Number(it.amount || 0), 0);
    const count = filteredHistory.length;
    return { totalAmount, count };
  }, [filteredHistory]);

  const isFiltered = useMemo(() => {
    return Object.values(filters).some(val => {
      if (typeof val === 'string') return val.length > 0 && val !== 'All';
      if (typeof val === 'object' && val !== null) return val.value.length > 0;
      return false;
    });
  }, [filters]);

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

  const exportToCsv = () => {
    if (filteredHistory.length === 0) return;

    const headers = [
      'Tanggal', 'Amount', 'Device', 'Outlet', 'Terminal', 'RRN', 'From Name', 'From Acc', 'To Acc'
    ];

    // Using filtered and sorted data
    const rows = filteredHistory.map(item => [
      `"${new Date(item.timestamprq).toLocaleString('id-ID')}"`,
      item.amount,
      `"${item.device || ''}"`,
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
      {history.length > 0 && selectedPreset !== 'today' && (
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
        <CardHeader className="py-3.5 flex flex-row items-center justify-between">
          <CardTitle>Daftar Transaksi</CardTitle>
          <Button className={'bg-orange-400 hover:bg-orange-600 text-white'} onClick={exportToCsv} variant="outline" size="sm" disabled={loadingHistory || filteredHistory.length === 0}>
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada data. Silakan pilih preset rentang tanggal lalu klik Ambil Report.</div>
          ) : (
            <>
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
                <tr className="text-left">
                  <td className="py-2 pr-4"><Input placeholder="Filter..." className="h-8" value={filters.timestamprq} onChange={(e) => handleFilterChange('timestamprq', e.target.value)} /></td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-1">
                      <select
                        className="h-8 border border-input bg-background rounded-md px-2 text-xs"
                        value={filters.amount.operator}
                        onChange={(e) => handleAmountFilterChange('operator', e.target.value)}
                      >
                        <option value="eq">=</option>
                        <option value="gt">&gt;</option>
                        <option value="lt">&lt;</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Value..."
                        className="h-8"
                        value={filters.amount.value}
                        onChange={(e) => handleAmountFilterChange('value', e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      className="h-8 border border-input bg-background rounded-md px-2 w-full"
                      value={filters.device}
                      onChange={(e) => handleFilterChange('device', e.target.value)}
                    >
                      {uniqueDevices.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      className="h-8 border border-input bg-background rounded-md px-2 w-full"
                      value={filters.outlet}
                      onChange={(e) => handleFilterChange('outlet', e.target.value)}
                    >
                      {uniqueOutlets.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      className="h-8 border border-input bg-background rounded-md px-2 w-full"
                      value={filters.terminal}
                      onChange={(e) => handleFilterChange('terminal', e.target.value)}
                    >
                      {uniqueTerminals.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-4"><Input placeholder="Filter..." className="h-8" value={filters.rrn} onChange={(e) => handleFilterChange('rrn', e.target.value)} /></td>
                  <td className="py-2 pr-4"><Input placeholder="Filter..." className="h-8" value={filters.fromname} onChange={(e) => handleFilterChange('fromname', e.target.value)} /></td>
                  <td className="py-2 pr-4"><Input placeholder="Filter..." className="h-8" value={filters.fromacc} onChange={(e) => handleFilterChange('fromacc', e.target.value)} /></td>
                  <td className="py-2 pr-4"><Input placeholder="Filter..." className="h-8" value={filters.toacc} onChange={(e) => handleFilterChange('toacc', e.target.value)} /></td>
                </tr>
                </thead>
                <tbody>
                {filteredHistory.map((it, idx) => (
                  <tr key={idx} className="border-b border-dashed last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(it.timestamprq).toLocaleString('id-ID')}</td>
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
                {isFiltered && (
                  <tfoot>
                  <tr className="border-t border-dashed">
                    <td className="py-2 pr-4 font-bold">Total Filtered</td>
                    <td className="py-2 pr-4 text-right font-mono font-bold">{formatIDR(filteredTotals.totalAmount)}</td>
                    <td colSpan="7" className="py-2 pr-4 text-right font-bold">{filteredTotals.count} records</td>
                  </tr>
                  </tfoot>
                )}
              </table>
              {filteredHistory.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">Tidak ada data yang cocok dengan filter.</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
