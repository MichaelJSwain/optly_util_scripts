console.log("new custom goal file");

const inquirer = require("inquirer");
const fs = require("fs");
const { networkManager } = require("./networkManager");
const fsp = fs.promises;
require("dotenv").config();
const { OPTLY_TOKEN, CK_PROJECT_ID, TH_PROJECT_ID } = process.env;
const args = process.argv;

const projectID = {
  TH: parseInt(CK_PROJECT_ID),
  CK: parseInt(TH_PROJECT_ID)
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
      },
    {
        type: "input",
        name: "addGoalToExp",
        message: "Do you want to add this custom goal to the experiment? (y|n)",
        validate: (val) => {
            if (val.toLowerCase() === "y") {
                return true;
            } else if (val.toLowerCase() === "n") {
                return false;
            }
        },
      }
];

const prompt = inquirer.createPromptModule();
prompt(questions).then(async (answers) => {
    const {expID, goalName, brand, addGoalToExp} = answers;

    const fullGoalName = `${expID} - ${goalName}`;
    
    const apiKeyForGoal = fullGoalName.toLowerCase().split(" ").join("_");
    const body = {key: apiKeyForGoal, name: fullGoalName};
    let brands = brand === "DB" ? ["TH", "CK"] : [brand];

    for (const brand of brands) {
      const event = await networkManager.createEvent(body, projectID[brand]);
      
      if (event && event.id && addGoalToExp.toUpperCase() === "Y") {
          console.log("adding event to experiment... ")
          addToExpCustomGoals(expID, brand, event);
      }
    }
});

const addToExpCustomGoals = async (expID, brand, event) => {
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
            console.log(`✅ Successfully updated config file for exp id: ${expID}, in project: ${brand}`);
          }
        }
      );
}