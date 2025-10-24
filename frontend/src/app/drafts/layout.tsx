import MainLayout from '@/components/layout/MainLayout'

export default function DraftsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
