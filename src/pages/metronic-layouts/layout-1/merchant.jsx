import moment from 'moment';
import ImagePrintService from '@/services/ImagePrintService.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card.jsx';
import { GridBackground } from '@/components/ui/grid-background.jsx';
import { Marquee } from '@/components/ui/marquee.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { TypingText } from '@/components/ui/typing-text.jsx';
import { useAppData } from '@/context/AppDataContext.jsx';


export function MerchantPage() {
  const { merchant, outlets, loading } = useAppData();

  const handlePrint = (base64) => {
    ImagePrintService.base64(base64);
  }

  return (
    <div className={`my-2 mx-8 ${outlets?.length > 1 ? 'flex flex-col gap-5' : 'flex flex-row gap-5'}`}>
    {/*<div className="my-2 mx-10 md:mx-24 flex m:flex-col lg:flex-row gap-5">*/}
      {/* LEFT ROW */}
      <div className="flex flex-col gap-5 basis-4/6">
        {/* WELCOME PANEL */}
        <GridBackground className="rounded-2xl" gridSize="9:4">
          {/* WELCOME TITLE */}
          <div className="flex flex-col gap-1 mt-12 ml-12 mr-5 mb-12">
            {/*<span className="text-base 2xl:text-2xl text-slate-100 opacity-90">Selamat Datang,</span>*/}
              <TypingText
                text="Selamat Datang,"
                className="text-base md:text-lg xl:text-xl text-slate-100 opacity-90"
                speed={60}
                showCursor={true}
                cursorClassName=""
              />
            {merchant && (
              <h1 className="text-base md:text-2xl xl:text-3xl 2xl:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-fuchsia-400 bg-clip-text text-transparent animate-fade-in">
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent uppercase">
                  { merchant.MRCName }
                </span>
              </h1>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex flex-row justify-between gap-2 ml-5 mr-5 mb-10">
            {outlets && (
              <div className="flex flex-col text-center m-5 w-full group/outlet">
                <div className="text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl text-slate-100 font-semibold">{outlets.length}</div>
                <div className="text-sm md:text-base xl:text-2xl text-slate-100 opacity-90">OUTLET</div>
              </div>
            )}
            {outlets && (
              <div className="flex flex-col text-center m-5 w-full group/terminal">
                <div className="text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl text-slate-100 font-semibold">{ outlets.reduce((sum, outlet) => sum + (outlet.terminal?.length ?? 0), 0) }</div>
                <div className="text-sm md:text-base xl:text-2xl text-slate-100 opacity-90">TERMINAL</div>
              </div>
            )}
            {outlets && (
              <div className="flex flex-col text-center m-5 w-full group/date">
                <div className="lg:text-base xl:text-4xl 2xl:text-5xl text-slate-100 font-semibold">
                  {moment(outlets[0]?.tanggal_terdaftar).format(
                    'YYYY-MM-DD',
                  ) || null}
                </div>
                <div className="text-sm md:text-base xl:text-2xl text-slate-100 opacity-90">TERDAFTAR</div>
              </div>
            )}
          </div>
        </GridBackground>

        {/* MULTIPLE IMAGE PANEL */}
        {outlets?.length > 1 && (
          <div className="relative flex w-full flex-col items-center justify-center gap-1 overflow-hidden py-2">
            {/* Marquee moving left to right (default) */}
            <Marquee pauseOnHover repeat={3} className="[--duration:120s]">
              {outlets.map((outlet) => (
                <div className="group/overlay relative">
                  <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover/overlay:opacity-100 transition-opacity duration-300">
                    <Button className="text-xs md:text-sm xl:text-base" variant="outline" onClick={() => handlePrint(outlet?.qris?.qr_base64)}>Print / Download</Button>
                  </div>
                  <img src={outlet?.qris?.qr_base64} aria-label="QRIS Image" className="w-[13rem] md:w-[15rem] xl:w-[18rem] 2xl:w-[19rem] object-contain rounded-xl" alt="Qris-Image" />
                </div>
              ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-background/95 to-transparent"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-background/95 to-transparent"></div>
            <div className="pointer-events-none absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-background/90 to-transparent"></div>
            <div className="pointer-events-none absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-background/90 to-transparent"></div>
          </div>
        )}

        {/* OWNER DETAIL PANEL */}
        <div className="flex flex-col md:flex-row gap-5 justify-between">
          <Card className="w-full" variant="accent">
            <CardHeader>
              <CardHeading>
                <CardTitle>Informasi Merchant</CardTitle>
              </CardHeading>
            </CardHeader>
            <CardContent className="py-1">
              <div className="flex flex-col gap-4 p-5">
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">Alamat</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full">
                      {`${outlets[0]?.outlatAddress}, ${outlets[0]?.kota} ${outlets[0]?.kdPost}`}
                    </div>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">KTP</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full">{outlets[0]?.ktp ?? '-'}</div>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">NPWP</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full">{outlets[0]?.npwp ?? '-'}</div>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">No. HP</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full">{outlets[0]?.phonenum}</div>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">Email</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full">{outlets[0]?.email}</div>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">Legalitas Usaha</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full uppercase">
                      {outlets[0]?.legalitas_usaha}
                    </div>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">No. Legalitas Usaha</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full">
                      {outlets[0]?.no_legalitas_usaha ?? '-'}
                    </div>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">No. Rekening</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full">{outlets[0]?.acc_no}</div>
                  )}
                </div>
                <div className="flex flex-row gap-4">
                  <div className="font-bold w-3/4">Nama Pemilik Rekening</div>
                  {loading || !outlets || outlets.length === 0 ? (
                    <div className="w-full">
                      <Skeleton className="h-2 w-[175px]" />
                    </div>
                  ) : (
                    <div className="w-full">{outlets[0]?.acc_name}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RIGHT ROW / IMAGE PANEL */}
      <div className="flex flex-col basis-2/6">
        <div className="p-1 flex flex-col flex-wrap gap-2 group/overlay relative">
          {outlets?.length === 1 && (
            <>
              <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover/overlay:opacity-100 transition-opacity duration-300">
                <Button variant="outline" onClick={() => handlePrint(outlets[0]?.qris?.qr_base64)}>Print / Download</Button>
              </div>
              <img src={outlets[0]?.qris?.qr_base64} aria-label="QRIS Image" className="w-full object-contain rounded-xl" alt="Qris-Image" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
