import BlogPromoTicker from "@/components/marketing/BlogPromoTicker";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BlogPromoTicker />
    </>
  );
}
