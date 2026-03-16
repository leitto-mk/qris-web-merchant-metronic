import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useCallback, useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Check, EllipsisVertical, Eye, EyeClosed, Key, LoaderCircleIcon, MonitorSmartphone, Smartphone, Monitor, UserRoundIcon, UserRoundMinus, UserRoundPen, UserRoundPlusIcon, X } from 'lucide-react';
import AuthService from '@/services/AuthService.js';
import axiosInstance from '@/services/AxiosInstance.js';
import ImagePrintService from '@/services/ImagePrintService.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardHeading, CardTable, CardTitle } from '@/components/ui/card.jsx';
import { DataGridPagination } from '@/components/ui/data-grid-pagination.jsx';
import { DataGridTable } from '@/components/ui/data-grid-table.jsx';
import { DataGrid } from '@/components/ui/data-grid.jsx';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@/components/ui/input.jsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Stepper, StepperContent, StepperIndicator, StepperItem, StepperNav, StepperPanel, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function buildExpandedDetails(merchant, data) {
  const merchantUsersByKdUser = new Map(
    (data?.merchantUser ?? [])
      .filter((item) => item?.kd_user)
      .map((item) => [item.kd_user, item]),
  );

  const terminalDetails = (data?.terminal ?? []).map((terminal) => {
    const matchedMerchantUser = merchantUsersByKdUser.get(terminal?.kd_user);

    return {
      ...terminal,
      userLabel: terminal?.kd_user || '-',
      deviceLabel: matchedMerchantUser.device,
      webLabel: matchedMerchantUser.web_status,
    };
  });

  return (
    <div className="m-3 md:m-4 xl:m-5">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-5">
        {/* QR IMAGE */}
        <div className="xl:col-span-3">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 shadow-sm overflow-hidden h-full">
            <div className="flex items-center justify-between gap-3 border-b border-dashed px-4 py-3">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  QRIS Preview
                </div>
                <div className="text-sm font-semibold uppercase truncate">
                  {data.outlatName || 'Outlet'}
                </div>
              </div>
              <Badge variant="secondary" className="uppercase shrink-0">
                {data.nmid || '-'}
              </Badge>
            </div>

            <div className="p-4">
              <div className="group/overlay relative flex items-center justify-center rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-3 min-h-[16rem] md:min-h-[18rem] xl:min-h-[20rem]">
                <div className="absolute inset-0 rounded-2xl bg-black/45 items-center justify-center opacity-0 transition-opacity duration-300 hidden lg:flex group-hover/overlay:opacity-100">
                  <Button
                    className="text-xs md:text-sm"
                    variant="outline"
                    onClick={() => ImagePrintService.base64(data.qris?.qr_base64)}
                  >
                    Print / Download
                  </Button>
                </div>
                <img
                  src={data?.qris?.qr_base64}
                  aria-label="QRIS Image"
                  className="w-full max-w-[11rem] md:max-w-[13rem] xl:max-w-[15rem] h-auto object-contain rounded-xl"
                  alt="Qris-Image"
                />
              </div>

              <Button
                className="mt-4 w-full lg:hidden"
                variant="outline"
                onClick={() => ImagePrintService.base64(data.qris?.qr_base64)}
              >
                Print / Download
              </Button>
            </div>
          </div>
        </div>

        {/* OUTLET INFO */}
        <div className="xl:col-span-4">
          <Card
            className="w-full min-w-0 rounded-2xl border border-border/60 shadow-sm h-full"
            variant="accent"
          >
            <CardHeader className="pb-3">
              <CardHeading>
                <div className="font-bold uppercase tracking-wide">
                  Outlet Info
                </div>
              </CardHeading>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Cabang</span>
                <Badge>{data.branchInfo.ket}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Nama Merchant</span>
                <span className="uppercase sm:text-right max-w-full sm:max-w-[60%] break-words">
                  {merchant.MRCName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Nama Outlet</span>
                <span className="uppercase sm:text-right max-w-full sm:max-w-[60%] break-words">
                  {data.outlatName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Tipe Usaha</span>
                <span className="sm:text-right">
                  {data.tipe_usaha === 'INDIVIDU'
                    ? 'INDIVIDU'
                    : 'BADAN USAHA'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Kategori</span>
                <span className="sm:text-right max-w-full sm:max-w-[60%] break-words">
                  {data.kategori || '-'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Kriteria Merchant</span>
                <Badge>{data.kriteria}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">MCC</span>
                <Badge variant="secondary">{data.mcc || '-'}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">MPAN</span>
                <span className="sm:text-right max-w-full sm:max-w-[60%] break-all">
                  {data.MPAN || '-'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">MID</span>
                <span className="sm:text-right max-w-full sm:max-w-[60%] break-all">
                  {data.MID || '-'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">NMID</span>
                <span className="sm:text-right max-w-full sm:max-w-[60%] break-all">
                  {data.nmid || '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OWNER INFO */}
        <div className="xl:col-span-5">
          <Card
            className="w-full min-w-0 rounded-2xl border border-border/60 shadow-sm h-full"
            variant="accent"
          >
            <CardHeader className="pb-3">
              <CardHeading>
                <div className="font-bold uppercase tracking-wide">
                  Informasi Pemilik
                </div>
              </CardHeading>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Alamat</span>
                <span className="sm:text-right break-words max-w-full sm:max-w-[65%]">
                  {`${data.outlatAddress}, ${data.kota} ${data.kdPost}`}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">KTP</span>
                <span className="sm:text-right break-all max-w-full sm:max-w-[65%]">
                  {data.ktp ?? '-'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">NPWP</span>
                <span className="sm:text-right break-all max-w-full sm:max-w-[65%]">
                  {data.npwp ?? '-'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">No. HP</span>
                <span className="sm:text-right max-w-full sm:max-w-[65%] break-words">
                  {data.phonenum}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Email</span>
                <span className="sm:text-right break-all max-w-full sm:max-w-[65%]">
                  {data.email}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Legalitas Usaha</span>
                <span className="sm:text-right max-w-full sm:max-w-[65%] break-words">
                  {data.legalitas_usaha}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">No. Legalitas Usaha</span>
                <span className="sm:text-right max-w-full sm:max-w-[65%] break-words">
                  {data.no_legalitas_usaha ?? '-'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">No. Rekening</span>
                <span className="sm:text-right break-all max-w-full sm:max-w-[65%]">
                  {data.acc_no}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-3 py-2 border-b border-dashed last:border-none">
                <span className="text-muted-foreground">Nama Pemilik Rekening</span>
                <span className="sm:text-right break-words max-w-full sm:max-w-[65%]">
                  {data.acc_name}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TERMINALS */}
        <div className="xl:col-span-12">
          <Card
            className="w-full min-w-0 rounded-2xl border border-border/60 shadow-sm"
            variant="accent"
          >
            <CardHeader className="pb-3">
              <CardHeading>
                <div className="font-bold uppercase tracking-wide">
                  Terminals
                </div>
              </CardHeading>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {terminalDetails.map((terminal) => (
                  <div
                    key={terminal.XID || terminal.TerminalID}
                    className="group rounded-2xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-4 shadow-sm transition-all duration-200 hover:-translate-y-2 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Terminal
                        </div>
                        <div className="mt-1 text-xl font-bold uppercase tracking-wide">
                          {terminal.TerminalID || '-'}
                        </div>
                      </div>

                      {/*<Badge*/}
                      {/*  variant={terminal.TerminalID === 'A01' ? 'primary' : 'secondary'}*/}
                      {/*  className="uppercase shrink-0"*/}
                      {/*>*/}
                      {/*  {terminal.TerminalID === 'A01' ? 'Default' : 'Active'}*/}
                      {/*</Badge>*/}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border/70 bg-background/70 px-3 py-2.5">
                        <UserRoundIcon className="mt-0.5 size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Digunakan oleh
                          </div>
                          <div className="font-semibold uppercase break-words">
                            {terminal.userLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row gap-3">
                        <div className="flex items-start w-full gap-3 rounded-xl border border-dashed border-border/70 bg-background/70 px-3 py-2.5">
                          <Smartphone className="mt-0.5 size-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                              Device
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge
                                variant={
                                  terminal.deviceLabel === 'N/A'
                                    ? 'secondary'
                                    : 'success'
                                }
                                className="max-w-full"
                              >
                                <span className="truncate max-w-[220px]">
                                  {terminal.deviceLabel}
                                </span>
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start w-full gap-3 rounded-xl border border-dashed border-border/70 bg-background/70 px-3 py-2.5">
                          <Monitor className="mt-0.5 size-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                              Web
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge
                                variant={
                                  terminal.webLabel === 'INACTIVE'
                                    ? 'secondary'
                                    : 'success'
                                }
                                className="max-w-full"
                              >
                                <span className="truncate max-w-[220px]">
                                  {terminal.webLabel}
                                </span>
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!terminalDetails.length && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center">
                  <MonitorSmartphone className="size-8 text-muted-foreground" />
                  <div className="mt-3 font-semibold">Belum ada terminal</div>
                  <div className="text-sm text-muted-foreground">
                    Terminal yang terdaftar pada outlet ini akan tampil di sini.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const ModalContents = {
  AddDeviceModalContent: ({ selected, closeModal }) => {
    const queryClient = useQueryClient();
    const steps = [
      { title: 'Ketentuan' },
      { title: 'Konfirmasi' },
      { title: 'Kirim' },
    ];
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [onShow, setOnShow] = useState(false);
    const [confirmPwd, setConfirmPwd] = useState('');
    const [emailFailAttempts, setEmailFailAttempts] = useState(
      Number(selected?.email_fail_attempts ?? 0),
    );

    const confirmPassword = useCallback(async () => {
      try {
        setLoading(true);
        await AuthService.confirmPassword(confirmPwd);
        setConfirmPwd('');
        if (selected) {
          selected.outlet_confirmed_add_device = true;
        }
      } catch (error) {
        if (selected) {
          selected.outlet_confirmed_add_device = false;
        }
        console.error(
          'Konfirmasi password gagal:',
          error?.response?.data?.errors ?? error,
        );
      } finally {
        setLoading(false);
      }
    }, [confirmPwd, selected]);

    const addTerminal = useCallback(() => {
      setSending(true);
      const session = AuthService.retrieveSession();
      if (!session || !session.kd_user) {
        console.error('Sesi pengguna tidak tersedia. Silakan login kembali.');
        setSending(false);
        return;
      }

      axiosInstance()
        .post('/terminal/create', {
          kdUser: session.kd_user,
          outlet: selected.XID,
        })
        .then(() => {
          queryClient.invalidateQueries('outlets');
          closeModal();
        })
        .catch((error) => {
          setEmailFailAttempts((prev) => prev + 1);
          console.error(
            'Penambahan Terminal gagal:',
            error?.response?.data?.errors ?? error,
          );
        })
        .finally(() => {
          setSending(false);
        });
    }, [selected, closeModal, queryClient]);

    return (
      <>
        <Stepper
          value={step}
          onValueChange={setStep}
          indicators={{
            completed: <Check className="size-4" />,
            loading: <LoaderCircleIcon className="size-4 animate-spin" />,
          }}
          className="space-y-8"
        >
          <StepperNav>
            {steps.map((step, index) => (
              <StepperItem
                key={index}
                step={index + 1}
                className="relative flex-1 items-start"
              >
                <StepperTrigger className="flex flex-col gap-2.5">
                  <StepperIndicator>{index + 1}</StepperIndicator>
                  <StepperTitle>{step.title}</StepperTitle>
                </StepperTrigger>
                {steps.length > index + 1 && (
                  <StepperSeparator className="absolute top-3 inset-x-0 left-[calc(50%+0.875rem)] m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem+0.225rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none group-data-[state=completed]/step:bg-primary" />
                )}
              </StepperItem>
            ))}
          </StepperNav>
          <StepperPanel className="text-sm">
            {steps.map((step, index) => (
              <StepperContent
                key={index}
                value={index + 1}
                className="flex items-center justify-center"
              >
                {index === 0 && (
                  <>
                    <div className="w-full">
                      <div className="flex flex-col gap-3 h-fit">
                        <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 p-5">
                          <span className="font-bold">
                            {selected?.namaOutlet ||
                              selected?.outletName ||
                              'Outlet Terpilih'}
                          </span>
                          <br />
                          <br />
                          Anda akan melakukan penambahan perangkat pada Outlet.
                          Adapun Ketentuan yang{' '}
                          <span className="font-bold">
                            perlu diperhatikan
                          </span>{' '}
                          adalah sebagai berikut :
                          <br />
                          <br />
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-row gap-4">
                              <div className="font-bold">1.</div>
                              <div>
                                Username untuk perangkat baru akan dikirimkan
                                pada email yang telah terdaftar
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">2.</div>
                              <div>
                                Akses username yang sudah diaktifkan pada
                                perangkat hanya bisa digunakan pada perangkat
                                tersebut
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">3.</div>
                              <div>
                                QRIS yang dibuat pada perangkat merupakan QRIS
                                dinamis
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">4.</div>
                              <div>
                                Apabila user yang sudah terdaftar ingin
                                melakukan perubahan, maka akan dilakukan oleh
                                user Admin Merchant
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">5.</div>
                              <div>
                                Ketentuan pengamanan username dan password
                                adalah kewajiban pemegang user
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">6.</div>
                              <div>
                                Sehubungan dengan pengelolaan user, merchant
                                bertanggung jawab sepenuhnya atas segala
                                transaksi qris yang terjadi melalui perangkat
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">7.</div>
                              <div>
                                Atas pengelolaan ini, membebaskan bank dari
                                risiko penyalahgunaan user dan password
                              </div>
                            </div>
                          </div>
                          <br />
                          Jika telah menyetujui, silahkan menekan tombol{' '}
                          <span className="font-bold">Lanjutkan</span>.
                        </div>
                      </div>
                      <div className="flex pt-6 gap-3 justify-between">
                        <DialogClose asChild>
                          <Button variant="outline">Tutup</Button>
                        </DialogClose>
                        <Button onClick={() => setStep(2)}>Lanjutkan</Button>
                      </div>
                    </div>
                  </>
                )}
                {index === 1 && (
                  <>
                    <div className="w-full">
                      {selected?.outlet_confirmed_add_device !== true ? (
                        <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 p-5 h-full">
                          Silahkan masukan password untuk konfirmasi penambahan
                          perangkat pada outlet:
                          <br />
                          <br />
                          <div className="flex flex-row gap-3 items-start">
                            <InputWrapper className="h-11 border-xl w-1/2">
                              <Key />
                              <Input
                                className="text-white font-semibold ml-1"
                                type={onShow ? 'text' : 'password'}
                                placeholder="Password"
                                value={confirmPwd}
                                onChange={(e) => setConfirmPwd(e.target.value)}
                                onKeyDown={(e) => {
                                  if (
                                    e.key === 'Enter' &&
                                    !loading &&
                                    confirmPwd
                                  ) {
                                    e.preventDefault();
                                    confirmPassword();
                                  }
                                }}
                                disabled={loading}
                              />
                              <div
                                className="hover:cursor-pointer"
                                onClick={() => setOnShow(!onShow)}
                              >
                                {onShow ? <EyeClosed /> : <Eye />}
                              </div>
                            </InputWrapper>
                            <Button
                              className="text-white font-semibold bg-green-500 h-11 w-40"
                              onClick={confirmPassword}
                              disabled={loading || !confirmPwd}
                            >
                              {loading ? (
                                <LoaderCircleIcon className="size-4 animate-spin" />
                              ) : (
                                'Konfirmasi'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex justify-center h-auto">
                          <div className="flex flex-col gap-5 justify-center m-10 items-center">
                            <div className="flex flex-wrap justify-center">
                              <div className="border-2 rounded-full p-5 border-slate-300 w-fit">
                                <Check
                                  className="text-green-400"
                                  style={{ fontSize: '5rem' }}
                                />
                              </div>
                            </div>
                            <span className="text-xl font-bold text-slate-500 dark:text-slate-300">
                              Password Terkonfirmasi
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex pt-6 gap-3 justify-between">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStep(1);
                            selected.outlet_confirmed_add_device = false;
                          }}
                        >
                          Kembali
                        </Button>
                        {selected?.outlet_confirmed_add_device ? (
                          <Button
                            onClick={() => {
                              setStep(3);
                              addTerminal();
                            }}
                          >
                            Lanjutkan
                          </Button>
                        ) : (
                          <DialogClose asChild>
                            <Button variant="outline">Tutup</Button>
                          </DialogClose>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {index === 2 && (
                  <>
                    <div className="w-full">
                      <div className="flex flex-wrap">
                        {sending ? (
                          <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 p-5 h-full w-full flex flex-col items-center justify-center gap-3">
                            <LoaderCircleIcon className="size-6 animate-spin" />
                            <div className="font-semibold">
                              Mengirim email username...
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Harap tunggu, proses sedang berjalan.
                            </div>
                          </div>
                        ) : emailFailAttempts > 0 ? (
                          <div className="border-2 border-dashed border-destructive/40 rounded bg-destructive/5 p-5 h-full w-full">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="font-bold text-destructive">
                                Gagal mengirim email username
                              </div>
                              <div className="text-sm text-muted-foreground text-center">
                                Terjadi kesalahan saat memproses permintaan.
                                Silakan coba lagi.
                              </div>
                            </div>
                          </div>
                        ) : selected?.outlet_confirmed_add_device ? (
                          <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 p-5 h-full w-full">
                            Username telah dikirimkan pada email berikut:
                            <br />
                            <br />
                            <div className="flex flex-wrap justify-center items-center font-bold text-2xl">
                              {selected?.email || '-'}
                            </div>
                            <br />
                            Silahkan periksa email anda untuk melihat username
                            yang telah dikirimkan. jika email tidak ditemukan,
                            silahkan cek folder spam.
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 p-5 h-full w-full">
                            <br />
                            Silahakan melakukan konfirmasi penambahan perangkat
                            pada outlet dengan memasukan password.
                            <br />
                            <br />
                          </div>
                        )}
                      </div>

                      <div className="flex pt-6 gap-3 justify-between">
                        {emailFailAttempts > 0 ? (
                          <Button
                            variant="outline"
                            onClick={addTerminal}
                            disabled={sending}
                          >
                            {sending ? (
                              <LoaderCircleIcon className="size-4 animate-spin" />
                            ) : (
                              'Kirim Lagi'
                            )}
                          </Button>
                        ) : (
                          <span />
                        )}

                        {selected?.outlet_confirmed_add_device ? (
                          <DialogClose asChild>
                            <Button variant="mono" disabled={sending}>
                              Tutup
                            </Button>
                          </DialogClose>
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </StepperContent>
            ))}
          </StepperPanel>
        </Stepper>
      </>
    );
  },
  ResetPasswordTerminalModalContent: ({ selected, closeModal }) => {
    const [loading, setLoading] = useState(false);
    const [merchantUser, setMerchantUser] = useState('');

    const merchantUserOptions = (selected?.merchantUser ?? []).filter(
      (item) => item?.kd_user,
    );

    const resetPasswordTerminal = useCallback(async () => {
      try {
        setLoading(true);
        if (!merchantUser) throw new Error('User Merchant harus dipilih');

        const session = AuthService.retrieveSession();
        if (!session || !session.kd_user) {
          throw new Error(
            'Sesi pengguna tidak tersedia. Silakan login kembali.',
          );
        }

        await axiosInstance().post('/terminal/reset/password', {
          kdUser: session.kd_user,
          merchant_user: merchantUser,
        });

        // Close modal after successful request
        closeModal();
      } catch (error) {
        console.error(
          'Gagal reset password:',
          error?.response?.data?.errors ?? error,
        );
      } finally {
        setLoading(false);
      }
    }, [merchantUser, closeModal]);

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 w-1/2">
            <Select
              value={merchantUser || undefined}
              onValueChange={setMerchantUser}
              indicatorPosition="right"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="User Merchant" />
              </SelectTrigger>
              <SelectContent className="w-full min-w-[16rem]">
                {merchantUserOptions.map((item) => (
                  <SelectItem
                    key={item.kd_user}
                    value={item.kd_user}
                    className="uppercase"
                  >
                    {item.kd_user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-row justify-between">
          <DialogClose asChild>
            <Button variant="outline">Tutup</Button>
          </DialogClose>
          <Button
            onClick={resetPasswordTerminal}
            disabled={loading || !merchantUser}
          >
            {loading ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              'Reset Password'
            )}
          </Button>
        </div>
      </div>
    );
  },
  ResetDeviceMerchantModalContent: ({ selected, closeModal }) => {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [resetDeviceXID, setResetDeviceXID] = useState('');
    const [resetType, setResetType] = useState('MOB');
    const [showForm, setShowForm] = useState(false);

    const merchantUsersByKdUser = new Map(
      (selected?.merchantUser ?? [])
        .filter((item) => item?.kd_user)
        .map((item) => [item.kd_user, item]),
    );

    const terminalOptions = (selected?.terminal ?? [])
      .filter((item) => item?.TerminalID !== 'A01' && item?.kd_user)
      .map((item) => {
        const matchedMerchantUser = merchantUsersByKdUser.get(item.kd_user);
        return {
          ...item,
          device: matchedMerchantUser?.device ?? matchedMerchantUser?.Device ?? '',
          webStatus: matchedMerchantUser?.web_status ?? 'INACTIVE',
        };
      });

    const resetDeviceTerminal = useCallback(async () => {
      try {
        setLoading(true);

        if (!resetDeviceXID) throw new Error('Terminal harus dipilih');

        const session = AuthService.retrieveSession();
        if (!session || !session.kd_user) {
          throw new Error(
            'Sesi pengguna tidak tersedia. Silakan login kembali.',
          );
        }

        await axiosInstance().post('/terminal/reset/device', {
          kdUser: session.kd_user,
          XID: resetDeviceXID,
          type: resetType,
        });

        // Update local data
        if (selected?.merchantUser && selected?.terminal) {
          const terminal = selected.terminal.find((t) => t.XID === resetDeviceXID);
          if (terminal && terminal.kd_user) {
            const userIndex = selected.merchantUser.findIndex(
              (u) => u.kd_user === terminal.kd_user,
            );

            if (userIndex !== -1) {
              const updatedMerchantUser = [...selected.merchantUser];
              const user = { ...updatedMerchantUser[userIndex] };

              if (resetType === 'MOB' || resetType === 'ALL') {
                user.device = null;
                user.status = 3;
              }

              if (resetType === 'WEB' || resetType === 'ALL') {
                user.web_status = 'INACTIVE';
              }

              updatedMerchantUser[userIndex] = user;
              selected.merchantUser = updatedMerchantUser;

              // Invalidate queries to ensure UI is in sync if needed, 
              // but since we modified 'selected' object which is likely a reference to the data in cache, 
              // it might already be updated in some views. 
              // However, React Query data should be updated via queryClient.setQueryData or invalidated.
              queryClient.invalidateQueries('outlets');
            }
          }
        }

        // Close modal after successful request
        closeModal();
      } catch (error) {
        console.error(
          'Gagal mereset perangkat:',
          error?.response?.data?.errors ?? error,
        );
      } finally {
        setLoading(false);
      }
    }, [resetDeviceXID, closeModal, resetType, selected, queryClient]);

    return (
      <div className="flex flex-col gap-5">
        {!showForm ? (
          <>
            <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex flex-row gap-4 p-5 items-start">
              <div className="flex-1 text-sm leading-relaxed">
                <p>
                  Reset Device diperuntuhkan bagi Perangkat Mobile yang telah
                  terhubung dengan Aplikasi BSG Merchant Mobile.
                </p>
                <br />
                <p>
                  Terminal yang telah terhubung dengan perangkat dapat di reset
                  oleh Admin, dimana Terminal tersebut dapat dipindahkan
                  penggunaanya pada perangkat lain.
                </p>
                <br />
                <p>
                  Jika anda menyetujui proses reset perangkat. silahkan menekan
                  tombol <span className="font-bold">'Lanjutkan'</span>
                </p>
              </div>
              <div className="relative w-40 h-64 overflow-hidden rounded-lg">
                <style>{`
                  @keyframes slide-up-once {
                    0% { transform: translateY(30%); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                  }
                `}</style>
                <img
                  src="/media/bsg/merchant_mobile.png"
                  alt="Merchant Mobile"
                  className="w-full h-auto object-cover drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
                  style={{
                    animation: 'slide-up-once 1.2s ease-out forwards',
                  }}
                />
                <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-surface-50 dark:from-surface-950 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-surface-50 dark:from-surface-950 to-transparent pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-row justify-between">
              <DialogClose asChild>
                <Button variant="outline">Tutup</Button>
              </DialogClose>
              <Button
                className="bg-green-700/60 hover:bg-green-600 text-white"
                onClick={() => setShowForm(true)}
              >
                Lanjutkan
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2.5">
                <Label>Terminal</Label>
                <div className="flex items-center gap-2 w-1/2">
                  <Select
                    value={resetDeviceXID || undefined}
                    onValueChange={setResetDeviceXID}
                    indicatorPosition="right"
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Terminal" />
                    </SelectTrigger>
                    <SelectContent className="w-full min-w-[16rem]">
                      {terminalOptions.map((item) => (
                        <SelectItem key={item.XID} value={item.XID}>
                          {`[${item.TerminalID}] ${(item.kd_user || '').toUpperCase()} ${item.device ? ` • Device: ${item.device}` : ''} | Web: ${item.webStatus}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Label>Tipe Reset</Label>
                <RadioGroup
                  value={resetType}
                  onValueChange={setResetType}
                  className="flex flex-row gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="MOB" id="mob" />
                    <Label htmlFor="mob" className="cursor-pointer">
                      Mobile Device
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="WEB" id="web" />
                    <Label htmlFor="web" className="cursor-pointer">
                      Web Access
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ALL" id="all" />
                    <Label htmlFor="all" className="cursor-pointer">
                      Keduanya
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className="flex flex-row justify-between mt-4">
              <DialogClose asChild>
                <Button variant="outline">Tutup</Button>
              </DialogClose>
              <Button
                onClick={resetDeviceTerminal}
                disabled={loading || !resetDeviceXID}
              >
                {loading ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  'Reset Perangkat'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }
};

function buildActionsMenu(row, openModal) {
  const merchantUsers = row?.original?.merchantUser ?? [];
  const hasMerchantUser = merchantUsers.some((item) => item?.kd_user);
  const hasTerminal = (row?.original?.terminal?.length ?? 0) > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" mode="icon" shape="circle">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={row.getToggleExpandedHandler()}
        >
          {row.getIsExpanded() ? <X /> : <UserRoundIcon />}
          <span>{row.getIsExpanded() ? 'Tutup Details' : 'Details'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => openModal('AddDeviceModalContent', row)}
        >
          <UserRoundPlusIcon />
          <span>Tambah Terminal</span>
        </DropdownMenuItem>
        {hasMerchantUser && hasTerminal && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => openModal('ResetPasswordTerminalModalContent', row)}
          >
            <UserRoundMinus />
            <span>Reset Password Terminal</span>
          </DropdownMenuItem>
        )}
        {hasMerchantUser && hasTerminal && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => openModal('ResetDeviceMerchantModalContent', row)}
          >
            <UserRoundPen />
            <span>Reset Device Mobile</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OutletPageSkeleton() {
  return (
    <div className="mx-auto my-2 flex w-full max-w-[1600px] flex-wrap gap-5 px-3 md:px-4 xl:px-5 2xl:px-6">
      <Card className="w-full">
        <CardHeader className="py-3.5">
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardTable>
          <div className="divide-y">
            <div className="flex items-center gap-5 justify-between p-4 xl:p-5 text-sm font-medium text-muted-foreground">
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-5 justify-between p-4 xl:p-5">
                <Skeleton className="h-8 w-1/6" />
                <Skeleton className="h-8 w-1/6" />
                <Skeleton className="h-8 w-1/6" />
                <Skeleton className="h-8 w-1/6" />
                <Skeleton className="h-8 w-1/6" />
                <Skeleton className="h-8 w-1/6" />
              </div>
            ))}
          </div>
        </CardTable>
        <CardFooter>
          <div className="flex w-full items-center justify-between gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Layout 1 Outlet Page Component
 *
 * @returns {React.JSX.Element}
 * @constructor
 */
export function OutletPage() {
  const { merchant, outlets, loading } = useAppData();

  const [sorting, setSorting] = useState([{ id: 'outlatName', desc: true }]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: (outlets?.length ?? 0) < 10 ? 10 : 5,
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [currentModalKey, setCurrentModalKey] = useState(null);

  // Modal metadata for dynamic titles and descriptions
  const modalMeta = useMemo(
    () => ({
      AddDeviceModalContent: {
        title: 'Tambah Perangkat',
        description:
          'Ikuti langkah untuk menambahkan perangkat baru pada outlet terpilih.',
      },
      ResetPasswordTerminalModalContent: {
        title: 'Reset User Password',
        description: 'Pilih Terminal untuk melakukan reset password.',
      },
      ResetDeviceMerchantModalContent: {
        title: 'Reset Perangkat',
        description: 'Pilih Terminal yang digunakan pada Perangkat',
      }
    }),
    [],
  );

  const { title: currentDialogTitle, description: currentDialogDescription } =
    useMemo(() => {
      const meta = currentModalKey ? modalMeta[currentModalKey] : null;
      const outletName = selectedRow?.outlatName || selectedRow?.namaOutlet;
      const titleWithContext = meta?.title
        ? `${meta.title}${
            outletName ? ` • ${String(outletName).toUpperCase()}` : ''
          }`
        : '';
      return {
        title: titleWithContext,
        description: meta?.description ?? '',
      };
    }, [currentModalKey, selectedRow, modalMeta]);

  const openModal = useCallback((key, row) => {
    setSelectedRow(row?.original ?? row);
    setCurrentModalKey(key);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedRow(null);
    setCurrentModalKey(null);
  }, []);

  const columns = useMemo(
    () => [
      {
        header: 'Outlet',
        accessorKey: 'outlatName',
        cell: (data) => <span className="uppercase">{data.getValue()}</span>,
        meta: {
          headerClassName: '',
          cellClassName: '',
        },
      },
      {
        header: 'Cabang',
        accessorKey: 'branch',
        cell: (data) => {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="uppercase">
                    <Badge variant="primary">{data.getValue()}</Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="uppercase">
                    {data.row.original.branchInfo.ket}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        meta: {
          headerClassName: '',
          cellClassName: '',
        },
      },
      {
        header: 'NMID',
        accessorKey: 'nmid',
        cell: (data) => <span className="uppercase">{data.getValue()}</span>,
        meta: {
          headerClassName: '',
          cellClassName: '',
        },
      },
      {
        header: 'Kriteria',
        accessorKey: 'kriteria',
        cell: (data) => {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="uppercase">
                    <Badge variant="primary">{data.getValue()}</Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="uppercase">
                    {data.row.original.merchantCriteria.ket}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        meta: {
          headerClassName: '',
          cellClassName: '',
        },
      },
      {
        header: 'MCC',
        accessorKey: 'mcc',
        cell: (data) => {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="uppercase">
                    <Badge variant="secondary">{data.getValue()}</Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="uppercase">
                    {data.row.original.merchantCategory.ket_indo}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        meta: {
          headerClassName: '',
          cellClassName: '',
        },
      },
      {
        header: 'Terminal',
        accessorKey: 'terminal',
        cell: (data) => (
          <span className="uppercase">
            <Badge
              variant={`${
                data.getValue().length > 0 ? 'success' : 'secondary'
              }`}
            >
              {data.getValue().length || 0}
            </Badge>
          </span>
        ),
        meta: {
          headerClassName: '',
          cellClassName: '',
        },
      },
      {
        header: 'Actions',
        cell: ({ row }) => {
          return row.getCanExpand() ? buildActionsMenu(row, openModal) : null;
        },
        meta: {
          headerClassName: 'whitespace-nowrap w-0',
          cellClassName: 'whitespace-nowrap w-0',
          expandedContent: (row) => buildExpandedDetails(merchant, row),
        },
      },
    ],
    [openModal, merchant]
  );

  const table = useReactTable({
    columns,
    data: outlets,
    pageCount: Math.ceil((outlets?.length ?? 0) / pagination.pageSize),
    getRowId: (row) => row.xid,
    getRowCanExpand: (row) => Boolean(row.original.XID),
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return <OutletPageSkeleton />;
  }

  return (
    <div className="mx-auto my-5 flex w-full flex-wrap gap-5 px-3 md:px-4 xl:px-5 2xl:px-6">
      <DataGrid
        table={table}
        recordCount={outlets?.length || 0}
        tableClassNames={{
          edgeCell: 'px-3 md:px-4 xl:px-5',
        }}
        tableLayout={{
          columnsPinnable: true,
          columnsResizable: true,
          columnsMovable: true,
          columnsVisibility: true,
          width: 'auto',
        }}
      >
        <Card className="w-full rounded-2xl border border-border/60 shadow-sm">
          <CardHeader className="py-3.5">
            <CardTitle>Daftar Outlet</CardTitle>
          </CardHeader>
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>

      {/* Action Modal Dialog */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedRow(null);
            setCurrentModalKey(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[1200px] flex-col gap-5 overflow-y-auto">
          <DialogTitle>{currentDialogTitle}</DialogTitle>
          <DialogDescription>{currentDialogDescription}</DialogDescription>
          {(() => {
            const ActiveModal = currentModalKey
              ? ModalContents[currentModalKey]
              : null;
            return ActiveModal ? (
              <ActiveModal selected={selectedRow} closeModal={closeModal} />
            ) : null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
