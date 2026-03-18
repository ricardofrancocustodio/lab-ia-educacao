const basePrompt = require("../core/constants/basePrompt");
const currentSchool = require("../core/schools/alvacir");

module.exports = {
  systemPrompt: basePrompt(currentSchool),
  keywords: currentSchool.customKeywords || {}
};
