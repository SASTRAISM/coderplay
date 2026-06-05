'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Shield, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/shared/Logo'
import { getDailyThought } from '@/lib/dailyThought'
import { isRegistrationNumberTaken } from '@/lib/firebase/firestore'

const STUDENT_CODE = 'student1115'
const ADMIN_CODE = 'admin1115'

const BTECH_BRANCHES = [
  'Aerospace Engineering',
  'Bioengineering',
  'Bioinformatics',
  'Biotechnology',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Science & Engineering (CSE)',
  'CSE (Artificial Intelligence & Data Science)',
  'CSE (Cyber Security & Block Chain Technology)',
  'CSE (IoT & Automation)',
  'CSE (Networks)',
  'Electrical and Electronics Engineering (EEE)',
  'Electronics & Communication Engineering (ECE)',
  'Electronics and Computer Engineering',
  'Electronics & Instrumentation Engineering (EIE)',
  'Robotics & Artificial Intelligence',
  'Electronics Engineering (VLSI Design & Technology)',
  'Information Technology (IT)',
  'Industrial Engineering and Management',
  'Mechanical Engineering',
  'Mechatronics',
  'Integrated M.Tech Biotechnology',
  'Integrated M.Tech Medical Nanotechnology',
]

const MTECH_BRANCHES = [
  'M.Tech - Aerospace Engineering',
  'M.Tech - Artificial Intelligence and Data Science',
  'M.Tech - Artificial Intelligence & Robotics',
  'M.Tech - Big Data Biology',
  'M.Tech - Computer Science & Engineering',
  'M.Tech - Cyber Security',
  'M.Tech - Digital Manufacturing',
  'M.Tech - Industrial Biotechnology',
  'M.Tech - Medical Nanotechnology',
  'M.Tech - Power & Energy Systems',
  'M.Tech - Structural Engineering',
  'M.Tech - Wireless Smart Communications',
  'M.Tech - VLSI',
]

type Role = 'picker' | 'student' | 'admin'
type StudentTab = 'signin' | 'signup'

function StatusScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-yellow-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}

function AuthPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const dailyThought = getDailyThought()
  const { signIn, signUp, user, loading, error, clearError } = useAuth()

  const initialRole: Role = searchParams.get('role') === 'admin' ? 'admin' : 'picker'
  const [role, setRole] = useState<Role>(initialRole)
  const [studentTab, setStudentTab] = useState<StudentTab>(
    searchParams.get('tab') === 'signup' ? 'signup' : 'signin'
  )

  // Sign In
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [siShowPwd, setSiShowPwd] = useState(false)
  const [siSubmitting, setSiSubmitting] = useState(false)

  // Sign Up
  const [suUsername, setSuUsername] = useState('')
  const [suRegNo, setSuRegNo] = useState('')
  const [suBranch, setSuBranch] = useState('')
  const [suYear, setSuYear] = useState('')
  const [suCode, setSuCode] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suSubmitting, setSuSubmitting] = useState(false)
  const [suEmailError, setSuEmailError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Admin
  const [adminName, setAdminName] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [adminShowCode, setAdminShowCode] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSubmitting, setAdminSubmitting] = useState(false)

  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!loading && user?.emailVerified) router.replace('/dashboard')
  }, [user, loading, router])

  if (loading) return <StatusScreen message="Checking your session..." />
  if (user?.emailVerified) return <StatusScreen message="Opening your dashboard..." />

  const switchStudentTab = (t: StudentTab) => {
    clearError()
    setLocalError('')
    setSuEmailError('')
    setStudentTab(t)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError(); setLocalError(''); setSiSubmitting(true)
    try {
      await signIn(siEmail, siPassword)
      router.replace('/dashboard')
    } catch { /* error set by hook */ }
    finally { setSiSubmitting(false) }
  }

  const isValidSastraEmail = (email: string) => {
    if (!email) return true // don't show error when empty
    return email.endsWith('@sastra.ac.in') || email === 'sastraism@gmail.com'
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError(); setLocalError('')
    if (!suUsername.trim()) { setLocalError('Please enter your username'); return }
    if (!suRegNo.trim()) { setLocalError('Please enter your registration number'); return }
    if (!suBranch) { setLocalError('Please select your branch'); return }
    if (!suYear) { setLocalError('Please select your year'); return }
    if (suCode !== STUDENT_CODE) { setLocalError('Invalid invitation code.'); return }
    if (!suEmail.trim()) { setLocalError('Please enter your email'); return }
    if (!isValidSastraEmail(suEmail.trim())) {
      setSuEmailError('Please use your SASTRA email address (yourname@sastra.ac.in)')
      return
    }
    if (suPassword.length < 6) { setLocalError('Password must be at least 6 characters'); return }
    // Check duplicate reg number
    const taken = await isRegistrationNumberTaken(suRegNo.trim())
    if (taken) { setLocalError('This registration number is already registered. Please contact admin if this is an error.'); return }
    setSuSubmitting(true)
    try {
      await signUp(suEmail, suPassword, suUsername.trim(), {
        registrationNumber: suRegNo.trim(), branch: suBranch, year: suYear,
      })
      setEmailSent(true)
    } catch { /* error set by hook */ }
    finally { setSuSubmitting(false) }
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError(''); setAdminSubmitting(true)
    setTimeout(() => {
      if (!adminName.trim()) { setAdminError('Please enter your name'); setAdminSubmitting(false); return }
      if (adminCode !== ADMIN_CODE) { setAdminError('Invalid admin code. Please try again.'); setAdminSubmitting(false); return }
      localStorage.setItem('cp_admin_auth', ADMIN_CODE)
      localStorage.setItem('cp_admin_name', adminName.trim())
      router.push('/admin/dashboard')
    }, 400)
  }

  const displayError = localError || error

  // Left panel text based on role/tab
  const leftContent = role === 'admin' ? {
    heading: <>Admin<br /><span className="text-yellow-500">Control</span><br />Panel</>,
    features: ['Real-time student analytics', 'Track progress and time spent', 'Manage placement tests'],
  } : studentTab === 'signin' ? {
    heading: <>Build strong<br /><span className="text-yellow-500">foundations.</span><br />Code with confidence.</>,
    features: ['Step-by-step concept explanations', 'Assessments that verify understanding', 'Coding practice with guided hints'],
  } : {
    heading: <>Start your<br /><span className="text-yellow-500">coding</span><br />journey today.</>,
    features: ['Go from zero to coding in days', 'Earn XP and achievements', 'Learn on any device, anytime'],
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-gray-950 flex-col justify-between p-12 shrink-0">
        <Logo variant="auth" href="/" />
        <div className="space-y-8">
          <div className="text-5xl font-black text-white leading-tight">
            {leftContent.heading}
          </div>
          <div className="space-y-3">
            {leftContent.features.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-500 text-xs shrink-0">+</div>
                <span className="text-gray-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-yellow-500/20 bg-white/5 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-yellow-500">Thought of the day</p>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">{dailyThought.text}</p>
          </div>
        </div>
        <p className="text-gray-600 text-xs">(c) {new Date().getFullYear()} CoderPlay AI</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm py-8"
          >
            {/* Mobile logo */}
            <div className="lg:hidden mb-8">
              <Logo variant="nav" href="/" onLight />
            </div>

            <AnimatePresence mode="wait">

              {/* -- Role Picker -- */}
              {role === 'picker' && (
                <motion.div key="picker" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome to CoderPlay</h1>
                  <p className="text-gray-500 text-sm mb-8">Choose how you want to sign in</p>

                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-yellow-400 hover:bg-yellow-50 transition-all text-left group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><GraduationCap className="w-6 h-6 text-black" /></div>
                      <div>
                        <p className="font-black text-gray-900 text-base">Student Login</p>
                        <p className="text-sm text-gray-500 mt-0.5">Sign in or create a student account</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-gray-800 hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><Shield className="w-6 h-6 text-white" /></div>
                      <div>
                        <p className="font-black text-gray-900 text-base">Admin Login</p>
                        <p className="text-sm text-gray-500 mt-0.5">Access the admin dashboard</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* -- Student Panel -- */}
              {role === 'student' && (
                <motion.div key="student" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button
                    type="button"
                    onClick={() => { setRole('picker'); clearError(); setLocalError('') }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-6 font-semibold transition-colors"
                  >
                    {'<-'} Back
                  </button>

                  {/* Tabs */}
                  <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
                    {(['signin', 'signup'] as const).map(t => (
                      <button key={t} type="button" onClick={() => switchStudentTab(t)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${studentTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {t === 'signin' ? 'Sign In' : 'Sign Up'}
                      </button>
                    ))}
                  </div>

                  {displayError && !emailSent && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-5">
                      {displayError}
                    </motion.div>
                  )}

                  <AnimatePresence mode="wait">
                    {studentTab === 'signin' && (
                      <motion.div key="signin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                        <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome back</h1>
                        <p className="text-gray-500 text-sm mb-7">Sign in to continue your learning journey</p>
                        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-yellow-700">Thought of the day</p>
                          <p className="text-sm text-gray-700 mt-1">{dailyThought.text}</p>
                        </div>
                        <form onSubmit={handleSignIn} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
                            <input type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} placeholder="you@example.com" required
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                              <input type={siShowPwd ? 'text' : 'password'} value={siPassword} onChange={e => setSiPassword(e.target.value)} placeholder="********" required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all pr-11" />
                              <button type="button" onClick={() => setSiShowPwd(!siShowPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                                {siShowPwd ? 'Hide' : 'Show'}
                              </button>
                            </div>
                            <div className="text-right mt-1">
                              <Link href="/forgot-password" className="text-xs text-yellow-600 hover:text-yellow-700 font-medium">Forgot password?</Link>
                            </div>
                          </div>
                          <button type="submit" disabled={siSubmitting || !siEmail || !siPassword}
                            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {siSubmitting ? <><span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" /> Signing in...</> : 'Sign In'}
                          </button>
                        </form>
                        <p className="text-center text-sm text-gray-500 mt-6">
                          Don&apos;t have an account?{' '}
                          <button type="button" onClick={() => switchStudentTab('signup')} className="font-semibold text-yellow-600 hover:text-yellow-700">Create one free</button>
                        </p>
                      </motion.div>
                    )}

                    {studentTab === 'signup' && !emailSent && (
                      <motion.div key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                        <h1 className="text-2xl font-black text-gray-900 mb-1">Create your account</h1>
                        <p className="text-gray-500 text-sm mb-7">Fill in your details to get started.</p>
                        <form onSubmit={handleSignUp} className="space-y-3.5">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Username</label>
                            <input type="text" value={suUsername} onChange={e => setSuUsername(e.target.value)} placeholder="e.g. arjun_sharma" required
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Registration Number</label>
                            <input type="text" value={suRegNo} onChange={e => setSuRegNo(e.target.value)} placeholder="e.g. 21BCE1234" required
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="su-branch" className="block text-xs font-semibold text-gray-700 mb-1.5">Branch</label>
                              <select id="su-branch" title="Select your branch" value={suBranch} onChange={e => setSuBranch(e.target.value)} required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all bg-white">
                                <option value="" disabled>Select branch</option>
                                <optgroup label="B.Tech Courses">
                                  {BTECH_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </optgroup>
                                <optgroup label="M.Tech Courses">
                                  {MTECH_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </optgroup>
                              </select>
                            </div>
                            <div>
                              <label htmlFor="su-year" className="block text-xs font-semibold text-gray-700 mb-1.5">Year</label>
                              <select id="su-year" title="Select your year" value={suYear} onChange={e => setSuYear(e.target.value)} required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all bg-white appearance-none">
                                <option value="" disabled>Select</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Invitation Code</label>
                            <input type="text" value={suCode} onChange={e => setSuCode(e.target.value)} placeholder="Enter your invitation code" required
                              className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all ${
                                suCode && suCode !== STUDENT_CODE ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                                : suCode === STUDENT_CODE ? 'border-green-300' : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                              }`} />
                            {suCode && suCode !== STUDENT_CODE && <p className="text-xs text-red-500 mt-1">Invalid invitation code</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
                            <input
                              type="email"
                              value={suEmail}
                              onChange={e => { setSuEmail(e.target.value); if (suEmailError) setSuEmailError('') }}
                              onBlur={() => {
                                if (!isValidSastraEmail(suEmail.trim())) {
                                  setSuEmailError('Please use your SASTRA email address (yourname@sastra.ac.in)')
                                } else {
                                  setSuEmailError('')
                                }
                              }}
                              placeholder="yourname@sastra.ac.in"
                              required
                              className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all ${
                                suEmailError
                                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                                  : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                              }`}
                            />
                            {suEmailError && <p className="text-xs text-red-500 mt-1">Please use your SASTRA email address (yourname@sastra.ac.in)</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                            <input type="password" value={suPassword} onChange={e => setSuPassword(e.target.value)} placeholder="Min. 6 characters" required
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all" />
                          </div>
                          <button type="submit" disabled={suSubmitting}
                            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1">
                            {suSubmitting ? <><span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" /> Creating account...</> : 'Create Account ->'}
                          </button>
                        </form>
                        <p className="text-center text-sm text-gray-500 mt-5">
                          Already have an account?{' '}
                          <button type="button" onClick={() => switchStudentTab('signin')} className="font-semibold text-yellow-600 hover:text-yellow-700">Sign in</button>
                        </p>
                      </motion.div>
                    )}

                    {studentTab === 'signup' && emailSent && (
                      <motion.div key="verify" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto"><Mail className="w-8 h-8 text-green-600" /></div>
                        <div>
                          <h1 className="text-2xl font-black text-gray-900 mb-2">Verify your email</h1>
                          <p className="text-gray-500 text-sm leading-relaxed">
                            We sent a verification link to <span className="font-semibold text-gray-800">{suEmail}</span>. Open it to activate your account.
                          </p>
                        </div>
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                          Check your spam folder if you don&apos;t see the email within a few minutes.
                        </div>
                        <button type="button" onClick={() => switchStudentTab('signin')}
                          className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-colors">
                          Go to Sign In
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* -- Admin Panel -- */}
              {role === 'admin' && (
                <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button
                    type="button"
                    onClick={() => { setRole('picker'); setAdminError('') }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-6 font-semibold transition-colors"
                  >
                    {'<-'} Back
                  </button>

                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center shrink-0"><Shield className="w-6 h-6 text-white" /></div>
                    <div>
                      <h1 className="text-2xl font-black text-gray-900">Admin Login</h1>
                      <p className="text-gray-500 text-sm">CoderPlay Administrator Panel</p>
                    </div>
                  </div>

                  {adminError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-5">
                      {adminError}
                    </motion.div>
                  )}

                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Name</label>
                      <input
                        type="text"
                        value={adminName}
                        onChange={e => setAdminName(e.target.value)}
                        placeholder="Enter your name"
                        required
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admin Code</label>
                      <div className="relative">
                        <input
                          type={adminShowCode ? 'text' : 'password'}
                          value={adminCode}
                          onChange={e => setAdminCode(e.target.value)}
                          placeholder="Enter admin code"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100 transition-all pr-11"
                        />
                        <button type="button" onClick={() => setAdminShowCode(!adminShowCode)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                          {adminShowCode ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={adminSubmitting || !adminName.trim() || !adminCode}
                      className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {adminSubmitting
                        ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Verifying...</>
                        : 'Access Admin Panel ->'}
                    </button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AuthPageInner />
    </Suspense>
  )
}
