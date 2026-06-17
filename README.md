# Wilson Belts — E-commerce Website

Custom championship wrestling belts store with product catalog, cart, PayPal checkout, and an admin panel for managing products and orders.

## What's inside
- `src/App.jsx` — the whole storefront and admin panel
- `src/firebase.js` — database connection (Firebase Firestore)
- Admin panel password: `wilson2026` (change this in `src/App.jsx`, the `ADMIN_PASS` constant, before going live)

## Before this works, you need to set up Firebase (free)

1. Go to https://console.firebase.google.com
2. Click "Add project", name it anything (e.g. "wilson-belts"), continue through the steps (you can disable Google Analytics, not needed)
3. Once the project is created, click the **Web icon (`</>`)** to add a web app. Name it anything, no need to check "Firebase Hosting".
4. You'll see a `firebaseConfig` object with values like `apiKey`, `authDomain`, etc. Copy these.
5. Open `src/firebase.js` in this project and paste your values into the `firebaseConfig` object, replacing the placeholder text.
6. In the Firebase console, go to **Build → Firestore Database → Create database**. Choose **Start in test mode** for now (you can lock it down later). Pick any region.

That's it — your site will now read/write products and orders to your Firestore database.

## Running locally (optional, to preview before deploying)
```
npm install
npm run dev
```

## Deploying live (free, via Vercel)
1. Push this project to a GitHub repository
2. Go to https://vercel.com, sign up/log in with your GitHub account
3. Click "Add New Project", select this repository
4. Leave all settings as default (Vercel auto-detects Vite) and click Deploy
5. After a minute, you'll get a live URL like `wilson-belts.vercel.app`

## Updating your PayPal link
In `src/App.jsx`, find the `Checkout` component and update the `PAYPAL_LINK` constant if your PayPal.me username changes.

## Managing your store
Visit your live site, click "Admin" in the top right, and log in with the admin password. From there you can:
- Add, edit, or delete belts (with images, price, stock, description)
- View all orders with customer details and PayPal transaction IDs
- Update order status (pending → confirmed → shipped)
