import * as fs from 'fs';

export const getConfigFile = (exp_id, brand) => {
    console.log(`⚙️ Getting config file for exp id: ${exp_id} in project: ${brand}`)
    let configFile = fs.readFileSync(
      `./experiments/${exp_id}/${brand}/config.json`,
      "binary"
    )
    configFile = JSON.parse(configFile);
    return configFile;
  };