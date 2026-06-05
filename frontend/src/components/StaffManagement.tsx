import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  X,
  Info,
  ChevronRight,
  Activity,
  CheckCircle,
  AlertTriangle,
  User,
  Sparkles,
  Shield,
  Clock,
  UserCheck,
  UserX,
  Phone
} from "lucide-react";

// --- INTERFACES ---
interface StaffActivity {
  time: string;
  action: string;
}

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: "Store Manager" | "Billing Operator" | "Delivery Boy & Stock Helper" | "Accountant";
  status: "Online" | "Offline" | "Pending Approval";
  lastActive: string;
  joinDate: string;
  productivityScore: number;
  permissions: ("customers" | "suppliers" | "expenses" | "cashbook" | "reports" | "settings")[];
  activities: StaffActivity[];
}

// --- CONSTANTS & ROLE MAPPINGS ---
const PERMISSION_CATEGORIES = [
  { id: "customers", label: "Customer Management", description: "Credit allocation, payments reminders" },
  { id: "suppliers", label: "Supplier Management", description: "Log purchases, distributor repayments" },
  { id: "expenses", label: "Expenses", description: "Add and audit utility operating costs" },
  { id: "cashbook", label: "Cashbook & Drawer", description: "Audit cash in hand and tally drawers" },
  { id: "reports", label: "Reports & GST", description: "Retrieve CFO tax and sales reports" },
  { id: "settings", label: "Settings & Seeds", description: "Reset mock database, developer flags" }
] as const;

const ROLE_PERMISSIONS: Record<StaffMember["role"], StaffMember["permissions"]> = {
  "Store Manager": ["customers", "suppliers", "expenses", "cashbook", "reports"],
  "Billing Operator": ["customers", "expenses"],
  "Delivery Boy & Stock Helper": ["customers"],
  "Accountant": ["expenses", "reports"]
};

const INITIAL_STAFF: StaffMember[] = [
  {
    id: "staff_1",
    name: "Raman",
    phone: "+91 98765 43210",
    role: "Store Manager",
    status: "Online",
    lastActive: "2 mins ago",
    joinDate: "2026-02-12",
    productivityScore: 94,
    permissions: ["customers", "suppliers", "expenses", "cashbook", "reports"],
    activities: [
      { time: "10:45 AM", action: "Recorded Rice Purchase transaction (₹15,000)" },
      { time: "09:30 AM", action: "Created customer profile for Vikram Malhotra" },
      { time: "Yesterday", action: "Synchronized Tally supplier ledger records" }
    ]
  },
  {
    id: "staff_2",
    name: "Aarti Sharma",
    phone: "+91 87654 32109",
    role: "Billing Operator",
    status: "Online",
    lastActive: "15 mins ago",
    joinDate: "2026-03-01",
    productivityScore: 88,
    permissions: ["customers", "expenses"],
    activities: [
      { time: "10:15 AM", action: "Logged counter cash sale (₹1,450)" },
      { time: "09:10 AM", action: "Collected Sandeep Gupta payment (₹650)" },
      { time: "Yesterday", action: "Added new credit customer Kiran Rao" }
    ]
  },
  {
    id: "staff_3",
    name: "Raju helper",
    phone: "+91 76543 21098",
    role: "Delivery Boy & Stock Helper",
    status: "Offline",
    lastActive: "2 hours ago",
    joinDate: "2026-04-10",
    productivityScore: 76,
    permissions: ["customers"],
    activities: [
      { time: "Yesterday", action: "Delivered counter orders to Suresh Patel" },
      { time: "2 days ago", action: "Logged minor cash payout for Staff Tea (₹350)" }
    ]
  },
  {
    id: "staff_4",
    name: "Karan Johar",
    phone: "+91 99887 76655",
    role: "Accountant",
    status: "Pending Approval",
    lastActive: "Never",
    joinDate: "2026-06-04",
    productivityScore: 0,
    permissions: ["expenses", "reports"],
    activities: []
  }
];

export default function StaffManagement() {
  // --- STATE ---
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    const local = localStorage.getItem("ai_munshi_staff_data");
    return local ? JSON.parse(local) : INITIAL_STAFF;
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters State
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<StaffMember["role"]>("Billing Operator");

  const openAddModal = () => {
    setFormName("");
    setFormPhone("");
    setFormRole("Billing Operator");
    setShowAddModal(true);
  };

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem("ai_munshi_staff_data", JSON.stringify(staffList));
  }, [staffList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm);
      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffList, searchTerm, roleFilter, statusFilter]);

  // Set default selected staff
  useEffect(() => {
    if (filteredList.length > 0) {
      if (!filteredList.some(s => s.id === selectedStaffId)) {
        setSelectedStaffId(filteredList[0].id);
      }
    } else {
      setSelectedStaffId(null);
    }
  }, [filteredList, selectedStaffId]);

  const selectedStaff = useMemo(() => {
    return staffList.find(s => s.id === selectedStaffId) || null;
  }, [staffList, selectedStaffId]);

  // --- CALCULATION OF METRICS ---
  const metrics = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter(s => s.status === "Online").length;
    const pending = staffList.filter(s => s.status === "Pending Approval").length;
    
    const gradedStaff = staffList.filter(s => s.productivityScore > 0);
    const avgScore = gradedStaff.length > 0
      ? Math.round(gradedStaff.reduce((sum, s) => sum + s.productivityScore, 0) / gradedStaff.length)
      : 85;

    return {
      total,
      active,
      pending,
      avgScore
    };
  }, [staffList]);

  // Context-aware AI Insights
  const aiInsights = useMemo(() => {
    if (!selectedStaff) return null;

    const name = selectedStaff.name;
    const role = selectedStaff.role;

    if (role === "Store Manager") {
      return {
        observation: `${name} managed 42 ledger entries this week. Efficiency metric is leading.`,
        trend: "Most active between 10 AM and 4 PM during main supply hours.",
        recommendation: "Grant Reports and GST auditing access. Revoke settings developer flags to protect system variables.",
        actionNeeded: "Reports checkbox recommended to be Checked."
      };
    }

    if (role === "Billing Operator") {
      return {
        observation: `${name} completed 28 cash checkouts this week. Zero reconciliation disputes.`,
        trend: "Activity spikes between 6 PM and 9 PM night customer rush.",
        recommendation: "Grant Cashbook & Drawer access for cashier reconciliations. Revoke settings and supplier access.",
        actionNeeded: "Cashbook & Drawer check recommended. Supplier access should be unchecked."
      };
    }

    if (role === "Delivery Boy & Stock Helper") {
      return {
        observation: `${name} completed 12 logistics cash collections on the field.`,
        trend: "Active during afternoon deliveries (12 PM - 3 PM).",
        recommendation: "Restrict to Customer Management only. Revoke wholesale Supplier procurement and Expense creation.",
        actionNeeded: "Revoke Supplier and Expense permissions to secure counter registers."
      };
    }

    // Pending Accountant
    return {
      observation: "Pending approval. Registered under Accountant permissions role.",
      trend: "No activities logged. Verification pending.",
      recommendation: "Verify WhatsApp phone verification details before approving cash registers and reporting ledger logs.",
      actionNeeded: "Approve account status first."
    };
  }, [selectedStaff]);

  // Form Submission (Add Staff)
  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) return;

    const newStaff: StaffMember = {
      id: `staff_${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      role: formRole,
      status: "Offline",
      lastActive: "Never",
      joinDate: new Date().toISOString().split("T")[0],
      productivityScore: 82, // Seed default average score
      permissions: [...ROLE_PERMISSIONS[formRole]], // Auto preset based on chosen role
      activities: [
        { time: "Today", action: "Account profile created and role assigned." }
      ]
    };

    setStaffList(prev => [...prev, newStaff]);
    setSelectedStaffId(newStaff.id);
    
    // Reset Form
    setFormName("");
    setFormPhone("");
    setShowAddModal(false);
  };

  // Modify Permissions
  const handleTogglePermission = (permId: typeof PERMISSION_CATEGORIES[number]["id"]) => {
    if (!selectedStaffId) return;

    setStaffList(prev => prev.map(s => {
      if (s.id === selectedStaffId) {
        const hasPerm = s.permissions.includes(permId);
        const updatedPerms = hasPerm
          ? s.permissions.filter(p => p !== permId)
          : [...s.permissions, permId];
        return {
          ...s,
          permissions: updatedPerms
        };
      }
      return s;
    }));
  };

  // Modify Role (and auto preset permissions)
  const handleRoleChange = (newRole: StaffMember["role"]) => {
    if (!selectedStaffId) return;

    if (window.confirm(`Assigning role "${newRole}" will reset permissions to default presets for this role. Do you want to continue?`)) {
      setStaffList(prev => prev.map(s => {
        if (s.id === selectedStaffId) {
          return {
            ...s,
            role: newRole,
            permissions: [...ROLE_PERMISSIONS[newRole]]
          };
        }
        return s;
      }));
    }
  };

  // Deactivate Staff
  const handleDeactivate = (id: string) => {
    if (window.confirm("Are you sure you want to deactivate and remove this staff profile?")) {
      setStaffList(prev => prev.filter(s => s.id !== id));
      setSelectedStaffId(null);
    }
  };

  // Approve Pending Staff
  const handleApproveStaff = (id: string) => {
    setStaffList(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: "Offline", // Active status
          lastActive: "Just now"
        };
      }
      return s;
    }));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8F9FB] h-full text-[#111827] relative">
      
      {/* 1. TOP METRICS HEADER */}
      <div className="p-6 pb-2 shrink-0">
        <div className="flex justify-between items-center mb-5 border-b border-[#E5E7EB] pb-3">
          <div>
            <h2 className="text-xl font-black text-[#002970] flex items-center gap-2">
              Staff & Permissions Control
              <span className="bg-[#FF9100]/10 text-[#FF9100] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Store ERP</span>
            </h2>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5">Role allocations, security credential logs, AI workflow metrics, and access checks.</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-[#00BAF2]/15 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00BAF2]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Total Staff</span>
                <h3 className="text-xl font-black text-[#002970] mt-1">{metrics.total}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-[#00BAF2]">
                <User className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-sky-500">
              <span>Registered employees</span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00C853]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Active Staff</span>
                <h3 className="text-xl font-black text-[#002970] mt-1">{metrics.active}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00C853]">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse"></span>
              <span>Online billing now</span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FF9100]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Pending Approvals</span>
                <h3 className="text-xl font-black text-[#002970] mt-1">{metrics.pending}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-[#FF9100]">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex mt-2">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                metrics.pending > 0 ? "bg-rose-50 border-rose-100 text-rose-500 animate-pulse" : "bg-slate-50 border-slate-100 text-[#6B7280]"
              }`}>
                {metrics.pending > 0 ? "Approvals Required" : "Ledger Balanced"}
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#7C4DFF]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Avg Productivity</span>
                <h3 className="text-xl font-black text-[#002970] mt-1">{metrics.avgScore}%</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#7C4DFF]">
                <Activity className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-indigo-500">
              <Sparkles className="w-3 h-3" />
              <span>Calculated by AI logs</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN ERP CONTAINER */}
      <div className="flex-1 flex min-h-0 p-6 pt-2 overflow-hidden gap-6">
        
        {/* LEFT COLUMN: STAFF LIST */}
        <div className="flex-1 flex flex-col bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-sm">
          {/* List Search & Filters */}
          <div className="p-4 border-b border-[#E5E7EB] bg-white space-y-4 shrink-0">
            <div className="flex gap-2">
              <div className="flex-grow bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-4 flex items-center gap-2.5 h-11 focus-within:border-[#00BAF2] transition-colors">
                <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
                <input
                  type="text"
                  placeholder="Search staff by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-transparent flex-grow text-xs font-semibold outline-none text-[#111827]"
                />
              </div>

              <div className="flex gap-2 shrink-0">
                {/* Role filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[10px] font-extrabold text-[#002970] outline-none cursor-pointer focus:border-[#00BAF2]"
                >
                  <option value="all">Roles: All</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Billing Operator">Billing Operator</option>
                  <option value="Delivery Boy & Stock Helper">Helper / Delivery</option>
                  <option value="Accountant">Accountant</option>
                </select>

                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[10px] font-extrabold text-[#002970] outline-none cursor-pointer focus:border-[#00BAF2]"
                >
                  <option value="all">Status: All</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Pending Approval">Pending Verification</option>
                </select>
              </div>
            </div>
          </div>

          {/* directory list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] bg-[#F8F9FB]">
            {filteredList.length > 0 ? (
              filteredList.map((staff) => {
                const isSelected = staff.id === selectedStaffId;
                
                return (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-all ${
                      isSelected ? "bg-white border-l-4 border-[#00BAF2] shadow-sm relative z-10" : "hover:bg-white/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar with Status indicator */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-[#002970] border border-[#E5E7EB] uppercase">
                          {staff.name.substring(0, 2)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          staff.status === "Online" ? "bg-[#00C853]" :
                          staff.status === "Offline" ? "bg-slate-400" :
                          "bg-[#FF9100] animate-pulse"
                        }`} />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-[#002970] flex items-center gap-1.5">
                          {staff.name}
                          {staff.status === "Pending Approval" && (
                            <span className="text-[7px] font-black uppercase bg-amber-50 border border-amber-200 text-amber-600 px-1 rounded-sm">KYC</span>
                          )}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-extrabold text-[#6B7280]">{staff.role}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-[9px] font-bold text-[#6B7280]">{staff.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {staff.status === "Online" ? (
                        <span className="text-[8px] font-black text-[#00C853] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Online</span>
                      ) : staff.status === "Offline" ? (
                        <span className="text-[8px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{staff.lastActive}</span>
                      ) : (
                        <span className="text-[8px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Pending</span>
                      )}
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "translate-x-0.5" : ""}`} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-white h-full">
                <AlertTriangle className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-xs font-extrabold text-[#002970]">No staff members found</h4>
                <p className="text-[10px] text-[#6B7280] mt-1">Try resetting your filters or search keywords.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL PROFILE & PERMISSION WORKSPACE */}
        <div className="w-[480px] flex flex-col min-h-0 bg-white border border-[#E5E7EB] rounded-3xl overflow-y-auto shadow-sm">
          {selectedStaff ? (
            <div className="flex-grow flex flex-col justify-between min-h-0">
              
              {/* SECTION 1: PROFILE HEADER */}
              <div className="p-5 border-b border-[#E5E7EB] shrink-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#00BAF2]" />
                    <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-widest">Employee Security Profile</span>
                  </div>

                  {/* Deactivate switch */}
                  <button
                    onClick={() => handleDeactivate(selectedStaff.id)}
                    className="text-rose-500 hover:text-rose-600 text-[10px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" /> Deactivate Staff
                  </button>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-[#E5E7EB] flex items-center justify-center font-black text-[#002970] text-lg uppercase">
                    {selectedStaff.name.substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-[#002970] truncate leading-tight">{selectedStaff.name}</h3>
                    
                    {/* Role changer dropdown */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <select
                        value={selectedStaff.role}
                        onChange={(e) => handleRoleChange(e.target.value as any)}
                        className="bg-slate-50 border border-[#E5E7EB] rounded-lg px-2 py-0.5 text-[9px] font-extrabold text-[#002970] cursor-pointer outline-none focus:border-[#00BAF2]"
                      >
                        <option value="Store Manager">Store Manager</option>
                        <option value="Billing Operator">Billing Operator</option>
                        <option value="Delivery Boy & Stock Helper">Helper / Delivery</option>
                        <option value="Accountant">Accountant</option>
                      </select>
                      
                      {selectedStaff.status === "Pending Approval" && (
                        <button
                          onClick={() => handleApproveStaff(selectedStaff.id)}
                          className="bg-[#00C853] hover:bg-[#00B24A] text-white text-[8px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-2.5 h-2.5" /> Approve Access
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Matrix */}
                <div className="grid grid-cols-3 gap-3.5 mt-5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Join Date</span>
                    <span className="text-[10px] font-extrabold text-[#002970] block mt-0.5 truncate">
                      {new Date(selectedStaff.joinDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Productivity</span>
                    <span className={`text-[10px] font-black block mt-0.5 ${
                      selectedStaff.productivityScore >= 90 ? "text-[#00C853]" :
                      selectedStaff.productivityScore >= 75 ? "text-amber-600" :
                      "text-slate-500"
                    }`}>
                      {selectedStaff.productivityScore > 0 ? `${selectedStaff.productivityScore} / 100` : "Audit pending"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">WhatsApp Logs</span>
                    <span className="text-[10px] font-extrabold text-[#002970] block mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#6B7280]" /> Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ACCESS CONTROL PERMISSIONS CHECKLIST */}
              <div className="p-5 border-b border-[#E5E7EB] shrink-0 bg-slate-50/30">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block mb-3.5">Interactive Permission Toggles</span>
                
                <div className="bg-white border border-[#E5E7EB] rounded-3xl p-4 shadow-sm space-y-4">
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const hasAccess = selectedStaff.permissions.includes(cat.id as any);
                    
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleTogglePermission(cat.id as any)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          hasAccess ? "bg-sky-50/20 border-[#00BAF2]/30" : "bg-white border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold text-[#002970] block">{cat.label}</span>
                          <span className="text-[8.5px] text-[#6B7280] font-semibold block mt-0.5 leading-snug">{cat.description}</span>
                        </div>
                        
                        {/* Checkbox circle element */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          hasAccess ? "bg-[#00BAF2] border-[#00BAF2] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {hasAccess && (
                            <svg className="w-3 h-3 stroke-current stroke-3 fill-none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: AI STAFF INSIGHTS & RECOM */}
              {aiInsights && (
                <div className="p-5 border-b border-[#E5E7EB] bg-gradient-to-tr from-sky-50/20 to-indigo-50/20 shrink-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#00BAF2] flex items-center gap-1 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" /> AI Productivity Audit
                  </span>

                  <div className="space-y-3">
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-[#002970] leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#00BAF2]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">Weekly Activity</span>
                      {aiInsights.observation}
                    </div>

                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-[#002970] leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#FF9100]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">Peak Hours</span>
                      {aiInsights.trend}
                    </div>

                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-emerald-950 leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#00C853]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">CFO Access Recommendation</span>
                      {aiInsights.recommendation}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: ACTIVITY TIMELINE */}
              <div className="p-5 shrink-0">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5 mb-4">
                  <Clock className="w-3.5 h-3.5 text-[#6B7280]" /> Recent Activity timeline
                </span>

                {selectedStaff.activities.length > 0 ? (
                  <div className="relative pl-5 border-l-2 border-slate-200 space-y-5 ml-2">
                    {selectedStaff.activities.map((act, idx) => (
                      <div key={idx} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[26px] top-0.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#00BAF2] flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00BAF2]" />
                        </div>
                        
                        <div className="text-xs">
                          <span className="font-extrabold text-[#6B7280] block text-[9px]">{act.time}</span>
                          <span className="text-[#002970] font-semibold mt-0.5 block leading-normal">{act.action}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center border border-[#E5E7EB] border-dashed rounded-2xl text-[10px] text-[#6B7280] font-semibold">
                    No activities recorded. Waiting for operator verification.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center text-center p-6 bg-white min-h-[400px]">
              <User className="w-12 h-12 text-[#FF9100]/20 border border-[#FF9100]/10 rounded-2xl p-2.5 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xs font-black text-[#002970]">ERP Staff Workspace</h3>
              <p className="text-[10px] text-[#6B7280] mt-1 max-w-[220px] mx-auto leading-relaxed">
                Add a new operator or select an employee from the directory list on the left to check credentials, assign roles, audit permissions, and view timelog actions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. MODAL: CREATE STAFF PROFILE */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-[#081A38]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#E5E7EB] shadow-2xl relative"
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-[#002970] mb-2">Create Staff Profile</h3>
              <p className="text-[10px] text-[#6B7280] font-semibold mb-6">Assign workspace credentials and auto-preset default roles access permissions.</p>

              <form onSubmit={handleAddStaffSubmit} className="space-y-4">
                {/* 1. Name */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Employee Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarti Sharma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                  />
                </div>

                {/* 2. Phone */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">WhatsApp Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                  />
                </div>

                {/* 3. Role Allocation */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Role Classification</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827] cursor-pointer"
                  >
                    <option value="Store Manager">Store Manager</option>
                    <option value="Billing Operator">Billing Operator</option>
                    <option value="Delivery Boy & Stock Helper">Delivery Boy & Stock Helper</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-100 text-[10px] text-amber-700 font-bold rounded-2xl flex items-start gap-2.5">
                  <Info className="w-4.5 h-4.5 shrink-0" />
                  <span>Seeding this profile will automatically preset default permissions for the chosen role. You can customize them individually afterwards.</span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer mt-4 shadow-lg shadow-[#00BAF2]/10 transition-transform active:scale-95"
                >
                  Create Staff Profile
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
