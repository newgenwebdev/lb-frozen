import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px] text-center">
        {/* 404 Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F5F5F5]">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#999]"
            >
              <path
                d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Error Code */}
        <h1 className="font-inter text-[64px] font-semibold leading-[100%] tracking-[-1.28px] text-black">
          404
        </h1>

        {/* Title */}
        <h2 className="mt-4 font-inter text-[24px] font-semibold leading-[100%] tracking-[-0.48px] text-black">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="mt-3 font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-[#666]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/admin/overview"
            className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-black px-4 py-[14px] font-inter text-[16px] font-semibold leading-[100%] tracking-[-0.32px] text-white transition-opacity hover:opacity-90"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#E5E5E5] bg-white px-4 py-[14px] font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-[#F5F5F5]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
