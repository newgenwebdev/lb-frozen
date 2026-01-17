"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/Toast";
import { GlobalSearchModal } from "@/components/ui/GlobalSearchModal";
import {
  BulkShippingProvider,
  useBulkShipping,
} from "@/contexts/BulkShippingContext";
import { BulkShippingDrawer } from "@/components/admin";
// Using lb-logo.png instead of SVG
const Logo = "/lb-logo.png";
import { useCurrentUser } from "@/lib/api/queries";
import { api } from "@/lib/api/client";

// ============================================================================
// PAGE CONFIG - Add new pages here to automatically show icon & title in header
// ============================================================================
// matchType: 'exact' = only matches exact path, 'section' = matches path and all sub-paths
type PageConfig = {
  path: string;
  title: string;
  matchType: "exact" | "section";
  icon: React.JSX.Element;
};

const PAGE_CONFIG: PageConfig[] = [
  {
    path: "/admin/overview",
    title: "Overview",
    matchType: "exact",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.1733 10.004C14.1733 7.7018 12.307 5.83557 10.0049 5.83557V10.004H14.1733Z"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.50233 7.76489C6.47003 8.38225 5.83715 9.4958 5.83496 10.6986C5.83496 12.6173 7.39029 14.1725 9.30891 14.1725C10.5117 14.1704 11.6253 13.5375 12.2426 12.5053"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="10.0031"
          cy="10.0044"
          r="7.50313"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: "/admin/products",
    title: "Products",
    matchType: "section",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M2.5 17.5H17.5"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.33398 17.5001L3.33407 9.12964"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.7275 17.4999L16.7276 9.11743"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18.1021 6.23138C18.3481 6.69455 18.3969 7.23728 18.2377 7.73694C17.9623 8.60378 17.1488 9.18564 16.2396 9.16619C15.3303 9.14675 14.5424 8.53065 14.3043 7.65284C14.2892 7.60185 14.2423 7.56688 14.1892 7.56688C14.1361 7.56688 14.0892 7.60185 14.0741 7.65284C13.8309 8.54629 13.0197 9.16626 12.0937 9.16616C11.1678 9.16606 10.3566 8.54592 10.1136 7.65241C10.0986 7.60141 10.0517 7.5664 9.99861 7.5664C9.94551 7.5664 9.89861 7.60141 9.88357 7.65241C9.64047 8.54593 8.82917 9.16599 7.90321 9.16595C6.97726 9.16591 6.16599 8.5458 5.923 7.65228C5.90789 7.6013 5.86106 7.56634 5.80798 7.56634C5.75491 7.56634 5.70807 7.6013 5.69297 7.65228C5.45467 8.52999 4.66689 9.14601 3.75765 9.16547C2.84842 9.18495 2.03499 8.60323 1.75951 7.73651C1.60023 7.23676 1.64911 6.69393 1.89511 6.23067L3.31738 3.41519C3.60091 2.85391 4.17619 2.5 4.80501 2.5H15.192C15.8208 2.5 16.396 2.85391 16.6796 3.41519L18.1021 6.23138Z"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.666 17.4999V9.11743"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.666 13.3335H3.33268"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: "/admin/categories",
    title: "Categories",
    matchType: "section",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.66667 8.33333H4.16667C3.24583 8.33333 2.5 7.5875 2.5 6.66667V4.16667C2.5 3.24583 3.24583 2.5 4.16667 2.5H6.66667C7.5875 2.5 8.33333 3.24583 8.33333 4.16667V6.66667C8.33333 7.5875 7.5875 8.33333 6.66667 8.33333Z"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.8341 8.33333H13.3341C12.4133 8.33333 11.6675 7.5875 11.6675 6.66667V4.16667C11.6675 3.24583 12.4133 2.5 13.3341 2.5H15.8341C16.755 2.5 17.5008 3.24583 17.5008 4.16667V6.66667C17.5008 7.5875 16.755 8.33333 15.8341 8.33333Z"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.66667 17.4996H4.16667C3.24583 17.4996 2.5 16.7538 2.5 15.8329V13.3329C2.5 12.4121 3.24583 11.6663 4.16667 11.6663H6.66667C7.5875 11.6663 8.33333 12.4121 8.33333 13.3329V15.8329C8.33333 16.7538 7.5875 17.4996 6.66667 17.4996Z"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.6667 12.9581H12.5"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.5 16.2089H16.6667"
          stroke="#030712"
          strokeWidth="1.5625"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: "/admin/orders",
    title: "Orders",
    matchType: "section",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <g clipPath="url(#clip0_header_orders)">
          <path
            d="M12.5 9.125L11.75 16.625M15.875 9.125L12.5 3.25M1.25 9.125H18.25M2.5625 9.125L3.9625 15.35C4.04478 15.751 4.26471 16.1109 4.58448 16.3666C4.90424 16.6224 5.30357 16.758 5.7125 16.75H14.0375C14.4464 16.758 14.8458 16.6224 15.1655 16.3666C15.4853 16.1109 15.7052 15.751 15.7875 15.35L17.275 9.125M3.4375 12.8123H16.3125M3.875 9.125L7.375 3.25M7.375 9.125L8.25 16.625"
            stroke="#030712"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <defs>
          <clipPath id="clip0_header_orders">
            <rect width="20" height="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    ),
  },
  {
    path: "/admin/returns",
    title: "Returns",
    matchType: "exact",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M7.5 3.33333L3.33333 7.5M3.33333 7.5L7.5 11.6667M3.33333 7.5H14.1667C15.2717 7.5 16.3315 7.93899 17.1129 8.72039C17.8943 9.50179 18.3333 10.5616 18.3333 11.6667V17.0833"
          stroke="#030712"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: "/admin/customers",
    title: "Customers",
    matchType: "section",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M15 17.5V15.8333C15 14.9493 14.6488 14.1014 14.0237 13.4763C13.3986 12.8512 12.5507 12.5 11.6667 12.5H5.83333C4.94928 12.5 4.10143 12.8512 3.47631 13.4763C2.85119 14.1014 2.5 14.9493 2.5 15.8333V17.5"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.75 9.16667C10.5909 9.16667 12.0833 7.67428 12.0833 5.83333C12.0833 3.99238 10.5909 2.5 8.75 2.5C6.90905 2.5 5.41667 3.99238 5.41667 5.83333C5.41667 7.67428 6.90905 9.16667 8.75 9.16667Z"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 17.5V15.8333C17.4996 15.0948 17.2421 14.3774 16.7685 13.7936C16.295 13.2099 15.6355 12.7931 14.8958 12.6083"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.2292 2.60833C13.9709 2.79192 14.6329 3.20893 15.1081 3.7936C15.5834 4.37827 15.8417 5.09736 15.8417 5.8375C15.8417 6.57764 15.5834 7.29673 15.1081 7.8814C14.6329 8.46607 13.9709 8.88308 13.2292 9.06667"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: "/admin/membership",
    title: "Membership",
    matchType: "section",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M10 9.16667C11.841 9.16667 13.3333 7.67428 13.3333 5.83333C13.3333 3.99238 11.841 2.5 10 2.5C8.15905 2.5 6.66667 3.99238 6.66667 5.83333C6.66667 7.67428 8.15905 9.16667 10 9.16667Z"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 17.5V15.8333C5 14.9493 5.35119 14.1014 5.97631 13.4763C6.60143 12.8512 7.44928 12.5 8.33333 12.5H11.6667C12.5507 12.5 13.3986 12.8512 14.0237 13.4763C14.6488 14.1014 15 14.9493 15 15.8333V17.5"
          stroke="#030712"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: '/admin/banner',
    title: 'Banner',
    matchType: 'section',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="4.16667" width="15" height="11.6667" rx="2" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6.66667 8.33333H13.3333" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6.66667 11.6667H10" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/admin/article',
    title: 'Article',
    matchType: 'section',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M11.6667 2.5H5.00001C4.55798 2.5 4.13406 2.67559 3.82149 2.98816C3.50893 3.30072 3.33334 3.72464 3.33334 4.16667V15.8333C3.33334 16.2754 3.50893 16.6993 3.82149 17.0118C4.13406 17.3244 4.55798 17.5 5.00001 17.5H15C15.442 17.5 15.866 17.3244 16.1785 17.0118C16.4911 16.6993 16.6667 16.2754 16.6667 15.8333V7.5L11.6667 2.5Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11.6667 2.5V7.5H16.6667" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.3333 10.8333H6.66666" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.3333 14.1667H6.66666" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.33333 7.5H6.66666" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/admin/reviews',
    title: 'Reviews',
    matchType: 'section',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 15.8333L5.83333 17.9167L6.66667 13.3333L3.33333 10L7.91667 9.33333L10 5L12.0833 9.33333L16.6667 10L13.3333 13.3333L14.1667 17.9167L10 15.8333Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/admin/notifications',
    title: 'Notifications',
    matchType: 'exact',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M8.55606 17.5002C8.70235 17.7535 8.91274 17.9639 9.1661 18.1102C9.41945 18.2565 9.70685 18.3335 9.99939 18.3335C10.2919 18.3335 10.5793 18.2565 10.8327 18.1102C11.0861 17.9639 11.2964 17.7535 11.4427 17.5002M2.71773 12.7718C2.60886 12.8912 2.53703 13.0396 2.51094 13.199C2.48485 13.3583 2.50566 13.5218 2.57081 13.6697C2.63597 13.8175 2.74268 13.9431 2.87794 14.0314C3.0132 14.1197 3.17121 14.1667 3.33273 14.1668H16.666C16.8276 14.1668 16.9856 14.12 17.121 14.0319C17.2563 13.9439 17.3631 13.8184 17.4285 13.6706C17.4938 13.5228 17.5147 13.3594 17.4889 13.2C17.463 13.0406 17.3914 12.8921 17.2827 12.7727C16.1744 11.6302 14.9994 10.416 14.9994 6.66687C14.9994 5.34079 14.4726 4.06901 13.5349 3.13133C12.5972 2.19365 11.3255 1.66687 9.99939 1.66687C8.67331 1.66687 7.40153 2.19365 6.46386 3.13133C5.52618 4.06901 4.99939 5.34079 4.99939 6.66687C4.99939 10.416 3.82356 11.6302 2.71773 12.7718Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/admin/shipment',
    title: 'Shipping Options',
    matchType: 'section',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M11.6667 15V5C11.6667 4.55797 11.4911 4.13405 11.1785 3.82149C10.866 3.50893 10.442 3.33333 10 3.33333H3.33333C2.89131 3.33333 2.46738 3.50893 2.15482 3.82149C1.84226 4.13405 1.66667 4.55797 1.66667 5V14.1667C1.66667 14.3877 1.75446 14.5996 1.91074 14.7559C2.06702 14.9122 2.27899 15 2.5 15H4.16667M4.16667 15C4.16667 15.9205 4.91286 16.6667 5.83333 16.6667C6.75381 16.6667 7.5 15.9205 7.5 15M4.16667 15C4.16667 14.0795 4.91286 13.3333 5.83333 13.3333C6.75381 13.3333 7.5 14.0795 7.5 15M12.5 15H7.5M12.5 15C12.5 15.9205 13.2462 16.6667 14.1667 16.6667C15.0871 16.6667 15.8333 15.9205 15.8333 15M12.5 15C12.5 14.0795 13.2462 13.3333 14.1667 13.3333C15.0871 13.3333 15.8333 14.0795 15.8333 15M15.8333 15H17.5C17.721 15 17.933 14.9122 18.0893 14.7559C18.2455 14.5996 18.3333 14.3877 18.3333 14.1667V11.131C18.3329 10.9404 18.2682 10.7556 18.1497 10.608L15.25 6.979C15.1754 6.88198 15.0803 6.80334 14.9718 6.74886C14.8634 6.69438 14.7442 6.6657 14.6232 6.66508H11.6667" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/admin/shipping/settings',
    title: 'Shipping Settings',
    matchType: 'section',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 10.8333C11.3807 10.8333 12.5 9.71405 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.71405 8.61929 10.8333 10 10.8333Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15.8929 8.33333C15.8929 13.8095 10 18.3333 10 18.3333C10 18.3333 4.10714 13.8095 4.10714 8.33333C4.10714 5.13567 6.74174 2.5 10 2.5C13.2583 2.5 15.8929 5.13567 15.8929 8.33333Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/admin/users-roles',
    title: 'Users & Roles',
    matchType: 'section',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10.8333 15.8333H5.83333C4.91286 15.8333 4.16667 15.0871 4.16667 14.1667V4.16667" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.16667 4.16667H14.1667C15.0871 4.16667 15.8333 4.91286 15.8333 5.83333V15.8333" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6.25 6.25L4.16667 4.16667L2.08333 6.25" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.3333 13.3333L15.8333 15.8333L18.3333 13.3333" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/admin/settings',
    title: 'Settings',
    matchType: 'section',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M16.5208 11.5007L16.5615 11.4905C17.1183 11.3513 17.5088 10.8511 17.5088 10.2773V9.72863C17.5088 9.1548 17.1181 8.65461 16.5615 8.51543L16.5206 8.50521C16.0963 8.39886 15.7474 8.09776 15.58 7.6935C15.4127 7.28924 15.4468 6.82961 15.6719 6.45446L15.689 6.42583C15.988 5.93296 15.9121 5.29968 15.5051 4.89152L15.1169 4.5035C14.7113 4.09775 14.0814 4.0202 13.5894 4.31541L13.5533 4.33709C13.1781 4.56216 12.7186 4.59616 12.3144 4.42875C11.9102 4.26134 11.6093 3.91232 11.5032 3.48791L11.4929 3.44718C11.3538 2.8905 10.8536 2.5 10.2798 2.5H9.73105C9.15723 2.5 8.65704 2.89051 8.51785 3.44718L8.50764 3.48804C8.4013 3.91244 8.1002 4.26139 7.69594 4.4287C7.29167 4.59602 6.83204 4.56194 6.45688 4.33682L6.42824 4.31966C5.93538 4.02066 5.30209 4.09662 4.89392 4.50371L4.50593 4.89173C4.10016 5.29741 4.02258 5.92719 4.31776 6.41921L4.33911 6.45481C4.56424 6.82998 4.59832 7.28961 4.43101 7.69388C4.2637 8.09815 3.91476 8.39925 3.49035 8.50559L3.44963 8.51578C2.89298 8.65496 2.50244 9.15512 2.50244 9.72891V10.2777C2.50244 10.8514 2.89276 11.3516 3.44933 11.4907L3.48977 11.5008C3.91424 11.6069 4.26335 11.9078 4.43091 12.312C4.59847 12.7161 4.56464 13.1758 4.33974 13.5511L4.31812 13.5871C4.02291 14.0791 4.10044 14.709 4.50617 15.1147L4.8942 15.5028C5.2998 15.9085 5.9295 15.9861 6.42146 15.691L6.45721 15.6695C6.83238 15.4444 7.29201 15.4103 7.69628 15.5776C8.10056 15.7449 8.40166 16.0939 8.50801 16.5183L8.5182 16.559C8.65736 17.1157 9.15753 17.5062 9.73134 17.5062H10.2801C10.8538 17.5062 11.354 17.1159 11.4931 16.5593L11.5033 16.5189C11.6093 16.0944 11.9102 15.7453 12.3144 15.5778C12.7186 15.4102 13.1783 15.444 13.5535 15.669L13.5894 15.6906C14.0816 15.9858 14.7114 15.9082 15.1171 15.5025L15.5052 15.1144C15.9109 14.7088 15.9885 14.0791 15.6934 13.5872L15.672 13.5515C15.4469 13.1763 15.4128 12.7167 15.5801 12.3124C15.7474 11.9081 16.0964 11.607 16.5208 11.5007Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10.0054" cy="10.0042" r="1.73149" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/admin/brands',
    title: 'Brands',
    matchType: 'section',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 1.66667L12.5 6.66667L17.5 7.5L13.75 11.6667L14.75 17.5L10 14.5833L5.25 17.5L6.25 11.6667L2.5 7.5L7.5 6.66667L10 1.66667Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

// Helper function to get current page config based on pathname
const getPageConfig = (pathname: string): PageConfig | undefined => {
  return PAGE_CONFIG.find((config) => {
    if (config.matchType === "exact") {
      return pathname === config.path;
    }
    return pathname.startsWith(config.path);
  });
};

// Inner component to use the bulk shipping context
function BulkShippingPanel(): React.JSX.Element {
  const { isOpen, selectedOrders, closeBulkShipping, onSubmit } =
    useBulkShipping();

  const handleComplete = (): void => {
    if (onSubmit) {
      onSubmit({} as Parameters<NonNullable<typeof onSubmit>>[0]);
    }
  };

  return (
    <BulkShippingDrawer
      isOpen={isOpen}
      onClose={closeBulkShipping}
      selectedOrders={selectedOrders}
      onComplete={handleComplete}
    />
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();

  // Open search modal
  const openSearch = useCallback((): void => {
    setIsSearchOpen(true);
  }, []);

  // Close search modal
  const closeSearch = useCallback((): void => {
    setIsSearchOpen(false);
  }, []);

  // Keyboard shortcut: Cmd+F (Mac) or Ctrl+F (Windows) to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd+F (Mac) or Ctrl+F (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        openSearch();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openSearch]);

  // Check if current user is an owner (can access Users & Roles)
  const isOwner = currentUser?.role?.toLowerCase() === "owner";

  // Fetch notification count (low stock alerts)
  useEffect(() => {
    const fetchNotificationCount = async (): Promise<void> => {
      // Only fetch if user is authenticated (has token)
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      try {
        const response = await api.get<{ alerts: Array<{ variant_id: string }>; count: number }>("/admin/low-stock-alerts");
        const { alerts } = response.data;

        // Badge shows total active alerts (not read/unread status)
        // This ensures admins always know when stock is low
        setNotificationCount(alerts.length);
      } catch (error: unknown) {
        // Silently ignore auth errors
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status !== 401) {
          console.error("Failed to fetch notification count:", error);
        }
      }
    };

    // Initial fetch
    fetchNotificationCount();

    // Refresh every 5 minutes
    const interval = setInterval(fetchNotificationCount, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Persist sidebar state on desktop, always collapse on mobile
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList): void => {
      const desktop = e.matches;
      setIsDesktop(desktop);

      if (desktop) {
        // On desktop: restore from localStorage, default to expanded
        const saved = localStorage.getItem("sidebar-collapsed");
        setIsSidebarCollapsed(saved === "true");
      } else {
        // On mobile: always start collapsed
        setIsSidebarCollapsed(true);
      }
    };

    // Initial check
    handleMediaChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  // Save sidebar state to localStorage on desktop
  useEffect(() => {
    if (isDesktop) {
      localStorage.setItem("sidebar-collapsed", String(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, isDesktop]);

  // Extract page name from pathname (e.g., /admin/overview -> Overview)
  const pageName =
    pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, " ")
      .toUpperCase() || "OVERVIEW";

  // Generate breadcrumb path based on current pathname
  const getBreadcrumbPath = (): { label: string; isLast: boolean }[] => {
    const pathSegments = pathname.split("/").filter(Boolean);

    // Remove 'admin' from segments
    const relevantSegments = pathSegments.slice(1);

    if (relevantSegments.length === 0) {
      return [{ label: "OVERVIEW", isLast: true }];
    }

    // Handle nested routes (e.g., /admin/products/add-product)
    if (relevantSegments.length > 1) {
      return relevantSegments.map((segment, index) => ({
        label: segment.replace(/-/g, " ").toUpperCase(),
        isLast: index === relevantSegments.length - 1,
      }));
    }

    // Single level route
    return [{ label: pageName, isLast: true }];
  };

  const breadcrumbPath = getBreadcrumbPath();

  // Helper function to check if link is active (exact match)
  const isActive = (path: string): boolean => pathname === path;

  // Helper function to check if we're in a section (starts with path)
  const isInSection = (path: string): boolean => pathname.startsWith(path);
  return (
    <ToastProvider>
      <BulkShippingProvider>
        <div className="flex min-h-screen bg-[#F3F4F6]">
          {/* Mobile Overlay */}
          {!isSidebarCollapsed && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsSidebarCollapsed(true)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`flex flex-col bg-white lg:bg-[#F5F5F5] transition-all duration-300 z-50
        ${isSidebarCollapsed ? "lg:w-16" : "lg:w-54"}
        lg:sticky lg:top-0 lg:h-screen lg:pt-8
        max-lg:fixed max-lg:inset-0 max-lg:w-70 max-lg:h-full max-lg:pt-4
        ${
          isSidebarCollapsed
            ? "max-lg:-translate-x-full"
            : "max-lg:translate-x-0"
        }
      `}
          >
            {/* Logo */}
            <div
              className={`h-16 flex items-center px-6 max-lg:h-20 ${
                isSidebarCollapsed ? "lg:justify-center" : "justify-between"
              }`}
            >
              <Image
                src={Logo}
                alt="LB Bartar"
                width={120}
                height={40}
                className={`w-auto transition-opacity duration-300 max-lg:h-9 ${
                  isSidebarCollapsed
                    ? "lg:opacity-0 lg:w-0 lg:absolute"
                    : "opacity-100 h-8"
                }`}
              />
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 hover:bg-[#F5F5F5] rounded transition-colors shrink-0 max-lg:hidden"
                aria-label="Toggle sidebar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`transition-transform duration-300 ${
                    isSidebarCollapsed ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M12.6667 2H3.33333C2.59695 2 2 2.59695 2 3.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V3.33333C14 2.59695 13.403 2 12.6667 2Z"
                    stroke="#6A7282"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 2V14"
                    stroke="#6A7282"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5.33398 6L7.33398 8L5.33398 10"
                    stroke="#6A7282"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Search Bar */}
            {!isSidebarCollapsed && (
              <div className="px-4 py-4 max-lg:px-6">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="max-lg:w-5 max-lg:h-5"
                    >
                      <circle
                        cx="7.37593"
                        cy="7.37593"
                        r="4.70796"
                        stroke="#030712"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M13.3395 13.339L10.7051 10.7046"
                        stroke="#030712"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={openSearch}
                    className="font-public w-full pl-10 pr-16 py-2 text-[14px] text-[#6A7282] bg-white border border-[#E5E7EB] rounded-lg hover:border-[#D9D9D9] transition-colors cursor-pointer text-left max-lg:py-3 max-lg:text-base max-lg:pl-12"
                  >
                    Search
                  </button>
                  <div className="font-geist absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[12px] text-[#99A1AF] font-medium rounded border border-[#E8E8E9] bg-white shadow-[0_1px_1.5px_0.1px_rgba(22,25,36,0.03)] max-lg:hidden pointer-events-none">
                    ⌘ F
                  </div>
                </div>
              </div>
            )}

            {/* Menu */}
            <nav className="flex-1 py-6 overflow-y-auto max-lg:px-3">
              <div className="px-3 mb-4 max-lg:px-0">
                {!isSidebarCollapsed && (
                  <p className="font-geist px-3 text-[12px] font-medium tracking-[-0.12px] text-[#99A1AF] mb-2 max-lg:text-sm">
                    MENU
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  <a
                    href="/admin/overview"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isActive("/admin/overview")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Overview"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M11.3386 8.00318C11.3386 6.16146 9.84562 4.66846 8.00391 4.66846V8.00318H11.3386Z"
                        stroke={
                          isActive("/admin/overview") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.00186 6.21191C5.17602 6.7058 4.66972 7.59664 4.66797 8.55889C4.66797 10.0938 5.91224 11.338 7.44713 11.338C8.40938 11.3363 9.30022 10.83 9.7941 10.0042"
                        stroke={
                          isActive("/admin/overview") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="8.0025"
                        cy="8.00348"
                        r="6.0025"
                        stroke={
                          isActive("/admin/overview") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Overview"}
                  </a>
                  <Link
                    href="/admin/orders"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isActive("/admin/orders")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Orders"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="17"
                      height="17"
                      viewBox="0 0 17 17"
                      fill="none"
                      className="shrink-0"
                    >
                      <g clipPath="url(#clip0_25591_66964)">
                        <path
                          d="M10.5004 7.6998L9.80039 13.9998M13.3004 7.6998L10.5004 2.7998M1.40039 7.6998H15.4004M2.45039 7.6998L3.57039 12.8798C3.63584 13.2008 3.81178 13.4887 4.06759 13.6933C4.3234 13.8979 4.64287 14.0064 4.97039 13.9998H11.8304C12.1579 14.0064 12.4774 13.8979 12.7332 13.6933C12.989 13.4887 13.1649 13.2008 13.2304 12.8798L14.4204 7.6998M3.15039 10.8498H13.6504M3.50039 7.6998L6.30039 2.7998M6.30039 7.6998L7.00039 13.9998"
                          stroke="#858585"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_25591_66964">
                          <rect width="16.8" height="16.8" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                    {!isSidebarCollapsed && "Orders"}
                  </Link>
                  <a
                    href="/admin/returns"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isActive("/admin/returns")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Returns"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="17"
                      height="17"
                      viewBox="0 0 17 17"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M6.3 2.8L2.8 6.3M2.8 6.3L6.3 9.8M2.8 6.3H11.9C12.8548 6.3 13.7705 6.6793 14.4456 7.35442C15.1207 8.02955 15.5 8.94522 15.5 9.9V14.5"
                        stroke={
                          isActive("/admin/returns") ? "#2F2F2F" : "#858585"
                        }
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Returns"}
                  </a>
                </div>
              </div>

              <div className="px-3 mb-4 max-lg:px-0">
                {!isSidebarCollapsed && (
                  <p className="font-geist px-3 text-[12px] font-medium tracking-[-0.12px] text-[#99A1AF] mb-2 max-lg:text-sm">
                    INVENTORY
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  <a
                    href="/admin/products"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isInSection("/admin/products")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Product"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M2 13.9998H14"
                        stroke={
                          isInSection("/admin/products") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2.66728 14.0001L2.66735 7.30371"
                        stroke={
                          isInSection("/admin/products") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M13.3821 13.9999L13.3822 7.29395"
                        stroke={
                          isInSection("/admin/products") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M14.4817 4.9851C14.6785 5.35564 14.7176 5.78982 14.5902 6.18955C14.3699 6.88302 13.7191 7.34851 12.9917 7.33295C12.2642 7.3174 11.634 6.82452 11.4435 6.12227C11.4314 6.08148 11.3939 6.0535 11.3514 6.0535C11.3089 6.0535 11.2714 6.08148 11.2593 6.12227C11.0648 6.83703 10.4158 7.33301 9.67501 7.33293C8.93426 7.33285 8.28532 6.83673 8.09096 6.12193C8.07891 6.08113 8.04144 6.05312 7.99889 6.05312C7.95634 6.05312 7.91887 6.08113 7.90682 6.12193C7.71238 6.83674 7.06334 7.33279 6.32257 7.33276C5.58179 7.33273 4.93279 6.83664 4.7384 6.12182C4.72631 6.08104 4.68885 6.05307 4.64631 6.05307C4.60378 6.05307 4.56631 6.08104 4.55423 6.12182C4.36374 6.82399 3.73351 7.31681 3.00612 7.33238C2.27874 7.34796 1.62799 6.88258 1.40761 6.18921C1.28019 5.78941 1.31929 5.35514 1.51609 4.98454L2.65391 2.73215C2.88073 2.28313 3.34096 2 3.84401 2H12.1536C12.6566 2 13.1168 2.28313 13.3437 2.73215L14.4817 4.9851Z"
                        stroke={
                          isInSection("/admin/products") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.33333 13.9999V7.29395"
                        stroke={
                          isInSection("/admin/products") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.33268 10.6668H2.66602"
                        stroke={
                          isInSection("/admin/products") ? "#2F2F2F" : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Product"}
                  </a>
                  <a
                    href="/admin/categories"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isInSection("/admin/categories")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Categories"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M5.33333 6.66667H3.33333C2.59667 6.66667 2 6.07 2 5.33333V3.33333C2 2.59667 2.59667 2 3.33333 2H5.33333C6.07 2 6.66667 2.59667 6.66667 3.33333V5.33333C6.66667 6.07 6.07 6.66667 5.33333 6.66667Z"
                        stroke={
                          isInSection("/admin/categories")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.6673 6.66667H10.6673C9.93065 6.66667 9.33398 6.07 9.33398 5.33333V3.33333C9.33398 2.59667 9.93065 2 10.6673 2H12.6673C13.404 2 14.0007 2.59667 14.0007 3.33333V5.33333C14.0007 6.07 13.404 6.66667 12.6673 6.66667Z"
                        stroke={
                          isInSection("/admin/categories")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M5.33333 13.9997H3.33333C2.59667 13.9997 2 13.403 2 12.6663V10.6663C2 9.92967 2.59667 9.33301 3.33333 9.33301H5.33333C6.07 9.33301 6.66667 9.92967 6.66667 10.6663V12.6663C6.66667 13.403 6.07 13.9997 5.33333 13.9997Z"
                        stroke={
                          isInSection("/admin/categories")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M13.3333 10.3665H10"
                        stroke={
                          isInSection("/admin/categories")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 12.9671H13.3333"
                        stroke={
                          isInSection("/admin/categories")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Categories"}
                  </a>
                  {/* <a
                    href="/admin/brands"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isInSection("/admin/brands")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Brands"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M8 1.33333L10 5.33333L14 6L11 9.33333L12 14L8 11.6667L4 14L5 9.33333L2 6L6 5.33333L8 1.33333Z"
                        stroke={
                          isInSection("/admin/brands")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Brands"}
                  </a>
                  <a
                    href="/admin/promos"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isInSection("/admin/promos")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Promo"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <rect
                        x="1.33398"
                        y="7.33594"
                        width="9.33722"
                        height="6.66944"
                        rx="1.33333"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.00195 11.6708L7.00279 9.66992"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4.44141 7.33615L5.60856 2.98768C5.70012 2.64603 5.92387 2.35486 6.23044 2.17843C6.537 2.002 6.90117 1.95481 7.24257 2.04728L13.6853 3.77467C14.0269 3.86623 14.3181 4.08999 14.4945 4.39655C14.6709 4.70311 14.7181 5.06728 14.6256 5.40869L13.5919 9.27029C13.4008 9.98198 12.6704 10.4053 11.9579 10.2174L10.6707 9.87054"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7.16955 11.8042C7.16953 11.8226 7.1546 11.8375 7.13619 11.8375C7.11779 11.8375 7.10287 11.8226 7.10286 11.8042C7.10285 11.7858 7.11776 11.7709 7.13617 11.7708C7.14502 11.7708 7.15352 11.7743 7.15979 11.7806C7.16605 11.7869 7.16956 11.7954 7.16955 11.8042"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4.90198 9.53664C4.90195 9.55504 4.88702 9.56995 4.86862 9.56994C4.85021 9.56994 4.83529 9.55502 4.83528 9.53661C4.83527 9.5182 4.85018 9.50327 4.86859 9.50325C4.87745 9.50324 4.88594 9.50675 4.89221 9.51302C4.89847 9.51928 4.90199 9.52778 4.90198 9.53664"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Promo"}
                  </a> */}
                </div>
              </div>

              <div className="px-3 mb-4 max-lg:px-0">
                {!isSidebarCollapsed && (
                  <p className="font-geist px-3 text-[12px] font-medium tracking-[-0.12px] text-[#99A1AF] mb-2 max-lg:text-sm">
                    MEMBERSHIP
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  <a
                    href="/admin/membership"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isActive("/admin/membership") ||
                      pathname.startsWith("/admin/membership/members")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Members"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M8 7.33333C9.47276 7.33333 10.6667 6.13943 10.6667 4.66667C10.6667 3.19391 9.47276 2 8 2C6.52724 2 5.33333 3.19391 5.33333 4.66667C5.33333 6.13943 6.52724 7.33333 8 7.33333Z"
                        stroke={
                          isActive("/admin/membership") ||
                          pathname.startsWith("/admin/membership/members")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 14V12.6667C4 11.9594 4.28095 11.2811 4.78105 10.781C5.28115 10.281 5.95942 10 6.66667 10H9.33333C10.0406 10 10.7189 10.281 11.219 10.781C11.719 11.2811 12 11.9594 12 12.6667V14"
                        stroke={
                          isActive("/admin/membership") ||
                          pathname.startsWith("/admin/membership/members")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Members"}
                  </a>
                  <a
                    href="/admin/membership/promos"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      pathname.startsWith("/admin/membership/promos")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Promos"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <rect
                        x="1.33398"
                        y="7.33594"
                        width="9.33722"
                        height="6.66944"
                        rx="1.33333"
                        stroke={
                          pathname.startsWith("/admin/membership/promos")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.00195 11.6708L7.00279 9.66992"
                        stroke={
                          pathname.startsWith("/admin/membership/promos")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4.44141 7.33615L5.60856 2.98768C5.70012 2.64603 5.92387 2.35486 6.23044 2.17843C6.537 2.002 6.90117 1.95481 7.24257 2.04728L13.6853 3.77467C14.0269 3.86623 14.3181 4.08999 14.4945 4.39655C14.6709 4.70311 14.7181 5.06728 14.6256 5.40869L13.5919 9.27029C13.4008 9.98198 12.6704 10.4053 11.9579 10.2174L10.6707 9.87054"
                        stroke={
                          pathname.startsWith("/admin/membership/promos")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7.16955 11.8042C7.16953 11.8226 7.1546 11.8375 7.13619 11.8375C7.11779 11.8375 7.10287 11.8226 7.10286 11.8042C7.10285 11.7858 7.11776 11.7709 7.13617 11.7708C7.14502 11.7708 7.15352 11.7743 7.15979 11.7806C7.16605 11.7869 7.16956 11.7954 7.16955 11.8042"
                        stroke={
                          pathname.startsWith("/admin/membership/promos")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4.90198 9.53664C4.90195 9.55504 4.88702 9.56995 4.86862 9.56994C4.85021 9.56994 4.83529 9.55502 4.83528 9.53661C4.83527 9.5182 4.85018 9.50327 4.86859 9.50325C4.87745 9.50324 4.88594 9.50675 4.89221 9.51302C4.89847 9.51928 4.90199 9.52778 4.90198 9.53664"
                        stroke={
                          pathname.startsWith("/admin/membership/promos")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Promos"}
                  </a>
                  <a
                    href="/admin/membership/tiers"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      pathname.startsWith("/admin/membership/tiers")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Tiers"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M2 12.6667H14"
                        stroke={
                          pathname.startsWith("/admin/membership/tiers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3.33398 12.6667V10"
                        stroke={
                          pathname.startsWith("/admin/membership/tiers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6 12.6667V7.33337"
                        stroke={
                          pathname.startsWith("/admin/membership/tiers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8.66602 12.6667V4.66663"
                        stroke={
                          pathname.startsWith("/admin/membership/tiers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M11.334 12.6667V2"
                        stroke={
                          pathname.startsWith("/admin/membership/tiers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Tiers"}
                  </a>
                  <a
                    href="/admin/membership/points"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      pathname.startsWith("/admin/membership/points")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Points"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        stroke={
                          pathname.startsWith("/admin/membership/points")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                      />
                      <path
                        d="M8 5V8L10 10"
                        stroke={
                          pathname.startsWith("/admin/membership/points")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Points"}
                  </a>
                  <a
                    href="/admin/membership/settings"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      pathname.startsWith("/admin/membership/settings")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Settings"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
                        stroke={
                          pathname.startsWith("/admin/membership/settings")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12.9333 10C12.8445 10.2023 12.8184 10.4266 12.8585 10.644C12.8987 10.8613 13.0032 11.0618 13.16 11.22L13.2 11.26C13.325 11.3848 13.4241 11.5333 13.4916 11.6968C13.559 11.8604 13.5935 12.0358 13.5935 12.213C13.5935 12.3902 13.559 12.5656 13.4916 12.7291C13.4241 12.8927 13.325 13.0412 13.2 13.166C13.0752 13.2911 12.9267 13.3902 12.7631 13.4577C12.5996 13.5251 12.4242 13.5596 12.247 13.5596C12.0698 13.5596 11.8944 13.5251 11.7308 13.4577C11.5673 13.3902 11.4188 13.2911 11.294 13.166L11.254 13.126C11.0958 12.9692 10.8953 12.8647 10.678 12.8245C10.4607 12.7843 10.2363 12.8105 10.034 12.8993C9.83573 12.9842 9.66665 13.1265 9.54911 13.3072C9.43157 13.4879 9.37063 13.6988 9.37333 13.914V14.0467C9.37333 14.4052 9.23095 14.749 8.97715 15.0028C8.72334 15.2566 8.37952 15.399 8.021 15.399C7.66248 15.399 7.31866 15.2566 7.06485 15.0028C6.81105 14.749 6.66867 14.4052 6.66867 14.0467V13.978C6.66283 13.7569 6.59378 13.5419 6.47013 13.3599C6.34647 13.1778 6.1733 13.0372 5.97133 12.9567C5.76907 12.8679 5.54466 12.8417 5.32736 12.8819C5.11006 12.922 4.90959 13.0265 4.75133 13.1833L4.71133 13.2233C4.58654 13.3484 4.438 13.4475 4.27445 13.515C4.11089 13.5824 3.93551 13.6169 3.75833 13.6169C3.58116 13.6169 3.40578 13.5824 3.24222 13.515C3.07867 13.4475 2.93012 13.3484 2.80533 13.2233C2.68029 13.0985 2.58117 12.95 2.51373 12.7864C2.44629 12.6229 2.41179 12.4475 2.41179 12.2703C2.41179 12.0932 2.44629 11.9178 2.51373 11.7542C2.58117 11.5907 2.68029 11.4421 2.80533 11.3173L2.84533 11.2773C3.00215 11.1191 3.10664 10.9186 3.14685 10.7013C3.18706 10.4841 3.16086 10.2596 3.072 10.0573C2.98706 9.85907 2.84479 9.68999 2.66413 9.57245C2.48346 9.45491 2.27256 9.39396 2.058 9.39667H1.92533C1.56681 9.39667 1.223 9.25428 0.969195 9.00048C0.715392 8.74668 0.573008 8.40285 0.573008 8.04433C0.573008 7.68581 0.715392 7.34199 0.969195 7.08819C1.223 6.83438 1.56681 6.692 1.92533 6.692H1.99333C2.21441 6.68616 2.42939 6.61711 2.61144 6.49346C2.79349 6.3698 2.93411 6.19664 3.01467 5.99467C3.10353 5.7924 3.12972 5.568 3.08951 5.3507C3.0493 5.1334 2.94481 4.93292 2.788 4.77467L2.748 4.73467C2.62296 4.60987 2.52384 4.46133 2.45639 4.29778C2.38895 4.13422 2.35445 3.95884 2.35445 3.78167C2.35445 3.60449 2.38895 3.42911 2.45639 3.26556C2.52384 3.102 2.62296 2.95346 2.748 2.82867C2.87279 2.70362 3.02134 2.6045 3.18489 2.53706C3.34845 2.46962 3.52383 2.43512 3.701 2.43512C3.87818 2.43512 4.05355 2.46962 4.21711 2.53706C4.38067 2.6045 4.52921 2.70362 4.654 2.82867L4.694 2.86867C4.85226 3.02548 5.05273 3.12997 5.27003 3.17018C5.48733 3.21039 5.71174 3.18419 5.914 3.09533H5.97133C6.16959 3.01039 6.33867 2.86812 6.45621 2.68746C6.57375 2.50679 6.6347 2.29589 6.632 2.08133V1.94867C6.632 1.59015 6.77438 1.24633 7.02819 0.992526C7.28199 0.738723 7.62581 0.596338 7.98433 0.596338C8.34285 0.596338 8.68667 0.738723 8.94048 0.992526C9.19428 1.24633 9.33667 1.59015 9.33667 1.94867V2.01667C9.33396 2.23122 9.39491 2.44212 9.51245 2.62279C9.62999 2.80346 9.79907 2.94572 9.99733 3.03067C10.1996 3.11953 10.424 3.14572 10.6413 3.10551C10.8586 3.0653 11.0591 2.96082 11.2173 2.804L11.2573 2.764C11.3821 2.63896 11.5307 2.53984 11.6942 2.47239C11.8578 2.40495 12.0332 2.37045 12.2103 2.37045C12.3875 2.37045 12.5629 2.40495 12.7264 2.47239C12.89 2.53984 13.0385 2.63896 13.1633 2.764C13.2884 2.88879 13.3875 3.03734 13.4549 3.20089C13.5224 3.36445 13.5569 3.53983 13.5569 3.717C13.5569 3.89418 13.5224 4.06955 13.4549 4.23311C13.3875 4.39667 13.2884 4.54521 13.1633 4.67L13.1233 4.71C12.9665 4.86826 12.862 5.06873 12.8218 5.28603C12.7816 5.50333 12.8078 5.72774 12.8967 5.93V5.98733C12.9816 6.18559 13.1239 6.35467 13.3046 6.47221C13.4852 6.58975 13.6961 6.6507 13.9107 6.648H14.0433C14.4019 6.648 14.7457 6.79038 14.9995 7.04419C15.2533 7.29799 15.3957 7.64181 15.3957 8.00033C15.3957 8.35885 15.2533 8.70267 14.9995 8.95648C14.7457 9.21028 14.4019 9.35267 14.0433 9.35267H13.9753C13.7608 9.35537 13.5499 9.41632 13.3692 9.53386C13.1886 9.6514 13.0463 9.82047 12.9613 10.0187L12.9333 10Z"
                        stroke={
                          pathname.startsWith("/admin/membership/settings")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Settings"}
                  </a>
                </div>
              </div>

              {/* CUSTOMERS Section */}
              <div className="px-3 mb-4 max-lg:px-0">
                {!isSidebarCollapsed && (
                  <p className="font-geist px-3 text-[12px] font-medium tracking-[-0.12px] text-[#99A1AF] mb-2 max-lg:text-sm">
                    CUSTOMERS
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  <a
                    href="/admin/customers"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isInSection("/admin/customers")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Customers"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M12 14V12.6667C12 11.9594 11.719 11.2811 11.219 10.781C10.7189 10.281 10.0406 10 9.33333 10H4.66667C3.95942 10 3.28115 10.281 2.78105 10.781C2.28095 11.2811 2 11.9594 2 12.6667V14"
                        stroke={
                          isInSection("/admin/customers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 7.33333C8.47276 7.33333 9.66667 6.13943 9.66667 4.66667C9.66667 3.19391 8.47276 2 7 2C5.52724 2 4.33333 3.19391 4.33333 4.66667C4.33333 6.13943 5.52724 7.33333 7 7.33333Z"
                        stroke={
                          isInSection("/admin/customers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 14V12.6667C13.9996 12.0758 13.7932 11.5019 13.4148 11.0349C13.0365 10.5679 12.5082 10.2344 11.9167 10.0867"
                        stroke={
                          isInSection("/admin/customers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10.5833 2.08667C11.1764 2.23354 11.7063 2.56714 12.0858 3.03488C12.4654 3.50262 12.6725 4.07789 12.6725 4.67C12.6725 5.26211 12.4654 5.83738 12.0858 6.30512C11.7063 6.77286 11.1764 7.10646 10.5833 7.25333"
                        stroke={
                          isInSection("/admin/customers")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Customers"}
                  </a>
                </div>
              </div>

              {/* SHIPPING Section */}
              <div className="px-3 mb-4 max-lg:px-0">
                {!isSidebarCollapsed && (
                  <p className="font-geist px-3 text-[12px] font-medium tracking-[-0.12px] text-[#99A1AF] mb-2 max-lg:text-sm">
                    SHIPPING
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  <a
                    href="/admin/shipment"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      pathname === "/admin/shipment" ||
                      pathname.startsWith("/admin/shipment/")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Shipping Options"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="17"
                      height="17"
                      viewBox="0 0 17 17"
                      fill="none"
                      className="shrink-0"
                    >
                      <g clipPath="url(#clip0_shipping_options)">
                        <path
                          d="M9.80039 12.5998V4.1998C9.80039 3.8285 9.65289 3.47241 9.39034 3.20986C9.12779 2.9473 8.77169 2.7998 8.40039 2.7998H2.80039C2.42909 2.7998 2.07299 2.9473 1.81044 3.20986C1.54789 3.47241 1.40039 3.8285 1.40039 4.1998V11.8998C1.40039 12.0855 1.47414 12.2635 1.60542 12.3948C1.73669 12.5261 1.91474 12.5998 2.10039 12.5998H3.50039M3.50039 12.5998C3.50039 13.373 4.12719 13.9998 4.90039 13.9998C5.67359 13.9998 6.30039 13.373 6.30039 12.5998M3.50039 12.5998C3.50039 11.8266 4.12719 11.1998 4.90039 11.1998C5.67359 11.1998 6.30039 11.8266 6.30039 12.5998M10.5004 12.5998H6.30039M10.5004 12.5998C10.5004 13.373 11.1272 13.9998 11.9004 13.9998C12.6736 13.9998 13.3004 13.373 13.3004 12.5998M10.5004 12.5998C10.5004 11.8266 11.1272 11.1998 11.9004 11.1998C12.6736 11.1998 13.3004 11.8266 13.3004 12.5998M13.3004 12.5998H14.7004C14.886 12.5998 15.0641 12.5261 15.1954 12.3948C15.3266 12.2635 15.4004 12.0855 15.4004 11.8998V9.3448C15.4001 9.18595 15.3458 9.03191 15.2464 8.908L12.8104 5.863C12.7449 5.78102 12.6619 5.7148 12.5674 5.66924C12.4728 5.62369 12.3693 5.59995 12.2644 5.5998H9.80039"
                          stroke={
                            pathname === "/admin/shipment" ||
                            pathname.startsWith("/admin/shipment/")
                              ? "#2F2F2F"
                              : "#858585"
                          }
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_shipping_options">
                          <rect width="16.8" height="16.8" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                    {!isSidebarCollapsed && "Shipping Options"}
                  </a>
                  <a
                    href="/admin/shipping/settings"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      pathname.startsWith("/admin/shipping/settings")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Shipping Settings"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M13.2166 9.20057L13.2492 9.19242C13.6946 9.08106 14.007 8.68091 14.007 8.22187V7.7829C14.007 7.32384 13.6945 6.92369 13.2492 6.81234L13.2165 6.80417C12.877 6.71909 12.5979 6.47821 12.464 6.1548C12.3302 5.83139 12.3574 5.46369 12.5375 5.16356L12.5512 5.14067C12.7904 4.74637 12.7297 4.23974 12.404 3.91321L12.0936 3.6028C11.769 3.2782 11.2651 3.21616 10.8715 3.45233L10.8426 3.46967C10.5425 3.64973 10.1748 3.67693 9.85149 3.543C9.52816 3.40907 9.28741 3.12985 9.20252 2.79033L9.19437 2.75774C9.08301 2.3124 8.68287 2 8.22382 2H7.78484C7.32578 2 6.92563 2.31241 6.81428 2.75775L6.80611 2.79043C6.72104 3.12995 6.48016 3.40911 6.15675 3.54296C5.83333 3.67682 5.46563 3.64955 5.1655 3.46946L5.14259 3.45573C4.7483 3.21653 4.24167 3.2773 3.91514 3.60297L3.60474 3.91338C3.28012 4.23792 3.21806 4.74175 3.45421 5.13537L3.47129 5.16385C3.65139 5.46398 3.67866 5.83169 3.54481 6.1551C3.41096 6.47852 3.13181 6.7194 2.79228 6.80447L2.75971 6.81262C2.31438 6.92397 2.00195 7.32409 2.00195 7.78313V8.22217C2.00195 8.68114 2.31421 9.08124 2.75946 9.19258L2.79182 9.20067C3.13139 9.28555 3.41068 9.52627 3.54473 9.84961C3.67877 10.1729 3.65171 10.5407 3.47179 10.8409L3.45449 10.8697C3.21833 11.2633 3.28035 11.7672 3.60493 12.0918L3.91536 12.4022C4.23984 12.7268 4.7436 12.7889 5.13717 12.5528L5.16577 12.5356C5.4659 12.3555 5.83361 12.3282 6.15703 12.4621C6.48045 12.5959 6.72133 12.8751 6.80641 13.2146L6.81456 13.2472C6.92589 13.6926 7.32602 14.005 7.78507 14.005H8.2241C8.68307 14.005 9.08317 13.6927 9.19451 13.2474L9.2026 13.2151C9.28746 12.8755 9.52819 12.5962 9.85152 12.4622C10.1749 12.3282 10.5426 12.3552 10.8428 12.5352L10.8716 12.5525C11.2653 12.7886 11.7691 12.7266 12.0937 12.402L12.4042 12.0916C12.7287 11.7671 12.7908 11.2633 12.5547 10.8698L12.5376 10.8412C12.3575 10.541 12.3302 10.1733 12.4641 9.84992C12.5979 9.52651 12.8771 9.28563 13.2166 9.20057Z"
                        stroke={
                          pathname.startsWith("/admin/shipping/settings")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="8.00433"
                        cy="8.00335"
                        r="1.38519"
                        stroke={
                          pathname.startsWith("/admin/shipping/settings")
                            ? "#2F2F2F"
                            : "#6A7282"
                        }
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Settings"}
                  </a>
                </div>
              </div>

              {/* OTHERS Section */}
              <div className="px-3 max-lg:px-0">
                {!isSidebarCollapsed && (
                  <p className="font-geist px-3 text-[12px] font-medium tracking-[-0.12px] text-[#99A1AF] mb-2 max-lg:text-sm">
                    OTHERS
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  <a
                    href="/admin/banner"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent text-[14px] font-medium tracking-[-0.14px] text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB] transition-all max-lg:py-3 max-lg:text-base ${
                      isSidebarCollapsed ? "lg:justify-center" : ""
                    }`}
                    title="Banner"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M3 15.75H3.75M6.75 15.75H7.5M10.5 15.75H11.25M14.25 15.75H15M3.75 2.25H14.25C15.0784 2.25 15.75 2.92157 15.75 3.75V11.25C15.75 12.0784 15.0784 12.75 14.25 12.75H3.75C2.92157 12.75 2.25 12.0784 2.25 11.25V3.75C2.25 2.92157 2.92157 2.25 3.75 2.25Z"
                        stroke="#787878"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Banner"}
                  </a>
                  <a
                    href="/admin/article"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isInSection("/admin/article")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Article"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M9.33333 2H4C3.64638 2 3.30724 2.14048 3.05719 2.39052C2.80714 2.64057 2.66667 2.97971 2.66667 3.33333V12.6667C2.66667 13.0203 2.80714 13.3594 3.05719 13.6095C3.30724 13.8595 3.64638 14 4 14H12C12.3536 14 12.6928 13.8595 12.9428 13.6095C13.1929 13.3594 13.3333 13.0203 13.3333 12.6667V6L9.33333 2Z"
                        stroke={isInSection("/admin/article") ? "#2F2F2F" : "#787878"}
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.33333 2V6H13.3333"
                        stroke={isInSection("/admin/article") ? "#2F2F2F" : "#787878"}
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10.6667 8.66667H5.33333"
                        stroke={isInSection("/admin/article") ? "#2F2F2F" : "#787878"}
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10.6667 11.3333H5.33333"
                        stroke={isInSection("/admin/article") ? "#2F2F2F" : "#787878"}
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.66667 6H5.33333"
                        stroke={isInSection("/admin/article") ? "#2F2F2F" : "#787878"}
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Article"}
                  </a>
                  <a
                    href="/admin/reviews"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium tracking-[-0.14px] transition-all max-lg:py-3 max-lg:text-base ${
                      isInSection("/admin/reviews")
                        ? "border border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
                        : "border border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]"
                    } ${isSidebarCollapsed ? "lg:justify-center" : ""}`}
                    title="Reviews"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M8 12.6667L4.66667 14.3333L5.33333 10.6667L2.66667 8L6.33333 7.46667L8 4L9.66667 7.46667L13.3333 8L10.6667 10.6667L11.3333 14.3333L8 12.6667Z"
                        stroke={isInSection("/admin/reviews") ? "#2F2F2F" : "#787878"}
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Reviews"}
                  </a>
                </div>
              </div>

              {/* OTHER Section */}
              <div className="px-3 mb-4 max-lg:px-0">
                <div className="flex flex-col gap-1">
                  {/* Only show Users & Roles menu for Owner role */}
                  {isOwner && (
                    <a
                      href="/admin/users-roles"
                      className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent text-[14px] font-medium tracking-[-0.14px] text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB] transition-all max-lg:py-3 max-lg:text-base ${
                        isSidebarCollapsed ? "lg:justify-center" : ""
                      }`}
                      title="Users & Roles"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="shrink-0"
                      >
                        <path
                          d="M8.66732 12.6663H4.66732C3.93065 12.6663 3.33398 12.0697 3.33398 11.333V3.33301"
                          stroke="#6A7282"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.33398 3.33301H11.334C12.0707 3.33301 12.6673 3.92967 12.6673 4.66634V12.6663"
                          stroke="#6A7282"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4.99935 4.99967L3.33268 3.33301L1.66602 4.99967"
                          stroke="#6A7282"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10.666 10.667L12.666 12.667L14.666 10.667"
                          stroke="#6A7282"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {!isSidebarCollapsed && "Users & Roles"}
                    </a>
                  )}
                  <a
                    href="/admin/settings"
                    className={`font-public flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent text-[14px] font-medium tracking-[-0.14px] text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB] transition-all max-lg:py-3 max-lg:text-base ${
                      isSidebarCollapsed ? "lg:justify-center" : ""
                    }`}
                    title="Settings"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M13.2166 9.20057L13.2492 9.19242C13.6946 9.08106 14.007 8.68091 14.007 8.22187V7.7829C14.007 7.32384 13.6945 6.92369 13.2492 6.81234L13.2165 6.80417C12.877 6.71909 12.5979 6.47821 12.464 6.1548C12.3302 5.83139 12.3574 5.46369 12.5375 5.16356L12.5512 5.14067C12.7904 4.74637 12.7297 4.23974 12.404 3.91321L12.0936 3.6028C11.769 3.2782 11.2651 3.21616 10.8715 3.45233L10.8426 3.46967C10.5425 3.64973 10.1748 3.67693 9.85149 3.543C9.52816 3.40907 9.28741 3.12985 9.20252 2.79033L9.19437 2.75774C9.08301 2.3124 8.68287 2 8.22382 2H7.78484C7.32578 2 6.92563 2.31241 6.81428 2.75775L6.80611 2.79043C6.72104 3.12995 6.48016 3.40911 6.15675 3.54296C5.83333 3.67682 5.46563 3.64955 5.1655 3.46946L5.14259 3.45573C4.7483 3.21653 4.24167 3.2773 3.91514 3.60297L3.60474 3.91338C3.28012 4.23792 3.21806 4.74175 3.45421 5.13537L3.47129 5.16385C3.65139 5.46398 3.67866 5.83169 3.54481 6.1551C3.41096 6.47852 3.13181 6.7194 2.79228 6.80447L2.75971 6.81262C2.31438 6.92397 2.00195 7.32409 2.00195 7.78313V8.22217C2.00195 8.68114 2.31421 9.08124 2.75946 9.19258L2.79182 9.20067C3.13139 9.28555 3.41068 9.52627 3.54473 9.84961C3.67877 10.1729 3.65171 10.5407 3.47179 10.8409L3.45449 10.8697C3.21833 11.2633 3.28035 11.7672 3.60493 12.0918L3.91536 12.4022C4.23984 12.7268 4.7436 12.7889 5.13717 12.5528L5.16577 12.5356C5.4659 12.3555 5.83361 12.3282 6.15703 12.4621C6.48045 12.5959 6.72133 12.8751 6.80641 13.2146L6.81456 13.2472C6.92589 13.6926 7.32602 14.005 7.78507 14.005H8.2241C8.68307 14.005 9.08317 13.6927 9.19451 13.2474L9.2026 13.2151C9.28746 12.8755 9.52819 12.5962 9.85152 12.4622C10.1749 12.3282 10.5426 12.3552 10.8428 12.5352L10.8716 12.5525C11.2653 12.7886 11.7691 12.7266 12.0937 12.402L12.4042 12.0916C12.7287 11.7671 12.7908 11.2633 12.5547 10.8698L12.5376 10.8412C12.3575 10.541 12.3302 10.1733 12.4641 9.84992C12.5979 9.52651 12.8771 9.28563 13.2166 9.20057Z"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="8.00433"
                        cy="8.00335"
                        r="1.38519"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {!isSidebarCollapsed && "Settings"}
                  </a>
                </div>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col pb-0 px-2 lg:px-0 lg:pr-8">
            {/* Sticky Header and Breadcrumb Container */}
            <div className="sticky top-0 pt-8 max-lg:pt-4 z-10 bg-[#F3F4F6]">
              {/* Header */}
              <header className="h-16 bg-white flex items-center justify-between px-8 max-lg:px-4 rounded-t-4xl">
                <div className="flex items-center gap-2">
                  {/* Mobile Menu Toggle */}
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Toggle menu"
                  >
                    {isSidebarCollapsed ? (
                      // Open icon - when sidebar is closed
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M15.8333 2.5H4.16667C3.24619 2.5 2.5 3.24619 2.5 4.16667V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V4.16667C17.5 3.24619 16.7538 2.5 15.8333 2.5Z"
                          stroke="#030712"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12.5 2.5V17.5"
                          stroke="#030712"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.66602 7.5L9.16602 10L6.66602 12.5"
                          stroke="#030712"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      // Close icon - when sidebar is open
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M15.8333 2.5H4.16667C3.24619 2.5 2.5 3.24619 2.5 4.16667V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V4.16667C17.5 3.24619 16.7538 2.5 15.8333 2.5Z"
                          stroke="#030712"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12.5 2.5V17.5"
                          stroke="#030712"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.16602 12.5L6.66602 10L9.16602 7.5"
                          stroke="#030712"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Dynamic icon based on current page - configured in PAGE_CONFIG */}
                  {getPageConfig(pathname)?.icon}
                  <h2 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#030712]">
                    {getPageConfig(pathname)?.title || pageName}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/admin/shipment")}
                    className="cursor-pointer p-2 rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.08)] hover:bg-[#F9FAFB] transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M9.33398 11.9998V3.99984C9.33398 3.64622 9.19351 3.30708 8.94346 3.05703C8.69341 2.80698 8.35427 2.6665 8.00065 2.6665H2.66732C2.3137 2.6665 1.97456 2.80698 1.72451 3.05703C1.47446 3.30708 1.33398 3.64622 1.33398 3.99984V11.3332C1.33398 11.51 1.40422 11.6796 1.52925 11.8046C1.65427 11.9296 1.82384 11.9998 2.00065 11.9998H3.33398M3.33398 11.9998C3.33398 12.7362 3.93094 13.3332 4.66732 13.3332C5.4037 13.3332 6.00065 12.7362 6.00065 11.9998M3.33398 11.9998C3.33398 11.2635 3.93094 10.6665 4.66732 10.6665C5.4037 10.6665 6.00065 11.2635 6.00065 11.9998M10.0007 11.9998H6.00065M10.0007 11.9998C10.0007 12.7362 10.5976 13.3332 11.334 13.3332C12.0704 13.3332 12.6673 12.7362 12.6673 11.9998M10.0007 11.9998C10.0007 11.2635 10.5976 10.6665 11.334 10.6665C12.0704 10.6665 12.6673 11.2635 12.6673 11.9998M12.6673 11.9998H14.0007C14.1775 11.9998 14.347 11.9296 14.4721 11.8046C14.5971 11.6796 14.6673 11.51 14.6673 11.3332V8.89984C14.667 8.74855 14.6153 8.60184 14.5207 8.48384L12.2007 5.58384C12.1383 5.50576 12.0592 5.44269 11.9692 5.3993C11.8792 5.35591 11.7806 5.33331 11.6807 5.33317H9.33398"
                        stroke="#030712"
                        strokeWidth="1.33333"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => router.push("/admin/notifications")}
                    className="relative cursor-pointer p-2 rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.08)] hover:bg-[#F9FAFB] transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M6.84485 14.0002C6.96188 14.2028 7.13019 14.3711 7.33288 14.4882C7.53556 14.6052 7.76548 14.6668 7.99951 14.6668C8.23355 14.6668 8.46347 14.6052 8.66615 14.4882C8.86884 14.3711 9.03715 14.2028 9.15418 14.0002M2.17418 10.2175C2.08709 10.313 2.02962 10.4317 2.00875 10.5592C1.98788 10.6867 2.00453 10.8175 2.05665 10.9358C2.10878 11.054 2.19414 11.1545 2.30235 11.2251C2.41056 11.2958 2.53697 11.3334 2.66618 11.3335H13.3328C13.462 11.3335 13.5885 11.296 13.6968 11.2256C13.805 11.1551 13.8905 11.0547 13.9428 10.9365C13.995 10.8183 14.0118 10.6876 13.9911 10.56C13.9704 10.4325 13.9131 10.3137 13.8262 10.2182C12.9395 9.30416 11.9995 8.33283 11.9995 5.3335C11.9995 4.27263 11.5781 3.25521 10.8279 2.50507C10.0778 1.75492 9.06038 1.3335 7.99951 1.3335C6.93865 1.3335 5.92123 1.75492 5.17109 2.50507C4.42094 3.25521 3.99951 4.27263 3.99951 5.3335C3.99951 8.33283 3.05885 9.30416 2.17418 10.2175Z"
                        stroke="#030712"
                        strokeWidth="1.33333"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {/* Notification Badge */}
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </button>
                </div>
              </header>

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 px-8 max-lg:px-4 py-4 bg-[#f5f5f5]">
                <a
                  href="/admin/overview"
                  className="font-geist text-[12px] font-medium leading-[150%] tracking-[-0.12px] text-[#6A7282] hover:text-[#030712] cursor-pointer transition-colors"
                >
                  MENU
                </a>
                {breadcrumbPath.map((crumb, index) => {
                  // Build the path for this breadcrumb segment
                  const pathSegments = pathname
                    .split("/")
                    .filter(Boolean)
                    .slice(1);
                  const crumbPath =
                    "/admin/" + pathSegments.slice(0, index + 1).join("/");

                  return (
                    <React.Fragment key={index}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M6.66602 10.6668L9.33268 8.00016L6.66602 5.3335"
                          stroke="#6A7282"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {crumb.isLast ? (
                        <span className="font-geist px-2 py-1 text-[12px] font-medium leading-[150%] tracking-[-0.12px] text-[#030712] rounded border border-[#E5E7EB] bg-white shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]">
                          {crumb.label}
                        </span>
                      ) : (
                        <a
                          href={crumbPath}
                          className="font-geist text-[12px] font-medium leading-[150%] tracking-[-0.12px] text-[#6A7282] hover:text-[#030712] cursor-pointer transition-colors"
                        >
                          {crumb.label}
                        </a>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white pb-8 rounded-b-4xl max-lg:pb-4">
              <div className="pt-6">{children}</div>
            </div>
          </main>

          {/* Right Panel - Bulk Shipping Drawer */}
          <BulkShippingPanel />
        </div>
        <ToastContainer />
        <GlobalSearchModal isOpen={isSearchOpen} onClose={closeSearch} />
      </BulkShippingProvider>
    </ToastProvider>
  );
}
