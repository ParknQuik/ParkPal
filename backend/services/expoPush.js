const fetch = require('node-fetch');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushNotification(pushToken, title, body, data = {}) {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: title,
        body: body,
        data: data,
        sound: 'default',
        priority: 'high',
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('Expo Push Error:', result.errors);
      return { success: false, error: result.errors };
    }
    
    console.log('Expo Push sent successfully:', result);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return { success: false, error: error.message };
  }
}

async function sendPushNotificationBatch(pushTokens, title, body, data = {}) {
  const results = await Promise.all(
    pushTokens.map(token => sendPushNotification(token, title, body, data))
  );
  
  const successful = results.filter(r => r.success).length;
  console.log(`Push notifications: ${successful}/${pushTokens.length} sent successfully`);
  
  return results;
}

module.exports = {
  sendPushNotification,
  sendPushNotificationBatch,
};