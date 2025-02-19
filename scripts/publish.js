const fs = require("fs");
const { networkManager } = require("./networkManager");
const args = process.argv;
require("dotenv").config();
const { getConfigFile } = require("./getConfigFile");
const buildExp = require("./build");
const isSafeToUpdateOptimizelyExperiment = require("./checkExpStatus");
const optimizelyProjects = require("../optimizelyProjects");
const inquirer = require("inquirer");

const questions = [ 
  {
    type: "input",
    name: "expID",
    message: "Experiment ID:",
    validate: (val) => {
      return true;
    },
  },
  {
    type: "input",
    name: "brand",
    message: "Which brand(s)? (TH / CK / DB)",
    validate: (val) => {
      if (val.toLowerCase() != "th" && val.toLowerCase() != "ck" && val.toLowerCase() != "db") {
        return "The experiment should target TH / CK / DB";
      } else {
        return true;
      }
    },
  }
];


const getUserInput = () => {
  const userInput =
  args[4] &&
  args[4].toUpperCase().includes("CX") &&
  args[5] &&
  (args[5].toUpperCase() === "TH" || args[5].toUpperCase() === "CK" || args[5].toUpperCase() === "DB")
    ? { expID: args[4], brand: args[5] }
    : false;
    return userInput;
}

const createOptimizelyPage = async (expName, projectID, activation, urlConditions, editorUrl, optlyPageID) => {
  if (expName && projectID) {
    const body = {
      archived: false,
      category: "other",
      activation_code: `${activation}`,
      edit_url: `${editorUrl}`,
      conditions: urlConditions,
      name: `${expName}`,
      project_id: projectID,
      activation_type: "callback",
    };

    const optimizelyPage = optlyPageID ? 
      await networkManager.updatePage(body, optlyPageID) : 
      await networkManager.createPage(body);

    if (!optimizelyPage.success) {
      console.log(`⚠️ Unable to create Optimizely page. ${optimizelyPage.code} - ${optimizelyPage.message}`);
    }
    return optimizelyPage;
  }
};

const getTrafficAllocationPerVariant = (totalTrafficAllocation, variants) => {
  const splitPerVariant = Math.trunc(totalTrafficAllocation / variants.length);
  let remainder;
  if (splitPerVariant * variants.length == totalTrafficAllocation) {
      remainder = false;
  } else {
      remainder = totalTrafficAllocation - (splitPerVariant * (variants.length - 1));
  }

  const variantsWithTrafficAllocation = variants.map((variant, idx) => {
      return {
          ...variant,
          trafficAllocation: !remainder || idx != (variants.length - 1) ? splitPerVariant : remainder
      }
  });
  return variantsWithTrafficAllocation;
};

const createVariantActions = (pageID, variants) => {
  variants = getTrafficAllocationPerVariant(10000, variants);
  const variantsArray = [];

  variants.forEach((variant) => {
    
    const variantActions =
      variant.js || variant.css
        ? [
            {
              changes: [],
              page_id: pageID,
            },
          ]
        : [
            {
              page_id: pageID,
            },
          ];
    if (variant.js) {
      variantActions[0].changes.push({
        type: "custom_code",
        value: `${variant.js}`,
        async: false,
      });
    }
    if (variant.css) {
      variantActions[0].changes.push({
        type: "custom_css",
        value: `${variant.css}`,
      });
    }

    const variantData = {
      name: variant.name,
      status: "active",
      weight: variant.trafficAllocation,
      description: "variant description",
      archived: false,
      actions: variantActions
    };
    if (variant.optimizely_variant_id) {
      variantData.variation_id = variant.optimizely_variant_id;
    }
    variantsArray.push(variantData);
  });
  return variantsArray;
};

const createOptimizelyExperiment = async (
  expName,
  pageID,
  projectID,
  audiences,
  goals,
  variants,
  sharedCode,
  OptimizelyExperimentID
) => {
  const variantsArray = createVariantActions(pageID, variants);

  const prefixedExpName = `[QA] - ${expName}`;

  const body = {
    audience_conditions: "everyone",
    metrics: goals,
    audience_conditions: audiences,
    schedule: { time_zone: "UTC" },
    type: "a/b",
    description: "description placeholder",
    name: prefixedExpName,
    page_ids: [pageID],
    project_id: projectID,
    traffic_allocation: 10000,
    variations: variantsArray,
  };
  if (sharedCode.length) {
    body.changes = sharedCode;
  }
  if (goals.length) {
    body.metrics = goals;
  }

  const optimizelyExp = OptimizelyExperimentID ? 
    await networkManager.updateExperiment(body, OptimizelyExperimentID) : 
    await networkManager.createExperiment(body);

  if (!optimizelyExp.success) {
    console.log(`⚠️ Unable to create Optimizely experiment. ${optimizelyExp.code} - ${optimizelyExp.message}`);
  }
  return optimizelyExp;
};

const updateConfigFile = (expID, brand, configFile, key, resourceID) => {
  configFile[key] = resourceID;
  fs.writeFile(
    `./experiments/${expID}/${brand}/config.json`,
    JSON.stringify(configFile),
    {
      encoding: "utf8",
    },
    (err) => {
      if (err) console.log(`⚠️ Unable to update the ${key} in config file for expID:${expID} brand:${brand}`, err);
      else {
        console.log(`✅ The ${key} in the config file for expID:${expID} brand:${brand} has been updated.`);
      }
    }
  );
};

const publish = async () => {
  const prompt = inquirer.createPromptModule();
  prompt(questions).then(async (answers) => {
    const {expID, brand} = answers;
    
    const brands = optimizelyProjects[brand.toLowerCase()];

    for (const brand of brands) {
      const configFile = getConfigFile(expID, brand.name);

      if (configFile) {

        const isSafe = configFile.OptimizelyExperimentID ? await isSafeToUpdateOptimizelyExperiment(configFile.OptimizelyExperimentID, "publish") : true;
        console.log(isSafe);
        if (isSafe) {
          const {
                  id,
                  name, 
                  projectID, 
                  callback, 
                  optlyAudiences, 
                  optlyGoals, 
                  variantCode, 
                  sharedCode, 
                  urlConditions, 
                  editorUrl, 
                  OptimizelyExperimentID
              } = await buildExp(configFile);

            const expName = `${id} - ${name}`;

            const optlyPage = await createOptimizelyPage(expName, projectID, callback, urlConditions, editorUrl, configFile.OptimizelyPageID);
            const optlyPageID = optlyPage.id ? optlyPage.id : optlyPage;

            if (optlyPageID) {
                  if (!configFile.OptimizelyPageID) {
                      updateConfigFile(expID, brand.name, configFile, 'OptimizelyPageID', optlyPageID);
                  }

                  const optlyExperiment = await createOptimizelyExperiment(
                    expName,
                    optlyPageID,
                    projectID,
                    optlyAudiences,
                    optlyGoals,
                    variantCode,
                    sharedCode,
                    configFile.OptimizelyExperimentID
                  );

                  if (optlyExperiment && optlyExperiment.id && !configFile.OptimizelyExperimentID) {
                    const variationIDs = optlyExperiment.variations.map(variation => variation.variation_id);

                    variationIDs.forEach((id, idx) => {
                      configFile.variants[idx].optimizely_variation_id = id
                    });

                    updateConfigFile(expID, brand.name, configFile, 'OptimizelyExperimentID', optlyExperiment.id);
                  } 
            }
        }
      }
    }
  });

};
publish();