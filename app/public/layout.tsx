import { Navbar } from '@/components/layout/navbar'
import { BetaBanner } from '@/components/layout/BetaBanner'
import { Footer } from '@/components/layout/footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
	  <BetaBanner />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}
