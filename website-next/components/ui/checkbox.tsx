interface CheckboxProps {
  label:     string;
  checked:   boolean;
  onChange:  (checked: boolean) => void;
  disabled?: boolean;
  id?:       string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  id,
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      style={{ display: "inline-flex", alignItems: "center", gap: "8px",
               cursor: disabled ? "not-allowed" : "pointer",
               opacity: disabled ? 0.45 : 1 }}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}