import { useEffect } from 'react'

const SIZE_OPTIONS = [
  { key: 'default', label: 'Default', desc: 'Standard',        aaSize: 16 },
  { key: 'large',   label: 'Large',   desc: 'Easier to read',  aaSize: 20 },
  { key: 'xl',      label: 'XL',      desc: 'Maximum comfort', aaSize: 24 },
]

export default function SettingsDrawer({ open, onClose, dark, toggleDark, theme, setTheme, fontSize, setFontSizeKey }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full sm:w-80 bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Customise</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl p-1">✕</button>
        </div>

        <div className="flex-1 p-5 space-y-7">

          {/* Visual system */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Visual system</div>
            <div className="space-y-2">
              {[
                { key: 'calm', label: 'Calm Command', desc: 'Spacious and reassuring', swatches: ['#153a37', '#4e9189', '#c49a44'] },
                { key: 'glass', label: 'Luminous Glass', desc: 'Layered and luminous', swatches: ['#11162b', '#8b7cff', '#64e7d1'] },
              ].map(opt => {
                const active = theme === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setTheme(opt.key)}
                    className={`theme-choice w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 transition-all text-left ${active ? 'theme-choice--active' : ''}`}
                  >
                    <span className="theme-choice__swatches" aria-hidden="true">
                      {opt.swatches.map(color => <i key={color} style={{ backgroundColor: color }} />)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-gray-800 dark:text-slate-200">{opt.label}</span>
                      <span className="block text-xs text-gray-400 dark:text-slate-500 mt-0.5">{opt.desc}</span>
                    </span>
                    <span className={`theme-choice__check ml-auto ${active ? 'theme-choice__check--active' : ''}`} aria-hidden="true">✓</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Appearance */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Appearance</div>
            <div className="flex gap-3">
              {[
                { key: 'light', icon: '☀️', label: 'Light' },
                { key: 'dark',  icon: '🌙', label: 'Dark'  },
              ].map(opt => {
                const active = (opt.key === 'dark') === dark
                return (
                  <button
                    key={opt.key}
                    onClick={() => { if (!active) toggleDark() }}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-all
                      ${active
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Font size */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Text size</div>
            <div className="space-y-2">
              {SIZE_OPTIONS.map(opt => {
                const active = fontSize === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFontSizeKey(opt.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left
                      ${active
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                  >
                    <div>
                      <div className={`font-bold ${active ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-slate-300'}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{opt.desc}</div>
                    </div>
                    <div
                      className={`font-bold ${active ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-slate-500'}`}
                      style={{ fontSize: opt.aaSize }}
                    >Aa</div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Preview */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Preview</div>
            <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
              <div className="font-bold text-gray-900 dark:text-slate-100 mb-1">#42 Sample idea title</div>
              <div className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">This is what your idea cards will look like at the current text size.</div>
              <div className="flex gap-1.5 mt-2">
                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">⚡ 1 wk</span>
                <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">HTML</span>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-bold"
          >Done</button>
        </div>
      </div>
    </div>
  )
}
