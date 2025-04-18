const inquirer = require("inquirer");
const fs = require("fs");
const optimizelyProjects = require("../optimizelyProjects");
require("dotenv").config();

const questions = [ 
  {
    type: "input",
    name: "expID",
    message: "Experiment ID:",
    validate: (val) => {
      if (val.toLowerCase().indexOf("cx") < 0) {
        return "The experiment ID must conform to the convention CX<number> e.g. CX999. The ID can be found in the CX ticket in";
      } else {
        return true;
      }
    },
  },
  {
    type: "input",
    name: "expName",
    message: "Experiment Name:",
    validate: (val) => {
      if (val.length < 1) {
        return "Please enter an experiment name";
      } else {
        return true;
      }
    },
  },
  {
    type: "input",
    name: "brand",
    message: "Which brand(s) does this experiment target? (TH / CK / DB)",
    validate: (val) => {
      if (val.toLowerCase() != "th" && val.toLowerCase() != "ck" && val.toLowerCase() != "db") {
        return "The experiment should target TH / CK / DB";
      } else {
        return true;
      }
    },
  },
  {
    type: "input",
    name: "numVariants",
    message: "Number of variants (including control):",
    validate: (val) => {
      if (parseInt(val) < 2) {
        return "There needs to be at least 2 variants";
      } else {
        return true;
      }
    },
  },
];

const checkExpIDexists = (expID) => {
    const expIDexists = fs.existsSync(`./experiments/${expID}`);
    return expIDexists;
}

const getBrandDetails = (brand) => {
    brand = optimizelyProjects[brand.toLowerCase()];
    return brand;
}

const createConfigFile = (expID, expName, numVariants, brand, projectID, editorUrl) => {
  const variantArray = Array.from(Array(numVariants).keys());
  const variants = variantArray.map((el, index) => {
    const variantName = index === 0 ? "original" : `v${index}`;

    return `
        {
            "name": "${variantName}",
            "js": "./experiments/${expID}/${brand}/variations/${variantName}/index.js",
            "css": "./experiments/${expID}/${brand}/variations/${variantName}/index.css",
            "optimizely_variation_id": ""
        }
    `;
  });

  const config = `{
    "state": "qa",
    "id": "${expID}",
    "name": "${expName}",
    "brand": "${brand}",
    "sharedCode": {
      "js": "./experiments/${expID}/${brand}/sharedCode/shared.js",
      "css": "./experiments/${expID}/${brand}/sharedCode/shared.css"
    },
    "variants": [${variants}],
    "audiences": "./experiments/${expID}/${brand}/targeting/audiences.json",
    "activation": "./experiments/${expID}/${brand}/targeting/callback.js",
    "customGoals": "./experiments/${expID}/${brand}/customGoals.json",
    "urls": "./experiments/${expID}/${brand}/targeting/urls.json",
    "editorUrl": "${editorUrl}",
    "projectID": ${projectID},
    "OptimizelyPageID": "",
    "OptimizelyExperimentID": ""
  }`;
  return config;
};

// scaffold experiment in IDE
const createExperimentScaffolding = (
  {brands,
  expID,
  expName,
  numVariants}
) => {
  console.log("⚙️ Scaffolding experiment...");

  numVariants = parseInt(numVariants);

  brands.forEach((brand) => {
    // create brand dir
    fs.mkdirSync(`./experiments/${expID}/${brand.name}`, {
      recursive: true,
    });

    fs.mkdirSync(`./experiments/${expID}/${brand.name}/variations`, {
      recursive: true,
    });

    for (let i = 0; i < numVariants; i++) {
      const variantName = i === 0 ? "original" : `v${i}`;

      // create variant dir
      fs.mkdirSync(
        `./experiments/${expID}/${brand.name}/variations/${variantName}`,
        {
          recursive: true,
        }
      );

      // create variant files inside variant dir
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/variations/${variantName}/index.js`,
        ""
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/variations/${variantName}/index.css`,
        ""
      );

      // create shared folder and files
      fs.mkdirSync(`./experiments/${expID}/${brand.name}/sharedCode`, {
        recursive: true,
      });
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/sharedCode/shared.js`,
        "/* Shared Code will apply to all variations in the experiment and is executed before variant level code */"
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/sharedCode/shared.css`,
         "/* Shared Code will apply to all variations in the experiment and is executed before variant level code */"
      );

      // create targeting folder and files
      fs.mkdirSync(`./experiments/${expID}/${brand.name}/targeting`, {
        recursive: true,
      });
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/targeting/callback.js`,
        `/**
            * Sample Activation Function
            * For complete documentation, see https://docs.developers.optimizely.com/web/docs/dynamic-websites#section-callback
            * @param {Function} activate - Call this function when you want to activate the page.
            * @param {Object} options - An object containing Page information. 
          */
        function callback(activate, options) {}`
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/targeting/urls.json`,
        `[
            "and",
            [
              "or",
              {
                  "match_type": "regex",
                  "type": "url",
                  "value": "${brand.defaultUrl}"
              }
            ]
        ]`
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/customGoals.json`,
        `[
          {"aggregator":"sum","field":"revenue","scope":"visitor","winning_direction":"increasing"}
        ]`
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/targeting/audiences.json`,
        `{
            "qa": true,
            "desktop": false,
            "mobile": false
          }`
      );
      fs.writeFileSync(
        `./experiments/${expID}/readme.md`,
        `Commands:
          npm run new
            Scaffolds a new experiment file and folder structure using initial parameters: experiment ID, project, experiment name and number of variants.
          npm run publish
            Publishes your experiment from the local directory to Optimizely
            If you haven't created the experiment in the Optimizely dashboard, it will create a new experiment and page for the experiment
            If the experiment has already been created in the Optimizely dashboard, it will update the existing experiment with changes in the local directory
          npm run set
            Start or pause an experiment
            Starting an experiment will set the status to running.
            Pausing an experiment will set the status to paused.`
      );

      //   create config files
      const config = createConfigFile(
        expID,
        expName,
        numVariants,
        brand.name,
        brand.projectID,
        brand.editorUrl
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/config.json`,
        config
      );
    }
    console.log(`✅ experiment scaffolded for exp id: ${expID}, in project: ${brand.name}!`);
  });
};

const prompt = inquirer.createPromptModule();
prompt(questions).then(async (answers) => {
  let { brand, expID, expName, numVariants } = answers;
  expID = expID.toUpperCase();

  if (!checkExpIDexists(expID)) {
    brand = getBrandDetails(brand);
    const data = {
        brands: brand,
        expID,
        expName,
        numVariants
    }
    createExperimentScaffolding(data);
  } else {
      console.log(`⚠️ The directory with exp id: '${expID}' already exists. Please use a unique experiment ID.`);
  }
});