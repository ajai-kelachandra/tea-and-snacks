"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/hooks";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiCoffee,
  FiAlertCircle,
  FiArrowRight,
  FiAward,
  FiShield
} from "react-icons/fi";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  phone?: string;
  dateJoined?: string;
}

export default function EmployeeHomePage() {
  const router = useRouter();
  const { userEmail } = useAppSelector((s) => s.auth);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // Load employee profile matching the logged-in email
  useEffect(() => {
    if (!userEmail) return;

    const unsub = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        const match = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as any))
          .find((emp) => emp.email?.toLowerCase() === userEmail.toLowerCase());

        if (match) {
          setEmployee(match);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load employee details:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userEmail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Retrieving workspace credentials…</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto bg-white border border-gray-150 shadow-sm mt-8 space-y-4">
        <FiAlertCircle size={40} className="mx-auto text-red-500 animate-pulse" />
        <h2 className="text-lg font-bold text-gray-900">Profile Registration Required</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your active email <span className="font-semibold text-gray-900">{userEmail}</span> is not registered in the directory. Please request your HR administrator to set up your directory card.
        </p>
      </div>
    );
  }

  // Get display avatar letters
  const avatarInitials = employee.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Determine dynamic greeting based on local time
  const hour = new Date().getHours();
  let greeting = "Welcome back";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";
  else greeting = "Good evening";

  return (
    <div className="space-y-6 font-dm-sans text-gray-800 animate-fadeIn pb-12">
      
      {/* Upper Header Greetings - Minimal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            {greeting}, {employee.name.split(" ")[0]}!
          </h1>
          <p className="text-[11px] text-gray-400 font-medium">
            Welcome back. Here is your dashboard overview for today.
          </p>
        </div>
        <div className="text-[10px] text-gray-455 font-semibold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm shrink-0 w-max select-none">
          📅 {new Date().toLocaleDateString("en-IN", { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* Main Visual Profile Card - Minimalist & Sleek */}
      <div className="bg-white border border-gray-100/80 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row items-center gap-6 relative overflow-hidden">
        {/* Soft decorative background shape */}
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none text-gray-400">
          <FiShield size={180} />
        </div>
        
        {/* Left side: Avatar and Basic Info */}
        <div className="flex items-center gap-4.5 z-10 shrink-0">
          {/* Avatar Circle - Clean & Minimal */}
          <div className="w-12 h-12 bg-gray-50 text-gray-600 border border-gray-100 rounded-full flex items-center justify-center text-lg font-bold shrink-0 select-none">
            {avatarInitials}
          </div>
          
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 tracking-tight leading-none">{employee.name}</h2>
              <span className="inline-flex items-center justify-center bg-green-50 text-green-700 border border-green-200/50 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full select-none w-max">
                Active
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium leading-none">
              {employee.jobTitle} • <span className="text-gray-400">{employee.department} Division</span>
            </p>
          </div>
        </div>

        {/* Vertical Separator for Large Screens */}
        <div className="hidden lg:block w-px h-10 bg-gray-100 mx-2 shrink-0 z-10" />

        {/* Right side: Typographic grid of details - Minimal & Clean */}
        <div className="w-full lg:flex-1 grid grid-cols-2 sm:grid-cols-4 gap-6 z-10 lg:pl-4">
          
          {/* Employee ID */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Employee ID</span>
            <span className="text-xs font-bold text-gray-900 block">{employee.employeeId}</span>
          </div>

          {/* Official Email */}
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Official Email</span>
            <a href={`mailto:${employee.email}`} className="text-xs font-bold text-gray-900 hover:text-[#1d4ed8] block truncate transition-colors">
              {employee.email}
            </a>
          </div>

          {/* Phone Contact */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Phone Contact</span>
            <span className="text-xs font-bold text-gray-900 block">
              {employee.phone || "Not Provided"}
            </span>
          </div>

          {/* Date Joined */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Date Joined</span>
            <span className="text-xs font-bold text-gray-900 block">
              {employee.dateJoined ? new Date(employee.dateJoined).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              }) : "Not Specified"}
            </span>
          </div>

        </div>

      </div>

      {/* Main Grid - Two columns underneath */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        
        {/* Card 1: Upcoming Holidays Calendar Widget (col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-gray-100/85 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="text-gray-400">
                  <FiCalendar size={15} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Upcoming Holidays
                </h3>
              </div>
              <span className="text-[9px] font-bold uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                2026 Schedule
              </span>
            </div>

            {/* List of upcoming holidays */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {(() => {
                const HOLIDAYS = [
                  { name: "May Day", date: "2026-05-01", day: "Friday" },
                  { name: "Eid-ul-Ad'ha (Bakrid)", date: "2026-05-27", day: "Wednesday", isStarred: true },
                  { name: "First Onam/Milad-i-Sherif", date: "2026-08-25", day: "Tuesday", subtitle: "Prophet Birthday", isStarred: true },
                  { name: "Thiruvonam", date: "2026-08-26", day: "Wednesday" },
                  { name: "Gandhi Jayanthi", date: "2026-10-02", day: "Friday" },
                  { name: "Mahanavami", date: "2026-10-20", day: "Tuesday" },
                  { name: "Christmas", date: "2026-12-25", day: "Friday" }
                ];

                const today = new Date("2026-05-20");

                const upcoming = HOLIDAYS.filter((h) => new Date(h.date) >= today);

                if (upcoming.length === 0) {
                  return (
                    <div className="text-center py-6 text-gray-450">
                      <p className="text-xs font-bold">No upcoming holidays scheduled</p>
                    </div>
                  );
                }

                return upcoming.map((h, idx) => {
                  const hDate = new Date(h.date);
                  const diffTime = hDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  let countdownText = "";
                  if (diffDays === 0) countdownText = "Today 🎉";
                  else if (diffDays === 1) countdownText = "Tomorrow";
                  else if (diffDays <= 30) countdownText = `In ${diffDays} days`;
                  else countdownText = `In ${Math.round(diffDays / 30)} months`;

                  const monthName = hDate.toLocaleString("en-IN", { month: "short" }).toUpperCase();
                  const dateNum = hDate.getDate();

                  return (
                    <div key={idx} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 group select-none">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Day / Date column - Clean Typographic */}
                        <div className="text-left shrink-0 w-8">
                          <span className="text-[9px] font-black text-gray-400 block uppercase leading-none tracking-wider">{monthName}</span>
                          <span className="text-sm font-extrabold text-gray-900 block leading-tight mt-0.5">{dateNum}</span>
                        </div>
                        {/* Name and subtitle */}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate group-hover:text-[#1d4ed8] transition-colors leading-tight">
                            {h.name}
                            {h.isStarred && <span className="text-rose-500 ml-0.5">*</span>}
                          </p>
                          <p className="text-[10px] text-gray-455 font-medium">
                            {h.day} {h.subtitle ? `• ${h.subtitle}` : ""}
                          </p>
                        </div>
                      </div>
                      
                      {/* Countdown tag - soft and minimal */}
                      <span className="text-[9px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {countdownText}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Card 2: Employee Benefits Hub Navigation widgets (col-span-2) */}
        <div className="lg:col-span-2 bg-white border border-gray-100/85 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="text-gray-400">
                  <FiShield size={15} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Employee Hub Launchpad
                </h3>
              </div>
            </div>

            <div className="space-y-1.5">
              
              {/* Widget: Pantry Perks */}
              <button
                onClick={() => router.push("/user/menu")}
                className="w-full text-left p-3 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-xl transition-all cursor-pointer group flex items-center justify-between active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-gray-455 group-hover:text-[#1d4ed8] transition-colors shrink-0">
                    <FiCoffee size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block group-hover:text-[#1d4ed8] transition-colors leading-none">Pantry Perks</span>
                    <span className="text-[10px] text-gray-400 font-medium block leading-normal mt-0.5">Order daily snacks and refreshments.</span>
                  </div>
                </div>
                <FiArrowRight className="text-gray-300 group-hover:text-gray-550 shrink-0 transition-all group-hover:translate-x-0.5" size={14} />
              </button>

              {/* Widget: Leaves Balance */}
              <button
                onClick={() => router.push("/user/leaves")}
                className="w-full text-left p-3 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-xl transition-all cursor-pointer group flex items-center justify-between active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-gray-455 group-hover:text-purple-600 transition-colors shrink-0">
                    <FiCalendar size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block group-hover:text-purple-600 transition-colors leading-none">Leaves & Attendance</span>
                    <span className="text-[10px] text-gray-400 font-medium block leading-normal mt-0.5">Check leaves allowance and balances.</span>
                  </div>
                </div>
                <FiArrowRight className="text-gray-300 group-hover:text-gray-550 shrink-0 transition-all group-hover:translate-x-0.5" size={14} />
              </button>

              {/* Widget: Timesheet Logs */}
              <button
                onClick={() => router.push("/user/timesheet")}
                className="w-full text-left p-3 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-xl transition-all cursor-pointer group flex items-center justify-between active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-gray-455 group-hover:text-emerald-600 transition-colors shrink-0">
                    <FiClock size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block group-hover:text-emerald-600 transition-colors leading-none">Timesheet Logs</span>
                    <span className="text-[10px] text-gray-400 font-medium block leading-normal mt-0.5">Log daily activities and work hours.</span>
                  </div>
                </div>
                <FiArrowRight className="text-gray-300 group-hover:text-gray-550 shrink-0 transition-all group-hover:translate-x-0.5" size={14} />
              </button>

              {/* Widget: Jira Taskboard */}
              <button
                onClick={() => router.push("/user/tasks")}
                className="w-full text-left p-3 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-xl transition-all cursor-pointer group flex items-center justify-between active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-gray-455 group-hover:text-blue-650 transition-colors shrink-0">
                    <FiBriefcase size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block group-hover:text-blue-650 transition-colors leading-none">Jira Taskboard</span>
                    <span className="text-[10px] text-gray-400 font-medium block leading-normal mt-0.5">Manage tasks, updates, and assignments in real-time.</span>
                  </div>
                </div>
                <FiArrowRight className="text-gray-300 group-hover:text-gray-550 shrink-0 transition-all group-hover:translate-x-0.5" size={14} />
              </button>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
