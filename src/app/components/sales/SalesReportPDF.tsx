"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink 
} from '@react-pdf/renderer';
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useState, useEffect } from "react";

// PDF Styles
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#333" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1.5 solid #1C4E35", paddingBottom: 10, marginBottom: 20 },
  headerLeft: {},
  title: { fontSize: 24, fontWeight: "bold", color: "#1C4E35" },
  subtitle: { fontSize: 11, color: "#666", marginTop: 4 },
  headerRight: { textAlign: "right" },
  logoText: { fontSize: 16, fontWeight: "bold", color: "#1C4E35" },
  
  summaryBox: { flexDirection: "row", padding: 15, backgroundColor: "#f0fdf4", borderRadius: 4, marginBottom: 20 },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 8, color: "#166534", textTransform: "uppercase", marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: "bold", color: "#14532d" },

  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#1C4E35", marginBottom: 8, marginTop: 16, borderBottom: "1 solid #e5e7eb", paddingBottom: 4 },
  
  table: { width: "auto", borderStyle: "solid", borderWidth: 1, borderColor: "#e5e7eb", borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableColHeader: { width: "12.5%", borderStyle: "solid", borderBottomWidth: 1, borderRightWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", padding: 5 },
  tableCol: { width: "12.5%", borderStyle: "solid", borderBottomWidth: 1, borderRightWidth: 1, borderColor: "#e5e7eb", padding: 5 },
  tableColWideHeader: { width: "25%", borderStyle: "solid", borderBottomWidth: 1, borderRightWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", padding: 5 },
  tableColWide: { width: "25%", borderStyle: "solid", borderBottomWidth: 1, borderRightWidth: 1, borderColor: "#e5e7eb", padding: 5 },
  tableCellHeader: { margin: "auto", marginTop: 3, fontSize: 9, fontWeight: "bold" },
  tableCell: { margin: "auto", marginTop: 3, fontSize: 8 },
  
  tableCellPending: { margin: "auto", marginTop: 3, fontSize: 8, color: "#b45309", fontWeight: "bold" },
  
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: 'grey', fontSize: 8, borderTop: "1 solid #e5e7eb", pt: 10 },
});

// Format currency for PDF
const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString()}`;

// PDF Document Component
const ReportDocument = ({ data }: { data: any }) => (
  <Document>
    {/* Page 1: Summary & Sales List */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>Period: {data.period}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.logoText}>KhetSmart</Text>
          <Text style={styles.subtitle}>Generated: {new Date(data.generatedAt).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.summaryBox}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>{formatCurrency(data.summary.totalRevenue)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending Amount</Text>
          <Text style={styles.summaryValue}>{formatCurrency(data.summary.pendingAmount)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Weight Sold</Text>
          <Text style={styles.summaryValue}>{data.summary.totalWeight.toLocaleString()} kg</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={styles.summaryValue}>{data.summary.saleCount}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Detailed Transactions</Text>
      
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Date</Text></View>
          <View style={styles.tableColWideHeader}><Text style={styles.tableCellHeader}>Crop</Text></View>
          <View style={styles.tableColWideHeader}><Text style={styles.tableCellHeader}>Buyer</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Weight</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Rate</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Amount</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Status</Text></View>
        </View>
        
        {data.sales.map((sale: any, i: number) => (
          <View style={styles.tableRow} key={i}>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{sale.date}</Text></View>
            <View style={styles.tableColWide}>
              <Text style={styles.tableCell}>{sale.cropName}</Text>
            </View>
            <View style={styles.tableColWide}><Text style={styles.tableCell}>{sale.buyerName}</Text></View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{sale.weight} {sale.weightUnit}</Text>
            </View>
            <View style={styles.tableCol}>
               <Text style={styles.tableCell}>{sale.ratePerUnit}</Text>
            </View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(sale.totalAmount)}</Text></View>
            <View style={styles.tableCol}>
              <Text style={sale.paymentStatus === "pending" || sale.paymentStatus === "partial" ? styles.tableCellPending : styles.tableCell}>
                {sale.paymentStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
        `KhetSmart Verified Report — Page ${pageNumber} of ${totalPages}`
      )} fixed />
    </Page>

    {/* Page 2: Buyer & Monthly Summaries */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Buyer Summary</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={{ ...styles.tableColWideHeader, width: "50%" }}><Text style={styles.tableCellHeader}>Buyer Name</Text></View>
          <View style={{ ...styles.tableColHeader, width: "25%" }}><Text style={styles.tableCellHeader}>Transactions</Text></View>
          <View style={{ ...styles.tableColHeader, width: "25%" }}><Text style={styles.tableCellHeader}>Total Paid/Pending</Text></View>
        </View>
        {data.buyerSummary.map((b: any, i: number) => (
          <View style={styles.tableRow} key={i}>
             <View style={{ ...styles.tableColWide, width: "50%" }}><Text style={styles.tableCell}>{b.buyerName}</Text></View>
             <View style={{ ...styles.tableCol, width: "25%" }}><Text style={styles.tableCell}>{b.count}</Text></View>
             <View style={{ ...styles.tableCol, width: "25%" }}><Text style={styles.tableCell}>{formatCurrency(b.totalAmount)}</Text></View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Monthly Revenue Breakdown</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={{ ...styles.tableColWideHeader, width: "50%" }}><Text style={styles.tableCellHeader}>Month</Text></View>
          <View style={{ ...styles.tableColHeader, width: "50%" }}><Text style={styles.tableCellHeader}>Revenue</Text></View>
        </View>
        {data.monthlyBreakdown.map((m: any, i: number) => (
          <View style={styles.tableRow} key={i}>
             <View style={{ ...styles.tableColWide, width: "50%" }}><Text style={styles.tableCell}>{m.month}</Text></View>
             <View style={{ ...styles.tableCol, width: "50%" }}><Text style={styles.tableCell}>{formatCurrency(m.revenue)}</Text></View>
          </View>
        ))}
      </View>

      <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
        `KhetSmart Verified Report — Page ${pageNumber} of ${totalPages}`
      )} fixed />
    </Page>
  </Document>
);

interface SalesReportPDFProps {
  farmId?: Id<"farms">;
  year?: number;
}

export function SalesReportPDFButton({ farmId, year }: SalesReportPDFProps) {
  const [isClient, setIsClient] = useState(false);
  const reportData = useQuery(api.sales.generateSalesReport, { farmId, year });

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Button variant="outline" className="gap-2 h-10" disabled>
        <FileText className="h-4 w-4" />
        Preparing PDF...
      </Button>
    );
  }

  if (reportData === undefined) {
      return (
         <Button variant="outline" className="gap-2 h-10" disabled>
           <FileText className="h-4 w-4 animate-pulse" />
           Loading Data...
         </Button>
      );
  }

  return (
    <PDFDownloadLink document={<ReportDocument data={reportData} />} fileName={`KhetSmart_Sales_Report_${year || 'AllTime'}.pdf`}>
      {({ blob, url, loading, error }) => (
        <Button variant="outline" className={`gap-2 h-10 font-bold ${loading ? 'opacity-50' : ''}`} disabled={loading}>
          {loading ? (
             <>
               <FileText className="h-4 w-4 animate-pulse" />
               Generating PDF...
             </>
          ) : (
             <>
               <Download className="h-4 w-4 text-emerald-600" />
               Download PDF
             </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
