"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/utils";

export function RateCalculatorWidget() {
  const [weight, setWeight] = useState<string>("");
  const [unit, setUnit] = useState<string>("quintal");
  const [rate, setRate] = useState<string>("");

  const numWeight = parseFloat(weight) || 0;
  const numRate = parseFloat(rate) || 0;

  let totalAmount = 0;
  let ratePerKg = 0;
  let ratePerQuintal = 0;
  let ratePerTon = 0;

  if (numRate > 0) {
    totalAmount = numWeight * numRate;
    
    if (unit === "kg") {
      ratePerKg = numRate;
      ratePerQuintal = numRate * 100;
      ratePerTon = numRate * 1000;
    } else if (unit === "quintal") {
      ratePerKg = numRate / 100;
      ratePerQuintal = numRate;
      ratePerTon = numRate * 10;
    } else if (unit === "ton") {
      ratePerKg = numRate / 1000;
      ratePerQuintal = numRate / 10;
      ratePerTon = numRate;
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button 
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white z-50 p-0"
            title="Rate Calculator"
          >
            <Calculator className="h-6 w-6" />
          </Button>
        }
      />
      <PopoverContent className="w-80 p-5 mb-2 mr-6 shadow-xl border-indigo-100 bg-card rounded-2xl z-50">
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4" />
              Mandi Rate Calculator
            </h4>
            <p className="text-xs text-muted-foreground leading-tight">
              Quickly calculate totals and compare rates while negotiating.
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Weight</Label>
                <Input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase opacity-0">Unit</Label>
                <Select value={unit} onValueChange={(val) => val && setUnit(val)}>
                  <SelectTrigger className="px-2">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="quintal">qtl</SelectItem>
                    <SelectItem value="ton">ton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Rate per {unit === "quintal" ? "qtl" : unit} (₹)</Label>
              <Input 
                type="number" 
                value={rate} 
                onChange={(e) => setRate(e.target.value)} 
                placeholder="e.g. 5200" 
                className="font-mono"
              />
            </div>
          </div>

          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3 mt-4">
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-indigo-100/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">Total Amount</p>
              <p className="text-2xl font-black text-indigo-700 font-mono tracking-tight leading-none">
                {totalAmount > 0 ? formatINR(totalAmount) : "₹0"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex flex-col items-center justify-center p-1.5 bg-white rounded border">
                <span className="text-[9px] uppercase text-muted-foreground font-sans font-bold">Per KG</span>
                <strong>{ratePerKg > 0 ? `₹${ratePerKg.toLocaleString(undefined, {maximumFractionDigits: 2})}` : "-"}</strong>
              </div>
              <div className="flex flex-col items-center justify-center p-1.5 bg-white rounded border">
                <span className="text-[9px] uppercase text-muted-foreground font-sans font-bold">Per Quintal</span>
                <strong>{ratePerQuintal > 0 ? formatINR(ratePerQuintal) : "-"}</strong>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            No save required. Evaluates instantly.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
