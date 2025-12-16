const axios = require('axios');
const secretManager = require('../config/secretManager');

exports.getAlerts = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Weather API integration (example using OpenWeatherMap)
    const weatherApiKey = await secretManager.getSecret('weather-api-key');

    // Check if API key is missing or is a test/placeholder value
    if (!weatherApiKey ||
        weatherApiKey === 'test_weather_api_key' ||
        weatherApiKey === 'your_openweathermap_api_key' ||
        weatherApiKey.startsWith('test_')) {
      return res.json({
        weather: null,
        alerts: [],
        message: 'Weather API key not configured',
        timestamp: new Date()
      });
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}`;
    const alertsUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily&appid=${weatherApiKey}`;

    // Add timeout to prevent hanging requests
    const [weatherResponse, alertsResponse] = await Promise.allSettled([
      axios.get(weatherUrl, { timeout: 5000 }), // 5 second timeout
      axios.get(alertsUrl, { timeout: 5000 })
    ]);

    const alerts = alertsResponse.status === 'fulfilled'
      ? alertsResponse.value.data.alerts || []
      : [];

    const weather = weatherResponse.status === 'fulfilled'
      ? weatherResponse.value.data
      : null;

    res.json({
      weather,
      alerts,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
