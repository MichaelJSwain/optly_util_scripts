const inquirer = require("inquirer");
const fs = require("fs");
require("dotenv").config();
const { TH_PROJECT_ID, CK_PROJECT_ID } = process.env;

const questions = [
  {
    type: "input",
    name: "expID",
    message: "Experiment ID:",
    validate: (val) => {
      if (val.toLowerCase().indexOf("cx") < 0) {
        return "The experiment ID must conform to the convention CX<number> e.g. CX999";
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

const brandDetails = {
  th: [
        {
            name: "TH",
            projectID: parseInt(TH_PROJECT_ID),
            defaultUrl: "(uk|nl|de|fr|it|es|pl).tommy.com",
            editorUrl: "nl.tommy.com"
        }
    ],
  ck: [
        {
            name: "CK",
            projectID: parseInt(CK_PROJECT_ID),
            defaultUrl: "www.calvinklein.(co.uk|nl|de|fr|it|es|pl)",
            editorUrl: "www.calvinklein.nl"
        }
    ],
  db: [
      {
          name: "TH",
          projectID: parseInt(TH_PROJECT_ID),
          defaultUrl: "(uk|nl|de|fr|it|es|pl).tommy.com",
          editorUrl: "nl.tommy.com"
      },
      {
        name: "CK",
        projectID: parseInt(CK_PROJECT_ID),
        defaultUrl: "www.calvinklein.(co.uk|nl|de|fr|it|es|pl)",
        editorUrl: "www.calvinklein.nl"
      }
    ]
}

const checkExpIDexists = (expID) => {
    const expIDexists = fs.existsSync(`./experiments/${expID}`);
    return expIDexists;
}

const getBrandDetails = (brand) => {
    brand = brandDetails[brand.toLowerCase()];
    return brand;
}

const createConfigFile = (expID, expName, numVariants, brand, projectID, editorUrl) => {
  const variantArray = Array.from(Array(numVariants).keys());
  const variants = variantArray.map((el, index) => {
    return `
        {
            "name": "variant${index}",
            "js": "./experiments/${expID}/${brand}/variations/variation${index}/index.js",
            "css": "./experiments/${expID}/${brand}/variations/variation${index}/index.css"
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
      // create variant dir
      fs.mkdirSync(
        `./experiments/${expID}/${brand.name}/variations/variation${i}`,
        {
          recursive: true,
        }
      );

      // create variant files inside variant dir
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/variations/variation${i}/index.js`,
        ""
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/variations/variation${i}/index.css`,
        ""
      );

      // create shared folder and files
      fs.mkdirSync(`./experiments/${expID}/${brand.name}/sharedCode`, {
        recursive: true,
      });
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/sharedCode/shared.js`,
        ""
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/sharedCode/shared.css`,
        ""
      );

      // create targeting folder and files
      fs.mkdirSync(`./experiments/${expID}/${brand.name}/targeting`, {
        recursive: true,
      });
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/targeting/callback.js`,
        `function callback(activate, options) {}`
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/targeting/audiences.json`,
        ""
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
  });

  console.log("✅ experiment scaffolded!");
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
      console.log(`The directory with experiment ID '${expID}' already exists. Please use a unique experiment ID.`);
  }
});