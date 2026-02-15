import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface MultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  "data-testid"?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
  "data-testid": testId,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((s) => s !== value))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex min-h-9 w-full items-center justify-between gap-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring",
            className
          )}
          data-testid={testId}
        >
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            ) : (
              selected.map((value) => (
                <Badge
                  key={value}
                  variant="secondary"
                  className="no-default-hover-elevate no-default-active-elevate text-xs px-1.5 py-0 h-5"
                >
                  {value}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none"
                    onClick={(e) => handleRemove(value, e)}
                    data-testid={testId ? `${testId}-remove-${value}` : undefined}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start" onWheel={(e) => e.stopPropagation()}>
        <div className="max-h-[200px] overflow-y-auto">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover-elevate",
              selected.includes(option) && "bg-accent"
            )}
            onClick={() => handleToggle(option)}
            data-testid={testId ? `${testId}-option-${option}` : undefined}
          >
            <div className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
              selected.includes(option) ? "bg-primary text-primary-foreground" : "opacity-50"
            )}>
              {selected.includes(option) && <Check className="h-3 w-3" />}
            </div>
            <span>{option}</span>
          </button>
        ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
