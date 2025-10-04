module.exports = app => {
  app.get('/alerts', (req, res) => {
    // TODO: Fetch weather/flood alerts
    res.json([]);
  });
};
