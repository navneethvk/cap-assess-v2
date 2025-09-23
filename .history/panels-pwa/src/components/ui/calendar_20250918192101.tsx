"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// Import react-day-picker styles
import "react-day-picker/dist/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "rdp-months flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "rdp-month space-y-4",
        caption: "rdp-caption flex justify-center pt-1 relative items-center",
        caption_label: "rdp-caption_label text-sm font-medium",
        nav: "rdp-nav space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "rdp-nav_button h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "rdp-nav_button_previous absolute left-1",
        nav_button_next: "rdp-nav_button_next absolute right-1",
        table: "rdp-table w-full border-collapse space-y-1",
        head_row: "rdp-head_row flex",
        head_cell: "rdp-head_cell text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "rdp-row flex w-full mt-2",
        cell: "rdp-cell h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative",
        day: "rdp-day h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        day_range_end: "rdp-day_range_end day-range-end",
        day_selected: "rdp-day_selected bg-primary text-primary-foreground",
        day_today: "rdp-day_today bg-accent text-accent-foreground",
        day_outside: "rdp-day_outside text-muted-foreground opacity-50",
        day_disabled: "rdp-day_disabled text-muted-foreground opacity-50",
        day_range_middle: "rdp-day_range_middle aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "rdp-day_hidden invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"


