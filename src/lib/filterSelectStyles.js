import { createElement } from "react";

/**
 * Show only "N batches selected" instead of individual multi-value chips.
 * Use with react-select `isMulti` + `components={BATCH_MULTI_SELECT_COMPONENTS}`.
 */
export function BatchMultiValueCount({ index, getValue }) {
  if (index > 0) return null;
  const count = getValue()?.length || 0;
  if (count === 0) return null;
  return createElement(
    "div",
    {
      style: {
        paddingLeft: 6,
        fontSize: 14,
        color: "hsl(var(--foreground))",
      },
    },
    `${count} ${count === 1 ? "batch" : "batches"} selected`
  );
}

export const BATCH_MULTI_SELECT_COMPONENTS = {
  MultiValue: BatchMultiValueCount,
};

/** Shared react-select styles matching app filter inputs (bg-background / border-input). */
export const FILTER_SELECT_STYLES = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    fontSize: 14,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
    boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.2)" : "none",
    "&:hover": {
      borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
    },
  }),
  singleValue: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--muted))",
  }),
  multiValueLabel: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  multiValueRemove: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    ":hover": {
      backgroundColor: "hsl(var(--muted))",
      color: "hsl(var(--foreground))",
    },
  }),
  input: (base) => ({ ...base, color: "hsl(var(--foreground))", margin: 0, padding: 0 }),
  placeholder: (base) => ({ ...base, color: "hsl(var(--muted-foreground))" }),
  valueContainer: (base) => ({ ...base, paddingTop: 2, paddingBottom: 2 }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  clearIndicator: (base) => ({ ...base, color: "hsl(var(--muted-foreground))", padding: 4 }),
  dropdownIndicator: (base) => ({ ...base, color: "hsl(var(--muted-foreground))", padding: 4 }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: "hsl(var(--input))" }),
  menu: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--background))",
    border: "1px solid hsl(var(--input))",
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused || state.isSelected
      ? "hsl(var(--muted))"
      : "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    fontWeight: state.isSelected ? 500 : 400,
  }),
};

/** Sales-batch multi-select: selected rows get a light brand-orange tint. */
export const BATCH_MULTI_SELECT_STYLES = {
  ...FILTER_SELECT_STYLES,
  option: (base, state) => {
    let backgroundColor = "hsl(var(--background))";
    if (state.isSelected && state.isFocused) backgroundColor = "rgba(255, 128, 0, 0.28)";
    else if (state.isSelected) backgroundColor = "rgba(255, 128, 0, 0.16)";
    else if (state.isFocused) backgroundColor = "hsl(var(--muted))";
    return {
      ...base,
      backgroundColor,
      color: "hsl(var(--foreground))",
      fontWeight: state.isSelected ? 500 : 400,
      cursor: "pointer",
    };
  },
};
