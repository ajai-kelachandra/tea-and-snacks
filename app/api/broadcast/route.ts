import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle the private key properly (replace escaped newlines)
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export async function POST(request: Request) {
  try {
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    const db = admin.firestore();
    
    // 1. Get all push tokens from our subscriptions collection
    const snapshot = await db.collection('pushSubscriptions').get();
    const tokens = snapshot.docs.map(doc => doc.data().fcmToken).filter(Boolean);

    if (tokens.length === 0) {
      return NextResponse.json({ message: 'No registered devices found.' });
    }

    // 2. Prepare the FCM message
    const message = {
      notification: {
        title,
        body,
      },
      tokens: tokens, // Send to multiple tokens at once
      webpush: {
        fcmOptions: {
          link: '/', // Where users go when they click the notification
        },
      },
    };

    // 3. Send via Firebase Admin
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`Successfully sent ${response.successCount} messages.`);

    return NextResponse.json({ 
      success: true, 
      sentCount: response.successCount,
      failureCount: response.failureCount 
    });

  } catch (error: any) {
    console.error('Broadcast API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
