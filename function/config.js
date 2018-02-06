"use strict";

const convict = require("@hbkapps/convict");
convict.configureProvider(require("@hbkapps/convict-provider-awsssm"));

module.exports = convict({
  MONGODB_URL: {
    default: "127.0.0.1",
    format: "string",
    env: "MONGODB_URL",
    providerPath: "/chartroom/api/production/core/CONNECTIONS_MONGO_URL" // can use multiple basePaths, and we'll only need to contact AWS once per path
  },
  S3_PATH: {
    default: 'com.hbkapps.chartroom.mongo-backups',
    format: "string",
    providerPath: "/lambda-mongodb-s3-backup/S3_PATH"
  }
}).validate().getProperties();