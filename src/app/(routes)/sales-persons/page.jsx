"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import withPrivateAuth from "@/components/withPrivateAuth";
import { useSalesPersons } from "@/hooks/useSalesData";
import axios from "@/axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SalesPersonFormDialog } from "@/components/SalesPersonFormDialog";
import { cn } from "@/lib/utils";
import { Users, Loader2, UserPlus, Pencil, Phone } from "lucide-react";

function SalesPersonsPage() {
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const userRole = (user?.role || "").toLowerCase();
  const isManager = userRole === "manager" || userRole === "super_admin";
  const { persons, loading, error, refetch: refetchPersons } = useSalesPersons({ enabled: isManager });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const openAdd = () => {
    setEditingPerson(null);
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditingPerson(p);
    setDialogOpen(true);
  };

  // ... withPrivateAuth handles authentication and initial role-based access checks ...


  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:gap-8 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Team Management</h1>
        <p className="text-muted-foreground font-medium">Configure roles, permissions, and oversight for your sales personnel.</p>
      </div>

      <Card className="border-none shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-0 pt-8 px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b pb-8 border-gray-100">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-1">Sales Force</CardTitle>
                <CardDescription className="text-sm font-medium">
                  Currently managing {persons.length} active team members.
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={openAdd}
              className="h-12 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <UserPlus className="h-5 w-5" />
              Onboard Personnel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-destructive">{error}</p>
          ) : persons.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No sales persons yet.</p>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-none">
                  <TableHead className="px-8 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</TableHead>
                  <TableHead className="py-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Role</TableHead>
                  <TableHead className="py-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="py-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Mobile</TableHead>
                  <TableHead className="px-8 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {persons.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50/30 transition-colors border-gray-100">
                    <TableCell className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">{p.name}</span>
                        <span className="text-xs text-gray-400">#{p.id?.toString().padStart(4, '0')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-sm text-gray-600">
                      {p.email}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 capitalize">
                        {p.role?.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          p.status === 'Active' ? "bg-green-500" :
                          p.status === 'Blocked' ? "bg-red-400" : "bg-gray-300"
                        )} />
                        <span className="text-sm text-gray-600">{p.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm text-gray-700">{p.personal_mobile || "—"}</span>
                        <span className="text-xs text-gray-400">{p.company_mobile || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                        className="h-9 w-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SalesPersonFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        person={editingPerson}
        persons={persons}
        onSuccess={refetchPersons}
        getHeaders={getHeaders}
      />
    </div>
  );
}
export default withPrivateAuth(SalesPersonsPage);
