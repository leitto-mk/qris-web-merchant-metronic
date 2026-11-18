<div align="center">

# QRIS Web Merchant · Front-End

**Portal merchant QRIS Bank SulutGo: admin merchant mengelola outlet & terminal, terminal (kasir) membuat QR pembayaran.**

![React](docs/badges/react.svg)
![Vite](docs/badges/vite.svg)
![Tailwind](docs/badges/tailwind.svg)
![Docker](docs/badges/docker.svg)

</div>

> Satu portal untuk dua jenis user: admin merchant melihat outlet, laporan, dan mengatur terminal; terminal menampilkan QR pembayaran ke pelanggan.

<p align="center"><img src="docs/flow.svg" alt="Alur QRIS Web Merchant" width="100%"></p>

| | |
|---|---|
| 🏪 **Merchant & Outlet** | Data merchant, daftar outlet, dan binding terminal |
| 📊 **Report** | Histori transaksi dengan total jumlah & nominal per outlet |
| 🧾 **Terminal & QR** | Halaman kasir untuk generate QR dinamis, plus layar QR untuk pelanggan |
| 🔐 **Device Key** | Terminal terikat ke browser lewat WebAuthn (Windows Hello / security key), alur lengkap di 3.2 |
| 🐳 **Satu Image untuk Semua Env** | URL backend diisi saat runtime lewat env `APP_URL` |

Back-End: [**qris-web-merchant-api**](https://gitea.dev.bsg.id/michio/qris-merchant-public-api)

## 1. DEVELOPMENT REQUIREMENTS
- [**React 19**](https://react.dev)
- [**Vite 7**](https://vite.dev)
- [**NodeJs**](https://nodejs.org) (image memakai Node 20)
- [**qris-web-merchant-api**](https://gitea.dev.bsg.id/michio/qris-merchant-public-api) (Back-End)

## 2. LOCAL INSTALLATION STEPS
- Download repo **qris-web-merchant-metronic**
- Buat `.env` berisi URL backend:
    ```
    VITE_APP_API_URL=http://localhost:30020
    VITE_APP_ENV=local
    ```
- Jalankan perintah berikut untuk menginstall package pada **package.json**:
    ```bash
    npm install --legacy-peer-deps
    ```
- Jalankan perintah berikut untuk menjalankan aplikasi secara local (`http://localhost:5173`):
    ```bash
    npm run dev
    ```

- Jalankan perintah berikut untuk melakukan *manual build*:
    ```bash
    npm run build
    ```

Backend lokal dijalankan dari repo **qris-web-merchant-api** (`docker-compose.local.yaml`), yang juga menjalankan image FE ini di `http://localhost:30010`.

## 3. STRUKTUR APLIKASI
Hanya file inti aplikasi. Layout bawaan template Metronic lainnya (`pages/metronic-layouts/layout-*`, `components/layouts/layout-*`) tidak dipakai di router.

```
qris-web-merchant-metronic/
├── src/
│   ├── main.jsx, App.jsx              # Bootstrap React
│   ├── config/runtime.js              # API_URL & APP_ENV dari meta tag, fallback ke VITE_APP_*
│   ├── routing/
│   │   └── app-routing-setup.jsx      # Daftar route + guard session (lihat 3.1)
│   ├── services/
│   │   ├── AxiosInstance.js           # Axios ke `${API_URL}/api/v1/mrchadmin`, toast per endpoint
│   │   ├── AuthService.js             # Login, logout, validasi session
│   │   ├── CryptoService.js           # Record key terminal di IndexedDB, browser key RSA (Web Crypto)
│   │   ├── WebAuthnService.js         # Windows Hello / security key: daftar & tanda tangan challenge
│   │   ├── QRService.js               # Render QR
│   │   └── ImagePrintService.js       # Cetak gambar QR
│   ├── context/AppDataContext.jsx     # Data merchant/outlet bersama
│   ├── pages/
│   │   ├── auth/login.jsx             # /login
│   │   └── metronic-layouts/
│   │       ├── layout-1/              # Admin: merchant.jsx, outlets.jsx, merchant-report.jsx
│   │       └── layout-32/             # Terminal: terminal-page.jsx, terminal-qr-display.jsx
│   └── components/layouts/
│       ├── layout-1/                  # Kerangka halaman admin
│       └── layout-32/                 # Kerangka halaman terminal
├── index.html                         # Meta `app_url` & `app_env` disisipkan saat build image
├── nginx.conf                         # SSI: mengisi meta dari env APP_URL & APP_ENV saat runtime
├── Dockerfile                         # Build Vite -> image nginx
├── changelogs.txt                     # Ditulis otomatis oleh deploy.sh
└── deploy.sh                          # Versioning, git tag, build & push image
```

**APP_URL**: URL backend tidak di-hardcode saat build. Container membaca env `APP_URL` dan `APP_ENV`, nginx (SSI) menuliskannya ke meta `app_url` / `app_env` pada `index.html`, lalu dibaca oleh `src/config/runtime.js`. Satu image bisa dipakai di semua environment.

### 3.1 Route
| Route | User | Halaman |
|-------|------|---------|
| `/login` | Semua | Login admin & terminal |
| `/merchant` | Admin | Data merchant |
| `/outlet` | Admin | Daftar outlet & terminal |
| `/report` | Admin | Histori transaksi |
| `/terminal/outlet`, `/terminal/pembayaran` | Terminal | Generate QR pembayaran |
| `/terminal/qr-display` | Terminal | Layar QR untuk pelanggan |

Route hanya untuk tampilan. Hak akses sebenarnya dicek di backend.

### 3.2 Alur Login
Lima alur login admin dan terminal (kasir), dari FE [**qris-web-merchant-metronic**](https://gitea.dev.bsg.id/michio/qris-merchant-public-metronic) sampai BE [**qris-web-merchant-api**](https://gitea.dev.bsg.id/michio/qris-merchant-public-api). Isi yang sama ada di README kedua repo.

| Kolom | Isi |
|-------|-----|
| **User** | Admin, kasir, dan authenticator OS (Windows Hello / Touch ID / security key) |
| **login.jsx** | FE `src/pages/auth/login.jsx` (alur 5 juga `pages/metronic-layouts/layout-1/outlets.jsx`) |
| **FE services** | FE `src/services/AuthService.js`, `WebAuthnService.js`, `CryptoService.js` |
| **Controller** | BE `app/Http/Controllers/AuthController.php` (alur 5 juga `MerchantController.php`) |
| **Actions · DB** | BE `app/Actions/*` dan tabel `MERCHENTUSER` |

Aturan utama:
- **Admin** login hanya dengan password (boleh diisi password manager browser). Admin tidak punya device key.
- **Terminal yang sudah terikat** tidak pernah mendapat session dari password saja: `POST /login` menjawab `CHALLENGE_REQUIRED`, lalu browser harus menandatangani challenge dengan key-nya.
- **Browser hanya bisa diikat** lewat PIN dari email (terminal baru, reset password, atau Reset Device web oleh admin), atau dalam jendela `BSG_APP_QRIS_RESET_EXP_SECOND` setelah password baru diset (untuk mengulang jika prompt Windows Hello dibatalkan).
- **Masa berlaku key bergeser**: setiap login dengan key memperpanjang `WEB_KEY_EXP_DAYS`. Hanya terminal yang tidak login selama itu yang perlu Reset Device oleh admin.

#### 1. Admin: login pertama
Akun admin berstatus 3 (dibuat lewat import acquirer, atau setelah reset password).

```mermaid
sequenceDiagram
    autonumber
    actor U as Admin
    participant P as login.jsx
    participant S as FE services
    participant C as AuthController
    participant A as Actions · DB
    Note over C,A: status 3 (import / reset password)
    U->>P: password sementara
    P->>S: AuthService.login()
    S->>C: POST /login
    Note over C,A: Hash::check · status 3
    C->>A: IssueLoginToken
    C-->>S: session · status 3
    P-->>U: form password baru
    U->>P: password baru ×2
    P->>S: AuthService.confirmReset()
    S->>C: POST user/reset
    Note over C,A: resetConfirm()
    C->>A: ChangePassword (status 1, expiry dihapus)
    P-->>U: kembali ke form login (lanjut alur 2)
```

#### 2. Admin: login normal
```mermaid
sequenceDiagram
    autonumber
    actor U as Admin
    participant P as login.jsx
    participant S as FE services
    participant C as AuthController
    participant A as Actions · DB
    U->>P: username (blur)
    P->>S: AuthService.checkReset()
    S->>C: POST login/check
    C-->>S: expired_at null (bukan mode PIN)
    U->>P: password (atau autofill password manager)
    P->>S: AuthService.login()
    S->>C: POST /login
    Note over C,A: rate limit · Hash::check<br/>isLocked · resetExpired
    C->>A: IssueLoginToken
    C-->>S: session cookie (header token di APP_ENV=local)
    P-->>U: tawarkan simpan password (PasswordCredential)
    P-->>U: dashboard /
```

#### 3. Terminal: login pertama
PIN 6 digit dikirim ke email outlet saat terminal dibuat (`CreateTerminal`) atau di-reset (`ResetTerminalPassword`, juga lewat Reset Device web).

```mermaid
sequenceDiagram
    autonumber
    actor U as Kasir · OS
    participant P as login.jsx
    participant S as FE services
    participant C as AuthController
    participant A as Actions · DB
    A-->>U: email PIN 6 digit ke outlet
    U->>P: username · PIN
    P->>S: AuthService.login()
    S->>C: POST /login
    C-->>S: session · status 3
    P-->>U: form password baru
    U->>P: password baru ×2
    S->>C: POST user/reset
    C->>A: ChangePassword
    Note over C,A: INACTIVE<br/>jendela daftar dibuka
    P->>S: chooseRegistrationMethod()
    S->>C: GET user/challenge
    Note over C,A: WebSignature::createChallenge<br/>challenge disimpan di cache
    S-->>U: prompt Windows Hello (WebAuthnService.create)
    U->>S: sidik jari / PIN perangkat
    S->>C: POST user/register-web-key
    Note over C,A: cek password · takeChallenge<br/>WebAuthn::verifyRegistration
    C->>A: RegisterWebKey
    Note over C,A: ACTIVE<br/>expiry +WEB_KEY_EXP_DAYS<br/>jendela daftar ditutup
    S->>S: CryptoService.saveKeys() ke IndexedDB
    P-->>U: /terminal/outlet
```

- **Prompt Windows Hello dibatalkan**: kasir bisa login lagi dengan password baru selama jendela daftar masih terbuka. Setelah itu muncul *PIN telah kadaluarsa* dan admin perlu reset lagi.
- **Perangkat tanpa Windows Hello**: muncul dialog *Verifikasi perangkat tidak tersedia* dengan pilihan Security Key atau lanjut tanpa verifikasi perangkat (browser key RSA). Jika `BSG_APP_QRIS_WEB_KEY_REQUIRE_WEBAUTHN=true`, pilihan RSA ditolak dengan `WEBAUTHN_REQUIRED`.

#### 4. Terminal: login normal
```mermaid
sequenceDiagram
    autonumber
    actor U as Kasir · OS
    participant P as login.jsx
    participant S as FE services
    participant C as AuthController
    participant A as Actions · DB
    U->>P: password, atau tombol Terminal
    P->>S: CryptoService.getKeys() untuk terminal_origin
    S->>C: POST /login
    Note over C,A: terikat · key belum expired
    C-->>S: 401 CHALLENGE_REQUIRED
    P->>S: handleTerminalLogin()
    S->>C: GET user/challenge
    S-->>U: prompt Windows Hello (WebAuthnService.sign)
    U->>S: sidik jari / PIN perangkat
    S->>C: POST user/verify-challenge
    Note over C,A: takeChallenge · WebAuthn::verifyLogin<br/>status · web_status · expiry
    C->>A: sign count · expiry +WEB_KEY_EXP_DAYS
    C-->>S: session
    P-->>U: /terminal/outlet
```

- **Tombol Terminal** langsung ke `handleTerminalLogin()` (langkah 6), tanpa password.
- **`terminal_origin`** adalah user yang key-nya tersimpan di browser ini. Jika browser masih dipakai terminal aktif lain, `POST /login` ditolak sebelum challenge.

#### 5. Terminal: key expired
```mermaid
sequenceDiagram
    autonumber
    actor U as Kasir / Admin
    participant P as login.jsx / outlets.jsx
    participant S as FE services
    participant C as Controller
    participant A as Actions · DB
    U->>P: login Terminal (kasir)
    S->>C: POST user/verify-challenge
    Note over C,A: AuthController · webKeyExpired()
    C-->>S: 401 KEY_EXPIRED
    S->>S: CryptoService.clearKeys()
    P-->>U: hubungi Admin untuk Reset Device
    Note over U,C: login dengan password juga ditolak<br/>(Device Terminal belum terdaftar...)
    U->>P: Reset Perangkat Web (admin, outlets.jsx)
    S->>C: POST terminal/reset/device
    Note over C,A: MerchantController · requirePassword()
    C->>A: ResetTerminalDevice → ResetTerminalPassword
    Note over C,A: PIN baru · status 3<br/>key & session dihapus
    A-->>U: email PIN ke outlet
    Note over U: lanjut ke alur 3
```

Dari sisi bank, **Reset Password** terminal di aplikasi acquirer juga mengirim PIN baru dan menghasilkan alur yang sama.

## 4. DEPLOYMENT
- Jalankan perintah berikut untuk menjalankan proses Deployment:

    ```bash
    ./deploy.sh
    ```

    **JALANKAN SCRIPT SETELAH SEMUA PERUBAHAN DI-COMMIT.** Script akan langsung berhenti (exit 1) dan menampilkan daftar file jika masih ada perubahan yang belum di-commit maupun file *untracked*. Gunakan `git stash` untuk menyimpan sementara pekerjaan yang belum selesai, lalu `git stash pop` setelah deployment selesai.

    **note**: Proses Deployment akan melakukan tahapan berikut:
    - **Versioning**
    - **Build**
    - **Deployment**

    ### 4.1 Versioning
    Versioning secara *default* membaca versi terakhir pada baris pertama `changelogs.txt` lalu menaikkan patch sebanyak 1 (contoh: `0.0.21` → `0.0.22`).

    Daftar perubahan diambil dari commit sejak versi sebelumnya. Commit dengan pesan yang mengandung `auto-changelogs`, `update-changelogs`, `Merge remote-tracking`, `build-unrelated:`, `unrelated-build:` atau `Revert` tidak dimasukkan ke changelog.

    Hasil versioning menghasilkan *output* berikut:

        0.0.21
            - Add PJP Logos on Report
            - Add Total Count and Sum of each Outlets in Report
            - Show only active web bindings with the green badge
        0.0.20
            - Cache merchant and outlet queries for five minutes
            - Simplify outlet detail rows and modal metadata

        ...

    Setelah `changelogs.txt` diperbarui, script otomatis akan:
    - commit dengan pesan `auto-changelogs: <version>`
    - membuat git tag `<version>` (tag lama dengan nama yang sama dihapus dan dibuat ulang)
    - push commit & tag ke remote `origin` dan `personal`

    ### 4.2 Build
    Image di-build satu kali dengan tag `latest`, kemudian image yang sama diberi tag versi:

    - `container.banksulutgo.co.id:5000/web-merchant-fe:latest`
    - `container.banksulutgo.co.id:5000/web-merchant-fe:<current_version>`

    `<current_version>` mengacu pada versi terbaru pada `changelogs.txt`. Jika build gagal, script berhenti dan tidak melakukan push.

    ### 4.3 Deployment
    Kedua tag (`latest` dan `<current_version>`) di-push ke registry **container.banksulutgo.co.id:5000**.

    Container butuh env `APP_URL` (URL backend) dan `APP_ENV`. Contoh menjalankan langsung:
    ```bash
    docker run --rm -p 8080:80 -e APP_URL=http://localhost:30020 -e APP_ENV=development container.banksulutgo.co.id:5000/web-merchant-fe:latest
    ```

    Untuk rollback, ganti tag `latest` dengan versi sebelumnya (contoh `:0.0.20`).

    ### 4.4 Parameters
    Di terminal, `deploy.sh` berjalan **interaktif** dan hanya menanyakan hal yang belum ditentukan lewat parameter (termasuk saat `--dry-run`): pilih versi dan build dengan tombol panah (↑↓ / j k / angka, Enter), lihat ringkasan beserta daftar commit yang masuk changelog, lalu konfirmasi. Pilihan pertama selalu alur versi baru (patch +1 → build & push → deploy), jadi cukup tekan Enter untuk rilis biasa. Setiap pilihan menampilkan parameter yang setara (mis. `--use-current`, `--no-build`), dan ringkasan menampilkan perintah lengkapnya untuk dijalankan ulang dengan `-y`. Setiap langkah tampil dengan spinner & durasi; jika gagal, script berhenti dan menampilkan potongan log (log lengkap ada di `/tmp/deploy-*.log`).

    | Parameter | Fungsi |
    |-----------|--------|
    | `--version <V>` / `--version=<V>` | Pakai versi tertentu untuk git tag & tag docker image |
    | `--use-current` | Pakai versi terakhir di `changelogs.txt` tanpa menaikkan versi: entry changelog diperbarui, tag dibuat ulang, image di-build & push ulang |
    | `--no-build` | Hanya changelog, commit, tag & push git, tanpa build & push docker image |
    | `--build-only` | Hanya build & push docker image untuk versi sekarang, tanpa changelog maupun git |
    | `--dry-run` | Tampilkan ringkasan & langkah yang akan dijalankan tanpa mengubah apa pun |
    | `-y`, `--yes` | Tanpa konfirmasi (wajib jika dijalankan bukan dari terminal, mis. CI) |
    | `-h`, `--help` | Bantuan |

    contoh perintah:
    ```bash
    ./deploy.sh                      # interaktif
    ./deploy.sh --version 1.0.0      # versi tertentu, konfirmasi sekali
    ./deploy.sh --use-current -y     # rebuild versi sekarang tanpa konfirmasi
    ./deploy.sh --dry-run            # cek rencana dulu
    ./deploy.sh --build-only -y      # build & push ulang image versi sekarang saja
    ```

    Jika parameter `--version` / `--use-current` tidak digunakan, versi yang dipakai adalah patch terakhir ditambah 1. Dengan `--build-only`, versi yang dipakai adalah versi sekarang.

    **Rollback otomatis**: semua langkah lokal (changelog, commit, tag, docker build) dijalankan lebih dulu, baru kemudian push (git remote → image `:<versi>` → image `:latest` paling akhir). Jika salah satu langkah gagal atau dibatalkan dengan Ctrl-C, semua langkah sebelumnya dibatalkan dengan urutan terbalik: `changelogs.txt` & commit di-reset, tag lokal dan tag/branch di remote dikembalikan ke posisi semula (`--force-with-lease`), dan tag image lokal dipulihkan. Satu-satunya yang tidak bisa dibatalkan adalah tag image yang sudah ter-push ke registry. Karena `:latest` di-push paling akhir, `:latest` hanya berubah jika seluruh deploy berhasil.
