const fs = require("fs");
const fsp = fs.promises;
const args = process.argv;
require("dotenv").config();
const { OPTLY_TOKEN } = process.env;

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

const getConfigFile = async (expID, brand) => {
  console.log(`Getting config file for expID:${expID} brand:${brand}`)
  let configFile = await fsp.readFile(
    `./experiments/${expID}/${brand}/config.json`,
    "binary"
  )
  .then(res => {
    parsedConfig = JSON.parse(res);
    return parsedConfig;
  })
  .catch(e => {
    console.log(`Config file not found for expID:${expID} brand:${brand}. Please check that the expID and brand are valid.`);
    return false;
  });
  return configFile;
};

const validateCustomCode = (code) => {
  // remove escape characters to prevent request rejection
  // const parsedCode = code.replace(/\s+/g, '');
  return code;
};

const getCustomCode = async (id, brand, variants, activation) => {
  const variantsArr = [];
  // get variant code
  for (const variant of variants) {
    const v = { name: variant.name, js: "", css: "" };

    const js = await fsp.readFile(`${variant.js}`, "binary");
    const parsedJS = validateCustomCode(js);
    v.js = parsedJS;

    const css = await fsp.readFile(`${variant.css}`, "binary");
    const parsedCSS = validateCustomCode(css);
    v.css = parsedCSS;

    variantsArr.push(v);
  }

  // get activation code
  const activationCallback = await fsp.readFile(
    `${activation}`,
    "binary"
  );
  const parsedCallback = validateCustomCode(activationCallback);

  // get shared code
  const sharedJS = await fsp.readFile(
    `./experiments/${id}/${brand}/sharedCode/shared.js`,
    "binary"
  );
  const sharedCSS = await fsp.readFile(
    `./experiments/${id}/${brand}/sharedCode/shared.css`,
    "binary"
  );
  const sharedCode = createSharedCode(sharedJS, sharedCSS);

  const result = {
    variants: variantsArr,
    activation: parsedCallback,
    sharedCode: sharedCode,
  };
  return result;
};


const getAudiences = async (path, brand) => {
  const audiences = await fsp.readFile(path, "binary");
  if (audiences) {
    const audienceObj = JSON.parse(audiences);
    let optimizelyAudiences = [
      "and"
    ]
    if (audienceObj.qa) {
      optimizelyAudiences.push({
        "audience_id": brand.toUpperCase() === "TH" ? 6161659085979648 : 5226595548397568
      });
    }
    if (audienceObj.desktop) {
      optimizelyAudiences.push({
        "audience_id": brand.toUpperCase() === "TH" ? 6533414275252224 : 5157423925690368
      });
    }
    if (audienceObj.mobile) {
      optimizelyAudiences.push({
        "audience_id": brand.toUpperCase() === "TH" ? 4873116552265728 : 4991908099915776
      });
    }

    optimizelyAudiences = JSON.stringify(optimizelyAudiences);
    return optimizelyAudiences;
  }
};

const getURLconditions = async (path) => {
  const urlConditions = await fsp.readFile(path, "binary");
  console.log("url conditions = ", urlConditions);
  return urlConditions;
};

const getCustomGoals = async (expID, brand) => {
  const customGoals = await fsp.readFile(`./experiments/${expID}/${brand}/customGoals.json`, "binary");
  const parsedCustomGoals = JSON.parse(customGoals);
  if (parsedCustomGoals && parsedCustomGoals.length) {
    const optimizelyMetrics = parsedCustomGoals.map(goal => {
      return goal.id ? {
        event_id: goal.id,
        aggregator: 'unique',
        scope: 'visitor',
        winning_direction: 'increasing'
      } : goal;
    });
    return optimizelyMetrics;
  } else {
    return []
  }
};

const createOptimizelyPage = async (expName, projectID, activation, urlConditions, editorUrl) => {
  console.log(`Creating Optimizely Page for ${expName}`)
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

    const optimizelyPage = await postToOptimizely(
      body,
      "https://api.optimizely.com/v2/pages",
      "POST"
    );
    if (!optimizelyPage.success) {
      console.log(`Unable to create Optimizely page. ${optimizelyPage.code} - ${optimizelyPage.message}`);
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
      actions: variantActions,
    };
    variantsArray.push(variantData);
  });
  return variantsArray;
};
const createSharedCode = (sharedJS, sharedCSS) => {
  const res = [];
  if (sharedJS) {
    res.push({ type: "custom_code", value: sharedJS, async: false });
  }
  if (sharedCSS) {
    res.push({ type: "custom_css", value: sharedCSS, async: false });
  }
  
  return res;
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

  let endpoint;
  let reqMethod;

  if (OptimizelyExperimentID) {
    endpoint = `https://api.optimizely.com/v2/experiments/${OptimizelyExperimentID}`;
    reqMethod = "PATCH";
    console.log(`Updating ${expName}`)
  } else {
    endpoint = 'https://api.optimizely.com/v2/experiments';
    reqMethod = "POST";
    console.log(`Creating a new experiment in the Optimizely UI for experiment: ${expName}`)
  }

  const optimizelyExp = await postToOptimizely(
    body,
    endpoint,
    reqMethod
  );
  if (!optimizelyExp.success) {
    console.log(`Unable to create Optimizely experiment. ${optimizelyExp.code} - ${optimizelyExp.message}`);
  }
  return optimizelyExp;
};

const postToOptimizely = async (reqBody, endpoint, reqMethod) => {
  const options = {
    method: reqMethod,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: OPTLY_TOKEN,
    },
    body: JSON.stringify(reqBody),
  };

    const res = await fetch(endpoint, options)
    const resource = await res.json();
    return resource && resource.id ? {...resource, success: true} : {...resource, success: false};
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
      if (err) console.log(`Unable to update the ${key} in config file for expID:${expID} brand:${brand}`, err);
      else {
        console.log(`The ${key} in the config file for expID:${expID} brand:${brand} has been updated.`);
      }
    }
  );
};

const buildExp = async (configFile) => {
  console.log("Building experiment... ");
      const {
      name,
      id,
      brand,
      audiences,
      variants,
      activation,
      customGoals,
      urls,
      editorUrl,
      projectID,
      OptimizelyPageID,
      OptimizelyExperimentID,
    } = configFile;
  const customCode = await getCustomCode(
    id,
    brand,
    variants,
    activation
  );
  
  
  const optlyAudiences = await getAudiences(audiences, brand);
  const optlyGoals = await getCustomGoals(id, brand);
  const urlConditions = await getURLconditions(urls);
  const builtExperiment = {
    id,
    name,
    projectID,
    variantCode: customCode.variants,
    sharedCode: customCode.sharedCode,
    callback: customCode.activation,
    optlyAudiences,
    optlyGoals,
    urlConditions,
    editorUrl
  }

  
  return builtExperiment;
}

const cowe = async () => {
  const userInput = getUserInput();
  if (userInput) {
    const { expID, brand } = userInput;
    let brands = brand === "DB" ? ["TH", "CK"] : [brand];

    for (const brand of brands) {
      const configFile = await getConfigFile(expID, brand);
      if (configFile) {
        const {id, name, projectID, callback, optlyAudiences, optlyGoals, variantCode, sharedCode, urlConditions, editorUrl, OptimizelyExperimentID} = await buildExp(configFile);
   
          const expName = `${id} - ${name}`;
          let optlyPageID = configFile.OptimizelyPageID || await createOptimizelyPage(expName, projectID, callback, urlConditions, editorUrl);
     
          optlyPageID = optlyPageID.id ? optlyPageID.id : optlyPageID;
          if (optlyPageID) {
                if (!configFile.OptimizelyPageID) {
                    updateConfigFile(expID, brand, configFile, 'OptimizelyPageID', optlyPageID);
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
                  updateConfigFile(expID, brand, configFile, 'OptimizelyExperimentID', optlyExperiment.id);
                } 
          }
      }
    }

  } else {
    console.log(
      "please specify the ID and brand for the Optimizely experiment you'd like to create e.g. CX100 TH"
    );
  }
};
cowe();