import type { Attachment } from "../domain/types.js";
import type { AttachmentSummary, AttachmentView } from "./views.js";
import { attachmentContentUri, attachmentUri, noteUri } from "./uris.js";

export function attachmentMimeType(attachment: Attachment): string {
  return attachment.mimeType ?? "application/octet-stream";
}

export function hasReadableContent(attachment: Attachment): boolean {
  if (attachment.contentKind === "text") return attachment.textContent !== null;
  if (attachment.contentKind === "blob") return attachment.blobContent !== null;
  return false;
}

export function toAttachmentSummary(attachment: Attachment): AttachmentSummary {
  return {
    id: attachment.id,
    uri: attachmentUri(attachment.id),
    noteId: attachment.noteId,
    noteUri: noteUri(attachment.noteId),
    name: attachment.name,
    mimeType: attachmentMimeType(attachment),
    size: attachment.size,
    linkUri: attachment.linkUri,
    contentUri: hasReadableContent(attachment) ? attachmentContentUri(attachment.id) : null,
    createdAt: attachment.createdAt
  };
}

export function toAttachmentView(attachment: Attachment): AttachmentView {
  const contentAvailable = hasReadableContent(attachment);
  return {
    resourceType: "attachment",
    uri: attachmentUri(attachment.id),
    id: attachment.id,
    noteId: attachment.noteId,
    noteUri: noteUri(attachment.noteId),
    name: attachment.name,
    mimeType: attachmentMimeType(attachment),
    size: attachment.size,
    createdAt: attachment.createdAt,
    linkUri: attachment.linkUri,
    contentAvailable,
    contentUri: contentAvailable ? attachmentContentUri(attachment.id) : null
  };
}
