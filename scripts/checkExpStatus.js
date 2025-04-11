const inquirer = require("inquirer");
const { networkManager } = require("./networkManager");
const { TH_QA_AUDIENCE_ID, CK_QA_AUDIENCE_ID } = process.env;

const prompts = {
  start: [
    {
      type: "input",
      name: "answer",
      message: "You are about to launch this experiment to real users. Do you wish to proceed? (y | n)",
      validate: (val) => {
        if (val.toLowerCase() === "y" || val.toLowerCase() === "n") {
          return true;
        } else {
          return false;
        }
      },
    }
  ],
  pause: [
    {
      type: "input",
      name: "answer",
      message: "You are about to pause this experiment. Do you wish to continue? (y | n)",
      validate: (val) => {
        if (val.toLowerCase() === "y" || val.toLowerCase() === "n") {
          return true;
        } else {
          return false;
        }
      },
    }
  ],
  publish: [
    {
      type: "input",
      name: "answer",
      message: "Are you sure you want to update a running experiment? In general, this is not a recommended action. (y | n)",
      validate: (val) => {
        if (val.toLowerCase() === "y" || val.toLowerCase() === "n") {
          return true;
        } else {
          return false;
        }
      },
    }
  ],
  customGoals: [
    {
      type: "input",
      name: "answer",
      message: "No custom goals were found for this experiment. If this has been confirmed, select 'y'. Otherwise, please review the custom goals in the ticket or reach out to the analyst if you have any questions. (y | n)",
      validate: (val) => {
        if (val.toLowerCase() === "y" || val.toLowerCase() === "n") {
          return true;
        } else {
          return false;
        }
      },
    }
  ]
}

const promptUser = async (action) => {
  const prompt = inquirer.createPromptModule();
  const isSafe = await prompt(prompts[action]).then(async ({answer}) => {
    const res = answer.toLowerCase() === "y" ? true : false;
    return res;
  });
  return isSafe;
}

const checkTrafficAllocation = (totalTrafficAllocation = 10000, variants) => {
  // calculate equal per variant allocation for equal traffic
  const splitPerVariant = Math.trunc(totalTrafficAllocation / variants.length);
  
  let remainder;
  if (splitPerVariant * variants.length == totalTrafficAllocation) {
      remainder = false;
  } else {
      remainder = totalTrafficAllocation - (splitPerVariant * (variants.length - 1));
  }
  
  const trafficAllocation = remainder ? [splitPerVariant, remainder] : [splitPerVariant];
  
  const isEqual = variants.every(v => {
      if (v.weight == trafficAllocation[0] || v.weight == trafficAllocation[1]) {
          return true;
      } else {
          return false;
      }
  });
  return isEqual;
}

const checkCustomGoals = (experiment) => {
  let customGoalsShared = false;
  let customGoalsVariant = false;

  // check for call to optimizely.sendAnalyticsEvents in the shared code
  if (experiment.changes) {
      const sharedJS = experiment.changes.find(c => c.type === "custom_code");
      
      if (sharedJS && sharedJS.value.includes("optimizely.sendAnalyticsEvents")) {
          customGoalsShared = true;
      }
  }

  // check for call to optimizely.sendAnalyticsEvents in the variant code
  if (experiment.variations) {
      experiment.variations.forEach(variation => {
          if (variation.actions && variation.actions.length) {
              variation.actions.forEach(action => {
                  action.changes.find(change => {
                      if (change.type === "custom_code" && change.value.includes("optimizely.sendAnalyticsEvents")) {
                          customGoalsVariant = true;
                      }
                  })
              })
          }
      });
  }

  return customGoalsShared || customGoalsVariant ? true : false;
}

const validateExperimentLaunch = async (experiment) => {
  console.log("validating experiment launch");
  if (experiment.audience_conditions === "everyone") {
    console.log("⚠️ Please set the audience to either desktop or mobile (or both) before launching the experiment.");
    return false;
  }
  const hasEqualTrafficAllocation = checkTrafficAllocation(10000, experiment.variations);
  if (!hasEqualTrafficAllocation) {
    console.log("⚠️ The traffic allocation between variants is unequal. Before launching the experiment, please ensure the traffic is equally distributed between variants, such as 50/50.");
    return false;
  }
  const hasCustomGoals = checkCustomGoals(experiment);
  if (!hasCustomGoals) {
    const decision = await promptUser('customGoals');
    return decision
  } 
  return true;
}

const isSafeToUpdateOptimizelyExperiment = async (optly_exp_id, action) => {
  const experiment = await networkManager.getExperiment(optly_exp_id);
  console.log(experiment)
  if (experiment.success) {
    const {audience_conditions, status} = experiment;
    const isInQAmode = audience_conditions.includes(TH_QA_AUDIENCE_ID) || audience_conditions.includes(CK_QA_AUDIENCE_ID);
    if (isInQAmode) {
        return true;
    }

    if ((status == 'paused' || status === 'not_started') && action === 'start') {
        const isValid = await validateExperimentLaunch(experiment);
        if (!isValid) {
          return false;
        } 
        const decision = await promptUser('start');
        return decision;
    } else if (status == 'running' && action === 'pause') {
        const decision = await promptUser('pause');
        return decision;
    } else if (status == 'running' && action == 'publish') {
        const decision = await promptUser('publish');
        return decision;
    } else {
        return true;
    }
  }
}
module.exports = isSafeToUpdateOptimizelyExperiment;