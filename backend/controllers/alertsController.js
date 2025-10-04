const axios = require('axios');

exports.getAlerts = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Weather API integration (example using OpenWeatherMap)
    const weatherApiKey = process.env.WEATHER_API_KEY;

    if (!weatherApiKey) {
      return res.json({
        weather: null,
        alerts: [],
        message: 'Weather API key not configured'
      });
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}`;
    const alertsUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily&appid=${weatherApiKey}`;

    const [weatherResponse, alertsResponse] = await Promise.allSettled([
      axios.get(weatherUrl),
      axios.get(alertsUrl)
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
