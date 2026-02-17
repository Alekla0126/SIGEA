export type Role = "FLAGRANCIA" | "MP" | "LITIGACION" | "SUPERVISOR" | "ADMIN";

export type RecordStatus = "DRAFT" | "READY" | "NEEDS_CHANGES" | "APPROVED";

export type CaseItem = {
  id: string;
  folio: string;
  title: string;
  description: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    role: Role;
  };
  records: {
    id: string;
    status: RecordStatus;
    version: number;
    createdAt: string;
    updatedAt: string;
  }[];
  _count: {
    records: number;
  };
};

export type EvidenceItem = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export type ArtifactItem = {
  id: string;
  format: "PPTX" | "PDF";
  status: "READY" | "FAILED";
  fileName: string;
  createdAt: string;
};

export type StatusTransitionItem = {
  id: string;
  fromStatus: RecordStatus;
  toStatus: RecordStatus;
  comment: string;
  createdAt: string;
  changedByUser: {
    id: string;
    name: string;
    role: Role;
  };
};

export type RecordItem = {
  id: string;
  caseId: string;
  payload: unknown;
  moduleOwner: "FLAGRANCIA" | "MP";
  currentArea: "FLAGRANCIA" | "LITIGACION" | "SUPERVISION";
  status: RecordStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string | null;
  case: {
    id: string;
    folio: string;
    title: string;
  };
  evidences: EvidenceItem[];
  artifacts: ArtifactItem[];
  statusTransitions: StatusTransitionItem[];
};
