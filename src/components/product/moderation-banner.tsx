import { Notice } from "@/components/booking/parts";

interface ModerationBannerProps {
  moderationLabels: string[];
}

/**
 * The owner's "Renit review" banner (04 2089:24130): the kit Notice in its
 * Danger tone. The labels the check gave are still said after the first
 * sentence, as the app always has (the frame's sample has none).
 */
export function ModerationBanner({ moderationLabels }: ModerationBannerProps) {
  const first = moderationLabels.length
    ? `This listing is hidden from renters while we check it: ${moderationLabels.join(", ")}.`
    : "This listing is hidden from renters while we check it.";
  return (
    <Notice tone="danger" title="Renit review">
      {`${first} Editing the photos or the description sends it back for another look.`}
    </Notice>
  );
}
