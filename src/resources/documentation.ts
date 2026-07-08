import { documentationResources } from "./catalog.js";

export function listDocumentationResources() {
  return documentationResources.map(({ text: _text, ...resource }) => resource);
}

export function readDocumentationResource(uri: string) {
  const resource = documentationResources.find((candidate) => candidate.uri === uri);
  if (!resource) return null;

  return {
    uri: resource.uri,
    mimeType: resource.mimeType,
    text: resource.text
  };
}
