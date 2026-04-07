const buildCorePromptSection = require("./buildCorePromptSection");

module.exports = (schoolData = {}) => buildCorePromptSection({
	assistantName: schoolData.assistantName,
	platformName: schoolData.fullName,
	noInfoMessage: schoolData.noInfoMessage,
	objective: 'Atender consultas institucionais e encaminhar com precisao para secretaria ou direcao quando necessario.'
});
