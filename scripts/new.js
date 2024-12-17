console.log("running new file...");

const inquirer = require("inquirer");
const fs = require("fs");

const questions = [
  {
    type: "input",
    name: "expID",
    message: "Experiment ID:",
    validate: (val) => {
      if (val.indexOf("CX") < 0) {
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
      if (val !== "TH" && val !== "CK" && val !== "DB") {
        return "The experiment should target TH / CK / DB";
      } else {
        return true;
      }
    },
  },
  {
    type: "input",
    name: "locales",
    message:
      "Please enter the locales targeted by this experiment (UK|NL|DE|FR|IT|ES|PL etc.):",
    validate: (val) => {
      if (val.length < 1) {
        return "Please enter a URL";
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
    if (brand.toLowerCase() === "th") {
        brand = [
        {
            name: "TH",
            projectID: 14193350179,
        },
        ];
    } else if (brand.toLowerCase() === "ck") {
        brand = [
        {
            name: "CK",
            projectID: 4639710178443264,
        },
        ];
    } else {
        brand = [
        {
            name: "TH",
            projectID: 14193350179,
        },
        {
            name: "CK",
            projectID: 4639710178443264,
        },
        ];
    }
    return brand;
}

const prompt = inquirer.createPromptModule();
prompt(questions).then(async (answers) => {
  let { brand, expID, expName, locales, numVariants } = answers;

  if (!checkExpIDexists(expID)) {
    console.log("scaffolding experiment...");
    brand = getBrandDetails(brand);
    const data = {
        brands: brand,
        expID,
        expName,
        locales,
        numVariants
    }
    createExperimentScaffolding(data);
    console.log("experiment scaffolded!");
    } else {
        console.log(`The directory with experiment ID '${expID}' already exists. Would you like to create an iteration experiment?`);
    }
});

// scaffold experiment in IDE
const createExperimentScaffolding = (
  {brands,
  expID,
  expName,
  locales,
  numVariants}
) => {
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
        `./experiments/${expID}/${brand.name}/targeting/urls.js`,
        ""
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
        brand.projectID
      );
      fs.writeFileSync(
        `./experiments/${expID}/${brand.name}/config.json`,
        config
      );
    }
  });
};

const createConfigFile = (expID, expName, numVariants, brand, projectID) => {
  const variants = Array.from(Array(numVariants).keys()).map((el, index) => {
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
    "urls": "./experiments/${expID}/${brand}/targeting/urls.js",
    "projectID": ${projectID},
    "OptimizelyPageID": "",
    "OptimizelyExperimentID": ""
  }`;
  return config;
};
