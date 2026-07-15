/**
 * Client validation aligned with DemoTrainerSerializer.
 * @returns {{ errors: Record<string, string>, values: object|null }}
 */
export function validateDemoTrainerForm(form) {
  const errors = {};

  const name = (form.name || "").trim();
  if (!name) errors.name = "Name is required.";
  else if (name.length < 5) errors.name = "Name must be at least 5 characters.";
  else if (name.length > 50) errors.name = "Name must be at most 50 characters.";

  const email = (form.email || "").trim().toLowerCase();
  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  const phone = (form.phone || "").trim();
  if (!phone) errors.phone = "Phone is required.";
  else if (phone.length > 15) errors.phone = "Phone must be at most 15 characters.";

  const status = (form.status || "").trim();
  if (!status || !["Active", "Inactive"].includes(status)) {
    errors.status = "Status must be Active or Inactive.";
  }

  let course = form.course;
  if (typeof course === "string") {
    course = course
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(course)) course = [];

  if (Object.keys(errors).length > 0) {
    return { errors, values: null };
  }

  return {
    errors: {},
    values: { name, email, phone, status, course },
  };
}

export function mapDemoTrainerApiErrors(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (typeof payload.detail === "string") return { _form: payload.detail };
  const out = {};
  for (const [key, val] of Object.entries(payload)) {
    if (key === "detail") continue;
    if (Array.isArray(val)) out[key] = val[0] || "Invalid value.";
    else if (typeof val === "string") out[key] = val;
  }
  return out;
}
