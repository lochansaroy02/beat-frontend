// components/InputComponent.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InputProps {
    id?: string
    label?: string;
    value: string | number | boolean | undefined | null;
    className?: string;
    setInput?: (val: string) => void;
    type?: "text" | "password" | string;
    placeholder?: any
    // 1. Add the optional 'disabled' prop
    disabled?: boolean;
}

const InputComponent = ({
    label,
    value,
    className,
    setInput,
    type,
    id,
    placeholder,
    // 2. Destructure the new 'disabled' prop
    disabled,
}: InputProps) => {
    return (
        <div className={cn("flex flex-col  ", className)}>
            <Label className="w-1/4 text-[14px] text-nowrap text-neutral-800">
                {label}
            </Label>
            <Input
                id={id}
                type={type}
                placeholder={setInput ? `Enter ${label}` : ""}
                className="text-neutral-800 bg-neutral-100/50 border border-neutral-800/40 focus:border-0  placeholder:text-neutral-700/50"
                value={typeof value === "boolean" ? String(value) : value ?? ""}
                onChange={(e) => setInput?.(e.target.value)}
                readOnly={!setInput}
                required={!!setInput}
                // 3. Pass the 'disabled' prop to the Input element
                disabled={disabled}
            />

        </div>
    );
};

export default InputComponent;