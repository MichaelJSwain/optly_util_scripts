const inquirer = require("inquirer");
const fs = require("fs");
const { networkManager } = require("./networkManager");
const { getConfigFile } = require("./getConfigFile");
require("dotenv").config();
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
  console.log("prompting user");
  const prompt = inquirer.createPromptModule();
  const isSafe = await prompt(prompts[action]).then(async ({answer}) => {
    const res = answer.toLowerCase() === "y" ? true : false;
    return res;
  });
  return isSafe;
}

const isSafeToUpdateOptlyExperiment = async (optly_exp_id, action) => {
  console.log("checking status of exp: ", optly_exp_id, action)
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
      const res = await promptUser('start');
      return res;
    } else if (
      !isInQAmode &&
      status == 'running' &&
      action === 'pause'
    ) {
      const res = await promptUser('pause');
      return res;
    } else if (
      !isInQAmode && 
      status == 'running' &&
      action == 'publish'
    ) {
      console.log("trying to update a running tests");
      const res = await promptUser('publish');
      return res;
    }
  }
}

const validateExpParams = (expID, brands) => {
    let res = {
        isValid: true,
        message: ""
    };
    const expIDexists = fs.existsSync(`./experiments/${expID}`);
    if (expIDexists) {
        brands.forEach(brand => {
            if (!fs.existsSync(`./experiments/${expID}/${brand}`)) {
                res.isValid = false;
                res.message = "⚠️ The brand for this experiment ID was not found."
            }
        })
    } else {
        res.isValid = false;
        res.message = "⚠️ The experiment ID was not found."
    }
    return res;
}

const questions = [
    {
      type: "input",
      name: "expID",
      message: "Experiment ID:",
      validate: (val) => {
        if (val.toLowerCase().indexOf("cx") < 0) {
          return "ℹ️ The experiment ID must conform to the convention CX<number> e.g. CX999";
        } else {
          return true;
        }
      },
    },
    {
      type: "input",
      name: "brand",
      message: "For which brand(s) would you like to change the experiment status? (TH / CK / DB)",
      validate: (val) => {
        if (val.toLowerCase() != "th" && val.toLowerCase() != "ck" && val.toLowerCase() != "db") {
          return "ℹ️ Please choose TH / CK / DB";
        } else {
          return true;
        }
      },
    },
    {
      type: "input",
      name: "action",
      message: "Action (start / pause)",
      validate: (val) => {
        if (val.toLowerCase() != "start" && val.toLowerCase() != "pause") {
          return "ℹ️ Action should be 'start' or 'pause'";
        } else {
          return true;
        }
      },
    },
  ];

  const prompt = inquirer.createPromptModule();
  prompt(questions).then(async (answers) => {
    let { brand, expID, action } = answers;
    brand = brand.toUpperCase();
    expID = expID.toUpperCase();
    const brands = brand === "DB" ? ["TH", "CK"] : [brand];
    const {isValid, message} = validateExpParams(expID, brands);
    if (isValid) {
        brands.forEach(async brand => {
            const {OptimizelyExperimentID, name} = getConfigFile(expID, brand);
            if (OptimizelyExperimentID && name) {
                const isSafe = await isSafeToUpdateOptlyExperiment(OptimizelyExperimentID, action);

                if (isSafe) {
                  console.log("is safe to update experiment");
                  console.log("⚙️ Updating experiment status... ");
                  const body = {name: `[QA] - ${expID} - ${name}`};
                  const res = await networkManager.setEperimentStatus(body, OptimizelyExperimentID, action);
                  
                  if (res.success) {
                    console.log(`✅ ${expID} ${brand} status successfully updated to '${res.status}' in the Optimizely UI`)
                  } else {
                    console.log("⚠️ Unable to update the experiment status in the Optimizely UI");
                  }
                } else {
                  console.log("is NOT safe to update experiment");
                }

            } else {
                console.log(`⚠️ Unable to get OptimizelyExperimentID or name in the config file for path experiments/${expID}/${brand}/config.json`);
            }
        })

    } else {
        console.log(message);
    }
  });