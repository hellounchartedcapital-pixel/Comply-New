import { toast } from 'sonner';
import { isPlanInactiveError, PLAN_INACTIVE_TAG } from '@/lib/plan-status';

/**
 * Shared error handler for client-side action catch blocks.
 *
 * If the error is a plan-gated error it opens the upgrade modal;
 * otherwise it shows a regular toast.
 */
export function handleActionError(
  err: unknown,
  fallbackMessage: string,
  showUpgradeModal?: (msg?: string) => void,
) {
  const message = err instanceof Error ? err.message : fallbackMessage;
  if (showUpgradeModal && isPlanInactiveError(message)) {
    // Strip the machine-readable tag so the modal shows a clean message
    const displayMessage = message.replace(PLAN_INACTIVE_TAG, '').trim();
    showUpgradeModal(displayMessage);
  } else {
    toast.error(message);
  }
}
