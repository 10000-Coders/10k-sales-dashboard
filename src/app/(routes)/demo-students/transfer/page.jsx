"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Link from "next/link";
import withPrivateAuth from "@/components/withPrivateAuth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSalesPersons } from "@/hooks/useSalesData";
import DemoStudentsFilters from "@/components/demoStudents/DemoStudentsFilters";
import DemoStudentsTransferSection from "@/components/demoStudents/DemoStudentsTransferSection";
import DemoStudentsTable from "@/components/demoStudents/DemoStudentsTable";
import {
  DEMO_STUDENTS_PAGE_SIZE,
  fetchDemoStudents,
  bulkReassignDemoStudents,
  clearDemoStudentReassign,
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

function DemoStudentsTransferPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const {
    list,
    listMeta,
    listLoading,
    listError,
    reassignLoading,
    reassignError,
    reassignResult,
    trainers,
    trainersLoading,
  } = useSelector((state) => state.demoStudents);

  const isManagerOrSuper = user?.role === "manager" || user?.role === "super_admin";
  const { persons } = useSalesPersons({ enabled: isManagerOrSuper });

  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toSalesPerson, setToSalesPerson] = useState("");

  useEffect(() => {
    if (user && !isManagerOrSuper) {
      router.replace("/demo-students");
    }
  }, [user, isManagerOrSuper, router]);

  const loadData = useCallback(() => {
    dispatch(fetchDemoStudents({ page, pageSize: DEMO_STUDENTS_PAGE_SIZE, filters: appliedFilters }));
  }, [dispatch, page, appliedFilters]);

  useEffect(() => {
    if (!isManagerOrSuper) return;
    loadData();
  }, [loadData, isManagerOrSuper]);

  useEffect(() => {
    if (!isManagerOrSuper) return;
    dispatch(fetchDemoTrainersDropdown());
  }, [dispatch, isManagerOrSuper]);

  useEffect(() => {
    setSelectedIds([]);
  }, [list]);

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

  const allSelected = list.length > 0 && selectedIds.length === list.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(list.map((s) => s.id));
  };
  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onReassign = async () => {
    if (!toSalesPerson || selectedIds.length === 0) return;
    dispatch(clearDemoStudentReassign());
    const result = await dispatch(
      bulkReassignDemoStudents({
        to_sales_person: Number(toSalesPerson),
        demo_student_ids: selectedIds,
      })
    );
    if (bulkReassignDemoStudents.fulfilled.match(result)) {
      setSelectedIds([]);
      loadData();
    }
  };

  if (!isManagerOrSuper) return null;

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-6 w-6" />
                Transfer demo students
              </CardTitle>
              <CardDescription>
                Select students with checkboxes, choose a counselor, then transfer.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/demo-students"
                className={cn(buttonVariants({ variant: "outline" }), "h-9")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
              <Button type="button" variant="outline" className="h-9" onClick={loadData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <DemoStudentsTransferSection
        persons={persons}
        toSalesPerson={toSalesPerson}
        onToSalesPersonChange={setToSalesPerson}
        selectedCount={selectedIds.length}
        loading={reassignLoading}
        error={reassignError}
        result={reassignResult}
        onTransfer={onReassign}
      />

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
            showSalesPersonFilter
            persons={persons}
            trainers={trainers}
            trainersLoading={trainersLoading}
          />
        }
        showCheckboxes
        selectedIds={selectedIds}
        onToggleAll={toggleAll}
        onToggleOne={toggleOne}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() =>
          setPage((p) => {
            const maxPage = listMeta.total_pages || 1;
            return Math.min(maxPage, p + 1);
          })
        }
      />
    </div>
  );
}

export default withPrivateAuth(DemoStudentsTransferPage);
