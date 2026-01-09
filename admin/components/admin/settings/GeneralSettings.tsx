import React from "react";

type GeneralSettingsProps = {
  name: string;
  email: string;
  role: string;
  isLoading?: boolean;
};

export function GeneralSettings({
  name,
  email,
  role,
  isLoading = false,
}: GeneralSettingsProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
        <div className="mb-2 h-6 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-gray-200" />

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="mb-2 h-4 w-16 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
      <h2 className="mb-2 font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712]">
        Account Details
      </h2>
      <p className="mb-6 font-public text-[14px] text-[#6A7282]">
        Your users will use this information to contact you.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Name
          </label>
          <input
            type="text"
            value={name}
            readOnly
            disabled
            className="w-full rounded-lg border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none cursor-not-allowed"
          />
        </div>
        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Email
          </label>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full rounded-lg border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none cursor-not-allowed"
          />
        </div>
        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Role
          </label>
          <input
            type="text"
            value={role.charAt(0).toUpperCase() + role.slice(1)}
            readOnly
            disabled
            className="w-full rounded-lg border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
