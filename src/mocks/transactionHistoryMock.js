// Simple mock generator for transaction history data
// Usage: generateTransactionHistory({ count: 50, from: Date, to: Date, merchant })

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const devices = ['QRIS Static', 'QRIS Dynamic', 'MPOS', 'Mobile'];
const outlets = ['Outlet Pusat', 'Outlet Sudirman', 'Outlet Thamrin', 'Outlet Kemang', 'Outlet Kelapa Gading'];

function randomAccount() {
  // 10-16 digit account number
  const len = randInt(10, 16);
  let s = '';
  for (let i = 0; i < len; i++) s += randInt(0, 9);
  return s;
}

function randomName() {
  const first = ['Budi', 'Siti', 'Andi', 'Dewi', 'Rina', 'Rudi', 'Agus', 'Rizky', 'Wulan', 'Fajar'];
  const last = ['Santoso', 'Putri', 'Saputra', 'Lestari', 'Pratama', 'Hidayat', 'Maulana', 'Wibowo', 'Siregar', 'Wijaya'];
  return `${first[randInt(0, first.length - 1)]} ${last[randInt(0, last.length - 1)]}`;
}

function randomRRN() {
  // 12-16 char numeric reference
  const len = randInt(12, 16);
  let s = '';
  for (let i = 0; i < len; i++) s += randInt(0, 9);
  return s;
}

function randomTerminal() {
  return `T${randInt(100000, 999999)}`;
}

export default function generateTransactionHistory({ count = 50, from, to, merchant } = {}) {
  const start = from instanceof Date ? from.getTime() : Date.now() - 7 * 24 * 60 * 60 * 1000;
  const end = to instanceof Date ? to.getTime() : Date.now();
  const minTs = Math.min(start, end);
  const maxTs = Math.max(start, end);

  const arr = [];
  for (let i = 0; i < count; i++) {
    const ts = randInt(minTs, maxTs);
    const amount = randInt(10_000, 2_000_000); // 10K — 2M IDR
    const device = devices[randInt(0, devices.length - 1)];
    const outlet = outlets[randInt(0, outlets.length - 1)];
    const terminal = randomTerminal();
    const rrn = randomRRN();
    const fromname = randomName();
    const fromacc = randomAccount();
    const toacc = randomAccount();

    arr.push({
      timestamprq: new Date(ts).toISOString(),
      amount,
      device,
      outlet,
      terminal,
      rrn,
      fromname,
      fromacc,
      toacc,
      merchant: merchant?.XID ?? null,
    });
  }
  return arr;
}
