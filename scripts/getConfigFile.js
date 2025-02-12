import * as fs from 'fs';

export const getConfigFile = (exp_id, brand) => {
    console.log(`⚙️ Getting config file for expID:${exp_id} brand:${brand}`)
    let configFile = fs.readFileSync(
      `./experiments/${exp_id}/${brand}/config.json`,
      "binary"
    )
    configFile = JSON.parse(configFile);
    return configFile;
  };