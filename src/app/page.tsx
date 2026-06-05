'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MessageSquare, ClipboardList, Code2, BarChart2, Zap, Target, TrendingUp, Smartphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { Footer } from '@/components/shared/Footer'
import { LANGUAGES } from '@/data/languages'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
}

const stats = [
  { value: '100+', label: 'Active Students' },
  { value: '7', label: 'Languages' },
  { value: '500+', label: 'Concepts' },
  { value: '3-Stage', label: 'Learning System' },
]

const howItWorks: { step: string; Icon: LucideIcon; title: string; desc: string }[] = [
  { step: '01', Icon: MessageSquare, title: 'Interactive Learning', desc: 'Have a focused conversation with your tutor. Concepts are explained clearly with real-world examples and analogies tailored to your level.' },
  { step: '02', Icon: ClipboardList, title: 'Smart Assessment', desc: 'Test your understanding with 15 diverse questions -- MCQs, code output predictions, fill-in-the-blanks, and scenario-based problems.' },
  { step: '03', Icon: Code2,         title: 'Coding Practice',    desc: 'Apply what you learned with structured coding challenges across 3 difficulty levels, with guided hints and debugging support.' },
]

const features: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: MessageSquare, title: 'Smart Tutor',         desc: 'A focused tutor that explains concepts step by step, stays on track, and ensures genuine understanding before moving forward.' },
  { Icon: BarChart2,     title: 'Smart Assessments',   desc: '15 diverse question types per concept -- not just MCQs. Code output, error identification, scenario questions, and more.' },
  { Icon: Zap,           title: 'XP & Gamification',   desc: 'Earn XP, maintain streaks, unlock achievements, and track your progress with a live leaderboard.' },
  { Icon: Target,        title: 'Guided Coding',        desc: 'A coding assistant that gives hints, debugs errors, and explains logic -- but encourages you to solve it yourself first.' },
  { Icon: TrendingUp,    title: 'Progress Tracking',    desc: 'Per-concept mastery tracking across all 3 stages with visual indicators and actionable recommendations.' },
  { Icon: Smartphone,    title: 'Mobile Friendly',      desc: 'Learn anywhere. Fully responsive UI designed to work beautifully on mobile, tablet, and desktop.' },
]

const testimonials = [
  { name: 'Mythresh', role: 'EEE, 1st Year', text: 'CoderPlay turned my confusion into clarity. The 3-stage learning model is brilliant -- I actually understand concepts now instead of just memorizing them.', avatar: 'AS' },
  { name: 'Sandeep', role: 'IT Engineering, 4th Year', text: 'The tutor doesn\'t let you skip steps. It made me answer mini-questions mid-explanation. Honestly the best coding platform I\'ve used.', avatar: 'PN' },
  { name: 'Lokesh', role: 'EIE, 2nd Year', text: 'I went from zero Python to building data analytics notebooks in 3 weeks. The gamification keeps you hooked. 10/10.', avatar: 'RV' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* -- Hero ------------------------------------------------------------ */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(234,179,8,0.10),rgba(255,255,255,0))]" />
        <div className="absolute top-20 right-0 w-72 h-72 bg-yellow-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-800 text-xs font-semibold mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Structured Coding Education Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.08] tracking-tight mb-6"
          >
            Learn to{' '}
            <span className="relative inline-block">
              <span className="text-yellow-500">Code.</span>
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6C50 2 150 2 198 6" stroke="#EAB308" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </span>
            {' '}Build for<br />Tomorrow.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            CoderPlay guides you from zero to job-ready through a proven 3-stage system --
            step-by-step explanations, smart assessments, and guided coding practice.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/signup"
              className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-base rounded-full transition-all shadow-lg shadow-yellow-200 hover:shadow-yellow-300 hover:-translate-y-0.5"
            >
              Start Learning Free {'>'}
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 border-2 border-gray-200 hover:border-gray-900 text-gray-700 hover:text-gray-900 font-semibold text-base rounded-full transition-all"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Floating code snippet */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 max-w-xl mx-auto"
          >
            <div className="bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl text-left">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/80 border-b border-gray-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-500 text-xs ml-2 font-mono">lesson_01_variables.py</span>
              </div>
              <pre className="p-5 text-sm font-mono text-gray-300 leading-7">
<span className="text-gray-500"># Variables are like labelled boxes</span>{'\n'}
<span className="text-blue-400">name</span> <span className="text-white">=</span> <span className="text-yellow-400">"Alice"</span>          <span className="text-gray-600"># str</span>{'\n'}
<span className="text-blue-400">age</span>  <span className="text-white">=</span> <span className="text-green-400">20</span>               <span className="text-gray-600"># int</span>{'\n'}
<span className="text-blue-400">gpa</span>  <span className="text-white">=</span> <span className="text-green-400">8.9</span>              <span className="text-gray-600"># float</span>{'\n'}
{'\n'}
<span className="text-purple-400">print</span><span className="text-white">(</span><span className="text-yellow-400">f"Hello, I am </span><span className="text-blue-300">{'{'}</span><span className="text-blue-400">name</span><span className="text-blue-300">{'}'}</span><span className="text-yellow-400">"</span><span className="text-white">)</span>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* -- Stats ----------------------------------------------------------- */}
      <section className="bg-gray-950 py-12 border-y border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <div className="text-3xl font-black text-yellow-500 mb-1">{s.value}</div>
                <div className="text-sm text-gray-400">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- How It Works ---------------------------------------------------- */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest">3-Stage Learning System</span>
              <h2 className="text-4xl font-black text-gray-900 mt-2">How CoderPlay works</h2>
              <p className="text-gray-500 mt-3 max-w-xl mx-auto">Every concept follows the same proven 3-stage system. No shortcuts. Just real understanding.</p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 opacity-30" />
            {howItWorks.map((stage, i) => (
              <motion.div
                key={stage.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative text-center"
              >
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-2xl bg-yellow-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-yellow-200">
                    <stage.Icon className="w-8 h-8 text-black" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-black flex items-center justify-center border-2 border-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{stage.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{stage.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Languages ------------------------------------------------------- */}
      <section id="languages" className="py-20 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest">Supported Languages</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">Start with what matters</h2>
            <p className="text-gray-500 mt-3">7 languages. Hundreds of concepts. One focused learning path.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {LANGUAGES.map((lang, i) => (
              <motion.div
                key={lang.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
                className="bg-white border border-gray-100 rounded-2xl p-5 text-center cursor-pointer"
              >
                <div className="text-3xl mb-3">{lang.icon}</div>
                <h3 className="font-bold text-gray-900 text-sm">{lang.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{lang.totalConcepts} concepts</p>
                <span className={`inline-block mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                  lang.difficulty === 'Beginner' ? 'bg-green-50 text-green-700 border-green-200'
                  : lang.difficulty === 'Intermediate' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {lang.difficulty}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Features -------------------------------------------------------- */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest">Platform Features</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">Everything you need to succeed</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="p-6 bg-white border border-gray-100 rounded-2xl hover:border-yellow-200 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center mb-4"><f.Icon className="w-6 h-6 text-yellow-600" /></div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Testimonials --------------------------------------------------- */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest">Student Stories</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">Loved by learners</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-white border border-gray-100 rounded-2xl p-6"
              >
                <div className="flex mb-3 gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className="text-yellow-500 text-sm">*</span>)}</div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-black">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- CTA ------------------------------------------------------------- */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
              Ready to master coding?
            </h2>
            <p className="text-gray-400 text-lg mb-10">
              Join thousands of students learning smarter. Start your coding journey today -- it&apos;s free.
            </p>
            <Link
              href="/signup"
              className="inline-block px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg rounded-full transition-all shadow-xl shadow-yellow-900/30 hover:-translate-y-0.5"
            >
              Create Free Account {'>'}
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
