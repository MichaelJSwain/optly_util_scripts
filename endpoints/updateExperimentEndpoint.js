export const updateExperimentEndpoint = (body, optimizelyExperimentID) => {
    if (body) {
        const baseURL = `https://api.optimizely.com/v2/experiments/${optimizelyExperimentID}`;
        const method = "PATCH";
        const callback = "";
        
        return {
            reqBody: body,
            endpoint: baseURL,
            reqMethod: method,
            callback
        }
    } else {
        console.log(`⚙️ Unable to update Optimizely experiment. There was no request body passed in API call`)
    }
};