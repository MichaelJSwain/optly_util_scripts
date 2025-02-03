import 'dotenv/config'
const { OPTLY_TOKEN } = process.env;

export const networkManager = async (reqBody, endpoint, reqMethod) => {
    console.log("running network manager...");
    
    const options = {
        method: reqMethod,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: OPTLY_TOKEN,
        },
        body: JSON.stringify(reqBody),
      };
    
        const res = await fetch(endpoint, options)
        const resource = await res.json();
        return resource && resource.id ? {...resource, success: true} : {...resource, success: false};
}