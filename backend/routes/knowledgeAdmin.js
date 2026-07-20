const { authenticate } = require('../services/auth');
const { requireAdmin } = require('../middleware/adminGuard');
const { validateBody, validateQuery } = require('../middleware/validation');
const knowledgeController = require('../controllers/knowledgeController');
const {
  triggerIndexSchema,
  retrievalDebugSchema,
  ragTestSchema,
  sourceQuerySchema,
} = require('../validators/knowledge');

module.exports = (app) => {
  app.post('/admin/knowledge/index', authenticate, requireAdmin, validateBody(triggerIndexSchema), knowledgeController.triggerIndexing);
  app.get('/admin/knowledge/status', authenticate, requireAdmin, knowledgeController.status);
  app.post('/admin/knowledge/retry', authenticate, requireAdmin, validateBody(triggerIndexSchema), knowledgeController.retryFailed);
  app.post('/admin/knowledge/retrieval-debug', authenticate, requireAdmin, validateBody(retrievalDebugSchema), knowledgeController.retrievalDebug);
  app.post('/admin/knowledge/rag-test', authenticate, requireAdmin, validateBody(ragTestSchema), knowledgeController.ragTest);
  app.get('/admin/knowledge/sources', authenticate, requireAdmin, validateQuery(sourceQuerySchema), knowledgeController.sources);
};
