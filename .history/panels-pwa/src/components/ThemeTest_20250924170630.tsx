import React, { useEffect, useState } from 'react'
import useAppStore from '@/store/appStore'

export const ThemeTest: React.FC = () => {
  const { currentTheme, setTheme, getEffectiveTheme } = useAppStore()
  const [htmlClasses, setHtmlClasses] = useState<string>('')

  useEffect(() => {
    // Check what classes are on the html element
    const checkHtmlClasses = () => {
      const classes = document.documentElement.className
      setHtmlClasses(classes)
    }
    
    checkHtmlClasses()
    
    // Check again after a short delay to see if classes change
    const timer = setTimeout(checkHtmlClasses, 100)
    
    return () => clearTimeout(timer)
  }, [currentTheme])

  const effectiveTheme = getEffectiveTheme()

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">Theme Test</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Current Theme:</strong> {currentTheme}
        </div>
        <div>
          <strong>Effective Theme:</strong> {effectiveTheme}
        </div>
        <div>
          <strong>HTML Classes:</strong> <code className="bg-muted px-1 rounded">{htmlClasses || '(none)'}</code>
        </div>
        <div>
          <strong>Has 'dark' class:</strong> {htmlClasses.includes('dark') ? '✅ Yes' : '❌ No'}
        </div>
      </div>

      <div className="mt-4 space-x-2">
        <button
          onClick={() => setTheme('light')}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          className="px-3 py-1 bg-gray-800 text-white rounded text-sm"
        >
          Dark
        </button>
        <button
          onClick={() => setTheme('system')}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm"
        >
          System
        </button>
      </div>
    </div>
  )
}

export default ThemeTest
