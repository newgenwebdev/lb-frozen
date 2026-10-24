import LegacyHomePage from "@/components/home/legacy/LegacyHomePage";
import RedesignHomePage from "@/components/home/redesign/RedesignHomePage";
import { HOME_VARIANT } from "@/lib/config/home";

export default function HomePage() {
  return HOME_VARIANT === "legacy" ? <LegacyHomePage /> : <RedesignHomePage />;
}
