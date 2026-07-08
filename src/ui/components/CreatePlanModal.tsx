import { type FormEvent } from "react";

import { Modal } from "./Modal";

interface CreatePlanModalProps {
  error: string | null;
  onChange: (title: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  title: string;
}

export function CreatePlanModal({ error, onChange, onClose, onSubmit, title }: CreatePlanModalProps) {
  return (
    <Modal onClose={onClose} title="Create plan">
      <form className="modal-form" onSubmit={onSubmit}>
        {error ? <div className="inline-error">{error}</div> : null}
        <label className="field">
          <span>Project name</span>
          <input autoFocus onChange={(event) => onChange(event.target.value)} required value={title} />
        </label>
        <div className="modal-actions">
          <button className="text-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
