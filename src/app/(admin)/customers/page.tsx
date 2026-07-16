"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  CheckCircle,
  MoreHorizontal,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "Active" | "Pending" | "Suspended";
  billingPlan: string;
  totalPaid: number;
  joinedDate: string;
}

const mockCustomers: CustomerItem[] = [];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    }
    return headers;
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/users?role=STUDENT&limit=100", {
        headers: getHeaders(),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load customers from database");
      }

      // Map dynamic backend student users (enrolled leads) as dynamic Customers
      const dbCustomers: CustomerItem[] = data.data.data.map((u: any) => ({
        id: u.id,
        name: u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Enrolled Customer",
        email: u.email,
        phone: u.phone || "Not provided",
        status: "Active",
        billingPlan: "Registered (Awaiting Plan Setup)",
        totalPaid: 0,
        joinedDate: new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      }));

      // Combine with mock customers for premium initial preview
      setCustomers([...dbCustomers, ...mockCustomers]);
    } catch (err: any) {
      console.error(err);
      setCustomers(mockCustomers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.billingPlan.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-2.5">
            <Users className="w-8 h-8 text-[#7c5cfc]" />
            Customers & Accounts
          </h1>
          <p className="text-white/45 text-sm max-w-md">
            Review billing accounts, active payment programs, and overall customer enrollment records.
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-sm font-semibold transition-all shadow-lg"
        >
          <ArrowUpRight className="w-4 h-4" />
          EXPORT REVENUE
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Search customers by name, email, billing plan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b27] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5
              text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto">
          <Filter className="w-4 h-4 text-white/30 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#161b27] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white/70
              focus:outline-none focus:border-[#7c5cfc] transition-all"
          >
            <option value="All">All Customer Statuses</option>
            <option value="Active">Active Accounts</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading billing accounts...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20 bg-[#161b27] border border-white/[0.07] rounded-2xl">
          <Users className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 font-medium">No customers found.</p>
        </div>
      ) : (
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold text-white/35 uppercase tracking-wider">
                <th className="px-6 py-4">Account Holder</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment Plan</th>
                <th className="px-6 py-4">Total Paid</th>
                <th className="px-6 py-4">Enrolled On</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7c5cfc]/20 to-[#00d4aa]/25
                        flex items-center justify-center text-white text-xs font-bold shrink-0 border border-[#7c5cfc]/20">
                        {customer.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-xs font-semibold text-white">
                        {customer.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-white/60 flex items-center gap-1.5 font-medium">
                        <Mail className="w-3.5 h-3.5 text-white/30" /> {customer.email}
                      </span>
                      {customer.phone && (
                        <span className="text-[10px] text-white/40 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-white/20" /> {customer.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                      customer.status === "Active"
                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : customer.status === "Suspended"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-white/65 flex items-center gap-1.5 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-white/30" />
                      {customer.billingPlan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-white flex items-center">
                      <DollarSign className="w-3.5 h-3.5 text-[#00d4aa]" />
                      {customer.totalPaid.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] text-white/35 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-white/20" />
                      {customer.joinedDate}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-white/25 hover:text-white/60 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
