const buildBehaviorRules = require("./behaviorRules");
const buildSafetyRules = require("./safetyRules");
const buildContactProtocol = require("./contactProtocol");
const buildToneStyle = require("./toneStyle");

function buildAssistantGuardrails(options = {}) {
  return [
    buildBehaviorRules(options),
    buildToneStyle(options),
    buildSafetyRules(options),
    buildContactProtocol(options)
  ].filter(Boolean).join("\n\n");
}

module.exports = buildAssistantGuardrails;