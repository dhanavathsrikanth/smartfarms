"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Phone } from "lucide-react";
import { formatINR } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PaymentReminderProps {
  buyerName: string;
  amount: number;
  saleDetails?: {
    cropName: string;
    weightKg: string | number;
    date: string;
    farmerName?: string;
  };
  triggerText?: string;
  fullWidth?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export function PaymentReminder({
  buyerName,
  amount,
  saleDetails,
  triggerText = "Send Reminder",
  fullWidth = false,
  variant = "outline"
}: PaymentReminderProps) {
  const [open, setOpen] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [phoneSource, setPhoneSource] = useState<"directory" | "manual">("directory");

  // Fetch directory contact directly
  const directoryContact = useQuery(api.sales.getBuyerContactByName, { buyerName });

  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If we have a contact and the user hasn't actively opened the missing-contact dialog
    if (directoryContact && !open) {
      sendWhatsApp(directoryContact);
      return;
    }
    
    // Open dialog to ask for contact
    setOpen(true);
  };

  const submitDialog = () => {
    let targetPhone = "";
    if (phoneSource === "directory" && directoryContact) {
       targetPhone = directoryContact;
    } else {
       targetPhone = manualPhone;
    }

    if (!targetPhone) return;
    
    sendWhatsApp(targetPhone);
    setOpen(false);
  };

  const sendWhatsApp = (phoneStr: string) => {
    // Clean phone number
    const cleanPhone = phoneStr.replace(/\D/g, '');
    
    // Build Message
    let message = "";
    if (saleDetails) {
      const farmerLine = saleDetails.farmerName ? `- ${saleDetails.farmerName}` : "";
      message = `Namaste ${buyerName}! This is a reminder that your payment of ${formatINR(amount)} for ${saleDetails.weightKg}kg ${saleDetails.cropName} purchased on ${saleDetails.date} is still pending. Please arrange payment at your earliest convenience. ${farmerLine} (via KhetSmart)`;
    } else {
      message = `Hi ${buyerName}, your payment of ${formatINR(amount)} is pending. Please confirm. (via KhetSmart)`;
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  // Mask directory contact function: xxxxx 12345
  const getMaskedContact = (contact: string) => {
      const clean = contact.replace(/\D/g, '');
      if (clean.length <= 5) return "xxxxx";
      // mask all but last 5
      const maskedPart = "x".repeat(clean.length - 5);
      const visiblePart = clean.substring(clean.length - 5);
      return `${maskedPart} ${visiblePart}`;
  };

  return (
    <>
      <Button 
        variant={variant}
        size="sm"
        className={`gap-2 ${fullWidth ? 'w-full' : ''}`}
        onClick={handleSend}
      >
        <Send className="h-3.5 w-3.5" />
        {triggerText}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send WhatsApp Reminder</DialogTitle>
            <DialogDescription>
              We need a valid phone number to send the reminder to {buyerName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <RadioGroup value={phoneSource} onValueChange={(val) => val && setPhoneSource(val as any)} className="space-y-4">
              
              <div className={`flex items-center space-x-3 space-y-0 rounded-lg border p-4 transition-colors ${!directoryContact && 'opacity-50 pointer-events-none'}`}>
                <RadioGroupItem value="directory" id="r1" />
                <Label htmlFor="r1" className="flex-1 cursor-pointer">
                  <div className="font-bold">Use Directory Contact</div>
                  {directoryContact ? (
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-mono">
                      <Phone className="h-3 w-3" />
                      {getMaskedContact(directoryContact)}
                    </div>
                  ) : (
                    <div className="text-xs text-rose-500 mt-1 font-medium bg-rose-50 p-1 px-2 rounded w-fit">
                      Not found in directory
                    </div>
                  )}
                </Label>
              </div>

              <div className="flex flex-col space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="manual" id="r2" />
                  <Label htmlFor="r2" className="cursor-pointer font-bold">Add Manually</Label>
                </div>
                {phoneSource === "manual" && (
                  <div className="pl-7">
                    <Input 
                      placeholder="e.g. +91 9876543210" 
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      type="tel"
                      className="font-mono"
                    />
                  </div>
                )}
              </div>

            </RadioGroup>

            <Button 
              className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white gap-2 font-bold"
              onClick={submitDialog}
              disabled={(phoneSource === "directory" && !directoryContact) || (phoneSource === "manual" && manualPhone.length < 5)}
            >
              <Send className="h-4 w-4" />
              Open WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
