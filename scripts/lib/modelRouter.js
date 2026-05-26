const COMPLEXITY_TIERS = ['trivial', 'simple', 'standard', 'complex', 'critical'];
const REASONING_EFFORTS = ['none', 'low', 'medium', 'high'];

const DEFAULT_MODEL_CONFIG = {
  trivial: { model: 'gpt-5.4-nano', reasoningEffort: 'none' },
  simple: { model: 'gpt-5.4-nano', reasoningEffort: 'low' },
  standard: { model: 'gpt-5.4-mini', reasoningEffort: 'low' },
  complex: { model: 'gpt-5.5', reasoningEffort: 'medium' },
  critical: { model: 'gpt-5.5', reasoningEffort: 'high' },
};

const PATTERNS = {
  critical: [
    /\b(security|vulnerability|exploit|malware|phishing|credential|secret|access token|api key|data leak|bypass)\b/i,
    /\b(privacy|personal data|pii|gdpr|hipaa|data breach)\b/i,
    /\b(legal|lawsuit|contract|compliance|regulatory)\b/i,
    /\b(financial advice|investment|loan|insurance|tax|bankruptcy|wire transfer)\b/i,
    /\b(production|prod)\b.*\b(delete|drop|wipe|destroy|purge|truncate|rollback)\b/i,
    /\b(delete|drop|wipe|destroy|purge|truncate)\b.*\b(database|table|production|account|user data)\b/i,
  ],
  pureSimple: [
    /\b(format|reformat|rewrite|summari[sz]e|classify|categorize|extract|translate|convert|parse)\b/i,
    /\b(json|csv|markdown|table|bullet|title case|lowercase|uppercase)\b/i,
  ],
  coding: [
    /\b(code|coding|debug|bug|fix|implement|refactor|test|jest|typescript|javascript|node|api|endpoint|database|prisma|migration)\b/i,
  ],
  filesOrErrors: [
    /\b(file|files|multi-file|stack trace|traceback|failing test|test failure|exception|error log)\b/i,
    /(?:^|\s)[\w./-]+\.(?:js|ts|tsx|json|md|sql|yml|yaml)(?=\s|$|:)/i,
    /\b[1-5]\d{2}\b/,
  ],
  planning: [
    /\b(plan|architecture|design|strategy|roadmap|investigate|diagnose|analy[sz]e|compare|tradeoff)\b/i,
  ],
  tools: [
    /\b(tool|tools|api|sdk|endpoint|database|query|curl|npm|docker|git|github|prisma|jest|deploy|cloud)\b/i,
  ],
  ambiguity: [
    /\b(ambiguous|unclear|unknown|maybe|figure out|not sure|fails sometimes|intermittent|flaky)\b/i,
  ],
};

function normalizeTask(task) {
  if (typeof task === 'string') {
    return {
      isValid: task.trim().length > 0,
      text: task.trim(),
      metadata: {},
    };
  }

  if (!task || typeof task !== 'object') {
    return { isValid: false, text: '', metadata: {} };
  }

  const textFields = [
    task.prompt,
    task.text,
    task.content,
    task.message,
    task.instructions,
    task.description,
  ];
  const text = textFields
    .filter((value) => typeof value === 'string')
    .join('\n')
    .trim();

  return {
    isValid: text.length > 0,
    text,
    metadata: task.metadata && typeof task.metadata === 'object' ? task.metadata : task,
  };
}

function hasPattern(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

function countPattern(pattern, text) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function addSignal(signals, reasons, signal, reason) {
  signals.push(signal);
  reasons.push(reason);
}

function countConstraints(text) {
  return countPattern(
    /\b(must|should|do not|don't|without|include|exclude|only|unless|exactly|at least|no more than|constraint|requirement)\b/gi,
    text
  );
}

function getLengthSignal(text, metadata) {
  const contextSize = Number(metadata.contextSize || metadata.contextTokens || metadata.tokenCount || 0);

  if (contextSize >= 6000 || text.length >= 6000) {
    return { points: 3, signal: 'long_context', reason: 'Long context or task text provided.' };
  }

  if (contextSize >= 2000 || text.length >= 1800) {
    return { points: 2, signal: 'moderate_context', reason: 'Moderate context size provided.' };
  }

  if (text.length <= 120) {
    return { points: -1, signal: 'short_request', reason: 'Request is short and bounded.' };
  }

  return { points: 0, signal: null, reason: null };
}

function getComplexityFromScore(score) {
  if (score <= 0) {
    return 'trivial';
  }

  if (score <= 2) {
    return 'simple';
  }

  if (score <= 5) {
    return 'standard';
  }

  return 'complex';
}

function confidenceFor(complexity, signals, hardOverride) {
  if (hardOverride) {
    return 0.95;
  }

  const base = {
    trivial: 0.78,
    simple: 0.76,
    standard: 0.68,
    complex: 0.82,
    critical: 0.95,
  }[complexity];

  return Math.min(0.94, Number((base + Math.min(signals.length, 5) * 0.03).toFixed(2)));
}

function classifyTaskComplexity(task) {
  const normalized = normalizeTask(task);

  if (!normalized.isValid) {
    return {
      complexity: 'standard',
      confidence: 0.4,
      signals: ['missing_task'],
      reasons: ['Task input was missing or malformed, so standard routing is used.'],
    };
  }

  const { text, metadata } = normalized;
  const signals = [];
  const reasons = [];

  if (hasPattern(PATTERNS.critical, text)) {
    addSignal(signals, reasons, 'critical_risk', 'Security, privacy, legal, financial, or irreversible-action language was detected.');
    return {
      complexity: 'critical',
      confidence: confidenceFor('critical', signals, true),
      signals,
      reasons,
    };
  }

  const isPureSimple = hasPattern(PATTERNS.pureSimple, text) && !hasPattern(PATTERNS.coding, text);
  const isCoding = hasPattern(PATTERNS.coding, text);
  const hasFilesOrErrors = hasPattern(PATTERNS.filesOrErrors, text);

  if (isCoding && hasFilesOrErrors) {
    addSignal(signals, reasons, 'coding_with_files_or_errors', 'Coding or debugging request includes files, errors, status codes, or failing tests.');
    return {
      complexity: 'complex',
      confidence: confidenceFor('complex', signals, true),
      signals,
      reasons,
    };
  }

  let score = 3;
  const lengthSignal = getLengthSignal(text, metadata);
  score += lengthSignal.points;
  if (lengthSignal.signal) {
    addSignal(signals, reasons, lengthSignal.signal, lengthSignal.reason);
  }

  const constraintCount = countConstraints(text);
  if (constraintCount >= 3) {
    score += 2;
    addSignal(signals, reasons, 'multiple_constraints', 'Multiple explicit constraints were detected.');
  } else if (constraintCount > 0) {
    score += 1;
    addSignal(signals, reasons, 'constraint_present', 'At least one explicit constraint was detected.');
  }

  if (isCoding) {
    score += 3;
    addSignal(signals, reasons, 'coding_or_debugging', 'Coding, debugging, implementation, or test language was detected.');
  }

  if (hasPattern(PATTERNS.planning, text)) {
    score += 2;
    addSignal(signals, reasons, 'planning_or_analysis', 'Planning, diagnosis, design, or analysis language was detected.');
  }

  if (hasPattern(PATTERNS.tools, text)) {
    score += 1;
    addSignal(signals, reasons, 'tool_or_api_context', 'Tool, API, database, deployment, or command context was detected.');
  }

  if (hasPattern(PATTERNS.ambiguity, text)) {
    score += 2;
    addSignal(signals, reasons, 'ambiguity', 'Ambiguity or diagnostic uncertainty was detected.');
  }

  if (hasFilesOrErrors) {
    score += 2;
    addSignal(signals, reasons, 'files_or_errors', 'Files, endpoints, status codes, errors, or logs were detected.');
  }

  if (isPureSimple) {
    addSignal(signals, reasons, 'pure_extraction_or_formatting', 'Pure extraction, formatting, conversion, or classification request detected.');
    const pureComplexity = text.length <= 100 && constraintCount === 0 ? 'trivial' : 'simple';
    return {
      complexity: pureComplexity,
      confidence: confidenceFor(pureComplexity, signals, true),
      signals,
      reasons,
    };
  }

  const complexity = getComplexityFromScore(score);

  return {
    complexity,
    confidence: confidenceFor(complexity, signals, false),
    signals: signals.length > 0 ? signals : ['general_request'],
    reasons: reasons.length > 0 ? reasons : ['No strong complexity signals were detected.'],
  };
}

function envKeyFor(tier, suffix) {
  return `MODEL_ROUTER_${tier.toUpperCase()}_${suffix}`;
}

function getTierConfig(tier, overrides = {}) {
  const defaultConfig = DEFAULT_MODEL_CONFIG[tier];
  const overrideConfig = overrides[tier] || {};
  const model = overrideConfig.model || process.env[envKeyFor(tier, 'MODEL')] || defaultConfig.model;
  const effortOverride =
    overrideConfig.reasoningEffort ||
    process.env[envKeyFor(tier, 'REASONING_EFFORT')] ||
    defaultConfig.reasoningEffort;

  return {
    model,
    reasoningEffort: REASONING_EFFORTS.includes(effortOverride) ? effortOverride : defaultConfig.reasoningEffort,
  };
}

function selectModelForTask(task, overrides = {}) {
  const classification = classifyTaskComplexity(task);
  const config = getTierConfig(classification.complexity, overrides);

  return {
    model: config.model,
    reasoningEffort: config.reasoningEffort,
    complexity: classification.complexity,
    confidence: classification.confidence,
    reasons: classification.reasons,
  };
}

module.exports = {
  COMPLEXITY_TIERS,
  DEFAULT_MODEL_CONFIG,
  classifyTaskComplexity,
  selectModelForTask,
};
