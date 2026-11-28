import { categoryChecklistUrl } from "@/lib/config";
import { ChecklistOptions, readOptions } from "@/lib/included-items";
import axiosInstance from "@/lib/networkUtils";
import { useQuery } from "react-query";

/** `GET /api/category/{id}/checklist/` (ENG-451): the standard, extra and used-up items a sub-category offers. */
export async function fetchCategoryChecklist(id: number): Promise<ChecklistOptions> {
  const { data } = await axiosInstance.get<unknown>(categoryChecklistUrl(id));
  return readOptions(data);
}

/** Staff change the lists in the admin, rarely: one read a sub-category serves the session. */
export function useCategoryChecklist(id: number | null | undefined) {
  return useQuery(["category-checklist", id ?? null], () => fetchCategoryChecklist(id as number), {
    enabled: id != null,
    staleTime: 30 * 60_000,
    retry: 1,
  });
}
