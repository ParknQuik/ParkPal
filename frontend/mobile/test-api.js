// Quick API connectivity test
const axios = require('axios');

const API_URL = 'http://192.168.100.112:3001/api/v1/config/maps-api-key';

console.log('Testing API connection to:', API_URL);

axios.get(API_URL, { timeout: 5000 })
  .then(response => {
    console.log('✅ SUCCESS! API is reachable');
    console.log('Response:', response.data);
  })
  .catch(error => {
    console.log('❌ FAILED! Cannot reach API');
    console.log('Error:', error.message);
    if (error.code) console.log('Error code:', error.code);
  });
