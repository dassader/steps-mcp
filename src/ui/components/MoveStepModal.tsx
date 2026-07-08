import { type FormEvent } from "react";

import type { MoveDraft } from "../types";
import { Modal } from "./Modal";

interface MoveStepModalProps {
  moveDraft: MoveDraft;
  onChange: (draft: MoveDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function MoveStepModal({ moveDraft, onChange, onClose, onSubmit }: MoveStepModalProps) {
  return (
    <Modal onClose={onClose} title="Move step">
      <form className="modal-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Note</span>
          <textarea
            autoFocus
            onChange={(event) => onChange({ ...moveDraft, note: event.target.value })}
            placeholder="Why is this status changing?"
            required
            value={moveDraft.note}
          />
        </label>
        <div className="modal-actions">
          <button className="text-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Move
          </button>
        </div>
      </form>
    </Modal>
  );
}
