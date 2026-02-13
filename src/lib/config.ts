export const appConfig = {
  authSecret: process.env.AUTH_SECRET || "dev-secret",
  uploadDir: process.env.UPLOAD_DIR || "./storage/evidence",
  artifactDir: process.env.ARTIFACT_DIR || "./storage/artifacts",
  litigacionCanSetReady: (process.env.LITIGACION_CAN_SET_READY || "true") === "true",
  litigacionCanAddEvidence: (process.env.LITIGACION_CAN_ADD_EVIDENCE || "true") === "true",
  litigacionCanDeleteEvidence: (process.env.LITIGACION_CAN_DELETE_EVIDENCE || "false") === "true",
};
