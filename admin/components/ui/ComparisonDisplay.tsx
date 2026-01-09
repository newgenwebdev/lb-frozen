import React from "react";
import { TrendIcon } from "./TrendIcon";

type ChangeDirection = "up" | "down" | "neutral";

type ComparisonDisplayProps = {
  changePercent: number;
  changeDirection: ChangeDirection;
  comparisonText: string;
};

export function ComparisonDisplay({
  changePercent,
  changeDirection,
  comparisonText,
}: ComparisonDisplayProps): React.JSX.Element {
  const colorClass =
    changeDirection === "up"
      ? "text-[#049228]"
      : changeDirection === "down"
      ? "text-[#DC2626]"
      : "text-[#6A7282]";

  return (
    <div className="flex items-center gap-1">
      <TrendIcon direction={changeDirection} size={16} />
      <span className={`font-public text-[14px] font-medium tracking-[-0.14px] ${colorClass}`}>
        {changePercent.toFixed(1)}%
      </span>
      <span className="font-public text-[14px] font-medium tracking-[-0.14px] text-[#6A7282]">
        {comparisonText}
      </span>
    </div>
  );
}
