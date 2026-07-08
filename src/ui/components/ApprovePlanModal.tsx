import { Modal } from "./Modal";

interface ApprovePlanModalProps {
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ApprovePlanModal({ message, onClose, onConfirm }: ApprovePlanModalProps) {
  return (
    <Modal onClose={onClose} title="Approve plan?">
      <div className="modal-form">
        <p className="confirm-copy">{message}</p>
        <div className="modal-actions">
          <button className="text-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" onClick={onConfirm} type="button">
            Approve
          </button>
        </div>
      </div>
    </Modal>
  );
}
