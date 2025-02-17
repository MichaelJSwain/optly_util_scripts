const inquirer = require("inquirer");
const fs = require("fs");
const { networkManager } = require("./networkManager");
const { getConfigFile } = require("./getConfigFile");
const isSafeToUpdateOptlyExperiment = require("./checkExpStatus");
require("dotenv").config();

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
      for (const brand of brands) {
            const {OptimizelyExperimentID, name} = getConfigFile(expID, brand);
            if (OptimizelyExperimentID && name) {
                const isSafe = await isSafeToUpdateOptlyExperiment(OptimizelyExperimentID, action);

                if (isSafe) {
                  console.log(`⚙️ Updating id: '${expID}' project: '${brand}' to status: '${action}'... `);
                  const body = {name: `[QA] - ${expID} - ${name}`};
                  const res = await networkManager.setEperimentStatus(body, OptimizelyExperimentID, action);
                  
                  if (res.success) {
                    console.log(`✅ id: '${expID}' project: '${brand}' successfully updated to status: '${res.status}' in the Optimizely UI`)
                  } else {
                    console.log(`⚠️ Unable to update id: '${expID}' project: '${brand}' to status: '${res.status}' in the Optimizely UI`);
                  }
                } else {
                  console.log(`⚠️  update id: '${expID}' project: '${brand}' action: ${action} has been cancelled.`);
                }
            } else {
                console.log(`⚠️ Unable to get OptimizelyExperimentID or name in the config file for path experiments/${expID}/${brand}/config.json`);
            }
          }

    } else {
        console.log(message);
    }
  });