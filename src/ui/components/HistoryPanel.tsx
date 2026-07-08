import { type ReactNode, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, History, MessageSquare, Paperclip, Search } from "lucide-react";

import { downloadAttachment } from "../mcpApi";
import type { Step, StepAttachment, StepNote, StepTransition } from "../types";
import { formatDateTime } from "../utils/date";
import { getStatusTitle } from "../utils/status";
import { formatBytes, getStandaloneNotes } from "../utils/step";

interface HistoryPanelProps {
  idPrefix?: string;
  variant?: "modal" | "side";
  step: Step;
}

function normalizeFilter(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function containsFilter(values: string[], normalizedFilter: string): boolean {
  return normalizedFilter.length === 0 || values.some((value) => value.toLocaleLowerCase().includes(normalizedFilter));
}

function attachmentSearchValues(attachment: StepAttachment): string[] {
  return [attachment.name, attachment.mimeType ?? "application/octet-stream", formatBytes(attachment.size)];
}

function noteMatchesFilter(note: StepNote, normalizedFilter: string): boolean {
  return containsFilter([formatDateTime(note.createdAt), note.text, ...note.attachments.flatMap(attachmentSearchValues)], normalizedFilter);
}

function transitionMatchesFilter(transition: StepTransition, normalizedFilter: string): boolean {
  return containsFilter(
    [getStatusTitle(transition.fromStatus), getStatusTitle(transition.toStatus), formatDateTime(transition.createdAt), transition.noteText],
    normalizedFilter
  );
}

function highlightText(text: string, normalizedFilter: string): ReactNode {
  if (normalizedFilter.length === 0) {
    return text;
  }

  const lowerText = text.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = lowerText.indexOf(normalizedFilter, cursor);

    if (matchIndex === -1) {
      parts.push(text.slice(cursor));
      break;
    }

    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }

    const matchEnd = matchIndex + normalizedFilter.length;
    parts.push(
      <mark className="activity-highlight" key={`${matchIndex}-${matchEnd}`}>
        {text.slice(matchIndex, matchEnd)}
      </mark>
    );
    cursor = matchEnd;
  }

  return parts;
}

function filterEmptyMessage(entityLabel: string, hasFilter: boolean): string {
  return hasFilter ? `No ${entityLabel} match this filter.` : `No ${entityLabel} yet.`;
}

export function HistoryPanel({ idPrefix = "step", step, variant = "side" }: HistoryPanelProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [isNotesOpen, setNotesOpen] = useState(true);
  const [isStatusOpen, setStatusOpen] = useState(true);
  const normalizedFilter = normalizeFilter(filterQuery);
  const hasFilter = normalizedFilter.length > 0;
  const standaloneNotes = useMemo(() => getStandaloneNotes(step), [step]);
  const filteredNotes = standaloneNotes.filter((note) => noteMatchesFilter(note, normalizedFilter));
  const filteredTransitions = step.transitions.filter((transition) => transitionMatchesFilter(transition, normalizedFilter));
  const notesActivityId = `${idPrefix}-notes-activity`;
  const statusActivityId = `${idPrefix}-status-activity`;
  const filterControl = (
    <label className="activity-filter">
      <Search aria-hidden="true" size={16} />
      <input
        aria-label="Filter notes and status history"
        onChange={(event) => setFilterQuery(event.target.value)}
        placeholder="Filter notes and status history"
        value={filterQuery}
      />
    </label>
  );

  async function handleDownloadAttachment(attachment: StepAttachment): Promise<void> {
    try {
      setDownloadError(null);
      setDownloadingAttachmentId(attachment.id);
      await downloadAttachment(attachment);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Failed to download attachment.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  return (
    <section className={`step-activity-pane ${variant === "modal" ? "step-activity-pane-modal" : ""}`} aria-label="Step activity" tabIndex={0}>
      <div className="activity-pane-header">
        {filterControl}
        {downloadError ? <div className="inline-error">{downloadError}</div> : null}
      </div>

      <div className="activity-pane-scroll">
        <div className="activity-section">
          <button
            aria-controls={notesActivityId}
            aria-expanded={isNotesOpen}
            className="activity-title-button"
            onClick={() => setNotesOpen((current) => !current)}
            type="button"
          >
            {isNotesOpen ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />}
            <MessageSquare aria-hidden="true" size={16} />
            <span>Notes</span>
            <small>{filteredNotes.length}</small>
          </button>
          {isNotesOpen ? (
            filteredNotes.length > 0 ? (
              <div className="activity-stack" id={notesActivityId}>
                {filteredNotes.map((note) => (
                  <article className="activity-card" key={note.id}>
                    <div className="activity-card-meta">{highlightText(formatDateTime(note.createdAt), normalizedFilter)}</div>
                    <p>{highlightText(note.text, normalizedFilter)}</p>
                    {note.attachments.length > 0 ? (
                      <div className="attachment-list">
                        {note.attachments.map((attachment) => {
                          const mimeType = attachment.mimeType ?? "application/octet-stream";
                          const size = formatBytes(attachment.size);

                          return (
                            <button
                              className="attachment-row"
                              disabled={downloadingAttachmentId === attachment.id}
                              key={attachment.id}
                              onClick={() => void handleDownloadAttachment(attachment)}
                              type="button"
                            >
                              <Paperclip aria-hidden="true" size={14} />
                              <span>{highlightText(attachment.name, normalizedFilter)}</span>
                              <small>
                                {highlightText(mimeType, normalizedFilter)} / {highlightText(size, normalizedFilter)}
                              </small>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-activity" id={notesActivityId}>
                {filterEmptyMessage("notes", hasFilter)}
              </div>
            )
          ) : null}
        </div>

        <div className="activity-section">
          <button
            aria-controls={statusActivityId}
            aria-expanded={isStatusOpen}
            className="activity-title-button"
            onClick={() => setStatusOpen((current) => !current)}
            type="button"
          >
            {isStatusOpen ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />}
            <History aria-hidden="true" size={16} />
            <span>Status history</span>
            <small>{filteredTransitions.length}</small>
          </button>
          {isStatusOpen ? (
            filteredTransitions.length > 0 ? (
              <div className="activity-stack" id={statusActivityId}>
                {filteredTransitions.map((transition) => {
                  const fromStatus = getStatusTitle(transition.fromStatus);
                  const toStatus = getStatusTitle(transition.toStatus);

                  return (
                    <article className="activity-card" key={transition.id}>
                      <div className="transition-row">
                        <span>{highlightText(fromStatus, normalizedFilter)}</span>
                        <ArrowRight aria-hidden="true" size={14} />
                        <span>{highlightText(toStatus, normalizedFilter)}</span>
                      </div>
                      <div className="activity-card-meta">{highlightText(formatDateTime(transition.createdAt), normalizedFilter)}</div>
                      <p>{highlightText(transition.noteText, normalizedFilter)}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-activity" id={statusActivityId}>
                {filterEmptyMessage("status changes", hasFilter)}
              </div>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}
