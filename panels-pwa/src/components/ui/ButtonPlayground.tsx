import React, { useState } from 'react'
import { Button, buttonConfigs } from './button'
import { cn } from '@/lib/utils'

/**
 * Button Playground Component
 * 
 * This component serves as both a Storybook story and a development playground
 * for testing and demonstrating all button variants and configurations.
 * 
 * It shows:
 * - All available button variants
 * - All size options
 * - Typography and shadow options
 * - Predefined configurations
 * - Interactive states (hover, focus, disabled)
 * - Real-world usage examples
 */

interface ButtonPlaygroundProps {
  className?: string
}

export const ButtonPlayground: React.FC<ButtonPlaygroundProps> = ({ className }) => {
  const [selectedVariant, setSelectedVariant] = useState<string>('default')
  const [selectedSize, setSelectedSize] = useState<string>('default')
  const [isDisabled, setIsDisabled] = useState(false)

  const variants = [
    'default', 'destructive', 'outline', 'secondary', 'ghost', 'link',
    'primary', 'primary-outline', 'primary-ghost', 'tab', 'tab-active'
  ]

  const sizes = [
    'default', 'sm', 'lg', 'icon',
    'primary-sm', 'primary-default', 'primary-lg', 'primary-icon'
  ]

  const typographyOptions = ['default', 'mono', 'bold']
  const shadowOptions = ['none', 'sm', 'md', 'lg', 'custom']

  return (
    <div className={cn("p-8 space-y-8 max-w-6xl mx-auto", className)}>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Button System Playground</h1>
        <p className="text-gray-600">
          Comprehensive showcase of the unified button system with all variants, sizes, and configurations.
        </p>
      </div>

      {/* Interactive Controls */}
      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-semibold">Interactive Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Variant</label>
            <select 
              value={selectedVariant} 
              onChange={(e) => setSelectedVariant(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {variants.map(variant => (
                <option key={variant} value={variant}>{variant}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Size</label>
            <select 
              value={selectedSize} 
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {sizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Typography</label>
            <select className="w-full p-2 border rounded">
              {typographyOptions.map(typography => (
                <option key={typography} value={typography}>{typography}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Shadow</label>
            <select className="w-full p-2 border rounded">
              {shadowOptions.map(shadow => (
                <option key={shadow} value={shadow}>{shadow}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="disabled" 
            checked={isDisabled}
            onChange={(e) => setIsDisabled(e.target.checked)}
          />
          <label htmlFor="disabled" className="text-sm font-medium">Disabled</label>
        </div>
        
        {/* Live Preview */}
        <div className="mt-4 p-4 bg-[hsl(var(--card))] rounded border">
          <h3 className="text-sm font-medium mb-2">Live Preview</h3>
          <Button 
            variant={selectedVariant as any}
            size={selectedSize as any}
            disabled={isDisabled}
          >
            {selectedVariant} Button
          </Button>
        </div>
      </div>

      {/* All Variants Showcase */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">All Variants</h2>
        
        {variants.map(variant => (
          <div key={variant} className="space-y-3">
            <h3 className="text-lg font-medium capitalize">{variant.replace('-', ' ')}</h3>
            <div className="flex flex-wrap gap-3">
              {sizes.map(size => (
                <Button 
                  key={`${variant}-${size}`}
                  variant={variant as any}
                  size={size as any}
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Predefined Configurations */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Predefined Configurations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(buttonConfigs).map(([name, config]) => (
            <div key={name} className="space-y-3">
              <h3 className="text-lg font-medium capitalize">{name.replace(/([A-Z])/g, ' $1')}</h3>
              <div className="space-y-2">
                <Button {...config}>
                  {name} Button
                </Button>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-world Examples */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Real-world Examples</h2>
        
        {/* Navigation Bar Example */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Navigation Bar</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button variant="tab" size="primary-sm">Home</Button>
                <Button variant="tab-active" size="primary-sm">Dashboard</Button>
                <Button variant="tab" size="primary-sm">Settings</Button>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Login</Button>
                <Button variant="default" size="sm">Sign Up</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions Example */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Form Actions</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="default">Cancel</Button>
              <Button variant="default" size="default">Save</Button>
            </div>
          </div>
        </div>

        {/* Primary Button Examples */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Primary Buttons (Tab-like)</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex flex-wrap gap-2">
              <Button {...buttonConfigs.primary}>Primary Action</Button>
              <Button {...buttonConfigs.primarySmall}>Small Primary</Button>
              <Button {...buttonConfigs.primaryPopup}>Dropdown</Button>
            </div>
          </div>
        </div>

        {/* Icon Button Examples */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Icon Buttons</h3>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex space-x-2">
              <Button size="icon" variant="outline">+</Button>
              <Button size="icon" variant="default">✓</Button>
              <Button size="icon" variant="destructive">×</Button>
              <Button size="primary-icon" variant="primary">⚙</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility & States */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">States & Accessibility</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Interactive States</h3>
            <div className="space-y-2">
              <Button variant="default">Normal</Button>
              <Button variant="default" disabled>Disabled</Button>
              <Button variant="default" className="focus:ring-4">Focused (tab to focus)</Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Size Comparison</h3>
            <div className="flex items-center space-x-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Usage Guidelines</h2>
        
        <div className="bg-blue-50 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-blue-900">Best Practices</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Use <code className="bg-blue-100 px-1 rounded">variant="primary"</code> for main actions and tab-like buttons</li>
            <li>• Use <code className="bg-blue-100 px-1 rounded">variant="default"</code> for standard UI buttons</li>
            <li>• Use <code className="bg-blue-100 px-1 rounded">variant="outline"</code> for secondary actions</li>
            <li>• Use <code className="bg-blue-100 px-1 rounded">variant="destructive"</code> for delete/dangerous actions</li>
            <li>• Use predefined configs like <code className="bg-blue-100 px-1 rounded">buttonConfigs.primary</code> for consistency</li>
            <li>• Ensure buttons are at least 44px tall for touch targets on mobile</li>
            <li>• Use <code className="bg-blue-100 px-1 rounded">asChild</code> prop when composing with Radix UI components</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ButtonPlayground
