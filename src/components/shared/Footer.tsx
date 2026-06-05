import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-gray-800">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1 space-y-4">
            <Logo variant="footer" href="/" />
            <p className="text-sm leading-relaxed text-gray-500">
              Learn coding smarter. Build foundations stronger. Practice with AI guidance ? step by step.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-3 text-sm">
              {['Features', 'How It Works', 'Languages', 'Pricing'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Learn</h3>
            <ul className="space-y-3 text-sm">
              {['Python', 'JavaScript', 'C / C++', 'Java', 'HTML & CSS', 'Data Analytics'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Company</h3>
            <ul className="space-y-3 text-sm">
              {['About Us', 'Blog', 'Careers', 'Privacy Policy', 'Terms of Service'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">? {new Date().getFullYear()} CoderPlay AI. All rights reserved.</p>
          <p className="text-xs text-gray-600">Built for student coders</p>
        </div>
      </div>
    </footer>
  )
}