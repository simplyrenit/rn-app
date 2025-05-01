import { useProfile } from "@/backend/profile"
import { useQuery } from "react-query"

export const useGetMyDetails = () => {
  const {getMyDetails} = useProfile();
  return useQuery({
    queryKey: ['getMyDetails'],
    queryFn: () => getMyDetails(),
  })
}