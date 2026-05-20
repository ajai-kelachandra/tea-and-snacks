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
    <div className="space-y-8 font-dm-sans text-gray-800 animate-fadeIn pb-12">
      
      {/* Upper Header Greetings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {greeting}, {employee.name.split(" ")[0]}!
          </h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            {employee.jobTitle} • {employee.department} Division
          </p>
        </div>
        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm shrink-0 w-max select-none">
          📅 {new Date().toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column - Profile & Essential Info Cards (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Visual Profile Card - Minimalist, Neat, Clean */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
            {/* Soft decorative background shape */}
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none text-gray-400">
              <FiShield size={180} />
            </div>
            
            {/* Avatar Initials Circle - Soft Pastel */}
            <div className="w-20 h-20 bg-blue-50 text-[#1d4ed8] border border-blue-100/50 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner shrink-0 select-none">
              {avatarInitials}
            </div>
            
            <div className="text-center sm:text-left space-y-1.5 z-10 min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <h2 className="text-xl font-black text-gray-900 tracking-tight truncate leading-none">{employee.name}</h2>
                <span className="inline-flex items-center justify-center bg-green-50 text-green-700 border border-green-200/50 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full select-none w-max mx-auto sm:mx-0">
                  Active
                </span>
              </div>
              <p className="text-xs font-bold text-[#1d4ed8] uppercase tracking-widest mt-0.5">
                {employee.jobTitle}
              </p>
              <p className="text-[10px] text-gray-450 uppercase font-black tracking-wider">
                ID: {employee.employeeId} • {employee.department} Division
              </p>
            </div>
          </div>

          {/* Essential Details Sleek Tiles */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/80 space-y-6">
            <div className="flex items-center gap-2.5 border-b border-gray-50 pb-4">
              <div className="p-1.5 bg-blue-50 text-[#1d4ed8] rounded-lg">
                <FiAward size={16} />
              </div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight">Essential Directory Records</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Employee ID */}
              <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <FiBriefcase size={16} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Employee ID</span>
                  <span className="text-xs font-black text-gray-900 block">{employee.employeeId}</span>
                </div>
              </div>

              {/* Official Email */}
              <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FiMail size={16} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Official Email</span>
                  <a href={`mailto:${employee.email}`} className="text-xs font-extrabold text-gray-900 hover:text-[#1d4ed8] block truncate transition-colors">
                    {employee.email}
                  </a>
                </div>
              </div>

              {/* Phone Contact */}
              <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <FiPhone size={16} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Phone Contact</span>
                  <span className="text-xs font-bold text-gray-900 block">
                    {employee.phone || "Not Provided"}
                  </span>
                </div>
              </div>

              {/* Date Joined */}
              <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <FiCalendar size={16} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Date Joined</span>
                  <span className="text-xs font-bold text-gray-900 block">
                    {employee.dateJoined ? new Date(employee.dateJoined).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    }) : "Not Specified"}
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column - Employee Benefits Hub Navigation widgets (col-span-1) */}
        <div className="space-y-4">
          
          <div className="bg-white border border-gray-100/80 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 border-b border-gray-50 pb-4">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <FiShield size={15} />
              </div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight">
                Employee Hub Launchpad
              </h3>
            </div>

            <div className="space-y-3.5">
              
              {/* Widget: Pantry Perks */}
              <button
                onClick={() => router.push("/user/menu")}
                className="w-full text-left p-4 bg-gray-50 hover:bg-blue-50/20 border border-gray-100 hover:border-blue-200/60 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 active:scale-[0.99]"
              >
                <div className="p-3 bg-blue-50 text-[#1d4ed8] border border-blue-100 rounded-xl group-hover:scale-105 transition-transform duration-200 shrink-0">
                  <FiCoffee size={16} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-xs font-extrabold text-gray-900 group-hover:text-[#1d4ed8] block transition-colors leading-none">Pantry Perks Benefits</span>
                  <span className="text-[10px] text-gray-400 font-bold block leading-relaxed">Order daily snacks and refreshments.</span>
                </div>
                <FiArrowRight className="text-gray-300 group-hover:text-[#1d4ed8] shrink-0 mt-3.5 transition-all group-hover:translate-x-1" size={14} />
              </button>

              {/* Widget: Leaves Balance */}
              <button
                onClick={() => router.push("/user/leaves")}
                className="w-full text-left p-4 bg-gray-50 hover:bg-purple-50/20 border border-gray-100 hover:border-purple-200/60 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 active:scale-[0.99]"
              >
                <div className="p-3 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl group-hover:scale-105 transition-transform duration-200 shrink-0">
                  <FiCalendar size={16} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-xs font-extrabold text-gray-900 group-hover:text-purple-600 block transition-colors leading-none">Leaves & Attendance</span>
                  <span className="text-[10px] text-gray-400 font-bold block leading-relaxed">Check leaves allowance and balances.</span>
                </div>
                <FiArrowRight className="text-gray-300 group-hover:text-purple-600 shrink-0 mt-3.5 transition-all group-hover:translate-x-1" size={14} />
              </button>

              {/* Widget: Timesheet Logs */}
              <button
                onClick={() => router.push("/user/timesheet")}
                className="w-full text-left p-4 bg-gray-50 hover:bg-emerald-50/20 border border-gray-100 hover:border-emerald-200/60 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 active:scale-[0.99]"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl group-hover:scale-105 transition-transform duration-200 shrink-0">
                  <FiClock size={16} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-xs font-extrabold text-gray-900 group-hover:text-emerald-600 block transition-colors leading-none">Timesheet Hour Logs</span>
                  <span className="text-[10px] text-gray-400 font-bold block leading-relaxed">Log daily activities and work hours.</span>
                </div>
                <FiArrowRight className="text-gray-300 group-hover:text-emerald-600 shrink-0 mt-3.5 transition-all group-hover:translate-x-1" size={14} />
              </button>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
