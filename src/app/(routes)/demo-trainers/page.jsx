"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import withPrivateAuth from "@/components/withPrivateAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, Plus, RefreshCw, Search, UserCog } from "lucide-react";
import DemoTrainerFormDialog from "@/components/demoTrainers/DemoTrainerFormDialog";
import {
  fetchDemoTrainers,
  createDemoTrainer,
  updateDemoTrainer,
  clearDemoTrainerSaveError,
} from "@/redux/features/demoStudents/demoStudentsSlice";

function DemoTrainersPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userAuth?.user);
  const {
    trainersList: list,
    trainersListLoading: loading,
    trainersListError: error,
    trainerSaveLoading: saveLoading,
  } = useSelector((state) => state.demoStudents);

  const canManage = user?.role === "manager" || user?.role === "super_admin";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    if (canManage) dispatch(fetchDemoTrainers());
  }, [dispatch, canManage]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = list.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (t.name || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      (t.phone || "").toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditing(null);
    dispatch(clearDemoTrainerSaveError());
    setDialogOpen(true);
  };

  const openEdit = (trainer) => {
    setEditing(trainer);
    dispatch(clearDemoTrainerSaveError());
    setDialogOpen(true);
  };

  const handleSave = async (values) => {
    const action = editing?.id
      ? updateDemoTrainer({ id: editing.id, ...values })
      : createDemoTrainer(values);
    const result = await dispatch(action);
    if (createDemoTrainer.fulfilled.match(result) || updateDemoTrainer.fulfilled.match(result)) {
      return { ok: true };
    }
    return { ok: false, errors: result.payload };
  };

  if (!canManage) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>Only manager and super admin can manage demo trainers.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UserCog className="h-6 w-6" />
                Demo trainers
              </CardTitle>
              <CardDescription>
                Create and update trainers used in the public demo feedback form.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-9" onClick={load}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" className="h-9" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add trainer
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
              {list.length}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No demo trainers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>{t.phone}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.status === "Active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {Array.isArray(t.course) && t.course.length ? t.course.join(", ") : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DemoTrainerFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        trainer={editing}
        saving={saveLoading}
        onSave={handleSave}
      />
    </div>
  );
}

export default withPrivateAuth(DemoTrainersPage);
