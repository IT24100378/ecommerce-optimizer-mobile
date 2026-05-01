# Mobile Storefront

This screen is a native Android-style storefront built with React Native primitives.

## What it does
- Loads products, categories, and active promotions from the backend API.
- Displays hero slides, category chips, filters, sorting, and a product grid.
- Provides a cart bottom sheet with quantity controls and a checkout action.

## Run
```powershell
Push-Location "C:\Users\RAZNIAHAMED\Desktop\ecommerce-optimizer\mobile"
npm install
npm run android
Pop-Location
```

## Test
```powershell
Push-Location "C:\Users\RAZNIAHAMED\Desktop\ecommerce-optimizer\mobile"
npm test -- --watchAll=false
Pop-Location
```

## Notes
- The API base URL is defined in `mobile/src/storefront/store.ts` as `API_BASE_URL`.
- Buttons and cards use `Pressable` with `android_ripple` and 48x48 touch targets.

## Architecture
- Screen: `mobile/src/screens/ProductFeedScreen.tsx`
- Zustand store: `mobile/src/storefront/store.ts`
