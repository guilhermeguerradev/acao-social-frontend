import { cn } from "../../lib/utils";

type TabItem<T extends string> = {
  value: T;
  label: string;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {items.map((item) => (
        <button
          key={item.value}
          className={cn(
            "h-9 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors",
            value === item.value && "bg-background text-foreground shadow-sm",
          )}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
