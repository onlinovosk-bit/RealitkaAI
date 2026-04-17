import BlogPromoTickerGate from "@/components/marketing/BlogPromoTickerGate";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BlogPromoTickerGate />
    </>
  );
}
