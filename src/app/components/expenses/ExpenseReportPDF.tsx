/**
 * ExpenseReportPDF.tsx
 *
 * Client-only component — must be loaded with dynamic(..., { ssr: false }).
 * Rendered via @react-pdf/renderer.
 */
"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Font,
} from "@react-pdf/renderer";
import { Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND_GREEN = "#1C4E35";
const BRAND_GOLD = "#D4840A";
const BRAND_CREAM = "#F7F0E3";
const ZEBRA_GRAY = "#F9F9F7";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type ReportData = {
  title: string;
  generatedAt: string;
  period: string;
  summary: {
    totalAmount: number;
    count: number;
    byCategory: Record<string, { total: number; count: number }>;
  };
  expenses: Array<{
    _id: string;
    date: string;
    category: string;
    cropName: string;
    farmName: string;
    supplier?: string;
    notes?: string;
    amount: number;
  }>;
  charts: {
    categoryBreakdown: Array<{
      category: string;
      total: number;
      count: number;
      pct: string;
    }>;
    monthlyTrend: Array<{ month: string; total: number }>;
  };
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1a1a1a",
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 36,
    backgroundColor: "#ffffff",
  },

  // Header band
  headerBand: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandName: { color: "#ffffff", fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  brandTagline: { color: "rgba(255,255,255,0.65)", fontSize: 8, marginTop: 2 },
  reportTitle: { color: "#ffffff", fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  reportSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 8, textAlign: "right", marginTop: 4 },

  // Summary box on cover
  summaryBox: {
    backgroundColor: BRAND_CREAM,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderColor: "#e8dcc8",
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryItem: { flex: 1, minWidth: "120pt" },
  summaryLabel: { fontSize: 7, color: "#6b6b6b", fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  summaryValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BRAND_GREEN },

  // Section header
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_GREEN,
    borderBottomColor: BRAND_GREEN,
    borderBottomWidth: 1.5,
    paddingBottom: 4,
    marginBottom: 10,
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Month group header
  monthHeader: {
    backgroundColor: BRAND_GREEN,
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    padding: "5 8",
    marginBottom: 2,
    borderRadius: 3,
  },

  // Table
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 2,
    alignItems: "flex-start",
  },
  tableHeader: {
    backgroundColor: BRAND_GREEN,
    color: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 2,
    flexDirection: "row",
  },
  colDate: { width: "12%", fontSize: 8 },
  colCat: { width: "13%", fontSize: 8 },
  colCrop: { width: "18%", fontSize: 8 },
  colSupplier: { width: "15%", fontSize: 8 },
  colNotes: { width: "27%", fontSize: 8 },
  colAmt: { width: "15%", fontSize: 8, textAlign: "right" },

  subtotalRow: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 2,
    marginBottom: 6,
    borderRadius: 2,
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: BRAND_GREEN,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  totalLabel: { flex: 1, color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 9 },
  totalValue: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 9, textAlign: "right", width: "15%" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopColor: "#cccccc",
    borderTopWidth: 0.5,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#999999" },

  // Category table
  catTable: { marginBottom: 4 },
  catRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderRadius: 2 },
  catHeader: { flexDirection: "row", backgroundColor: BRAND_GREEN, color: "#fff", paddingVertical: 6, paddingHorizontal: 6, borderRadius: 4, marginBottom: 2 },
});

// ─── Document ────────────────────────────────────────────────────────────────

function ExpensePDF({ data }: { data: ReportData }) {
  // Group expenses by YYYY-MM
  const byMonth: Record<string, typeof data.expenses> = {};
  for (const e of data.expenses) {
    const key = e.date.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(e);
  }
  const monthKeys = Object.keys(byMonth).sort();

  return (
    <Document title={data.title} author="KhetSmart" creator="KhetSmart">
      {/* ── PAGE 1: COVER ── */}
      <Page size="A4" style={s.page}>
        {/* Header band */}
        <View style={s.headerBand}>
          <View>
            <Text style={s.brandName}>🌾 KhetSmart</Text>
            <Text style={s.brandTagline}>Smart Farm Management Platform</Text>
          </View>
          <View>
            <Text style={s.reportTitle}>{data.title}</Text>
            <Text style={s.reportSubtitle}>Period: {data.period}</Text>
            <Text style={s.reportSubtitle}>
              Generated: {fmtDate(data.generatedAt)}
            </Text>
          </View>
        </View>

        {/* Summary box */}
        <View style={s.summaryBox}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Total Expenses</Text>
            <Text style={s.summaryValue}>{fmtINR(data.summary.totalAmount)}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Total Entries</Text>
            <Text style={s.summaryValue}>{data.summary.count}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Categories Used</Text>
            <Text style={s.summaryValue}>{Object.keys(data.summary.byCategory).length}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Report Period</Text>
            <Text style={[s.summaryValue, { fontSize: 11 }]}>{data.period}</Text>
          </View>
        </View>

        {/* Category summary on cover */}
        <Text style={s.sectionTitle}>Category Summary</Text>
        <View style={s.catTable}>
          <View style={s.catHeader}>
            <Text style={{ ...s.colCat, color: "#fff", fontFamily: "Helvetica-Bold" }}>Category</Text>
            <Text style={{ width: "25%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8 }}>Total</Text>
            <Text style={{ width: "20%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8 }}>Entries</Text>
            <Text style={{ width: "20%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>Avg/Entry</Text>
            <Text style={{ width: "20%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>% of Total</Text>
          </View>
          {data.charts.categoryBreakdown
            .sort((a, b) => b.total - a.total)
            .map((cat, i) => (
              <View key={cat.category} style={[s.catRow, { backgroundColor: i % 2 === 0 ? "#fff" : ZEBRA_GRAY }]}>
                <Text style={{ ...s.colCat }}>{capitalize(cat.category)}</Text>
                <Text style={{ width: "25%", fontSize: 8 }}>{fmtINR(cat.total)}</Text>
                <Text style={{ width: "20%", fontSize: 8 }}>{cat.count}</Text>
                <Text style={{ width: "20%", fontSize: 8, textAlign: "right" }}>
                  {cat.count > 0 ? fmtINR(Math.round(cat.total / cat.count)) : "—"}
                </Text>
                <Text style={{ width: "20%", fontSize: 8, textAlign: "right" }}>{cat.pct}%</Text>
              </View>
            ))}
          {/* Grand total */}
          <View style={[s.totalRow]}>
            <Text style={{ ...s.totalLabel }}>Grand Total</Text>
            <Text style={{ width: "25%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9 }}>{fmtINR(data.summary.totalAmount)}</Text>
            <Text style={{ width: "20%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9 }}>{data.summary.count}</Text>
            <Text style={{ width: "20%", color: "#fff", fontSize: 9 }}></Text>
            <Text style={{ width: "20%", color: "#fff", fontSize: 9 }}>100%</Text>
          </View>
        </View>

        <Footer />
      </Page>

      {/* ── PAGE 2+: EXPENSE DETAILS (grouped by month) ── */}
      {monthKeys.map((monthKey) => {
        const rows = byMonth[monthKey];
        const monthTotal = rows.reduce((s, r) => s + r.amount, 0);
        const [yr, mo] = monthKey.split("-").map(Number);
        const monthLabel = new Date(yr, mo - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

        return (
          <Page key={monthKey} size="A4" style={s.page}>
            {/* Small header band */}
            <View style={[s.headerBand, { padding: 10, marginBottom: 14 }]}>
              <Text style={[s.brandName, { fontSize: 11 }]}>🌾 KhetSmart — {data.title}</Text>
              <Text style={[s.reportSubtitle, { marginTop: 0 }]}>Period: {data.period}</Text>
            </View>

            {/* Month group */}
            <Text style={s.monthHeader}>{monthLabel}</Text>

            {/* Table header */}
            <View style={s.tableHeader}>
              <Text style={[s.colDate, { color: "#fff", fontFamily: "Helvetica-Bold" }]}>Date</Text>
              <Text style={[s.colCat, { color: "#fff", fontFamily: "Helvetica-Bold" }]}>Category</Text>
              <Text style={[s.colCrop, { color: "#fff", fontFamily: "Helvetica-Bold" }]}>Crop</Text>
              <Text style={[s.colSupplier, { color: "#fff", fontFamily: "Helvetica-Bold" }]}>Supplier</Text>
              <Text style={[s.colNotes, { color: "#fff", fontFamily: "Helvetica-Bold" }]}>Notes</Text>
              <Text style={[s.colAmt, { color: "#fff", fontFamily: "Helvetica-Bold" }]}>Amount</Text>
            </View>

            {rows.map((exp, i) => (
              <View key={exp._id} style={[s.tableRow, { backgroundColor: i % 2 === 0 ? "#fff" : ZEBRA_GRAY }]}>
                <Text style={s.colDate}>{fmtDate(exp.date)}</Text>
                <Text style={s.colCat}>{capitalize(exp.category)}</Text>
                <Text style={s.colCrop}>{exp.cropName}</Text>
                <Text style={s.colSupplier}>{exp.supplier ?? "—"}</Text>
                <Text style={s.colNotes}>{exp.notes ?? ""}</Text>
                <Text style={[s.colAmt, { fontFamily: "Helvetica-Bold", color: "#c0392b" }]}>
                  {fmtINR(exp.amount)}
                </Text>
              </View>
            ))}

            {/* Month subtotal */}
            <View style={s.subtotalRow}>
              <Text style={{ flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1C4E35" }}>
                {monthLabel} Subtotal
              </Text>
              <Text style={{ width: "15%", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1C4E35", textAlign: "right" }}>
                {fmtINR(monthTotal)}
              </Text>
            </View>

            <Footer />
          </Page>
        );
      })}

      {/* ── FINAL PAGE: GRAND TOTAL ── */}
      <Page size="A4" style={s.page}>
        <View style={[s.headerBand, { padding: 10, marginBottom: 14 }]}>
          <Text style={[s.brandName, { fontSize: 11 }]}>🌾 KhetSmart — Expense Summary</Text>
          <Text style={s.reportSubtitle}>Period: {data.period}</Text>
        </View>

        <Text style={s.sectionTitle}>Monthly Trend</Text>
        {data.charts.monthlyTrend.map((m, i) => {
          const [yr, mo] = m.month.split("-").map(Number);
          const label = new Date(yr, mo - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
          const pct = data.summary.totalAmount > 0 ? (m.total / data.summary.totalAmount) * 100 : 0;
          return (
            <View key={m.month} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ width: "18%", fontSize: 8, color: "#555" }}>{label}</Text>
              <View style={{ flex: 1, backgroundColor: "#eee", borderRadius: 2, height: 8, marginHorizontal: 6 }}>
                <View style={{ backgroundColor: BRAND_GREEN, height: 8, borderRadius: 2, width: `${Math.min(100, pct)}%` }} />
              </View>
              <Text style={{ width: "18%", fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold", color: BRAND_GREEN }}>
                {fmtINR(m.total)}
              </Text>
            </View>
          );
        })}

        {/* Grand total */}
        <View style={[s.totalRow, { marginTop: 20 }]}>
          <Text style={s.totalLabel}>Grand Total — {data.period}</Text>
          <Text style={s.totalValue}>{fmtINR(data.summary.totalAmount)}</Text>
        </View>

        <Footer />
      </Page>
    </Document>
  );
}

function Footer() {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>Confidential — KhetSmart Farm Report</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

// ─── Download Button ──────────────────────────────────────────────────────────

interface Props {
  data: ReportData;
  fileName?: string;
}

export function ExpenseReportDownloadButton({ data, fileName = "KhetSmart-Expenses.pdf" }: Props) {
  return (
    <PDFDownloadLink
      document={<ExpensePDF data={data} />}
      fileName={fileName}
      style={{ textDecoration: "none" }}
    >
      {({ loading }) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-[#1C4E35] text-[#1C4E35] hover:bg-[#1C4E35]/10"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {loading ? "Preparing PDF…" : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
