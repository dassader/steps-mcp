import { normalizeLimit } from "../utils/pagination.js";
import { invalidResourceRequest } from "./errors.js";

export interface ParsedResourceUri<Suffix extends string> {
  uri: string;
  id: string;
  suffix: Suffix;
  searchParams: URLSearchParams;
}

export interface ResourceUriParserOptions<Suffix extends string> {
  host: string;
  defaultSuffix: Suffix;
  allowedSuffixes: readonly string[];
  invalidUriCode: string;
  invalidUriMessage: string;
  unknownSuffixCode: string;
  unknownSuffixMessage: string;
}

export function parseResourceUri<Suffix extends string>(
  uri: string,
  options: ResourceUriParserOptions<Suffix>
): ParsedResourceUri<Suffix> | null {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return null;
  }

  if (parsed.protocol !== "steps:" || parsed.hostname !== options.host) {
    return null;
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 1 || parts.length > 2) {
    throw invalidResourceRequest(options.invalidUriCode, options.invalidUriMessage, { uri });
  }

  return {
    uri,
    id: parts[0],
    suffix: parseResourceSuffix(parts[1], options),
    searchParams: parsed.searchParams
  };
}

export function readLimitedPositiveIntegerParam(
  searchParams: URLSearchParams,
  paramName: string,
  options: {
    defaultLimit: number;
    maxLimit: number;
    invalidCode: string;
    invalidMessage: string;
  }
): number {
  const rawValue = searchParams.get(paramName);
  if (rawValue === null) {
    return normalizeLimit(undefined, { defaultLimit: options.defaultLimit, maxLimit: options.maxLimit });
  }

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || String(value) !== rawValue || value < 1) {
    throw invalidResourceRequest(options.invalidCode, options.invalidMessage, { [paramName]: rawValue });
  }
  return normalizeLimit(value, { defaultLimit: options.defaultLimit, maxLimit: options.maxLimit });
}

function parseResourceSuffix<Suffix extends string>(
  rawSuffix: string | undefined,
  options: ResourceUriParserOptions<Suffix>
): Suffix {
  if (!rawSuffix) return options.defaultSuffix;
  if (options.allowedSuffixes.includes(rawSuffix)) {
    return rawSuffix as Suffix;
  }
  throw invalidResourceRequest(options.unknownSuffixCode, options.unknownSuffixMessage, { suffix: rawSuffix });
}
