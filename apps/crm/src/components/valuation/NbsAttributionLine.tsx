/** NBS-required attribution when a numeric valuation band is shown. */
export const NBS_ATTRIBUTION_TEXT =
  "Zdroj dát: spracované údaje Národnej banky Slovenska na základe údajov United Classifieds a NARKS · Realitný barometer Realitnej únie SR";

type Props = {
  mutedColor: string;
  /** False when noEstimate / priceSource none — omit from DOM. */
  show?: boolean;
};

/** Readable, subordinate attribution line under the estimate band. */
export function NbsAttributionLine({ mutedColor, show = true }: Props) {
  if (!show) return null;
  return (
    <p className="mt-3 text-sm leading-relaxed" style={{ color: mutedColor }}>
      {NBS_ATTRIBUTION_TEXT}
    </p>
  );
}
