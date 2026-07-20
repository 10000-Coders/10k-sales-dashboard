"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import * as XLSX from "xlsx-js-style";
import withPrivateAuth from "@/components/withPrivateAuth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRightLeft, Download, Loader2, QrCode, Users } from "lucide-react";
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
  fetchDemoStudentsXlsheet,
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

const EXPORT_COLUMNS = [
  { key: "student_name", header: "Student Name", width: 18 },
  { key: "student_email", header: "Email", width: 28 },
  { key: "student_phonenumber", header: "Phone", width: 14 },
  { key: "student_branch", header: "Branch", width: 18 },
  { key: "student_year_of_pass", header: "Year of Pass", width: 12 },
  { key: "payment_status", header: "Payment Status", width: 14 },
  { key: "student_status", header: "Status", width: 14 },
  { key: "sales_person_display", header: "Sales Person", width: 14 },
  { key: "demo_date", header: "Demo Date", width: 12 },
  { key: "course_name", header: "Course", width: 16 },
  { key: "demo_trainer_name", header: "Trainer", width: 16 },
  { key: "demo_topic", header: "Topic", width: 24 },
  { key: "explanation", header: "Explanation", width: 14 },
  { key: "concept", header: "Concept", width: 14 },
  { key: "class_interaction", header: "Class Interaction", width: 16 },
  { key: "voice_modulation", header: "Voice Modulation", width: 16 },
  { key: "eye_contact", header: "Eye Contact", width: 14 },
  { key: "body_language", header: "Body Language", width: 14 },
  { key: "real_time_examples", header: "Real Time Examples", width: 18 },
  { key: "feedback", header: "Feedback", width: 28 },
  { key: "comments", header: "Comments", width: 22 },
  { key: "created_at", header: "Created At", width: 18 },
];

const ROW_HEIGHT_PT = 28;
const HEADER_ROW_HEIGHT_PT = 32;

function formatExportValue(key, value) {
  if (value == null || value === "") return "";
  if (key === "payment_status") {
    return value === true || value === "true" || value === 1 ? "Paid" : "Unpaid";
  }
  if (key === "created_at") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    }
  }
  return value;
}

function downloadDemoStudentsExcel(rows) {
  const sheetRows = rows.map((row) => {
    const out = {};
    for (const col of EXPORT_COLUMNS) {
      out[col.header] = formatExportValue(col.key, row[col.key]);
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);

  worksheet["!cols"] = EXPORT_COLUMNS.map((col) => ({ wch: col.width }));
  worksheet["!rows"] = [
    { hpt: HEADER_ROW_HEIGHT_PT },
    ...sheetRows.map(() => ({ hpt: ROW_HEIGHT_PT })),
  ];

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  for (let R = range.s.r; R <= range.e.r; R += 1) {
    for (let C = range.s.c; C <= range.e.c; C += 1) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[addr];
      if (!cell) continue;
      const isHeader = R === 0;
      cell.s = {
        font: {
          bold: isHeader,
          sz: isHeader ? 12 : 11,
        },
        alignment: {
          vertical: "center",
          horizontal: "left",
          wrapText: true,
        },
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Demo Students");
  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `demo-students-${dateStamp}.xlsx`);
}

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
    exportLoading,
    exportError,
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

  useEffect(() => {
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

  const onExport = async () => {
    const result = await dispatch(fetchDemoStudentsXlsheet({ filters: appliedFilters }));
    if (fetchDemoStudentsXlsheet.fulfilled.match(result)) {
      downloadDemoStudentsExcel(result.payload || []);
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
              {exportError && (
                <p className="mt-2 text-sm text-destructive">{exportError}</p>
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
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={onExport}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
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
