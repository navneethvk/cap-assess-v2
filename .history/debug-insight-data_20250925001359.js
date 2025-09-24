// Debug script to check current insight data structure
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'cap-assess-pwa' // Replace with your project ID
  });
}

const db = admin.firestore();

async function checkInsightData() {
  try {
    console.log('Checking insight data structure...');
    
    // Get the most recent insight data document
    const snapshot = await db.collection('insight_data')
      .where('dataType', '==', 'weekly_visits_count')
      .orderBy('lastUpdated', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log('No insight data found!');
      return;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log('Latest insight document ID:', doc.id);
    console.log('Data structure:');
    console.log('- dataType:', data.dataType);
    console.log('- lastUpdated:', data.lastUpdated.toDate());
    console.log('- userBreakdown keys:', Object.keys(data.data.userBreakdown || {}));
    
    if (data.data.userBreakdown) {
      const userBreakdown = data.data.userBreakdown;
      console.log('- perUserStats available:', !!userBreakdown.perUserStats);
      console.log('- topUsers count:', userBreakdown.topUsers?.length || 0);
      console.log('- userStats count:', Object.keys(userBreakdown.userStats || {}).length);
      console.log('- usersByRole:', userBreakdown.usersByRole);
      
      if (userBreakdown.perUserStats) {
        console.log('- perUserStats keys:', Object.keys(userBreakdown.perUserStats));
        console.log('- Sample perUserStats entry:', Object.values(userBreakdown.perUserStats)[0]);
      }
    }
    
  } catch (error) {
    console.error('Error checking insight data:', error);
  }
}

checkInsightData();
