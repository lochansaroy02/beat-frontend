import { CheckSquare, Square } from "lucide-react";

export const CustomCheckbox = ({ checked, indeterminate, onClick }) => (
    <span
        className="inline-flex items-center justify-center h-4 w-4 rounded border transition-colors cursor-pointer"
        style={{
            backgroundColor: checked || indeterminate ? '#4f46e5' : 'transparent', // Indigo-600
            borderColor: checked || indeterminate ? '#4f46e5' : '#d1d5db', // Gray-300
        }}
        onClick={onClick}
    >
        {(checked || indeterminate) ? (
            <CheckSquare className="h-4 w-4 text-white" />
        ) : (
            <Square className="h-4 w-4 text-gray-400" />
        )}
    </span>
);