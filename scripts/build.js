const { createExperimentEndpoint } = require("../endpoints/createExperimentEndpoint");
const { updateExperimentEndpoint } = require("../endpoints/updateExperimentEndpoint");
console.log("running build file...")
const res = createExperimentEndpoint("cx-34");
console.log(res);

console.log(updateExperimentEndpoint("BODY", "9842934"));