import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}