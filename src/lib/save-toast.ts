import { SaveOutcome } from "@/lib/listing-edit";
import { toast } from "@/lib/toast";

/**
 * Says what a save of a listing did (`saveOutcome`). A change that waits or needs a change is a warning, never the
 * "Your product was updated!" of a change that went through; being checked and nothing changed are plain news.
 */
export function toastSave(outcome: SaveOutcome) {
  const options = outcome.message ? { message: outcome.message } : undefined;
  switch (outcome.kind) {
    case "updated":
      toast.success(outcome.title, options);
      break;
    case "held":
    case "flagged":
    case "sent_back_again":
      toast.warning(outcome.title, options);
      break;
    default:
      toast.info(outcome.title, options);
  }
}
