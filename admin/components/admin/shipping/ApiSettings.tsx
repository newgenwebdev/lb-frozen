"use client";

import React, { useState } from "react";
import { useTestEasyParcelConnection } from "@/lib/api/queries";
import { useToast } from "@/contexts/ToastContext";

export function ApiSettings(): React.JSX.Element {
  const { showToast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "error"
  >("unknown");
  const testConnectionMutation = useTestEasyParcelConnection();

  const handleTestConnection = async (): Promise<void> => {
    try {
      const result = await testConnectionMutation.mutateAsync();
      if (result.success) {
        setConnectionStatus("connected");
        showToast("EasyParcel API connection successful!", "success");
      } else {
        setConnectionStatus("error");
        showToast(result.message || "Connection failed", "error");
      }
    } catch {
      setConnectionStatus("error");
      showToast("Failed to connect to EasyParcel API", "error");
    }
  };

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
      <h2 className="mb-2 font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712]">
        API Connection
      </h2>
      <p className="mb-6 font-public text-[14px] text-[#6A7282]">
        EasyParcel API connection settings and status.
      </p>

      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "error"
                    ? "bg-red-500"
                    : "bg-gray-400"
              }`}
            />
            <div>
              <p className="font-geist text-[14px] font-medium text-[#030712]">
                Connection Status
              </p>
              <p className="font-public text-[12px] text-[#6A7282]">
                {connectionStatus === "connected"
                  ? "Connected to EasyParcel"
                  : connectionStatus === "error"
                    ? "Connection failed"
                    : "Not tested yet"}
              </p>
            </div>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={testConnectionMutation.isPending}
            className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
          </button>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] p-4">
          <p className="mb-2 font-geist text-[14px] font-medium text-[#030712]">
            Environment
          </p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 font-public text-[12px] font-medium text-amber-700">
              Demo
            </span>
            <span className="font-public text-[12px] text-[#6A7282]">
              Using EasyParcel Demo API
            </span>
          </div>
          <p className="mt-2 font-public text-[12px] text-[#6A7282]">
            To switch to production, update EASYPARCEL_USE_DEMO in server
            environment.
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="font-geist text-[14px] font-medium text-blue-700">
            API Key Configuration
          </p>
          <p className="mt-1 font-public text-[12px] text-blue-600">
            Your EasyParcel API key is configured in the server environment
            variables (EASYPARCEL_API_KEY). Contact your system administrator to
            update the API key.
          </p>
        </div>
      </div>
    </div>
  );
}
