import { Noto_Sans_SC } from "next/font/google";

// CJK font for the redesigned homepage (exposed as --font-noto-sc, used via `font-home`)
export const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
});
