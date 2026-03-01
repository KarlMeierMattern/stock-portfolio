import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SymbolSearch } from "@/components/transactions/SymbolSearch";
import {
  useAddTransaction,
  useUpdateTransaction,
} from "@/hooks/useTransactions";
import { transactionSchema, type TransactionFormData } from "@/lib/validators";
import type { Transaction } from "@/types/database";
import { formatNumber } from "@/lib/currency";
import { format } from "date-fns";

type SellPreset = {
  symbol: string;
  name: string | null;
  asset_type: string;
  maxQuantity: number;
};

type BuyPreset = {
  symbol: string;
  name: string | null;
  asset_type: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTransaction?: Transaction | null;
  sellPreset?: SellPreset | null;
  buyPreset?: BuyPreset | null;
};

const TX_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "dividend", label: "Dividend" },
];

const ASSET_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Crypto" },
];

const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "ZAR", label: "ZAR" },
];

const emptyForm = {
  symbol: "",
  name: "",
  asset_type: "stock",
  transaction_type: "buy",
  quantity: "",
  price_per_unit: "",
  currency: "USD",
  fees: "0",
  transaction_date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
};

export function TransactionModal({
  open,
  onOpenChange,
  editTransaction,
  sellPreset,
  buyPreset,
}: Props) {
  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm);

  const isEditing = !!editTransaction;
  const isSellMode = !!sellPreset;
  const isBuyMode = !!buyPreset;

  useEffect(() => {
    if (editTransaction) {
      setForm({
        symbol: editTransaction.symbol,
        name: editTransaction.name || "",
        asset_type: editTransaction.asset_type,
        transaction_type: editTransaction.transaction_type,
        quantity: String(editTransaction.quantity),
        price_per_unit: String(editTransaction.price_per_unit),
        currency: editTransaction.currency,
        fees: String(editTransaction.fees),
        transaction_date: editTransaction.transaction_date,
        notes: editTransaction.notes || "",
      });
    } else if (sellPreset) {
      setForm({
        ...emptyForm,
        symbol: sellPreset.symbol,
        name: sellPreset.name || "",
        asset_type: sellPreset.asset_type,
        transaction_type: "sell",
        transaction_date: format(new Date(), "yyyy-MM-dd"),
      });
    } else if (buyPreset) {
      setForm({
        ...emptyForm,
        symbol: buyPreset.symbol,
        name: buyPreset.name || "",
        asset_type: buyPreset.asset_type,
        transaction_type: "buy",
        transaction_date: format(new Date(), "yyyy-MM-dd"),
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [editTransaction, sellPreset, buyPreset, open]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const data: TransactionFormData = {
      ...form,
      quantity: parseFloat(form.quantity) || 0,
      price_per_unit: parseFloat(form.price_per_unit) || 0,
      fees: parseFloat(form.fees) || 0,
      asset_type: form.asset_type as "stock" | "etf" | "crypto",
      transaction_type: form.transaction_type as "buy" | "sell",
      currency: form.currency as "USD" | "ZAR",
    };

    // Sell quantity validation
    if (data.transaction_type === "sell" && sellPreset) {
      if (data.quantity > sellPreset.maxQuantity) {
        setErrors({
          quantity: `Cannot sell more than ${formatNumber(sellPreset.maxQuantity, 4)} units (current holding)`,
        });
        return;
      }
    }

    const result = transactionSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (path) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      if (isEditing) {
        await updateTransaction.mutateAsync({
          id: editTransaction.id,
          data: result.data,
        });
      } else {
        await addTransaction.mutateAsync(result.data);
      }
      onOpenChange(false);
      setForm(emptyForm);
    } catch (err) {
      console.error("Failed to save transaction:", err);
    }
  };

  const isPending = addTransaction.isPending || updateTransaction.isPending;

  const title = isEditing
    ? "Edit Transaction"
    : isSellMode
      ? `Sell ${sellPreset.symbol}`
      : isBuyMode
        ? `Buy ${buyPreset!.symbol}`
        : "Add Transaction";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {isSellMode && (
            <p className="text-sm text-muted-foreground">
              Available: {formatNumber(sellPreset.maxQuantity, 4)} units
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isSellMode && !isBuyMode && (
            <div className="space-y-2">
              <Label>Symbol</Label>
              <SymbolSearch
                value={form.symbol}
                onChange={(symbol, name, assetType) => {
                  setForm((prev) => ({
                    ...prev,
                    symbol,
                    name,
                    asset_type: assetType,
                  }));
                  setErrors((prev) => ({ ...prev, symbol: "" }));
                }}
              />
              {form.name && (
                <p className="text-xs text-muted-foreground">{form.name}</p>
              )}
              {errors.symbol && (
                <p className="text-xs text-destructive">{errors.symbol}</p>
              )}
            </div>
          )}

          {(isSellMode || isBuyMode) && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="font-medium">{(sellPreset || buyPreset)!.symbol}</p>
              {(sellPreset || buyPreset)!.name && (
                <p className="text-sm text-muted-foreground">
                  {(sellPreset || buyPreset)!.name}
                </p>
              )}
            </div>
          )}

          <div
            className={`grid gap-4 ${isSellMode ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {!isSellMode && !isBuyMode && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  options={TX_TYPES}
                  value={form.transaction_type}
                  onChange={(e) =>
                    updateField("transaction_type", e.target.value)
                  }
                />
              </div>
            )}

            {!isSellMode && !isBuyMode && (
              <div className="space-y-2">
                <Label>Asset Type</Label>
                <Select
                  options={ASSET_TYPES}
                  value={form.asset_type}
                  onChange={(e) => updateField("asset_type", e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                options={CURRENCIES}
                value={form.currency}
                onChange={(e) => updateField("currency", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="quantity">
                  {form.transaction_type === "dividend" ? "Shares" : "Quantity"}
                </Label>
                {isSellMode && (
                  <button
                    type="button"
                    className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/20 cursor-pointer transition-colors"
                    onClick={() =>
                      updateField("quantity", String(sellPreset.maxQuantity))
                    }
                  >
                    Sell all
                  </button>
                )}
              </div>
              <Input
                id="quantity"
                type="number"
                step="any"
                placeholder="0.00"
                max={isSellMode ? sellPreset.maxQuantity : undefined}
                value={form.quantity}
                onChange={(e) => updateField("quantity", e.target.value)}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">
                {form.transaction_type === "dividend"
                  ? "Dividend per share"
                  : "Price per Unit"}
              </Label>
              <Input
                id="price"
                type="number"
                step="any"
                placeholder="0.00"
                value={form.price_per_unit}
                onChange={(e) => updateField("price_per_unit", e.target.value)}
              />
              {errors.price_per_unit && (
                <p className="text-xs text-destructive">
                  {errors.price_per_unit}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fees">Fees</Label>
              <Input
                id="fees"
                type="number"
                step="any"
                placeholder="0.00"
                value={form.fees}
                onChange={(e) => updateField("fees", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.transaction_date}
                onChange={(e) =>
                  updateField("transaction_date", e.target.value)
                }
              />
              {errors.transaction_date && (
                <p className="text-xs text-destructive">
                  {errors.transaction_date}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              variant={isSellMode ? "destructive" : "default"}
            >
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : isSellMode
                    ? "Sell"
                    : "Add Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
