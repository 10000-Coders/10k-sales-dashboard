# Sales Dashboard – Role hierarchy and permissions

**Order (highest to lowest):** **Manager** > **Super Admin** > **Admin** > **Counselor**

---

## What each role can do

| Feature | Manager | Super Admin | Admin | Counselor |
|--------|:-------:|:-----------:|:-----:|:---------:|
| **Sales persons** | Create, edit, list (only Manager) | No | No | No |
| **Leads – who they see** | All leads | Own leads only | Own leads only | Own leads only |
| **Leads – create / edit / activities** | Yes | Yes (own) | Yes (own) | Yes (own) |
| **Students – who they see** | All students | All students | Own leads’ students | Own leads’ students |
| **Students – create (enroll from lead)** | Yes | Yes | Yes | Yes |
| **Students – add payment** | Yes | Yes | Yes | Yes |
| **Payments – who they see** | All payments | All payments | Own leads’ students’ payments | No (no Payments page) |
| **Payments – verify / reject** | Yes | No | No | No |
| **Move student to batch** | Yes | Yes | No | No |
| **Batches list** (for move-to-batch) | Yes | Yes | No | No |
| **Activities / stats** | All persons (manager view) | Own only | Own only | Own only |

---

## Short “what is what”

| Role | In short |
|------|----------|
| **Manager** | Top role. Manages sales persons (CRUD). Sees all leads and all students. Can verify payments, move to batch. Sees full team in activities. |
| **Super Admin** | Sees only own leads (like Admin/Counselor) but sees **all students** and **all payments**; can move students to batch. **Cannot verify/reject payments.** No access to Sales persons management. |
| **Admin** | Sees own leads and own leads’ students. **Cannot verify payments.** Cannot move to batch. No Sales persons management. |
| **Counselor** | Sees only own leads and own leads’ students. Can create students and add payments. Cannot verify payments, move to batch, or access Sales persons. |
