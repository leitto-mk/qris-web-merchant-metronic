import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppData } from '@/context/AppDataContext.jsx';
import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Check, EllipsisVertical, Eye, EyeClosed, Key, LoaderCircleIcon, UserRoundIcon, UserRoundMinus, UserRoundPen, UserRoundPlusIcon, X } from 'lucide-react';
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
import { Stepper, StepperContent, StepperIndicator, StepperItem, StepperNav, StepperPanel, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ModalContents = {
  AddDeviceModalContent: ({ selected, closeModal }) => {
    const queryClient = useQueryClient();
    const steps = [{ title: 'Ketentuan' }, { title: 'Konfirmasi' }, { title: 'Kirim' }];
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [onShow, setOnShow] = useState(false);
    const [confirmPwd, setConfirmPwd] = useState('');
    const [emailFailAttempts, setEmailFailAttempts] = useState(
      Number(selected?.email_fail_attempts ?? 0)
    );

    const confirmPassword = async () => {
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
        console.error('Konfirmasi password gagal:', error?.response?.data?.errors ?? error);
      } finally {
        setLoading(false);
      }
    };

    const addTerminal = async () => {
      try {
        setLoading(true);
        const session = AuthService.retrieveSession();
        if (!session || !session.kd_user) {
          throw new Error('Sesi pengguna tidak tersedia. Silakan login kembali.');
        }

        await axiosInstance().post('/terminal/create', {
          kdUser: session.kd_user,
          outlet: selected.XID
        });
        // Invalidate outlets query so the UI refreshes with the latest outlet terminals
        // Close modal after successful request
        closeModal();
      } catch (error) {
        setEmailFailAttempts(emailFailAttempts+1);
        console.error('Penambahan Terminal gagal:', error?.response?.data?.errors ?? error);
      } finally {
        selected.outlet_confirmed_add_device = false;
        setLoading(false);
      }
    };

    return (
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
                                Username untuk perangkat baru akan dikirimkan pada
                                email yang telah terdaftar
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
                                Apabila user yang sudah terdaftar ingin melakukan
                                perubahan, maka akan dilakukan oleh user Admin
                                Merchant
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">5.</div>
                              <div>
                                Ketentuan pengamanan username dan password adalah
                                kewajiban pemegang user
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">6.</div>
                              <div>
                                Sehubungan dengan pengelolaan user, merchant
                                bertanggung jawab sepenuhnya atas segala transaksi
                                qris yang terjadi melalui perangkat
                              </div>
                            </div>
                            <div className="flex flex-row gap-3">
                              <div className="font-bold">7.</div>
                              <div>
                                Atas pengelolaan ini, membebaskan bank dari risiko
                                penyalahgunaan user dan password
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
                                  if (e.key === 'Enter' && !loading && confirmPwd) {
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
                              ) : null}
                              {loading ? 'Memproses...' : 'Konfirmasi'}
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
                          <Button onClick={addTerminal}>Lanjutkan</Button>
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
                        {selected?.outlet_confirmed_add_device ? (
                          <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 p-5 h-full w-full">
                            Username akan dikirimkan pada email berikut:
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
                        {selected?.outlet_confirmed_add_device &&
                        emailFailAttempts > 0 ? (
                          <Button
                            variant="outline"
                            onClick={addTerminal}
                            disabled={loading}
                          >
                            {loading ? (
                              <LoaderCircleIcon className="size-4 animate-spin" />
                            ) : null}
                            {loading ? 'Mengirim...' : 'Kirim Lagi'}
                          </Button>
                        ) : (
                          <span />
                        )}

                        {selected?.outlet_confirmed_add_device ? (
                          <DialogClose asChild>
                            <Button variant="mono" disabled={loading || loading}>
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
    );
  },
  ResetTerminalModalContent: ({ selected, closeModal }) => {
    const [loading, setLoading] = useState(false);
    const [resetDeviceXID, setResetDeviceXID] = useState('');

    const terminalOptions = (selected?.terminal ?? []).filter(
      (item) => item?.TerminalID !== 'A01'
    );

    const resetDeviceTerminal = async () => {
      try {
        setLoading(true);

        if (!resetDeviceXID) throw new Error('Terminal harus dipilih');

        const session = AuthService.retrieveSession();
        if (!session || !session.kd_user) {
          throw new Error('Sesi pengguna tidak tersedia. Silakan login kembali.');
        }

        await axiosInstance().post('/terminal/reset/device', {
          kdUser: session.kd_user,
          XID: resetDeviceXID,
        });

        // Close modal after successful request
        closeModal();
      } catch (error) {
        console.error('Gagal mereset perangkat:', error?.response?.data?.errors ?? error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
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
                    {`${(item.kd_user || '').toUpperCase()} [${item.TerminalID}]`}
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
          <Button onClick={resetDeviceTerminal} disabled={loading || !resetDeviceXID}>
            {loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            {loading ? 'Memproses...' : 'Reset Perangkat'}
          </Button>
        </div>
      </div>
    );
    },
    ResetPasswordTerminalModalContent: ({ selected, closeModal }) => {
      const [loading, setLoading] = useState(false);
      const [merchantUser, setMerchantUser] = useState('');

  const merchantUserOptions = (selected?.terminal ?? []).filter(
    (item) => item?.TerminalID !== 'A01'
  );

  const resetPasswordTerminal = async () => {
    try {
      setLoading(true);
      if (!merchantUser) throw new Error('User Merchant harus dipilih');

      const session = AuthService.retrieveSession();
      if (!session || !session.kd_user) {
        throw new Error('Sesi pengguna tidak tersedia. Silakan login kembali.');
      }

      await axiosInstance().post('/terminal/reset/password', {
        kdUser: session.kd_user,
        merchant_user: merchantUser,
      });

      // Close modal after successful request
      closeModal();
    } catch (error) {
      console.error('Gagal reset password:', error?.response?.data?.errors ?? error);
    } finally {
      setLoading(false);
    }
  };

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
                <SelectItem key={item.kd_user} value={item.kd_user} className="uppercase">
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
        <Button onClick={resetPasswordTerminal} disabled={loading || !merchantUser}>
          {loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
          {loading ? 'Memproses...' : 'Reset Password'}
        </Button>
      </div>
    </div>
  );
}
}

function buildActionsMenu(row, openModal) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" mode="icon" shape="circle">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuItem className="cursor-pointer" onClick={row.getToggleExpandedHandler()}>
          {row.getIsExpanded() ? <X /> : <UserRoundIcon />}
          <span>{row.getIsExpanded() ? 'Tutup Details' : 'Details' }</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => openModal('AddDeviceModalContent', row)}>
          <UserRoundPlusIcon />
          <span>Tambah Perangkat</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => openModal('ResetTerminalModalContent', row)}>
          <UserRoundPen />
          <span>Reset Perangkat</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => openModal('ResetPasswordTerminalModalContent', row)}>
          <UserRoundMinus />
          <span>Reset User Password</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function buildExpandedDetails(merchant, data) {
  return (
    <div className="flex flex-col 2xl:flex-row gap-10 m-5">

      {/* QR IMAGE */}
      <div className="flex flex-col gap-1">
        <div className="group/overlay relative">
          <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover/overlay:opacity-100 transition-opacity duration-300">
            <Button className="text-xs md:text-sm xl:text-base" variant="outline" onClick={() => ImagePrintService.base64(data.qris?.qr_base64)}>Print / Download</Button>
          </div>
          <img src={data?.qris?.qr_base64} aria-label="QRIS Image" className="w-[13rem] md:w-[15rem] xl:w-[18rem] 2xl:w-[19rem] object-contain rounded-xl" alt="Qris-Image" />
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex flex-col gap-5">

        {/* OUTLET INFOS */}
        <div className="flex flex-col 2xl:flex-row gap-5">

          {/* LEFT CARD */}
          <Card className="inline-block w-[50rem] 2xl:w-[35rem]" variant="accent">
            <CardHeader>
              <CardHeading>
                <div className="font-bold uppercase">Outlet Info</div>
              </CardHeading>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Cabang</span>
                <Badge>{data.branchInfo.ket}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Nama Merchant</span>
                <span className="uppercase">{merchant.MRCName}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Nama Outlet</span>
                <span className="uppercase">{data.outlatName}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Tipe Usaha</span>
                <span>{data.tipe_usaha === "INDIVIDU" ? "INDIVIDU" : "BADAN USAHA"}</span>
              </div>
              {data.tipe_usaha === 'BADAN_USAHA' && (
                <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                  <span>Institusi</span>
                  <span>{data.nama_institusi || '-'}</span>
                </div>
              )}
              {data.tipe_usaha === 'BADAN_USAHA' && data.kategori === 'PEMDA' && (
                <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                  <span>PEMDA</span>
                  <span>{data.pemda || '-'}</span>
                </div>
              )}
              {data.tipe_usaha === 'BADAN_USAHA' && data.kategori === 'PEMDA' && (
                <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                  <span>DINAS</span>
                  <span>{data.dinas || '-'}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Kategori</span>
                <span>{data.kategori || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Kriteria Merchant</span>
                <Badge>{data.kriteria}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>MCC</span>
                <Badge variant="secondary">{data.mcc || '-'}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>MPAN</span>
                <span>{data.MPAN || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>MID</span>
                <span>{data.MID || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>NMID</span>
                <span>{data.nmid || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT CARD */}
          <Card className="inline-block w-[50rem] 2xl:w-[35rem]" variant="accent">
            <CardHeader>
              <CardHeading>
                <div className="font-bold uppercase">Informasi Pemilik</div>
              </CardHeading>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Alamat</span>
                <span label="Alamat">{`${data.outlatAddress}, ${data.kota} ${data.kdPost}`}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>KTP</span>
                <span label="KTP">{data.ktp ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>NPWP</span>
                <span>{data.npwp ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>No. HP</span>
                <span>{data.phonenum}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Email</span>
                <span>{data.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Legalitas Usaha</span>
                <span>{data.legalitas_usaha}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>No. Legalitas Usaha</span>
                <span>{data.no_legalitas_usaha ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>No. Rekening</span>
                <span>{data.acc_no}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed last:border-none">
                <span>Nama Pemilik Rekening</span>
                <span>{data.acc_name}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-[50rem] 2xl:w-[30rem]" variant="accent">
          <CardHeader>
            <CardHeading>
              <div className="font-bold uppercase">Terminals</div>
            </CardHeading>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* TERMINAL LIST */}
            <div className="flex flex-row gap-4">
              <div className="flex font-bold w-2/5">Terminal</div>

              <div className="flex flex-wrap gap-2">
                {data.terminal.map((terminal) => (
                  <Badge value={terminal.TerminalID} variant="secondary" size="lg">{terminal.TerminalID}</Badge>
                ))}
              </div>
            </div>

            {/* MERCHANT USERS */}
            <div className="flex flex-row gap-4">
              <div className="flex font-bold w-2/5">Merchant User</div>

              <div className="flex flex-wrap gap-2">
                {data.terminal
                  .filter((t) => t.TerminalID !== "A01")
                  .map((t) => (
                    <Badge className="uppercase" variant="secondary" size="lg">{t.kd_user}</Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function OutletPage() {
  const { merchant, outlets } = useAppData();

  const [sorting, setSorting] = useState([{ id: 'outlatName', desc: true }]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [currentModalKey, setCurrentModalKey] = useState(null);

  // Modal metadata for dynamic titles and descriptions
  const modalMeta = useMemo(() => ({
    AddDeviceModalContent: {
      title: 'Tambah Perangkat',
      description: 'Ikuti langkah untuk menambahkan perangkat baru pada outlet terpilih.',
    },
    ResetTerminalModalContent: {
      title: 'Reset Perangkat',
      description: 'Pilih terminal perangkat yang akan direset.',
    },
    ResetPasswordTerminalModalContent: {
      title: 'Reset User Password',
      description: 'Pilih Merchant User untuk melakukan reset password.',
    },
  }), []);

  const { title: currentDialogTitle, description: currentDialogDescription } = useMemo(() => {
    const meta = currentModalKey ? modalMeta[currentModalKey] : null;
    const outletName = selectedRow?.outlatName || selectedRow?.namaOutlet;
    const titleWithContext = meta?.title
      ? `${meta.title}${outletName ? ` • ${String(outletName).toUpperCase()}` : ''}`
      : '';
    return {
      title: titleWithContext,
      description: meta?.description ?? '',
    };
  }, [currentModalKey, selectedRow, modalMeta]);

  const openModal = (key, row) => {
    setSelectedRow(row?.original ?? row);
    setCurrentModalKey(key);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
    setCurrentModalKey(null);
  };

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
              variant={`${data.getValue().length > 0 ? 'success' : 'secondary'}`}
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
        cell: ({row}) => {
          return row.getCanExpand() ? buildActionsMenu(row, openModal) : null;
        },
        // Make the Actions column fit its content (no wrapping and minimal width)
        meta: {
          headerClassName: 'whitespace-nowrap w-0',
          cellClassName: 'whitespace-nowrap w-0',
          expandedContent: (row) => buildExpandedDetails(merchant, row),
        },
      },
    ],
    [outlets],
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

  return (
    <div className="my-2 mx-8 flex flex-wrap gap-5">
      <DataGrid
        table={table}
        recordCount={outlets?.length || 0}
        tableClassNames={{
          edgeCell: 'px-5',
        }}
        tableLayout={{
          columnsPinnable: true,
          columnsResizable: true,
          columnsMovable: true,
          columnsVisibility: true,
        }}
      >
        <Card>
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
        <DialogContent className="max-w-[800px] flex flex-col gap-5">
          <DialogTitle>{currentDialogTitle}</DialogTitle>
          <DialogDescription>{currentDialogDescription}</DialogDescription>
          {(() => {
            const ActiveModal = currentModalKey ? ModalContents[currentModalKey] : null;
            return ActiveModal ? (
              <ActiveModal
                selected={selectedRow}
                closeModal={closeModal}
              />
            ) : null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
