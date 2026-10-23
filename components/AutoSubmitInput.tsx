"use client";

import { useRef } from "react";

/**
 * Inputs that save their surrounding form on blur, on Enter, or on change.
 *
 * The editor uses server actions, so "save" is just "submit the enclosing
 * form". Keeping that in one small client component lets the rest of the
 * editor stay server-rendered: an instructor renames a module by typing and
 * clicking away, with no save button to forget.
 */

function useSubmit() {
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null);
  return {
    ref,
    submit: () => ref.current?.form?.requestSubmit(),
  };
}

export default function AutoSubmitInput({
  name,
  defaultValue,
  className,
  type = "text",
  ariaLabel,
  placeholder,
}: {
  name: string;
  defaultValue?: string | number;
  className?: string;
  type?: "text" | "number";
  ariaLabel?: string;
  placeholder?: string;
}) {
  const { ref, submit } = useSubmit();
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      name={name}
      type={type}
      defaultValue={defaultValue}
      className={className}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onBlur={submit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
      }}
    />
  );
}

export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  className,
  ariaLabel,
}: {
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  ariaLabel?: string;
}) {
  const { ref, submit } = useSubmit();
  return (
    <select
      ref={ref as React.RefObject<HTMLSelectElement>}
      name={name}
      defaultValue={defaultValue}
      className={className}
      aria-label={ariaLabel}
      onChange={submit}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
