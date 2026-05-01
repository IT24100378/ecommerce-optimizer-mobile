# Mobile Release Checklist (P2 QA + Rollout)

## 1) Pre-release Gate

- [ ] Set feature flags in `src/config/featureFlags.ts`:
  - `enableProductDeepLinks`
  - `enableMerchandisingRails`
- [ ] Run static checks:
  - `npm run lint`
  - `npm test -- --watch=false`

## 2) Staging Rollout

### Phase 1 (low-risk)

- [ ] `enableProductDeepLinks=true`
- [ ] `enableMerchandisingRails=false`
- [ ] Deploy to staging build.

Deep-link smoke:

Android:

```powershell
adb shell am start -W -a android.intent.action.VIEW -d "ecomoptimizer://products/1"
```

iOS Simulator:

```bash
xcrun simctl openurl booted "ecomoptimizer://products/1"
```

Expected:
- App opens Product Detail.
- Product loads when opened cold and warm.
- Invalid id shows not-found state without crash.

### Phase 2 (merchandising)

- [ ] `enableMerchandisingRails=true`
- [ ] Deploy to staging build.

Merchandising smoke:
- [ ] Home (`All`) shows `Exclusive Offers` if any `isOnPromotion` products exist.
- [ ] Home (`All`) shows featured rails (`Mobile Phones`, `Laptops`, `TV`) when matching products exist.
- [ ] Rails do not appear when category filter is not `All`.
- [ ] Add-to-cart works from rails, including stock-cap alerts.

## 3) Regression Checklist

- [ ] Guest checkout: cart -> details -> payment -> success.
- [ ] Auth checkout: sign in -> orders visible -> order placement works.
- [ ] Promo code apply/remove works in cart.
- [ ] Product detail review create/edit/delete flows still work.
- [ ] Admin Promotions tester (`/api/promotions/apply`) works with valid + invalid codes.
- [ ] Admin module navigation remains functional.

## 4) Production Rollout

- [ ] Release with Phase 1 flags first:
  - `enableProductDeepLinks=true`
  - `enableMerchandisingRails=false`
- [ ] Monitor crash/error logs and checkout/order funnel for at least 24h.
- [ ] If stable, enable Phase 2:
  - `enableMerchandisingRails=true`

Rollback:
- If issues are isolated to merchandising, set `enableMerchandisingRails=false`.
- If deep-link regressions appear, set `enableProductDeepLinks=false`.

