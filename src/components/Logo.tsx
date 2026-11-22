function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

const TILE_SIZES = {
  sm: "w-7 h-7 rounded-[7px]",
  md: "w-9 h-9 rounded-[9px]",
  lg: "w-12 h-12 rounded-[12px]",
};

const ICON_SIZES = { sm: 15, md: 19, lg: 25 };

const TEXT_SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

export function Logo({
  size = "md",
  wordmark = true,
  className,
}: {
  size?: keyof typeof TILE_SIZES;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <span
        className={cx(
          "flex items-center justify-center flex-none -skew-x-[9deg] bg-gradient-to-br from-accent to-accent-hover text-on-accent shadow-[0_2px_6px_rgba(14,107,92,0.35)]",
          TILE_SIZES[size],
        )}
      >
        <svg
          width={ICON_SIZES[size]}
          height={ICON_SIZES[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />
        </svg>
      </span>
      {wordmark && <span className={cx("font-display italic font-extrabold text-accent leading-none", TEXT_SIZES[size])}>Repflow</span>}
    </span>
  );
}
