import * as fs from 'fs';
const fsp = fs.promises;
import 'dotenv/config'
const { TH_QA_AUDIENCE_ID,
        TH_MB_AUDIENCE_ID,
        TH_DT_AUDIENCE_ID,
        CK_QA_AUDIENCE_ID,
        CK_MB_AUDIENCE_ID,
        CK_DT_AUDIENCE_ID } = process.env;

const validateCustomCode = (code) => {
    // remove escape characters to prevent request rejection
    // const parsedCode = code.replace(/\s+/g, '');
    return code;
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
  

const getCustomCode = async (id, brand, variants, activation) => {
    const variantsArr = [];
    // get variant code
    for (const variant of variants) {
   
      const v = { name: variant.name, js: "", css: "", optimizely_variant_id:  variant.optimizely_variation_id};
  
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
      const brandUppercase = brand.toUpperCase();
      let optimizelyAudiences = [
        "and"
      ]
      if (audienceObj.qa) {
        optimizelyAudiences.push({
          "audience_id": parseInt(brandUppercase === "TH" ? TH_QA_AUDIENCE_ID : CK_QA_AUDIENCE_ID)
        });
      }
      if (audienceObj.desktop) {
        optimizelyAudiences.push({
          "audience_id": parseInt(brandUppercase === "TH" ? TH_DT_AUDIENCE_ID : CK_DT_AUDIENCE_ID)
        });
      }
      if (audienceObj.mobile) {
        optimizelyAudiences.push({
          "audience_id": parseInt(brandUppercase === "TH" ? TH_MB_AUDIENCE_ID : CK_MB_AUDIENCE_ID)
        });
      }
  
      optimizelyAudiences = JSON.stringify(optimizelyAudiences);
      return optimizelyAudiences;
    }
  };
  
  const getURLconditions = async (path) => {
    const urlConditions = await fsp.readFile(path, "binary");
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

export const buildExp = async (configFile) => {
    console.log("⚙️ Building experiment... ");
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