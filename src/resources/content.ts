export interface TextResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export interface BlobResourceContent {
  uri: string;
  mimeType: string;
  blob: string;
}

export type ResourceContent = TextResourceContent | BlobResourceContent;

export interface JsonResourceContent extends TextResourceContent {
  mimeType: "application/json";
}

export function jsonContent(uri: string, value: unknown): JsonResourceContent {
  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(value)
  };
}
