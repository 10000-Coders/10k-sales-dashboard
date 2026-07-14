"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function DemoStudentsTransferSection({
  persons,
  toSalesPerson,
  onToSalesPersonChange,
  selectedCount,
  loading,
  error,
  result,
  onTransfer,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transfer demo students</CardTitle>
        <CardDescription>
          Check one or more students below, choose target counselor, then transfer.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To sales person</label>
          <select
            className="h-9 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
            value={toSalesPerson}
            onChange={(e) => onToSalesPersonChange(e.target.value)}
          >
            <option value="">Select counselor</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          disabled={!toSalesPerson || selectedCount === 0 || loading}
          onClick={onTransfer}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Transfer ({selectedCount})
        </Button>
        {result && (
          <p className="text-sm text-muted-foreground">
            Moved {result.updated_count} to {result.to_sales_person_name}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
