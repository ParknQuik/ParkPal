module.exports = app => {
  app.get('/parking', (req, res) => {
    // TODO: Fetch available slots from DB/Redis
    res.json([]);
  });
  app.post('/parking/reserve', (req, res) => {
    // TODO: Reserve a slot
    res.json({ success: true });
  });
  app.post('/parking/list', (req, res) => {
    // TODO: Add user-owned slot
    res.json({ success: true });
  });
};
