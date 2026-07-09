import type { PlanModelId } from "@/lib/subscriptions/plans";

// Mirrors the local type declarations in app/page.tsx (Message, Conversation,
// Workspace, and their DB row counterparts). Duplicated here rather than imported
// so this extraction step doesn't require exporting types out of app/page.tsx.
// Worth consolidating into a single shared module once app/page.tsx's own state
// types are extracted in a later migration step.

export type DocumentStatus = "idle" | "loading" | "loaded" | "error";

export type UploadedDocumentType =
  | "PDF"
  | "Word"
  | "PowerPoint"
  | "Excel"
  | "Image"
  | "Dokumen";

export type UploadedAttachmentKind = "document" | "image";

export type DocumentMetadata = {
  fileName: string;
  fileType: UploadedDocumentType;
  status: Exclude<DocumentStatus, "idle">;
  files?: {
    fileName: string;
    fileType: UploadedDocumentType;
    status: Exclude<DocumentStatus, "idle">;
    kind?: UploadedAttachmentKind;
  }[];
};

export type UploadedAttachment = {
  id: string;
  fileName: string;
  fileType: UploadedDocumentType;
  kind: UploadedAttachmentKind;
  status: Exclude<DocumentStatus, "idle">;
  text?: string;
  mimeType?: string;
  data?: string;
  error?: string;
};

export type Message = {
  id?: string;
  role: "user" | "ai";
  text: string;
  createdAt?: string;
  model?: PlanModelId;
  skillId?: string | null;
  documentMetadata?: DocumentMetadata | null;
  continuationSuggested?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: PlanModelId;
  skillId: string | null;
  documentMetadata: DocumentMetadata | null;
  workspaceId: string | null;
  isPinned: boolean;
};

export type ConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  selected_model: string | null;
  study_mode: string | null;
  document_metadata: DocumentMetadata | null;
  workspace_id: string | null;
  is_pinned: boolean | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  selected_model: string | null;
  study_mode: string | null;
  document_metadata: DocumentMetadata | null;
};

export type SettingsTab =
  | "general"
  | "personalization"
  | "subscription"
  | "data"
  | "security"
  | "documents"
  | "knowledge";

export type ActiveTool = "chat" | "docs" | "tasks" | "sheets" | "canvas";

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
};

export type WorkspaceRow = {
  id: string;
  name: string;
  created_at: string;
};
