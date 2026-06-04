/** Shared react-select styles for form fields (h-11 controls). */

export const formSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderColor: state.selectProps.error
      ? "hsl(var(--destructive))"
      : state.isFocused
        ? "hsl(var(--ring))"
        : "hsl(var(--input))",
    boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring))" : "none",
    "&:hover": {
      borderColor: state.selectProps.error
        ? "hsl(var(--destructive))"
        : state.isFocused
          ? "hsl(var(--ring))"
          : "#9ca3af",
    },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "0.875rem" }),
  singleValue: (base) => ({ ...base, fontSize: "0.875rem" }),
  input: (base) => ({ ...base, fontSize: "0.875rem" }),
};

export const formSelectMenuPortalTarget =
  typeof document !== "undefined" ? document.body : null;
