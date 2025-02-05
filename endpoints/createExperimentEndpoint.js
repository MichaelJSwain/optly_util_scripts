export const createExperimentEndpoint = (body) => {
    if (body) {
        const baseURL = "https://api.optimizely.com/v2/experiments";
        const method = "POST";
        const callback = "";
        
        return {
            reqBody: body,
            endpoint: baseURL,
            reqMethod: method,
            callback
        }
    } else {
        console.log(`⚙️ Unable to create Optimizely experiment. There was no request body passed in API call`)
    }
};