import 'dotenv/config'
// import { checkExpStatus } from './checkExpStatus';
const { OPTLY_TOKEN } = process.env;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

export const networkManager = {
  createRequestObject: (req_body, req_method) => {
    const options = {
        method: req_method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: OPTLY_TOKEN,
        }
      };
      if (req_body) {
        options.body = JSON.stringify(req_body)
      }
      return options;
  },
  call: async (endpoint, req_object) => {
    const res = await fetch(endpoint, req_object);
    const resource = await res.json();
    return resource && resource.id ? {...resource, success: true} : {...resource, success: false};
  },
  initiateRequest: () => {
    // const request_object = networkManager.createRequestObject(req_body, req_method);
    // const res = await networkManager.call(endpoint, request_object);
    // return res;
  },
  createExperiment: async (req_body) => {
    console.log(`⚙️ Creating a new experiment in Optimizely...`)

    const endpoint = "https://api.optimizely.com/v2/experiments";
    const req_method = "POST";

    const request_object = networkManager.createRequestObject(req_body, req_method);
    const res = await networkManager.call(endpoint, request_object);
    return res;
  },
  updateExperiment: async (req_body, exp_id) => {
    console.log(`⚙️ Publishing changes to existing experiment in Optimizely...`)

    const endpoint = `https://api.optimizely.com/v2/experiments/${exp_id}`;
    const req_method = "PATCH";

    const request_object = networkManager.createRequestObject(req_body, req_method);
    const res = await networkManager.call(endpoint, request_object);
    return res;
  },
  createPage: async (req_body) => {
    console.log(`⚙️ Creating a new page in Optimizely...`)

    const endpoint = `https://api.optimizely.com/v2/pages`;
    const req_method = "POST";

    const request_object = networkManager.createRequestObject(req_body, req_method);
    const res = await networkManager.call(endpoint, request_object);
    return res;
  },
  updatePage: async (req_body, exp_id) => {
    console.log(`⚙️ Publishing changes to existing page in Optimizely...`)

    const endpoint = `https://api.optimizely.com/v2/pages/${exp_id}`;
    const req_method = "PATCH";

    const request_object = networkManager.createRequestObject(req_body, req_method);
    const res = await networkManager.call(endpoint, request_object);
    return res;
  },
  createEvent: async (req_body, project_id) => {
    const endpoint = `https://api.optimizely.com/v2/projects/${project_id}/custom_events`;
    const req_method = "POST";

    const request_object = networkManager.createRequestObject(req_body, req_method);
    const res = await networkManager.call(endpoint, request_object);
    return res;
  },
  setEperimentStatus: async (req_body, exp_id, action) => {
    const endpoint = `https://api.optimizely.com/v2/experiments/${exp_id}?action=${action}`;
    const req_method = "PATCH";

    const request_object = networkManager.createRequestObject(req_body, req_method);
    const res = await networkManager.call(endpoint, request_object);
    return res;
  },
  getExperiment: async (exp_id) => {
    const endpoint = `https://api.optimizely.com/v2/experiments/${exp_id}`;
    const req_method = "GET";

    const request_object = networkManager.createRequestObject(undefined, req_method);
    const res = await networkManager.call(endpoint, request_object);
    return res;
  }
}