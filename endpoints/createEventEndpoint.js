export const createEventEndpoint = (body, projectID) => {
    if (body) {
        const baseURL = `https://api.optimizely.com/v2/projects/${projectID}/custom_events`;
        const method = "POST";
        const callback = "";
        
        return {
            reqBody: body,
            endpoint: baseURL,
            reqMethod: method,
            callback
        }
    } else {
        console.log(`⚙️ Unable to create Optimizely event. There was no request body passed in API call`)
    }
};