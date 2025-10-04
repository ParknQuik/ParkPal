module.exports = app => {
  app.post('/payments', (req, res) => {
    // TODO: Process payment
    res.json({ success: true });
  });
};
