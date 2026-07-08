import { type FormEvent, useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";

import type { Step, StepFormDraft } from "../types";
import { getStandaloneNotes } from "../utils/step";
import { HistoryPanel } from "./HistoryPanel";
import { MarkdownEditor } from "./MarkdownEditor";
import { Modal } from "./Modal";

interface StepFormModalProps {
  onChange: (draft: StepFormDraft) => void;
  onClose: () => void;
  onDelete: (stepId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  restoreFocusTo?: HTMLElement | null;
  stepDetails: Step | null;
  stepDraft: StepFormDraft;
}

export function StepFormModal({ onChange, onClose, onDelete, onSubmit, restoreFocusTo, stepDetails, stepDraft }: StepFormModalProps) {
  const [isActivityModalOpen, setActivityModalOpen] = useState(false);
  const isEditing = Boolean(stepDraft.id);
  const activityCount = stepDetails ? getStandaloneNotes(stepDetails).length + stepDetails.transitions.length : 0;

  return (
    <>
      <Modal onClose={onClose} restoreFocusTo={restoreFocusTo} size={isEditing ? "wide" : "editor"} title={isEditing ? "Edit step" : "Create step"}>
        <form className={isEditing ? "step-detail-layout" : "modal-form step-create-form"} onSubmit={onSubmit}>
          <section className={isEditing ? "step-edit-pane" : "plain-step-form"}>
            <label className="field">
              <span>Name</span>
              <input autoFocus onChange={(event) => onChange({ ...stepDraft, title: event.target.value })} required value={stepDraft.title} />
            </label>
            {isEditing && stepDetails ? (
              <button className="mobile-notes-button" onClick={() => setActivityModalOpen(true)} type="button">
                <MessageSquare aria-hidden="true" size={17} />
                <span>Notes</span>
                <small>{activityCount}</small>
              </button>
            ) : null}
            <MarkdownEditor
              label="Description"
              onChange={(description) => onChange({ ...stepDraft, description })}
              placeholder="Write Markdown"
              value={stepDraft.description}
            />
            <div className="modal-actions split-actions">
              {isEditing ? (
                <button className="danger-icon-button" onClick={() => onDelete(stepDraft.id ?? "")} type="button">
                  <Trash2 aria-hidden="true" size={18} />
                  Delete
                </button>
              ) : (
                <span />
              )}
              <span className="right-actions">
                <button className="text-button" onClick={onClose} type="button">
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Save
                </button>
              </span>
            </div>
          </section>

          {stepDetails ? (
            <div className="step-activity-desktop">
              <HistoryPanel step={stepDetails} />
            </div>
          ) : null}
        </form>
      </Modal>

      {isActivityModalOpen && stepDetails ? (
        <Modal onClose={() => setActivityModalOpen(false)} size="wide" surface="activity" title="Notes">
          <div className="modal-activity-body">
            <HistoryPanel idPrefix="step-activity-modal" step={stepDetails} variant="modal" />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
