import MainLayout from '@/components/layout/MainLayout'

export default function ClaimsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}
