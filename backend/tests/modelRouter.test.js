const {
  classifyTaskComplexity,
  selectModelForTask,
} = require('../services/modelRouter');
const {
  formatModelRoutingHandoff,
} = require('../../scripts/knowledge/model-routing-handoff');

describe('modelRouter', () => {
  const routerEnvKeys = [
    'MODEL_ROUTER_TRIVIAL_MODEL',
    'MODEL_ROUTER_TRIVIAL_REASONING_EFFORT',
    'MODEL_ROUTER_SIMPLE_MODEL',
    'MODEL_ROUTER_SIMPLE_REASONING_EFFORT',
    'MODEL_ROUTER_STANDARD_MODEL',
    'MODEL_ROUTER_STANDARD_REASONING_EFFORT',
    'MODEL_ROUTER_COMPLEX_MODEL',
    'MODEL_ROUTER_COMPLEX_REASONING_EFFORT',
    'MODEL_ROUTER_CRITICAL_MODEL',
    'MODEL_ROUTER_CRITICAL_REASONING_EFFORT',
  ];

  beforeEach(() => {
    routerEnvKeys.forEach((key) => {
      delete process.env[key];
    });
  });

  it('routes trivial formatting requests to nano with no reasoning effort', () => {
    const selection = selectModelForTask('Format this title in title case.');

    expect(selection).toEqual(expect.objectContaining({
      model: 'gpt-5.4-nano',
      reasoningEffort: 'none',
      complexity: 'trivial',
    }));
    expect(selection.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('formatting'),
    ]));
  });

  it('routes simple classification requests to nano with low reasoning effort', () => {
    const selection = selectModelForTask(
      'Classify this customer message as positive, neutral, or negative: the app was easy to use but checkout was slow.'
    );

    expect(selection).toEqual(expect.objectContaining({
      model: 'gpt-5.4-nano',
      reasoningEffort: 'low',
      complexity: 'simple',
    }));
  });

  it('routes standard product help requests to mini with low reasoning effort', () => {
    const selection = selectModelForTask(
      'Help a ParkPal renter understand how to compare nearby parking options, choose a booking window, and prepare for checkout.'
    );

    expect(selection).toEqual(expect.objectContaining({
      model: 'gpt-5.4-mini',
      reasoningEffort: 'low',
      complexity: 'standard',
    }));
  });

  it('routes multi-file coding and debugging prompts to gpt-5.5 with medium reasoning effort', () => {
    const task = [
      'Debug failing Jest tests across backend/services/modelRouter.js and backend/controllers/configController.js.',
      'The API returns 500 and the stack trace points at config parsing.',
      'Implement the fix and update tests without changing public routes.',
    ].join(' ');

    const selection = selectModelForTask(task);

    expect(selection).toEqual(expect.objectContaining({
      model: 'gpt-5.5',
      reasoningEffort: 'medium',
      complexity: 'complex',
    }));
    expect(selection.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Coding or debugging request'),
    ]));
  });

  it('routes security, privacy, and irreversible-action prompts to critical with high reasoning effort', () => {
    const selection = selectModelForTask(
      'Review this production database purge plan for privacy and legal compliance before deleting user data.'
    );

    expect(selection).toEqual(expect.objectContaining({
      model: 'gpt-5.5',
      reasoningEffort: 'high',
      complexity: 'critical',
    }));
  });

  it('uses environment overrides for model IDs and reasoning effort', () => {
    process.env.MODEL_ROUTER_COMPLEX_MODEL = 'custom-complex-model';
    process.env.MODEL_ROUTER_COMPLEX_REASONING_EFFORT = 'high';

    const selection = selectModelForTask(
      'Implement a fix for failing tests in backend/services/foo.js with stack trace output and a 500 response.'
    );

    expect(selection).toEqual(expect.objectContaining({
      model: 'custom-complex-model',
      reasoningEffort: 'high',
      complexity: 'complex',
    }));
  });

  it('uses call-level overrides when provided', () => {
    const selection = selectModelForTask('Summarize this customer note into one sentence.', {
      trivial: { model: 'override-trivial-model', reasoningEffort: 'medium' },
    });

    expect(selection).toEqual(expect.objectContaining({
      model: 'override-trivial-model',
      reasoningEffort: 'medium',
      complexity: 'trivial',
    }));
  });

  it('falls back to standard for malformed or missing task input', () => {
    const classification = classifyTaskComplexity(null);
    const selection = selectModelForTask({});

    expect(classification).toEqual(expect.objectContaining({
      complexity: 'standard',
      confidence: 0.4,
    }));
    expect(selection).toEqual(expect.objectContaining({
      model: 'gpt-5.4-mini',
      reasoningEffort: 'low',
      complexity: 'standard',
    }));
  });

  it('formats an implementation handoff block with model routing fields', () => {
    const handoff = formatModelRoutingHandoff(
      'Debug failing Jest tests in backend/services/modelRouter.js and update the implementation.'
    );

    expect(handoff).toContain('Model Routing');
    expect(handoff).toContain('Recommended model: gpt-5.5');
    expect(handoff).toContain('Reasoning effort: medium');
    expect(handoff).toContain('Tier: complex');
    expect(handoff).toContain('Confidence:');
    expect(handoff).toContain('Reason: Coding or debugging request');
    expect(handoff).toContain('Advisory only: Codex cannot self-switch models from repo code');
  });
});
