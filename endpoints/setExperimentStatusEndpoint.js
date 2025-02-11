export const setExperimentStatusEndpoint = (body, expID, action) => {
    if (body) {
        const baseURL = `https://api.optimizely.com/v2/experiments/${expID}?action=${action}`;
        const method = "PATCH";
        const callback = "";
        
        return {
            reqBody: body,
            endpoint: baseURL,
            reqMethod: method,
            callback
        }
    } else {
        console.log(`⚙️ Unable to update experiment status. There was no request body passed in API call`)
    }
};