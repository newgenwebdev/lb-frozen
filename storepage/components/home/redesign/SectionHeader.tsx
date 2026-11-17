interface SectionHeaderProps {
  title: string;
  description?: string;
  tone?: "light" | "dark";
}

// Big title on the left, short description on the right, thick rule underneath
export default function SectionHeader({
  title,
  description,
  tone = "light",
}: SectionHeaderProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={`flex flex-col gap-3 pb-5 lg:pb-6 mb-8 lg:mb-12 border-b-[3px] md:flex-row md:items-end md:justify-between md:gap-10 ${
        isDark ? "border-lb-navy-line" : "border-lb-navy"
      }`}
    >
      <h2
        className={`text-3xl lg:text-4xl font-black tracking-tight shrink-0 ${
          isDark ? "text-white" : "text-lb-navy"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`text-sm lg:text-base leading-relaxed md:max-w-xl ${
            isDark ? "text-white/70" : "text-lb-muted"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
