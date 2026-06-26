# B2B Billing Backend

Run:

```bash
npm run server
```

Required `.env` values are shown in `.env.example`.

Main API routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|PUT /api/company`
- `GET|POST /api/customers`
- `GET|POST /api/suppliers`
- `GET|POST /api/products`
- `GET|POST /api/sales`
- `GET|POST /api/purchases`
- `GET|POST /api/expenses`
- `GET /api/dashboard`

Protected routes need:

```http
Authorization: Bearer <token>
```
