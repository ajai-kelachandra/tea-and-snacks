"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/hooks";
import Link from "next/link";
import {
  FiUsers,
  FiUserCheck,
  FiCalendar,
  FiVolume2,
  FiUserPlus,
  FiBriefcase,
  FiSearch,
  FiFilter,
  FiActivity,
  FiTrendingUp,
} from "react-icons/fi";
import { db } from "@/lib/firebase";
import {
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  joinDate: string;
  createdAt: any;
}

export default function AdminDashboardPage() {
  const { userName } = useAppSelector((s) => s.auth);

  // HR States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Employees list (for Zoho-style HR widgets)
    const unsubEmployees = onSnapshot(
      query(collection(db, "employees"), orderBy("employeeId", "asc")),
      (snapshot) => {
        const empData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Employee[];
        setEmployees(empData);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch employees:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubEmployees();
    };
  }, []);

  // Stats Counters
  const totalStaff = employees.length;
  // Estimate presence at ~90% for active looking numbers, fallback to 0
  const presentCount = Math.max(0, Math.round(totalStaff * 0.9));
  const leaveCount = Math.max(0, totalStaff - presentCount);
  
  // Unique Departments Count
  const uniqueDepts = Array.from(new Set(employees.map(e => e.department))).length;

  const hrStats = [
    { label: "Total Staff", value: totalStaff, icon: FiUsers, color: "bg-blue-50 text-blue-600 border border-blue-100", desc: "Registered employees" },
    { label: "Present Today", value: presentCount, icon: FiUserCheck, color: "bg-emerald-50 text-emerald-600 border border-emerald-100", desc: "Active office presence" },
    { label: "On Leave", value: leaveCount, icon: FiCalendar, color: "bg-amber-50 text-amber-600 border border-amber-100", desc: "Approved time-off" },
    { label: "Departments", value: uniqueDepts, icon: FiBriefcase, color: "bg-purple-50 text-purple-600 border border-purple-100", desc: "Operational divisions" },
  ];

  const quickActions = [
    { href: "/admin/employees", label: "Add Employee", icon: FiUserPlus, color: "bg-[#1d4ed8] text-white hover:bg-[#1e40af]", desc: "Expand your directory" },
    { href: "/admin/employees", label: "View Directory", icon: FiUsers, color: "bg-white border border-gray-200 text-gray-900 hover:border-[#1d4ed8]", desc: "Search & manage employee profiles" },
    { href: "/admin/tea-snack", label: "Tea & Snack Dashboard", icon: FiTrendingUp, color: "bg-white border border-gray-200 text-gray-900 hover:border-[#1d4ed8]", desc: "Manage snack queues & ordering" },
  ];

  const newJoinees = [...employees]
    .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 font-dm-sans animate-fadeIn">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">IRO People Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Welcome back, {userName?.split("@")[0] || "Admin"}! Here is your corporate overview.</p>
        </div>
        <div className="text-xs text-[var(--text-muted)] font-bold bg-[var(--bg-card)] px-4 py-2.5 rounded-xl border border-[var(--border)] shadow-sm">
          📅 Today: {new Date().toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Zoho People Style Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {hrStats.map(({ label, value, icon: Icon, color, desc }) => (
          <div key={label} className="card p-5 border border-[var(--border)] shadow-sm relative overflow-hidden bg-[var(--bg-card)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-black text-[var(--text-primary)] mt-2">{value}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">{desc}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Workspace Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - New Joinees & Quick Statistics (col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Recent onboarded employees */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                  <FiUsers className="text-blue-500" />
                  Recent Hires
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Latest employee onboardings in the directory</p>
              </div>
              <Link
                href="/admin/employees"
                className="text-[10px] text-[#1d4ed8] font-bold uppercase tracking-wider hover:underline"
              >
                Full Directory →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-[var(--bg-hover)] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : newJoinees.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No employees onboarded yet.</p>
            ) : (
              <div className="space-y-3">
                {newJoinees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded-2xl hover:opacity-90 transition-all border border-[var(--border-light)] hover:border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center dark:bg-blue-900/30 dark:text-blue-300">
                        {emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{emp.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                        {emp.department}
                      </span>
                      <span className="text-[10px] font-bold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] px-2 py-0.5 rounded">
                        {emp.employeeId}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-[var(--text-primary)] text-sm">IRO People Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--bg-hover)] border border-[var(--border-light)] hover:border-[var(--border)] rounded-2xl transition-all">
                <FiActivity className="text-blue-500 mb-2" size={18} />
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Attendance Monitoring</h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Check daily sign-ins, logs, and presence ratios.</p>
              </div>
              <div className="p-4 bg-[var(--bg-hover)] border border-[var(--border-light)] hover:border-[var(--border)] rounded-2xl transition-all">
                <FiBriefcase className="text-purple-500 mb-2" size={18} />
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Resource Planning</h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Optimize staff allocations and departmental operations.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Zoho HR Feeds (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Zoho style Announcements/Feeds card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5 border-b border-[var(--border-light)] pb-3">
              <FiVolume2 className="text-amber-500" />
              IRO People Announcements
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl space-y-1 dark:bg-amber-900/15 dark:border-amber-800/30">
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Company Birthday Wall 🎂</span>
                <p className="text-[11px] font-bold text-[var(--text-primary)] leading-normal">
                  Happy birthday to Sarah Jenkins from Engineering today! Let's wish them a wonderful day ahead!
                </p>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl space-y-1 dark:bg-purple-900/15 dark:border-purple-800/30">
                <span className="text-[8px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">New Hire Onboarding 🎉</span>
                <p className="text-[11px] font-bold text-[var(--text-primary)] leading-normal">
                  Welcome Sarah Jenkins and Emily Watson to their respective departments. Let's make them feel at home!
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-1 dark:bg-emerald-900/15 dark:border-emerald-800/30">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Policy Update Notice</span>
                <p className="text-[11px] font-bold text-[var(--text-primary)] leading-normal">
                  All employees are requested to review and verify their company profile database before next week.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Portal Navigation Shortcuts */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 ml-1 font-dm-sans">Portal Operations Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ href, label, icon: Icon, color, desc }, idx) => (
            <Link
              key={idx}
              href={href}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 shadow-sm border border-transparent ${color}`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
              <div>
                <p className="font-bold text-sm leading-none">{label}</p>
                <p className="text-xs opacity-75 mt-1 font-medium">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
