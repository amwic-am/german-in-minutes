import { useQuery } from "@tanstack/react-query";
import { defaultSiteContent } from "@shared/site-content";
import { api } from "@/lib/api";

export type ContactInfo = { supportEmail: string; phone: string; hours: string; address: string };

export const defaultContact: ContactInfo = {
  supportEmail: "support@germaninminute.com",
  phone: "+251 911 000 000",
  hours: "Monday–Friday, 09:00–18:00 EAT",
  address: "Meganagna Siti Mall, 5th Floor, Addis Ababa, Ethiopia",
};

export const siteContentOptions = {
  queryKey: ["site-content"],
  queryFn: async () => {
    try {
      return await api.get<{ content: typeof defaultSiteContent; contact: ContactInfo }>("/site-content");
    } catch {
      return { content: defaultSiteContent, contact: defaultContact };
    }
  },
  staleTime: 30_000,
};

export function useSiteContent() {
  const result = useQuery(siteContentOptions);
  return {
    ...result,
    content: result.data?.content ?? defaultSiteContent,
    contact: result.data?.contact ?? defaultContact,
  };
}
