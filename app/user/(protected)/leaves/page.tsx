"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAppSelector } from "@/lib/hooks";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  FiCalendar,
  FiClock,
  FiFileText,
  FiPlus,
  FiAlertCircle,
  FiTrash2,
} from "react-icons/fi";
import toast from "react-hot-toast";

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

interface LeaveRequest {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: any;
}

interface AttendanceLog {
  id: string;
  date: string;
  employeeId: string;
  name: string;
  status: "Present" | "Absent" | "Late" | "On Leave";
  logInTime: string;
  logOutTime: string;
}

export default function EmployeeLeavesPage() {
  const { userEmail } = useAppSelector((s) => s.auth);

  // States
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch employee profile matching the logged-in email
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
        } else {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Failed to load employee:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userEmail]);

  // 2. Fetch leave requests and attendance logs once employee profile is loaded
  useEffect(() => {
    if (!employee) return;

    setLoading(true);

    // Real-time leave applications filter
    const unsubLeaves = onSnapshot(
      collection(db, "leaveRequests"),
      (snapshot) => {
        const list = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as any))
          .filter((req) => req.employeeId === employee.employeeId);

        // Sort descending by creation date
        list.sort((a, b) => {
          const t1 = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt || 0).getTime();
          const t2 = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt || 0).getTime();
          return t2 - t1;
        });

        setLeaves(list);
      },
      (err) => console.error("Failed to load leaves:", err)
    );

    // Real-time attendance logs filter
    const unsubAttendance = onSnapshot(
      collection(db, "attendance"),
      (snapshot) => {
        const list = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as any))
          .filter((log) => log.employeeId === employee.employeeId);

        // Sort descending by date
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setAttendanceLogs(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load attendance logs:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubLeaves();
      unsubAttendance();
    };
  }, [employee]);

  // Handle Leave Submission
  const handleSubmitLeave = async (e: FormEvent) => {
    e.preventDefault();
    if (!employee) {
      toast.error("Profile not found in directory. Please contact administrator.");
      return;
    }
    if (!startDate || !endDate || !reason.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after the end date.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "leaveRequests"), {
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      // Dispatch automated Resend notification email
      try {
        await fetch("/api/send-leave-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId: employee.employeeId,
            name: employee.name,
            department: employee.department,
            leaveType,
            startDate,
            endDate,
            reason: reason.trim(),
          }),
        });
      } catch (emailErr) {
        console.error("Failed to dispatch Resend leave application email:", emailErr);
      }

      toast.success("Leave application submitted successfully! ✉️");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete/Cancel Pending Leave Request
  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this leave application?")) return;

    try {
      await deleteDoc(doc(db, "leaveRequests", id));
      toast.success("Leave application canceled.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel leave request.");
    }
  };

  // Attendance stats helper
  const totalDays = attendanceLogs.length;
  const presentDays = attendanceLogs.filter((log) => log.status === "Present" || log.status === "Late").length;
  const lateDays = attendanceLogs.filter((log) => log.status === "Late").length;
  const onLeaveDays = attendanceLogs.filter((log) => log.status === "On Leave").length;
  const absentDays = attendanceLogs.filter((log) => log.status === "Absent").length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading profile and files…</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto bg-white border border-gray-150 shadow-sm mt-8 space-y-4">
        <FiAlertCircle size={40} className="mx-auto text-red-500" />
        <h2 className="text-lg font-bold text-gray-900">Profile Not Found</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your registered email <span className="font-semibold text-gray-900">{userEmail}</span> was not found in the employee directory. Please contact your HR Manager to register your account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-dm-sans">
      
      {/* Welcome Card / Profile Details */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-[#1d4ed8] rounded-2xl flex items-center justify-center text-xl font-black shadow-inner">
            {employee.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Welcome, {employee.name}!</h1>
            <p className="text-xs text-gray-400 font-bold tracking-wider uppercase mt-0.5">{employee.jobTitle} • {employee.department}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-xs font-semibold">
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Employee ID</span>
            <p className="text-gray-900 font-extrabold">{employee.employeeId}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Office Email</span>
            <p className="text-gray-900 font-bold truncate max-w-[150px]">{employee.email}</p>
          </div>
          <div className="space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Presence Ratio</span>
            <p className="text-emerald-600 font-extrabold">{attendanceRate}% Attendance</p>
          </div>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Present Days</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{presentDays - lateDays}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">Logged on time shifts</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Late Clock-Ins</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{lateDays}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">Punch-ins post 09:15 AM</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">On Leaves</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{onLeaveDays}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">Approved medical/casuals</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Absent Days</p>
          <p className="text-2xl font-black text-red-500 mt-1">{absentDays}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">Unexcused missing shifts</p>
        </div>
      </div>

      {/* Leave Submission & Leave History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Leave Request Form Column (col-span-1) */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 border-b border-gray-50 pb-3">
              <FiCalendar className="text-[#1d4ed8]" />
              Apply for Leave
            </h3>

            <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="label text-[10px]">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="input-field py-2.5"
                >
                  <option value="Casual Leave">Casual Leave 🗓️</option>
                  <option value="Sick Leave">Sick Leave 🩺</option>
                  <option value="Annual Leave">Annual Leave 🌴</option>
                  <option value="Maternity/Paternity Leave">Maternity/Paternity 🍼</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-[10px]">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field py-2.5 cursor-pointer"
                    required
                  />
                </div>
                <div>
                  <label className="label text-[10px]">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field py-2.5 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label text-[10px]">Reason for Leave</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you are applying for leave, coverage details..."
                  rows={4}
                  className="input-field resize-none py-2 px-3"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-1.5 py-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded-xl transition-all duration-150 active:scale-95 cursor-pointer shadow-md shadow-blue-100 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiPlus size={14} />
                    Submit Application
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Leave Requests History Column (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Leave Records */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 border-b border-gray-50 pb-3">
              <FiFileText className="text-purple-600" />
              My Leave Application History
            </h3>

            {leaves.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <FiFileText size={32} className="mx-auto mb-2 opacity-25" />
                <p className="text-xs font-bold">No leave applications submitted yet.</p>
                <p className="text-[10px] text-gray-400 mt-1">Submit your first application using the form on the left.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                {leaves.map((req) => (
                  <div key={req.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs space-y-2 relative transition-all hover:bg-gray-100/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-gray-900 text-sm capitalize">{req.leaveType}</span>
                        <p className="text-[9px] text-gray-400 font-bold mt-0.5">Applied: {req.createdAt?.toDate?.() ? new Date(req.createdAt.toDate()).toLocaleDateString("en-IN") : "Just now"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase border tracking-wider ${
                          req.status === "Approved" ? "bg-green-50 text-green-700 border-green-100" :
                          req.status === "Rejected" ? "bg-red-50 text-red-700 border-red-100" :
                          "bg-purple-50 text-purple-700 border-purple-100 animate-pulse"
                        }`}>
                          {req.status}
                        </span>
                        
                        {req.status === "Pending" && (
                          <button
                            onClick={() => handleDeleteLeave(req.id)}
                            className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Cancel Application"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/50 space-y-1">
                      <p className="text-[10px] text-gray-500 font-bold">
                        <span className="text-gray-900 font-black">Leave Period:</span> {new Date(req.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} to {new Date(req.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-[10px] text-gray-600 font-medium italic mt-1 leading-relaxed bg-white p-2 rounded-lg border border-gray-100">
                        "{req.reason}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Attendance Logs List Table */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 border-b border-gray-50 pb-3">
          <FiClock className="text-emerald-600" />
          My Clock-In & Attendance History
        </h3>

        {attendanceLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <FiClock size={28} className="mx-auto mb-2 opacity-25" />
            <p className="text-xs font-bold">No clock-in records logged in directory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Punch In Time</th>
                  <th className="px-3 py-2">Punch Out Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {attendanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/30">
                    <td className="px-3 py-2.5 font-bold text-gray-800">
                      {new Date(log.date).toLocaleDateString("en-IN", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black uppercase text-[9px] border tracking-wider ${
                        log.status === "Present" ? "bg-green-50 text-green-700 border-green-100" :
                        log.status === "Late" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        log.status === "On Leave" ? "bg-blue-50 text-blue-700 border-blue-100" :
                        "bg-red-50 text-red-700 border-red-100"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 font-semibold">{log.logInTime}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-semibold">{log.logOutTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
