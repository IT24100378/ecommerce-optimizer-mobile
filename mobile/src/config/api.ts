// API base URL configuration for mobile builds.
// Cloud-first API config for React Native CLI builds.
const CLOUD_API_BASE_URL = 'https://ecommerce-optimizer-backend-production.up.railway.app';
const LOCAL_ANDROID_EMULATOR_API_BASE_URL = 'http://10.0.2.2:5000';

// Set true only when you intentionally want to test against a local backend.
const USE_LOCAL_API = false;

export const API_BASE_URL = USE_LOCAL_API
    ? LOCAL_ANDROID_EMULATOR_API_BASE_URL
    : CLOUD_API_BASE_URL;
