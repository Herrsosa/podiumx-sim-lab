import { AddContributionModal as CanonicalAddContributionModal } from '@/components/contribution/AddContributionModal';

interface AddContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorId: string;
  onSuccess?: () => void;
}

export function AddContributionModal({
  open,
  onOpenChange,
  authorId,
  onSuccess,
}: AddContributionModalProps) {
  return (
    <CanonicalAddContributionModal
      open={open}
      onOpenChange={onOpenChange}
      athleteId={authorId}
      onCreated={() => onSuccess?.()}
    />
  );
}

export default AddContributionModal;
