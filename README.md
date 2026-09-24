# HealthTracker ⚖️

A self-hosted, private, and mobile-friendly Weight & Body Composition Tracker backed by a serverless Neon PostgreSQL database and Vercel serverless functions.

Designed with zero heavy frontend framework dependencies (pure HTML5, CSS3, and ES Modules) for instant mobile loading, offline-first caching, interactive canvas charts, and multi-formula health analysis.

---

## Features

- **Multi-Formula BMI Analysis**:
  - **Standard WHO BMI** ($W / H^2$) with clinical categories (Underweight, Normal, Overweight, Obese I/II/III).
  - **Oxford "New" BMI** ($1.3 \times W / H^{2.5}$) by Prof. Nick Trefethen (normalizes for tall/short heights).
  - **BMI Prime** (ratio against upper normal limit of 25.0).
- **Body Fat Percentage (%BF) Estimators**:
  - **Deurenberg Formula (1991)** based on BMI, age, and sex.
  - **Gallagher Formula (1996)** based on multi-ethnic regression data.
  - **CUN-BAE Formula (Navarra 2012)** non-linear adiposity estimator.
  - Automatic breakdown of **Fat Mass (kg)** vs. **Lean Body Mass (kg)**.
- **Ideal Body Weight (IBW) Reference Standards**:
  - Compares **Devine (1974)**, **Robinson (1983)**, **Miller (1983)**, and **Hamwi (1964)** models alongside WHO normal weight ranges.
- **Metabolic Expenditure (BMR & TDEE)**:
  - **Mifflin-St Jeor** and **Revised Harris-Benedict** basal metabolic rate.
  - Daily calorie maintenance projections across Sedentary, Light, Moderate, and Active lifestyles.
- **Exponential Moving Average (EMA) Weight Smoothing**:
  - Filters out erratic daily water-weight and sodium fluctuations to visualize your true fat loss/gain trend line.
- **Interactive Mobile Canvas Chart**:
  - Zero-dependency canvas chart with touch tooltips, 7D/30D/90D/1Y/All timeframe filters, and switchable views (Weight & Trend, Body Fat %, BMI).
- **Offline-First & Cloud Sync**:
  - Changes save instantly to `localStorage` and sync asynchronously to your private Neon PostgreSQL database.
- **Privacy & Security**:
  - Password-gated with timing-safe HMAC-SHA256 signed HTTP-only cookies (`HEALTH_ACCESS_PASSWORD` and `HEALTH_COOKIE_SECRET`).
- **Data Portability**:
  - One-click export to JSON (full backup) and CSV (compatible with Apple Health, Google Fit, and Excel).

---

## Local Development

1. Clone or navigate to the repository:
   ```bash
   cd health
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env.local` file from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Provide your Neon PostgreSQL `DATABASE_URL`, `HEALTH_ACCESS_PASSWORD`, and `HEALTH_COOKIE_SECRET`.

4. Apply the database migrations:
   ```bash
   npm run db:migrate
   ```

5. Run unit tests:
   ```bash
   npm test
   ```

6. Start the local development server:
   ```bash
   npm run dev
   ```

---

## Vercel Deployment

1. Push your repository to GitHub.
2. In Vercel, import your repository.
3. Configure the environment variables in Vercel:
   - `DATABASE_URL`: Your pooled connection string from Neon.
   - `HEALTH_ACCESS_PASSWORD`: Your private password to unlock the dashboard.
   - `HEALTH_COOKIE_SECRET`: A 32+ character random string.
4. Deploy! Open the URL, enter your password, set up your profile, and start logging.

---

## License

MIT License.
