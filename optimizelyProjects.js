require("dotenv").config();
const { TH_PROJECT_ID, 
        CK_PROJECT_ID, 
        TH_QA_AUDIENCE_ID,
        TH_MB_AUDIENCE_ID,
        TH_DT_AUDIENCE_ID,
        CK_QA_AUDIENCE_ID,
        CK_MB_AUDIENCE_ID,
        CK_DT_AUDIENCE_ID  } = process.env;

const optimizelyProjects = {
    th: [
          {
              name: "TH",
              projectID: parseInt(TH_PROJECT_ID),
              defaultUrl: "(uk|nl|de|fr|it|es|pl).tommy.com",
              editorUrl: "nl.tommy.com",
              audiences: {
                qa: TH_QA_AUDIENCE_ID,
                mb: TH_MB_AUDIENCE_ID,
                dt: TH_DT_AUDIENCE_ID
              }
          }
      ],
    ck: [
          {
              name: "CK",
              projectID: parseInt(CK_PROJECT_ID),
              defaultUrl: "www.calvinklein.(co.uk|nl|de|fr|it|es|pl)",
              editorUrl: "www.calvinklein.nl",
              audiences: {
                qa: CK_QA_AUDIENCE_ID,
                mb: CK_MB_AUDIENCE_ID,
                dt: CK_DT_AUDIENCE_ID
              }
          }
      ],
    db: [
        {
            name: "TH",
            projectID: parseInt(TH_PROJECT_ID),
            defaultUrl: "(uk|nl|de|fr|it|es|pl).tommy.com",
            editorUrl: "nl.tommy.com",
            audiences: {
                qa: TH_QA_AUDIENCE_ID,
                mb: TH_MB_AUDIENCE_ID,
                dt: TH_DT_AUDIENCE_ID
              }
        },
        {
          name: "CK",
          projectID: parseInt(CK_PROJECT_ID),
          defaultUrl: "www.calvinklein.(co.uk|nl|de|fr|it|es|pl)",
          editorUrl: "www.calvinklein.nl",
          audiences: {
            qa: CK_QA_AUDIENCE_ID,
            mb: CK_MB_AUDIENCE_ID,
            dt: CK_DT_AUDIENCE_ID
          }
        }
      ]
  }

  module.exports = optimizelyProjects;