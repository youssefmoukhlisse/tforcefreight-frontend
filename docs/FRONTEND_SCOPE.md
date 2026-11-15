# Frontend scope and parity record

## Included

- Responsive shared header, alerts, navigation, dropdowns, search, customer-service banner, footer, and cookie notice.
- Home page at `/` and `/ltl/apps/Home`.
- Public service and information routes discovered from the original navigation.
- Frontend-only reconstructions of tracking, rate estimate, transit times, pickup request, and density calculator.
- Validation and explicit non-submission messages for operational forms.

## Deliberately excluded until backend approval

- Shipment status lookup and customer shipment data.
- Rate calculation, negotiated rates, quote numbers, and tariff validation.
- Pickup creation or confirmation.
- MyLTL authentication and account functionality.
- Service-center, transit-time, claims, document, and billing APIs.

## Public reference evidence

- Original desktop home reference: `test-results/reference/home-1512.png`
- Original compact home reference: `test-results/reference/home-844.png`
- Original rate-estimate reference: `test-results/reference/rate-estimate-1512.png`

The target is the highest demonstrable visual parity. A claim of literal 100% parity is not made because the original contains time-varying alerts, account-dependent states, third-party destinations, and protected backend responses.
