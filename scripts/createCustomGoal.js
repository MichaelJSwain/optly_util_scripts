const inquirer = require("inquirer");
const fs = require("fs");
const { networkManager } = require("./networkManager");
const fsp = fs.promises;
require("dotenv").config();
const { CK_PROJECT_ID, TH_PROJECT_ID } = process.env;

const projectID = {
  CK: parseInt(CK_PROJECT_ID),
  TH: parseInt(TH_PROJECT_ID)
}

const questions = [
    {
        type: "input",
        name: "expID",
        message: "Please enter the experiment ID that this custom goal applies to",
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
        name: "goalName",
        message: "Please enter the name of the custom goal",
        validate: (val) => {
            return true;
        },
    },
    {
        type: "input",
        name: "brand",
        message: "Which brand does this goal apply to? (TH | CK | DB)",
        validate: (val) => {
            if (val.toUpperCase() !== "TH" && val.toUpperCase() !== "CK" && val.toUpperCase() !== "DB") {
                return "The goal should apply to TH / CK / DB";
              } else {
                return true;
              }
        },
      }
];

const prompt = inquirer.createPromptModule();
prompt(questions).then(async (answers) => {
    const brand = answers.brand.toUpperCase();
    const expID = answers.expID.toUpperCase();
    const goalName = answers.goalName;
    
    const fullGoalName = `${expID} - ${goalName}`;
    
    const apiKeyForGoal = fullGoalName.toLowerCase().split(" ").join("_");
    const body = {key: apiKeyForGoal, name: fullGoalName};
    let brands = brand === "DB" ? ["TH", "CK"] : [brand];

    for (const brand of brands) {
      const event = await networkManager.createCustomGoal(body, projectID[brand]);
      
      if (event && event.id) {
          console.log("✅ Custom goal created");
          addToExpCustomGoals(expID, brand, event);
      } else {
        console.log("⚠️ Unable to create the custom goal. Please try again later")
      }
    }
});

const addToExpCustomGoals = async (expID, brand, event) => {
    console.log("⚙️ updating customGoals.json file...")
    const customGoalsFile = await fsp.readFile(
        `./experiments/${expID}/${brand}/customGoals.json`,
        "binary"
      );
    const parsedCustomGoalsFile = JSON.parse(customGoalsFile);
    parsedCustomGoalsFile.push(event);

      fs.writeFile(
        `./experiments/${expID}/${brand}/customGoals.json`,
        JSON.stringify(parsedCustomGoalsFile),
        {
          encoding: "utf8",
        },
        (err) => {
          if (err) console.log(err);
          else {
            console.log(`✅ Successfully updated customGoals.json file for exp id: ${expID}, in project: ${brand}`);
          }
        }
      );
}