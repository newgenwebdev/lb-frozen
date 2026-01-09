import React from "react";
import { Button } from "@/components/ui";

type ArticleToolbarProps = {
  onFilterClick: () => void;
  onAddClick: () => void;
};

export function ArticleToolbar({
  onFilterClick,
  onAddClick,
}: ArticleToolbarProps): React.JSX.Element {
  return (
    <div className="mb-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Page Title */}
      <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
        Article List
      </h1>

      {/* Action Buttons */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {/* Filter Button */}
        <Button
          variant="secondary"
          onClick={onFilterClick}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 3.33333H14" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 3.33333H9.33333" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.66602 8.00033H13.9993" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 8.00033H4" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 12.6663H14" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12.6663H9.33333" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M11.6082 2.39052C12.1289 2.91122 12.1289 3.75544 11.6082 4.27614C11.0875 4.79684 10.2433 4.79684 9.72256 4.27614C9.20186 3.75545 9.20186 2.91122 9.72256 2.39052C10.2433 1.86983 11.0875 1.86983 11.6082 2.39052"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.27614 7.05752C6.79684 7.57822 6.79684 8.42244 6.27614 8.94314C5.75545 9.46384 4.91122 9.46384 4.39052 8.94314C3.86983 8.42244 3.86983 7.57822 4.39052 7.05752C4.91122 6.53682 5.75544 6.53682 6.27614 7.05752"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.6082 11.7235C12.1289 12.2442 12.1289 13.0885 11.6082 13.6092C11.0875 14.1299 10.2433 14.1299 9.72256 13.6092C9.20186 13.0885 9.20186 12.2442 9.72256 11.7235C10.2433 11.2028 11.0875 11.2028 11.6082 11.7235"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        >
          Filter
        </Button>

        {/* Add New Article Button */}
        <Button
          variant="primary"
          onClick={onAddClick}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3.33333V12.6667" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3.33398 8H12.6673" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        >
          Add new article
        </Button>
      </div>
    </div>
  );
}
