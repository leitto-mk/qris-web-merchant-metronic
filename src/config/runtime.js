const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;

const API_URL = getMeta('app_url') || import.meta.env.VITE_APP_API_URL;
const APP_ENV = getMeta('app_env') || import.meta.env.VITE_APP_ENV;

export { API_URL, APP_ENV };