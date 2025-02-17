require("dotenv").config();
const { TH_PROJECT_ID, CK_PROJECT_ID } = process.env;

const optimizelyProjects = {
    th: [
          {
              name: "TH",
              projectID: parseInt(TH_PROJECT_ID),
              defaultUrl: "(uk|nl|de|fr|it|es|pl).tommy.com",
              editorUrl: "nl.tommy.com"
          }
      ],
    ck: [
          {
              name: "CK",
              projectID: parseInt(CK_PROJECT_ID),
              defaultUrl: "www.calvinklein.(co.uk|nl|de|fr|it|es|pl)",
              editorUrl: "www.calvinklein.nl"
          }
      ],
    db: [
        {
            name: "TH",
            projectID: parseInt(TH_PROJECT_ID),
            defaultUrl: "(uk|nl|de|fr|it|es|pl).tommy.com",
            editorUrl: "nl.tommy.com"
        },
        {
          name: "CK",
          projectID: parseInt(CK_PROJECT_ID),
          defaultUrl: "www.calvinklein.(co.uk|nl|de|fr|it|es|pl)",
          editorUrl: "www.calvinklein.nl"
        }
      ]
  }

  module.exports = optimizelyProjects;