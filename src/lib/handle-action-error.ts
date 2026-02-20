import { toast } from 'sonner';
import { isPlanInactiveError } from '@/lib/plan-status';

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
    showUpgradeModal(message);
  } else {
    toast.error(message);
  }
}
