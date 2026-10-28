import { useQuery } from "@tanstack/react-query";
import type { CourseSummary } from "@shared/types";
import { api } from "@/lib/api";

export const coursesQuery = {
  queryKey: ["courses"],
  queryFn: async () => (await api.get<{ courses: CourseSummary[] }>("/courses")).courses,
  staleTime: 60_000,
};

export function useDbCourses() {
  return useQuery(coursesQuery);
}
