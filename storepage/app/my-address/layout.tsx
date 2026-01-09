import ProtectedNavbar from "@/components/layout/ProtectedNavbar";

export default function MyAddressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <ProtectedNavbar />
      {children}
    </div>
  );
}
