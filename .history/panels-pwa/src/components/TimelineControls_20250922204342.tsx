import React from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface TimelineControlsProps {
  isInMoveMode: boolean
  onExitMoveMode: () => Promise<void>
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  isInMoveMode,
  onExitMoveMode
}) => {
  if (!isInMoveMode) return null

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Button
        onClick={onExitMoveMode}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
      >
        <Check className="h-4 w-4 mr-2" />
        Done
      </Button>
    </div>
  )
}

export default TimelineControls

