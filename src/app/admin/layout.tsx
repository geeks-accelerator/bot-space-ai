export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}
