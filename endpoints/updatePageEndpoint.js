export const updatePageEndpoint = (body, optimizelyPageID) => {
    if (body) {
        const baseURL = `https://api.optimizely.com/v2/pages/${optimizelyPageID}`;
        const method = "PATCH";
        const callback = "";
        
        return {
            reqBody: body,
            endpoint: baseURL,
            reqMethod: method,
            callback
        }
    } else {
        console.log(`⚙️ Unable to update Optimizely page. There was no request body passed in API call`)
    }
};