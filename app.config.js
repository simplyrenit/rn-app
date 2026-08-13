const app = require("./app.json");

const appEnv = (process.env.EXPO_PUBLIC_APP_ENV || "PROD").toUpperCase();
const isQa = appEnv === "QA";

module.exports = {
  ...app,
  expo: {
    ...app.expo,
    ...(isQa
      ? {
          name: "Renit QA",
          slug: "renit-qa-app",
          android: {
            ...app.expo.android,
            package: "com.renit.app.qa",
            googleServicesFile: "./android/app/src/qa/google-services.json",
          },
          extra: {
            ...app.expo.extra,
            eas: {
              ...app.expo.extra.eas,
              projectId: "fc02cb6a-f30c-48e7-9762-e6f6d29cbfa9",
            },
            appEnv,
            googleMapApiKey: process.env.EXPO_PUBLIC_QA_GOOGLE_MAP_API_KEY,
          },
        }
      : {}),
  },
};
