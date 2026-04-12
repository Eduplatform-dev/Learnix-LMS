import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { CreditCard, DollarSign, Download, Calendar, CheckCircle, AlertCircle, Receipt } from "lucide-react";
import { getMyFees, markFeePaid, type Fee, type MyFeesResponse } from "../../../services/feeService";
import { generateFeeReceipt } from "../../../utils/feeReceiptGenerator";

const statusColor = (s: string) => {
  if (s === "paid")    return "bg-green-100 text-green-700";
  if (s === "pending") return "bg-amber-100 text-amber-700";
  if (s === "overdue") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
};

export function Fees() {
  const [data,     setData]     = useState<MyFeesResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error,    setError]    = useState("");

  const userData = localStorage.getItem("user");
  const userName = userData ? JSON.parse(userData).username : undefined;

  useEffect(() => {
    getMyFees()
      .then(setData)
      .catch(() => setError("Failed to load fee data."))
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async (fee: Fee) => {
    if (payingId) return;
    setPayingId(fee._id);
    try {
      const updated = await markFeePaid(fee._id);
      setData((prev) => {
        if (!prev) return prev;
        const fees        = prev.fees.map((f) => f._id === updated._id ? updated : f);
        const totalPaid   = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
        const totalPending = fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0);
        return { fees, totalPaid, totalPending, nextFee: fees.find((f) => f.status === "pending") ?? null };
      });
    } catch {
      setError("Payment failed. Please try again.");
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (error && !data) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-500 text-sm mt-1">No fee records found. Contact your administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fees     = data?.fees ?? [];
  const upcoming = fees.filter((f) => f.status === "pending" || f.status === "overdue");
  const history  = fees.filter((f) => f.status === "paid");

  return (
    <div className="space-y-6">

      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">${(data?.totalPending ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{upcoming.length} pending payment{upcoming.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Total Paid</p>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">${(data?.totalPaid ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{history.length} payment{history.length !== 1 ? "s" : ""} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Next Due</p>
              <Calendar className="w-5 h-5 text-indigo-500" />
            </div>
            {data?.nextFee ? (
              <>
                <p className="text-3xl font-bold text-gray-900">${data.nextFee.amount.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">Due: {new Date(data.nextFee.dueDate).toLocaleDateString()}</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-green-600 mt-1">All clear! 🎉</p>
                <p className="text-xs text-gray-400 mt-1">No upcoming payments</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending payments */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4"><CardTitle>Upcoming Payments</CardTitle></CardHeader>
          <CardContent className="p-5 space-y-3">
            {upcoming.map((fee) => (
              <div key={fee._id}
                className={`flex items-center justify-between p-4 rounded-xl border ${fee.status === "overdue" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                <div>
                  <p className="font-medium text-gray-900">{fee.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>Due: {new Date(fee.dueDate).toLocaleDateString()}</span>
                    {fee.semester && <span className="text-gray-400">· {fee.semester}</span>}
                    <Badge className={`text-xs ${statusColor(fee.status)}`}>{fee.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold text-gray-900">${fee.amount.toFixed(2)}</p>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => handlePay(fee)} disabled={payingId === fee._id}>
                    {payingId === fee._id ? "Processing..." : "Pay Now"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fee breakdown */}
      {fees.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4"><CardTitle>Fee Breakdown</CardTitle></CardHeader>
          <CardContent className="p-5 space-y-4">
            {fees.map((fee, i) => (
              <div key={fee._id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{fee.description}</p>
                    <p className="text-xs text-gray-400 capitalize">{fee.category}</p>
                  </div>
                  <p className="font-semibold text-gray-900">${fee.amount.toFixed(2)}</p>
                </div>
                {i < fees.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <p className="font-semibold text-gray-900">Total</p>
              <p className="text-2xl font-bold text-gray-900">${fees.reduce((s, f) => s + f.amount, 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History with receipt download */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4"><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Description", "Paid On", "Amount", "Status", "Invoice", "Receipt"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((fee) => (
                    <tr key={fee._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{fee.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">${fee.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${statusColor(fee.status)}`}>
                          <CheckCircle className="w-3 h-3" />{fee.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{fee.invoice || "—"}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                          onClick={() => generateFeeReceipt(fee, userName)}>
                          <Receipt className="w-3.5 h-3.5" />Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {fees.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No fee records found.</p>
            <p className="text-gray-300 text-sm mt-1">Contact your administrator if you believe this is an error.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
