"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Download, Sparkles, Moon, Sun } from "lucide-react"
import { motion } from "framer-motion"

export default function DesignSystemPage() {
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Detecta preferência do sistema
    const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (darkModePreference) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    console.log('🔄 Toggle Dark Mode - Estado atual:', darkMode)
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    console.log('🌓 Novo estado:', newDarkMode)
    
    if (newDarkMode) {
      console.log('🌙 Adicionando classe dark')
      document.documentElement.classList.add('dark')
    } else {
      console.log('☀️ Removendo classe dark')
      document.documentElement.classList.remove('dark')
    }
    
    console.log('📋 Classes atuais:', document.documentElement.classList.toString())
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPrompt(id)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const colorPalette = {
    light: [
      { name: "Primária (CTA/Ações)", hex: "#16A085", var: "brand-500" },
      { name: "Accent", hex: "#2EAE9A", var: "brand-400" },
      { name: "Background", hex: "#F7F9FA", var: "slate-50" },
      { name: "Card/Surface", hex: "#FFFFFF", var: "white" },
      { name: "Texto Principal", hex: "#1A2E38", var: "gray-900" },
      { name: "Texto Secundário", hex: "#5C7080", var: "gray-600" },
      { name: "Borda", hex: "#D8DEE4", var: "gray-200" },
      { name: "Success", hex: "#16A34A", var: "success" },
      { name: "Warning", hex: "#F59E0B", var: "warning" },
      { name: "Destructive", hex: "#EF4444", var: "error" },
    ],
    dark: [
      { name: "Primária (CTA/Ações)", hex: "#2EAE9A", var: "brand-400" },
      { name: "Accent", hex: "#16A085", var: "brand-500" },
      { name: "Background", hex: "#101A1E", var: "slate-950" },
      { name: "Card/Surface", hex: "#162024", var: "slate-900" },
      { name: "Texto Principal", hex: "#EDF1F3", var: "slate-50" },
      { name: "Texto Secundário", hex: "#8899A6", var: "slate-400" },
      { name: "Borda", hex: "#2A3842", var: "slate-700" },
      { name: "Success", hex: "#22C55E", var: "green-500" },
      { name: "Warning", hex: "#D97706", var: "amber-600" },
      { name: "Destructive", hex: "#DC2626", var: "red-600" },
    ],
  }

  const tokens = [
    { name: "Border Radius (lg)", value: "12px (0.75rem)" },
    { name: "Border Radius (md)", value: "10px" },
    { name: "Border Radius (sm)", value: "8px" },
    { name: "Shadow Medical", value: "0 4px 20px -4px rgba(22, 160, 133, 0.15)" },
    { name: "Shadow Card", value: "0 2px 8px -2px rgba(26, 46, 56, 0.08)" },
    { name: "Container Max", value: "1400px" },
    { name: "Container Padding", value: "32px (2rem)" },
  ]

  const masterPrompt = `Clean medical SaaS interface aesthetic, primary teal color #16A085 used exclusively as accent for buttons and interactive elements, white background #F7F9FA for light environments and dark slate #101A1E for dark environments, Plus Jakarta Sans typography style with geometric humanist letterforms, consistent 12px rounded corners on all UI elements, subtle teal glow shadows rgba(22,160,133,0.15), premium minimalist composition with generous white space, soft diffused natural lighting, modern Brazilian professional context, glassmorphism subtle effects on cards, no text overlays in generated images, no sci-fi or futuristic elements, no cold clinical hospital aesthetic, warm professional technology appearance`

  const generatedPrompts = [
    {
      id: "hero-1",
      title: "Hero Section - Médico usando iPhone",
      prompt: `${masterPrompt}, professional Brazilian doctor in white coat using iPhone in modern consultation room, natural daylight from window, warm smile, stethoscope around neck, clean minimalist desk with MacBook, plants in background, 9:16 portrait orientation --ar 9:16 --style raw --v 6`,
    },
    {
      id: "hero-2",
      title: "Dashboard Interface Close-up",
      prompt: `${masterPrompt}, close-up of modern medical dashboard interface on iPad screen, teal accent buttons #16A085, clean data visualization charts, soft shadows, floating UI elements, white background, professional medical icons, 1:1 square format --ar 1:1 --style raw --v 6`,
    },
    {
      id: "testimonial-1",
      title: "Médico satisfeito no consultório",
      prompt: `${masterPrompt}, confident Brazilian doctor in modern consultation room, arms crossed, warm professional smile, natural window light, clean white walls, medical diplomas on wall, plants, contemporary furniture, 9:16 portrait --ar 9:16 --style raw --v 6`,
    },
    {
      id: "feature-1",
      title: "Mãos segurando iPhone gravando",
      prompt: `${masterPrompt}, close-up of hands holding iPhone with voice recording interface visible, medical consultation room background blurred, natural lighting, teal accent UI elements #16A085, professional setting, 16:9 landscape --ar 16:9 --style raw --v 6`,
    },
    {
      id: "feature-2",
      title: "Transcrição IA em tempo real",
      prompt: `${masterPrompt}, abstract visualization of AI transcription process, floating text fragments converting from audio waves, teal gradient accents #16A085, soft glow effects, clean white background, modern tech aesthetic, 1:1 square --ar 1:1 --style raw --v 6`,
    },
    {
      id: "social-1",
      title: "Feed Instagram - Dica médica",
      prompt: `${masterPrompt}, Instagram feed post template with clean white background, teal accent elements #16A085, medical productivity tip text area, professional icon in corner, minimalist composition, 1:1 square format --ar 1:1 --style raw --v 6`,
    },
    {
      id: "social-2",
      title: "Stories - Antes e Depois",
      prompt: `${masterPrompt}, Instagram stories template showing before/after comparison, left side: messy papers and stress, right side: organized digital workflow with iPad, teal divider line #16A085, 9:16 vertical --ar 9:16 --style raw --v 6`,
    },
    {
      id: "banner-1",
      title: "Banner YouTube - Produtividade",
      prompt: `${masterPrompt}, YouTube thumbnail showing productive doctor working on laptop in modern office, teal accent overlay #16A085, clean composition with copy space on right, energetic professional vibe, 16:9 landscape --ar 16:9 --style raw --v 6`,
    },
    {
      id: "ad-1",
      title: "Anúncio Facebook - Benefício",
      prompt: `${masterPrompt}, Facebook ad image showing doctor saving time with mobile app, split composition: stressed doctor with papers (left) vs relaxed doctor with iPhone (right), teal accent glow #16A085, 1:1 square --ar 1:1 --style raw --v 6`,
    },
    {
      id: "blog-1",
      title: "Header Blog Post",
      prompt: `${masterPrompt}, blog post header image with modern medical workspace, MacBook showing dashboard, coffee cup, notebook, iPhone, clean desk setup, natural window light, plants, teal accent details #16A085, 16:9 landscape --ar 16:9 --style raw --v 6`,
    },
  ]

  const tokensJSON = {
    colors: {
      light: colorPalette.light.reduce((acc, color) => {
        acc[color.var] = color.hex
        return acc
      }, {} as Record<string, string>),
      dark: colorPalette.dark.reduce((acc, color) => {
        acc[color.var] = color.hex
        return acc
      }, {} as Record<string, string>),
    },
    typography: {
      fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
      weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    },
    borderRadius: { sm: "8px", md: "10px", lg: "12px" },
    shadows: {
      medical: "0 4px 20px -4px rgba(22, 160, 133, 0.15)",
      card: "0 2px 8px -2px rgba(26, 46, 56, 0.08)",
    },
    container: { maxWidth: "1400px", padding: "32px" },
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-xl bg-card/90">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-400 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Design System Visual</h1>
              <p className="text-xs text-muted-foreground">Gravador Médico</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-muted hover:bg-secondary transition-colors"
              title={darkMode ? "Modo Light" : "Modo Dark"}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-foreground" />
              )}
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors"
            >
              ← Voltar
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Paleta de Cores */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">1. Paleta de Cores</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Light Mode */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground mb-4">Light Mode</h3>
              <div className="space-y-2">
                {colorPalette.light.map((color) => (
                  <div
                    key={color.hex}
                    className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border hover:shadow-md transition-shadow"
                  >
                    <div
                      className="w-16 h-16 rounded-lg shadow-md flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{color.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{color.hex}</p>
                      <p className="text-xs text-muted-foreground font-mono">{color.var}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(color.hex, color.hex)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      {copiedPrompt === color.hex ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dark Mode */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground mb-4">Dark Mode</h3>
              <div className="space-y-2">
                {colorPalette.dark.map((color) => (
                  <div
                    key={color.hex}
                    className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-700 hover:shadow-md transition-shadow"
                  >
                    <div
                      className="w-16 h-16 rounded-lg shadow-md flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-50">{color.name}</p>
                      <p className="text-sm text-slate-400 font-mono">{color.hex}</p>
                      <p className="text-xs text-slate-500 font-mono">{color.var}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(color.hex, `dark-${color.hex}`)}
                      className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      {copiedPrompt === `dark-${color.hex}` ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tipografia */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">2. Tipografia</h2>
          <div className="bg-card rounded-2xl border border-border p-8 space-y-6">
            <div>
              <p className="text-muted-foreground font-semibold mb-2">Família</p>
              <p className="text-2xl font-bold text-foreground">Plus Jakarta Sans</p>
              <p className="text-sm text-muted-foreground font-mono">Fallback: system-ui, sans-serif</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-4xl font-normal mb-2 text-foreground">Aa</p>
                <p className="text-xs text-muted-foreground">Regular 400</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-4xl font-medium mb-2 text-foreground">Aa</p>
                <p className="text-xs text-muted-foreground">Medium 500</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-4xl font-semibold mb-2 text-foreground">Aa</p>
                <p className="text-xs text-muted-foreground">Semibold 600</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="text-4xl font-bold mb-2 text-foreground">Aa</p>
                <p className="text-xs text-muted-foreground">Bold 700</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tokens Visuais */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">3. Tokens Visuais</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {tokens.map((token) => (
              <div
                key={token.name}
                className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow"
              >
                <p className="font-semibold text-foreground mb-1">{token.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{token.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Prompt Visual Mestre */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">4. Prompt Visual Mestre</h2>
          <div className="bg-gradient-to-br from-brand-50 to-card dark:from-brand-900/20 dark:to-card border-2 border-brand-200 dark:border-brand-700 rounded-2xl p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                <p className="font-semibold text-foreground">Base para todos os prompts</p>
              </div>
              <button
                onClick={() => copyToClipboard(masterPrompt, "master")}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors"
              >
                {copiedPrompt === "master" ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <p className="text-foreground leading-relaxed font-mono text-sm bg-card/50 p-6 rounded-xl">
              {masterPrompt}
            </p>
          </div>
        </section>

        {/* Prompts Gerados */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">5. Prompts de Imagem Gerados</h2>
          <div className="space-y-4">
            {generatedPrompts.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">Prompt #{item.id}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.prompt, item.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-lg font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors text-sm"
                  >
                    {copiedPrompt === item.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground font-mono bg-muted p-4 rounded-lg leading-relaxed">
                  {item.prompt}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Exportar JSON */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">6. Exportar Tokens (JSON)</h2>
          <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-8 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-200 font-semibold">design-tokens.json</p>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(tokensJSON, null, 2)], {
                    type: "application/json",
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "design-tokens.json"
                  a.click()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar JSON
              </button>
            </div>
            <pre className="text-xs text-slate-300 overflow-x-auto">
              {JSON.stringify(tokensJSON, null, 2)}
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}
