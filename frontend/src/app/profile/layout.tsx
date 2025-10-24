import MainLayout from '@/components/layout/MainLayout'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
}