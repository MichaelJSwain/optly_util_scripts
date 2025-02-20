const inquirer = require("inquirer");
const { networkManager } = require("./networkManager");
const { TH_QA_AUDIENCE_ID, CK_QA_AUDIENCE_ID } = process.env;


const prompts = {
  start: [
    {
      type: "input",
      name: "answer",
      message: "This experiment does not use the QA audience and will be exposed to real users. Are you sure you want to proceed? (y|n)",
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
      message: "Are you sure you want to pause a running experiment? (y|n)",
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
      message: "Are you sure you want to update a running experiment? In general, this is not a recommended action (see knowledge base link for more details) (y | n)",
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

const isSafeToUpdateOptimizelyExperiment = async (optly_exp_id, action) => {
  const res = await networkManager.getExperiment(optly_exp_id);
  
  if (res.success) {
    const {audience_conditions, status} = res;
    const isInQAmode = audience_conditions.includes(TH_QA_AUDIENCE_ID) || audience_conditions.includes(CK_QA_AUDIENCE_ID);
    if (isInQAmode) {
      return true;
    }

    if (
      !isInQAmode &&
      (status == 'paused' || status === 'not_started') &&
      action === 'start'
    ) {
      const decision = await promptUser('start');
      return decision;
    } else if (
      !isInQAmode &&
      status == 'running' &&
      action === 'pause'
    ) {
      const decision = await promptUser('pause');
      return decision;
    } else if (
      !isInQAmode && 
      status == 'running' &&
      action == 'publish'
    ) {
      const decision = await promptUser('publish');
      return decision;
    } else {
      return true;
    }
  }
}
module.exports = isSafeToUpdateOptimizelyExperiment;