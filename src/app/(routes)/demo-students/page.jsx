"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import withPrivateAuth from "@/components/withPrivateAuth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRightLeft, Loader2, QrCode, RefreshCw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSalesPersons } from "@/hooks/useSalesData";
import DemoClassQrModal from "@/components/demoStudents/DemoClassQrModal";
import DemoStudentsStatsCards from "@/components/demoStudents/DemoStudentsStatsCards";
import DemoStudentsFilters from "@/components/demoStudents/DemoStudentsFilters";
import DemoStudentsTable from "@/components/demoStudents/DemoStudentsTable";
import {
  DEMO_STUDENTS_PAGE_SIZE,
  fetchDemoStudents,
  fetchDemoStudentStats,
  fetchDemoClassQr,
  generateDemoClassQr,
  fetchDemoTrainersDropdown,
} from "@/redux/features/demoStudents/demoStudentsSlice";

function emptyFilters() {
  return {
    search: "",
    paymentStatus: "",
    studentStatus: "",
    salesPerson: "",
    demoTrainer: "",
    fromDate: "",
    toDate: "",
  };
}

const SEARCH_DEBOUNCE_MS = 2000;

function DemoStudentsPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userAuth?.user);
  const {
    list,
    listMeta,
    listLoading,
    listError,
    stats,
    statsLoading,
    statsError,
    qr,
    qrLoading,
    qrError,
    trainers,
    trainersLoading,
  } = useSelector((state) => state.demoStudents);

  const isManagerOrSuper = user?.role === "manager" || user?.role === "super_admin";
  const canManageQr = user?.role !== "counselor";
  const { persons } = useSalesPersons({ enabled: isManagerOrSuper });

  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const loadData = useCallback(() => {
    dispatch(fetchDemoStudents({ page, pageSize: DEMO_STUDENTS_PAGE_SIZE, filters: appliedFilters }));
    dispatch(fetchDemoStudentStats({ filters: appliedFilters }));
  }, [dispatch, page, appliedFilters]);
 
  useEffect(() =>{
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (canManageQr) dispatch(fetchDemoClassQr());
    dispatch(fetchDemoTrainersDropdown());
  }, [dispatch, canManageQr]);

  useEffect(() => {
    if (filters.search === appliedFilters.search) return;
    const timer = setTimeout(() => {
      setPage(1);
      setAppliedFilters((prev) => ({ ...prev, search: filters.search }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search, appliedFilters.search]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    const empty = emptyFilters();
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const onGenerateQr = async () => {
    const result = await dispatch(generateDemoClassQr({}));
    if (generateDemoClassQr.fulfilled.match(result)) {
      setQrModalOpen(true);
    }
  };

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-6 w-6" />
                Demo students
              </CardTitle>
              <CardDescription>
                List, stats, and global QR for the public demo feedback form.
              </CardDescription>
              {qrError && canManageQr && (
                <p className="mt-2 text-sm text-destructive">{qrError}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isManagerOrSuper && (
                <Link
                  href="/demo-students/transfer"
                  className={cn(buttonVariants({ variant: "default" }), "h-9")}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer students
                </Link>
              )}
              {canManageQr && (
                <>
                  <Button
                    type="button"
                    className="h-9"
                    onClick={onGenerateQr}
                    disabled={qrLoading}
                  >
                    {qrLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    {qr ? "Generate new QR" : "Generate QR"}
                  </Button>
                  {qr && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9"
                      onClick={() => setQrModalOpen(true)}
                    >
                      Show QR
                    </Button>
                  )}
                </>
              )}
              <Button type="button" variant="outline" className="h-9" onClick={loadData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <DemoStudentsStatsCards stats={stats} loading={statsLoading} error={statsError} />

      <DemoStudentsTable
        list={list}
        listMeta={listMeta}
        loading={listLoading}
        error={listError}
        toolbar={
          <DemoStudentsFilters
            filters={filters}
            onChange={setFilters}
            onApply={applyFilters}
            onReset={resetFilters}
            showSalesPersonFilter={isManagerOrSuper}
            persons={persons}
            trainers={trainers}
            trainersLoading={trainersLoading}
          />
        }
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() =>
          setPage((p) => {
            const maxPage = listMeta.total_pages || 1;
            return Math.min(maxPage, p + 1);
          })
        }
        appliedFilters={appliedFilters}
      />

      <DemoClassQrModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        token={qr?.token}
      />
    </div>
  );
}

export default withPrivateAuth(DemoStudentsPage);