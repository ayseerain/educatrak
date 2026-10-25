import { useState } from "react";
import { PaginationControls } from "@/components/ui/PaginationControls";

export function useClientPagination<T>(items: T[], label: string, fixedPageSize = false) {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const lastPage = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.min(currentPage, lastPage);
  const visibleItems = items.slice((page - 1) * perPage, page * perPage);

  return {
    items: visibleItems,
    controls: <PaginationControls
      currentPage={page}
      lastPage={lastPage}
      perPage={perPage}
      total={items.length}
      label={label}
      onPageChange={setCurrentPage}
      onPerPageChange={fixedPageSize ? undefined : (size) => { setPerPage(size); setCurrentPage(1); }}
    />,
  };
}
