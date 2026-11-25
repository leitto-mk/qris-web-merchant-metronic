export const throttle = (func, limit) => {
  let lastFunc = null;
  let lastRan = null;

  return function (...args) {
    if (lastRan === null) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      if (lastFunc !== null) {
        clearTimeout(lastFunc);
      }
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan),
      );
    }
  };
};

export function debounce(func, wait) {
  let timeout = null;

  return function (...args) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function uid() {
  return (Date.now() + Math.floor(Math.random() * 1000)).toString();
}

export function getInitials(name, count) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase());

  return count && count > 0
    ? initials.slice(0, count).join('')
    : initials.join('');
}

export function toAbsoluteUrl(pathname) {
  const baseUrl = import.meta.env.BASE_URL;

  if (baseUrl && baseUrl !== '/') {
    return import.meta.env.BASE_URL + pathname;
  } else {
    return pathname;
  }
}

export function timeAgo(date) {
  const now = new Date();
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((now.getTime() - inputDate.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600)
    return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) > 1 ? 's' : ''} ago`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
  if (diff < 604800)
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
  if (diff < 2592000)
    return `${Math.floor(diff / 604800)} week${Math.floor(diff / 604800) > 1 ? 's' : ''} ago`;
  if (diff < 31536000)
    return `${Math.floor(diff / 2592000)} month${Math.floor(diff / 2592000) > 1 ? 's' : ''} ago`;

  return `${Math.floor(diff / 31536000)} year${Math.floor(diff / 31536000) > 1 ? 's' : ''} ago`;
}

export function formatDate(input) {
  const date = new Date(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(input) {
  const date = new Date(input);
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
}

// Tag 62 sub-tags 05/06/08 from the transaction report; shown only for outlets with kriteria URE
// [response key, column label, EMVCo explanation]
export const URE_LABELS = [
  ['reference_label_05', 'Reference Label', 'EMVCo tag 62, sub-tag 05: reference for this payment set by the merchant, e.g. an invoice or bill number.'],
  ['customer_label_06', 'Customer Label', 'EMVCo tag 62, sub-tag 06: identifies the customer, e.g. a customer ID or member number.'],
  ['purpose_transaction_08', 'Purpose Transaction', 'EMVCo tag 62, sub-tag 08: the purpose of the payment.'],
];

// blanks the URE labels on a report row unless its outlet is URE
export const ureOnly = (tx, kriteria) =>
  kriteria === 'URE' ? tx : { ...tx, ...Object.fromEntries(URE_LABELS.map(([key]) => [key, null])) };

export const hasUreLabels = (rows) => rows.some((tx) => URE_LABELS.some(([key]) => tx[key]));
