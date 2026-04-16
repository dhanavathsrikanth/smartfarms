"use client";

import React from "react";
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet
} from "@react-pdf/renderer";

// Register custom fonts for a premium look if needed
// For now, using standard PDF fonts for maximum compatibility

const colors = {
  primary: "#1C4E35",      // Brand Green
  secondary: "#D4840A",    // Brand Accent
  background: "#F7F0E3",   // Cream
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
  success: "#10B981",
  danger: "#EF4444",
  divider: "#E5E7EB"
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.text,
    backgroundColor: colors.white
  },
  
  // --- LAYOUT ---
  section: {
    marginBottom: 20
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginVertical: 10
  },
  brandDivider: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginVertical: 15
  },

  // --- TYPOGRAPHY ---
  h1: { fontSize: 28, fontWeight: "bold", color: colors.primary },
  h2: { fontSize: 18, fontWeight: "bold", color: colors.primary, marginBottom: 8 },
  h3: { fontSize: 14, fontWeight: "bold", color: colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 12, color: colors.muted, marginBottom: 20 },
  label: { fontSize: 9, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 },
  bold: { fontWeight: "bold" },
  
  // --- TABLES ---
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    color: colors.white,
    padding: 6,
    fontWeight: "bold"
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    padding: 6
  },
  tableRowAlternate: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    padding: 6
  },
  tableCell: { flex: 1 },
  tableCellRight: { flex: 1, textAlign: "right" },
  
  // --- CARDS/WIDGETS ---
  statCard: {
    flex: 1,
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 6,
    textAlign: "center"
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
    color: colors.primary
  },
  
  // --- FOOTER ---
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 10,
    fontSize: 8,
    color: colors.muted
  }
});

interface FinancialReportProps {
  data: any; // The payload from generateFullFinancialReport
}

const formatCurrency = (val: number) => {
  return "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export function FinancialReportPDF({ data }: FinancialReportProps) {
  if (!data) return null;

  const { 
    reportMeta, 
    executive_summary, 
    income_statement, 
    crop_performance,
    expense_breakdown,
    sales_breakdown,
    year_over_year,
    farm_breakdown
  } = data;

  return (
    <Document title={`Report_${reportMeta.period}_${reportMeta.farmerName}`}>
      
      {/* --- PAGE 1: COVER PAGE --- */}
      <Page size="A4" style={[styles.page, { justifyContent: "center" }]}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 32, fontWeight: "heavy", color: colors.primary, marginBottom: 10 }}>KHETSMART</Text>
          <Text style={{ fontSize: 10, color: colors.secondary, letterSpacing: 4, marginBottom: 50 }}>SMART FARMING ANALYTICS</Text>
          
          <View style={styles.brandDivider} />
          
          <Text style={styles.h1}>Annual Financial Report</Text>
          <Text style={[styles.subtitle, { fontSize: 16, marginTop: 10 }]}>{reportMeta.period}</Text>
          
          <View style={{ marginTop: 60, alignItems: "center" }}>
             <Text style={styles.label}>Prepared For</Text>
             <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 5 }}>{reportMeta.farmerName}</Text>
             <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{reportMeta.farmName}</Text>
          </View>
          
          <View style={{ marginTop: 100, width: "80%" }}>
             <View style={styles.grid}>
                <View style={styles.statCard}>
                   <Text style={styles.label}>Revenue</Text>
                   <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(executive_summary.totalRevenue)}</Text>
                </View>
                <View style={styles.statCard}>
                   <Text style={styles.label}>Expenses</Text>
                   <Text style={[styles.statValue, { color: colors.danger }]}>{formatCurrency(executive_summary.totalExpenses)}</Text>
                </View>
             </View>
             <View style={styles.grid}>
                <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
                   <Text style={[styles.label, { color: colors.background }]}>Net Profit</Text>
                   <Text style={[styles.statValue, { color: colors.white }]}>{formatCurrency(executive_summary.totalProfit)}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftWidth: 1, borderLeftColor: colors.divider }]}>
                   <Text style={styles.label}>ROI</Text>
                   <Text style={styles.statValue}>{executive_summary.roiPercent.toFixed(1)}%</Text>
                </View>
             </View>
          </View>
          
          <Text style={{ position: "absolute", bottom: 0, fontSize: 8, color: colors.muted }}>
             Generated on {new Date(reportMeta.generatedAt).toLocaleDateString()}
          </Text>
        </View>
      </Page>

      {/* --- PAGE 2: EXECUTIVE SUMMARY --- */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
           <Text style={styles.h3}>Executive Summary</Text>
           <Text style={[styles.label, { fontSize: 7 }]}>{reportMeta.period} Portfolio</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Performance at a Glance</Text>
          <Text style={{ lineHeight: 1.6, marginBottom: 15 }}>
            In {year_over_year ? year_over_year.currentYear.year : "this period"}, your farm generated {formatCurrency(executive_summary.totalRevenue)} in revenue from
            {" "}{executive_summary.totalCrops} crop cycles. Net profit was {formatCurrency(executive_summary.totalProfit)} with a 
            {" "}{executive_summary.profitMarginPercent.toFixed(1)}% profit margin. 
            {year_over_year && (
               ` This represents a ${Math.abs(year_over_year.changes.profitChange).toFixed(1)}% ${year_over_year.changes.profitChange >= 0 ? "increase" : "decrease"} in net profitability compared to the previous year.`
            )}
          </Text>
        </View>

        <View style={styles.grid}>
           <View style={[styles.statCard, { backgroundColor: "#F0F9FF" }]}>
              <Text style={[styles.label, { color: "#0369A1" }]}>Best Performer</Text>
              <Text style={[styles.statValue, { color: "#0369A1" }]}>{executive_summary.bestCrop}</Text>
           </View>
           <View style={[styles.statCard, { backgroundColor: "#FFF1F2" }]}>
              <Text style={[styles.label, { color: "#BE123C" }]}>Lowest Performer</Text>
              <Text style={[styles.statValue, { color: "#BE123C" }]}>{executive_summary.worstCrop}</Text>
           </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.h3, { marginTop: 20 }]}>Key Ratios</Text>
          <View style={styles.table}>
             <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Return on Investment (ROI)</Text>
                <Text style={styles.tableCellRight}>{executive_summary.roiPercent.toFixed(2)}%</Text>
             </View>
             <View style={styles.tableRowAlternate}>
                <Text style={styles.tableCell}>Net Profit Margin</Text>
                <Text style={styles.tableCellRight}>{executive_summary.profitMarginPercent.toFixed(2)}%</Text>
             </View>
             <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Operational Efficiency</Text>
                <Text style={styles.tableCellRight}>{(executive_summary.totalRevenue / (executive_summary.totalExpenses || 1)).toFixed(2)}x</Text>
             </View>
             <View style={styles.tableRowAlternate}>
                <Text style={styles.tableCell}>Profitable Cycles</Text>
                <Text style={styles.tableCellRight}>{executive_summary.profitableCrops} of {executive_summary.totalCrops}</Text>
             </View>
          </View>
        </View>

        <View style={styles.footer}>
           <Text>KhetSmart — Confidential Farm Financial Report</Text>
           <Text>Page 2</Text>
        </View>
      </Page>

      {/* --- PAGE 3: INCOME STATEMENT --- */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
           <Text style={styles.h3}>Detailed Income Statement</Text>
           <Text style={styles.label}>{reportMeta.period}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { marginBottom: 10, fontWeight: "bold", color: colors.primary }]}>REVENUE</Text>
          <View style={styles.table}>
             {Object.entries(income_statement.revenue.bySaleType).map(([type, amount]: any, i) => (
                <View key={type} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
                   <Text style={[styles.tableCell, { textTransform: "capitalize" }]}>{type} Sales</Text>
                   <Text style={styles.tableCellRight}>{formatCurrency(amount)}</Text>
                </View>
             ))}
             <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: colors.primary, marginTop: 5 }]}>
                <Text style={[styles.tableCell, styles.bold]}>TOTAL REVENUE</Text>
                <Text style={[styles.tableCellRight, styles.bold]}>{formatCurrency(income_statement.revenue.total)}</Text>
             </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { marginBottom: 10, marginTop: 20, fontWeight: "bold", color: colors.danger }]}>EXPENSES</Text>
          <View style={styles.table}>
             {Object.entries(income_statement.expenses.byCategory).map(([cat, stats]: any, i) => (
                <View key={cat} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
                   <Text style={[styles.tableCell, { textTransform: "capitalize" }]}>{cat}</Text>
                   <Text style={styles.tableCellRight}>{formatCurrency(stats.total)}</Text>
                </View>
             ))}
             <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: colors.danger, marginTop: 5 }]}>
                <Text style={[styles.tableCell, styles.bold]}>TOTAL EXPENSES</Text>
                <Text style={[styles.tableCellRight, styles.bold]}>{formatCurrency(income_statement.expenses.total)}</Text>
             </View>
          </View>
        </View>

        <View style={styles.section}>
           <View style={[styles.brandDivider, { marginTop: 40 }]} />
           <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>GROSS PROFIT</Text>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primary }}>{formatCurrency(income_statement.netProfit)}</Text>
           </View>
           <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 }}>
              <Text style={{ color: colors.muted }}>Net Margin Percentage</Text>
              <Text style={{ fontWeight: "bold" }}>{executive_summary.profitMarginPercent.toFixed(1)}%</Text>
           </View>
        </View>

        <View style={styles.footer}>
           <Text>KhetSmart — Confidential Farm Financial Report</Text>
           <Text>Page 3</Text>
        </View>
      </Page>

      {/* --- PAGE 4: CROP PERFORMANCE --- */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
           <Text style={styles.h3}>Crop Performance Analysis</Text>
           <Text style={styles.label}>Sorted by Profitability</Text>
        </View>

        <View style={styles.table}>
           <View style={styles.tableHeader}>
              <Text style={{ flex: 1.5 }}>Crop</Text>
              <Text style={styles.tableCell}>Area</Text>
              <Text style={styles.tableCell}>Expenses</Text>
              <Text style={styles.tableCell}>Revenue</Text>
              <Text style={styles.tableCellRight}>Profit</Text>
              <Text style={{ flex: 0.5, textAlign: "right" }}>%</Text>
           </View>
           {crop_performance.map((p: any, i: number) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
                 <Text style={{ flex: 1.5, fontWeight: i === 0 ? "bold" : "normal" }}>{p.cropName}</Text>
                 <Text style={styles.tableCell}>{p.area} Ac</Text>
                 <Text style={styles.tableCell}>{formatCurrency(p.expenses)}</Text>
                 <Text style={styles.tableCell}>{formatCurrency(p.revenue)}</Text>
                 <Text style={[styles.tableCellRight, { color: p.profit >= 0 ? colors.success : colors.danger }]}>
                    {formatCurrency(p.profit)}
                 </Text>
                 <Text style={{ flex: 0.5, textAlign: "right", fontSize: 8 }}>{p.margin.toFixed(0)}%</Text>
              </View>
           ))}
        </View>

        <View style={styles.footer}>
           <Text>KhetSmart — Confidential Farm Financial Report</Text>
           <Text>Page 4</Text>
        </View>
      </Page>

      {/* --- PAGE 5: SALES & COLLECTIONS --- */}
      <Page size="A4" style={styles.page}>
         <View style={styles.headerRow}>
            <Text style={styles.h3}>Sales & Buyer Analysis</Text>
            <Text style={styles.label}>Transaction Overview</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.h2}>Top Buyers</Text>
            <View style={styles.table}>
               <View style={styles.tableHeader}>
                  <Text style={{ flex: 2 }}>Buyer Name</Text>
                  <Text style={styles.tableCell}>Qty Cycles</Text>
                  <Text style={styles.tableCell}>Last Status</Text>
                  <Text style={styles.tableCellRight}>Total Volume</Text>
               </View>
               {sales_breakdown.byBuyer.slice(0, 10).map((b: any, i: number) => (
                  <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
                     <Text style={{ flex: 2 }}>{b.buyerName}</Text>
                     <Text style={styles.tableCell}>{b.count}</Text>
                     <Text style={[styles.tableCell, { textTransform: "capitalize" }]}>{b.status}</Text>
                     <Text style={styles.tableCellRight}>{formatCurrency(b.total)}</Text>
                  </View>
               ))}
            </View>
         </View>

         {sales_breakdown.pendingCollections.length > 0 && (
            <View style={[styles.section, { backgroundColor: "#FFFBEB", padding: 15, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: colors.secondary }]}>
               <Text style={[styles.h3, { color: "#92400E" }]}>⚠️ Pending Collections</Text>
               <View style={[styles.table, { borderBottomColor: "#FDE68A" }]}>
                  {sales_breakdown.pendingCollections.map((pc: any, i: number) => (
                     <View key={i} style={styles.tableRow}>
                        <Text style={{ flex: 1.5 }}>{pc.buyerName}</Text>
                        <Text style={styles.tableCell}>{pc.crop}</Text>
                        <Text style={styles.tableCell}>{pc.date}</Text>
                        <Text style={[styles.tableCellRight, { fontWeight: "bold" }]}>{formatCurrency(pc.amount)}</Text>
                     </View>
                  ))}
               </View>
               <Text style={{ fontSize: 8, marginTop: 10, color: "#92400E" }}>Total outstanding: {formatCurrency(sales_breakdown.pendingCollections.reduce((s: any, p: any) => s + p.amount, 0))}</Text>
            </View>
         )}

         <View style={styles.footer}>
           <Text>KhetSmart — Confidential Farm Financial Report</Text>
           <Text>Page 5</Text>
        </View>
      </Page>

      {/* --- PAGE 6: EXPENSE & MONTHLY --- */}
      <Page size="A4" style={styles.page}>
         <View style={styles.headerRow}>
            <Text style={styles.h3}>Expense & Cash Flow</Text>
            <Text style={styles.label}>Operational Insights</Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.h2}>Cost Breakdown</Text>
            <View style={styles.table}>
               <View style={styles.tableHeader}>
                  <Text style={{ flex: 2 }}>Category</Text>
                  <Text style={styles.tableCell}>Count</Text>
                  <Text style={styles.tableCell}>Share (%)</Text>
                  <Text style={styles.tableCellRight}>Total Amount</Text>
               </View>
               {expense_breakdown.map((e: any, i: number) => (
                  <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
                     <Text style={{ flex: 2, textTransform: "capitalize" }}>{e.category}</Text>
                     <Text style={styles.tableCell}>{e.count}</Text>
                     <Text style={styles.tableCell}>{e.percentage.toFixed(1)}%</Text>
                     <Text style={styles.tableCellRight}>{formatCurrency(e.total)}</Text>
                  </View>
               ))}
            </View>
         </View>

         <View style={styles.section}>
            <Text style={styles.h2}>Monthly Cash Flow</Text>
            <View style={styles.table}>
               <View style={styles.tableHeader}>
                  <Text style={styles.tableCell}>Month</Text>
                  <Text style={styles.tableCellRight}>Revenue</Text>
                  <Text style={styles.tableCellRight}>Expenses</Text>
                  <Text style={styles.tableCellRight}>Net Flow</Text>
               </View>
               {Object.entries(income_statement.revenue.byMonth).map(([m, rev]: any, i) => {
                  const exp = income_statement.expenses.byMonth[m];
                  const flow = rev - exp;
                  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m) - 1];
                  return (
                     <View key={m} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
                        <Text style={styles.tableCell}>{monthName}</Text>
                        <Text style={styles.tableCellRight}>{formatCurrency(rev)}</Text>
                        <Text style={styles.tableCellRight}>{formatCurrency(exp)}</Text>
                        <Text style={[styles.tableCellRight, { color: flow >= 0 ? colors.success : colors.danger }]}>{formatCurrency(flow)}</Text>
                     </View>
                  );
               })}
            </View>
         </View>

         <View style={styles.footer}>
           <Text>KhetSmart — Confidential Farm Financial Report</Text>
           <Text>Page 6</Text>
        </View>
      </Page>

      {/* --- PAGE 7: YEAR OVER YEAR --- */}
      {year_over_year && (
         <Page size="A4" style={styles.page}>
            <View style={styles.headerRow}>
               <Text style={styles.h3}>Year-over-Year Progression</Text>
               <Text style={styles.label}>Comparative Analysis</Text>
            </View>

            <View style={{ marginTop: 40 }}>
               <View style={styles.tableHeader}>
                  <Text style={{ flex: 1.5 }}>Key Quantitative Metrics</Text>
                  <Text style={styles.tableCellRight}>Last Year</Text>
                  <Text style={styles.tableCellRight}>This Year</Text>
                  <Text style={styles.tableCellRight}>Change (%)</Text>
               </View>
               <View style={styles.tableRow}>
                  <Text style={{ flex: 1.5 }}>Gross Revenue</Text>
                  <Text style={styles.tableCellRight}>{formatCurrency(year_over_year.previousYear.totalRevenue)}</Text>
                  <Text style={styles.tableCellRight}>{formatCurrency(year_over_year.currentYear.totalRevenue)}</Text>
                  <Text style={[styles.tableCellRight, { color: year_over_year.changes.revenueChange >= 0 ? colors.success : colors.danger }]}>
                     {year_over_year.changes.revenueChange.toFixed(1)}%
                  </Text>
               </View>
               <View style={styles.tableRowAlternate}>
                  <Text style={{ flex: 1.5 }}>Operational Expenses</Text>
                  <Text style={styles.tableCellRight}>{formatCurrency(year_over_year.previousYear.totalExpenses)}</Text>
                  <Text style={styles.tableCellRight}>{formatCurrency(year_over_year.currentYear.totalExpenses)}</Text>
                  <Text style={[styles.tableCellRight, { color: year_over_year.changes.expenseChange <= 0 ? colors.success : colors.danger }]}>
                     {year_over_year.changes.expenseChange.toFixed(1)}%
                  </Text>
               </View>
               <View style={styles.tableRow}>
                  <Text style={{ flex: 1.5, fontWeight: "bold" }}>Net Profit</Text>
                  <Text style={styles.tableCellRight}>{formatCurrency(year_over_year.previousYear.totalProfit)}</Text>
                  <Text style={styles.tableCellRight}>{formatCurrency(year_over_year.currentYear.totalProfit)}</Text>
                  <Text style={[styles.tableCellRight, { color: year_over_year.changes.profitChange >= 0 ? colors.success : colors.danger, fontWeight: "bold" }]}>
                     {year_over_year.changes.profitChange.toFixed(1)}%
                  </Text>
               </View>
            </View>
            
            <View style={{ marginTop: 100, alignItems: "center", borderStyle: "dashed", borderColor: colors.primary, borderWidth: 1, padding: 30, borderRadius: 10 }}>
               <Text style={styles.h2}>Report End</Text>
               <Text style={{ color: colors.muted, marginTop: 10 }}>Thank you for using KhetSmart Analytics for your farm business management.</Text>
            </View>

            <View style={styles.footer}>
              <Text>KhetSmart — Confidential Farm Financial Report</Text>
              <Text>Page 7</Text>
           </View>
         </Page>
      )}

    </Document>
  );
}
