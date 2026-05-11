# Firebase Integration Guide for Iro Snack

The frontend of **Iro Snack** is now complete and ready to be powered by Firebase. Follow these steps to connect your application to your Firebase project.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it `Iro Snack`.
3. (Optional) Disable Google Analytics for a faster setup.

## 2. Register Your Web App
1. Click the **Web** icon (`</>`) in the center of the project overview page.
2. Register the app as `Iro Snack Web`.
3. Firebase will show you a `firebaseConfig` object. **Copy these values.**

## 3. Configure Environment Variables
Create a file named `.env.local` in the root directory of your project and paste your credentials there:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 4. Enable Firebase Services

### A. Authentication
1. Go to **Build > Authentication** in the Firebase sidebar.
2. Click **Get Started**.
3. Enable **Email/Password** as a sign-in provider.

### B. Firestore Database
1. Go to **Build > Firestore Database**.
2. Click **Create Database**.
3. Select **Start in Test Mode** (you can tighten rules later).
4. Choose a location close to your office (e.g., `asia-south1` for India).

### C. Cloud Storage (For Snack Images)
1. Go to **Build > Storage**.
2. Click **Get Started** and follow the prompts.
3. This allows the Admin panel to upload custom snack photos.

## 5. Seed Initial Data
Once your `.env.local` is saved, restart the development server. The app will now communicate with your live Firebase instance instead of demo mode. You can use the **Admin Panel** to add your first "Beverages" and "Snacks"!

---
**IMPORTANT**: After saving the `.env.local` file, you **MUST** restart your terminal (`npm run dev`) for the changes to take effect.
