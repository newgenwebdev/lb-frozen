import React from "react";

type TrendDirection = "up" | "down" | "neutral";

type TrendIconProps = {
  direction: TrendDirection;
  size?: number;
};

export function TrendIcon({ direction, size = 16 }: TrendIconProps): React.JSX.Element {
  if (direction === "up") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14 8V8C14 11.314 11.314 14 8 14V14C4.686 14 2 11.314 2 8V8C2 4.686 4.686 2 8 2V2C11.314 2 14 4.686 14 8Z"
          stroke="#049228"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7.99935 5.3335V10.6668" stroke="#049228" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 7.3335L8 5.3335L10 7.3335" stroke="#049228" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (direction === "down") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14 8V8C14 11.314 11.314 14 8 14V14C4.686 14 2 11.314 2 8V8C2 4.686 4.686 2 8 2V2C11.314 2 14 4.686 14 8Z"
          stroke="#DC2626"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7.99935 10.6668V5.3335" stroke="#DC2626" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 8.6665L8 10.6665L6 8.6665" stroke="#DC2626" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 8V8C14 11.314 11.314 14 8 14V14C4.686 14 2 11.314 2 8V8C2 4.686 4.686 2 8 2V2C11.314 2 14 4.686 14 8Z"
        stroke="#6A7282"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 8H11" stroke="#6A7282" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
