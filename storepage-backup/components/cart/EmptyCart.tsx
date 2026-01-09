import React from 'react'
import Link from 'next/link'

export const EmptyCart = (): React.JSX.Element => {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg bg-[#F7F7F7] px-8 py-16 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        className="mb-6"
      >
        <path
          d="M7 22C6.45 22 5.979 21.804 5.587 21.412C5.195 21.020 4.99933 20.5493 5 20V8C5 7.45 5.196 6.979 5.588 6.587C5.980 6.195 6.45067 5.99933 7 6H9V5C9 3.9 9.391 2.958 10.173 2.174C10.955 1.390 11.8973 0.999333 13 1C14.1 1 15.042 1.392 15.826 2.176C16.610 2.960 17.0013 3.90133 17 5V6H19C19.55 6 20.021 6.196 20.413 6.588C20.805 6.980 21.0007 7.45067 21 8V20C21 20.55 20.804 21.021 20.412 21.413C20.020 21.805 19.5493 22.0007 19 22H7ZM7 8V20H19V8H7ZM13 16C14.1 16 15.042 15.608 15.826 14.824C16.610 14.040 17.0013 13.0987 17 12H15C15 12.55 14.804 13.021 14.412 13.413C14.020 13.805 13.5493 14.0007 13 14C12.45 14 11.979 13.804 11.587 13.412C11.195 13.020 10.9993 12.5493 11 12H9C9 13.1 9.392 14.042 10.176 14.826C10.960 15.610 11.9013 16.0013 13 16ZM11 6H15V5C15 4.45 14.804 3.979 14.412 3.587C14.020 3.195 13.5493 2.99933 13 3C12.45 3 11.979 3.196 11.587 3.588C11.195 3.980 10.9993 4.45067 11 5V6Z"
          fill="#999999"
        />
      </svg>

      <h2 className="mb-3 font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
        Your bag is empty
      </h2>

      <p className="mb-8 font-inter text-[16px] font-normal leading-[150%] tracking-[-0.32px] text-[#666]">
        Looks like you haven&apos;t added anything to your bag yet. Start shopping to fill it up!
      </p>

      <Link
        href="/products"
        className="inline-block rounded-full border border-[#999] bg-white/16 px-12 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#090909] transition-all duration-300 hover:bg-[#999] hover:text-white"
      >
        Continue shopping
      </Link>
    </div>
  )
}
