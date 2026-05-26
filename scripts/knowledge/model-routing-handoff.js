#!/usr/bin/env node

const { selectModelForTask } = require('../lib/modelRouter');

function topReason(modelRouting) {
  return modelRouting.reasons && modelRouting.reasons.length > 0
    ? modelRouting.reasons[0]
    : 'No strong complexity signals were detected.';
}

function formatModelRoutingHandoff(task, modelRouting = selectModelForTask(task)) {
  return [
    'Model Routing',
    `Recommended model: ${modelRouting.model}`,
    `Reasoning effort: ${modelRouting.reasoningEffort}`,
    `Tier: ${modelRouting.complexity}`,
    `Confidence: ${modelRouting.confidence}`,
    `Reason: ${topReason(modelRouting)}`,
    'Advisory only: Codex cannot self-switch models from repo code; use this for handoff, orchestration, or operator model selection.',
  ].join('\n');
}

function main() {
  const task = process.argv.slice(2).join(' ').trim();
  if (!task) {
    throw new Error('Usage: npm run knowledge:model-routing -- "<implementation intent>"');
  }

  console.log(formatModelRoutingHandoff(task));
}

if (require.main === module) {
  main();
}

module.exports = {
  formatModelRoutingHandoff,
  topReason,
};
