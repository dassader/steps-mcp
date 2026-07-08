import { Modal } from "./Modal";

interface DeleteConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ onClose, onConfirm }: DeleteConfirmModalProps) {
  return (
    <Modal onClose={onClose} title="Delete step?">
      <div className="modal-form">
        <p className="confirm-copy">This step will be removed from the board.</p>
        <div className="modal-actions">
          <button className="text-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="danger-button" onClick={onConfirm} type="button">
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
