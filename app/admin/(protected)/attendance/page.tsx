"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  setDoc,
} from "firebase/firestore";
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiUserCheck,
  FiFileText,
  FiSearch,
  FiCheck,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
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

interface TimesheetEntry {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  date: string;
  project: string;
  hours: number;
  description: string;
  createdAt: any;
}

const MOCK_LEAVE_REQUESTS = [
  { employeeId: "EMP-101", name: "Alice Vance", department: "Engineering", leaveType: "Sick Leave", startDate: "2026-05-20", endDate: "2026-05-22", reason: "Recovering from wisdom teeth extraction surgery", status: "Pending" },
  { employeeId: "EMP-102", name: "Bob Peterson", department: "Operations", leaveType: "Casual Leave", startDate: "2026-05-25", endDate: "2026-05-26", reason: "Attending primary family wedding function", status: "Approved" },
  { employeeId: "EMP-103", name: "Carol Smith", department: "Human Resources", leaveType: "Annual Leave", startDate: "2026-06-01", endDate: "2026-06-05", reason: "Pre-planned family vacation out of town", status: "Pending" },
];

export default function LeaveAttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filter States
  const [activeTab, setActiveTab] = useState<"attendance" | "timesheets">("attendance");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [timesheetSearch, setTimesheetSearch] = useState("");

  useEffect(() => {
    // 1. Fetch all registered employees
    const unsubEmployees = onSnapshot(
      query(collection(db, "employees"), orderBy("employeeId", "asc")),
      async (snapshot) => {
        const empList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Employee[];
        setEmployees(empList);

        // Seed default leave requests if none exist
        const leaveSnap = await getDocs(collection(db, "leaveRequests"));
        if (leaveSnap.empty) {
          for (const req of MOCK_LEAVE_REQUESTS) {
            await addDoc(collection(db, "leaveRequests"), {
              ...req,
              createdAt: serverTimestamp(),
            });
          }
        }
      },
      (err) => console.error("Failed to load employees:", err)
    );

    // 2. Listen to real-time leave requests
    const unsubLeaves = onSnapshot(
      query(collection(db, "leaveRequests"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const leaves = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LeaveRequest[];
        setLeaveRequests(leaves);
      },
      (err) => console.error("Failed to load leave requests:", err)
    );

    // 3. Listen to real-time timesheets
    const unsubTimesheets = onSnapshot(
      query(collection(db, "timesheets"), orderBy("date", "desc")),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TimesheetEntry[];
        setTimesheetEntries(list);
      },
      (err) => console.error("Failed to load timesheets:", err)
    );

    return () => {
      unsubEmployees();
      unsubLeaves();
      unsubTimesheets();
    };
  }, []);

  // 3. Listen to real-time attendance logs for the selected date
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "attendance"));
    const unsubAttendance = onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AttendanceLog[];
      
      // Filter for the selected date
      const dateLogs = allLogs.filter((log) => log.date === selectedDate);
      setAttendance(dateLogs);
      setLoading(false);
    }, (err) => {
      console.error("Failed to load attendance logs:", err);
      setLoading(false);
    });

    return () => unsubAttendance();
  }, [selectedDate]);

  // Quick Action: Update Attendance Status
  const handleMarkAttendance = async (
    emp: Employee,
    status: "Present" | "Absent" | "Late" | "On Leave"
  ) => {
    try {
      // Find if entry already exists for this date and employee
      const existingLog = attendance.find((log) => log.employeeId === emp.employeeId);
      
      let logInTime = "-";
      let logOutTime = "-";
      
      if (status === "Present") {
        logInTime = "09:00 AM";
        logOutTime = "06:00 PM";
      } else if (status === "Late") {
        logInTime = "10:15 AM";
        logOutTime = "06:00 PM";
      }

      const logData = {
        date: selectedDate,
        employeeId: emp.employeeId,
        name: emp.name,
        status,
        logInTime,
        logOutTime,
      };

      if (existingLog) {
        // Update existing record
        await updateDoc(doc(db, "attendance", existingLog.id), logData);
      } else {
        // Add new record with deterministic custom doc ID
        const customId = `${selectedDate}_${emp.employeeId}`;
        await setDoc(doc(db, "attendance", customId), logData);
      }

      toast.success(`${emp.name} marked as ${status}! 🗓️`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update attendance status.");
    }
  };

  // Leave approval actions
  const handleUpdateLeaveStatus = async (reqId: string, status: "Approved" | "Rejected") => {
    try {
      await updateDoc(doc(db, "leaveRequests", reqId), { status });
      toast.success(`Leave request successfully ${status}! ✉️`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update leave application.");
    }
  };

  // Stats Calculations
  const totalEmployees = employees.length;
  const presentCount = attendance.filter((log) => log.status === "Present" || log.status === "Late").length;
  const lateCount = attendance.filter((log) => log.status === "Late").length;
  const absentCount = attendance.filter((log) => log.status === "Absent").length;
  const leaveCount = attendance.filter((log) => log.status === "On Leave").length;

  const presentPercentage = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;
  const pendingLeavesCount = leaveRequests.filter((req) => req.status === "Pending").length;

  // Filtered employees list for attendance sheet
  const filteredEmployeesForAttendance = employees.filter((emp) => {
    return (
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 font-dm-sans animate-fadeIn">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FiCalendar className="text-[#1d4ed8]" />
            Leave & Attendance Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Approve leave applications and log daily employee attendance.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-black uppercase text-gray-400">Target Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field text-xs font-bold bg-white border border-gray-100 py-2 px-3 rounded-xl cursor-pointer"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Daily Present Rate</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{presentPercentage}%</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{presentCount} of {totalEmployees} employees active today</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Late Arrivals</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{lateCount}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Arrived after 09:15 AM shifts</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">On Approved Leaves</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{leaveCount}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Welfare vacation leaves</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Pending Leave Applications</p>
          <p className="text-3xl font-black text-purple-600 mt-1">{pendingLeavesCount}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Awaiting manager assessment</p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-150">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "attendance"
              ? "border-[#1d4ed8] text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Attendance & Leaves
        </button>
        <button
          onClick={() => setActiveTab("timesheets")}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "timesheets"
              ? "border-[#1d4ed8] text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Employee Timesheets
        </button>
      </div>

      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Daily Attendance Log Sheet (col-span-2) */}
          <div className="xl:col-span-2 space-y-4">
            <div className="card p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-50 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <FiClock className="text-blue-600" />
                    Daily Shift Log Sheet
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Attendance logs for {new Date(selectedDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search shift sheet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-8 text-xs py-1.5"
                  />
                </div>
              </div>

              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-gray-50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : filteredEmployeesForAttendance.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <FiAlertCircle size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">No employee records registered in directory.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[650px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                        <th className="px-3 py-2.5">ID</th>
                        <th className="px-3 py-2.5">Employee Name</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Punch In</th>
                        <th className="px-3 py-2.5">Punch Out</th>
                        <th className="px-3 py-2.5 text-center">Log Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {filteredEmployeesForAttendance.map((emp) => {
                        const log = attendance.find((l) => l.employeeId === emp.employeeId);
                        const currentStatus = log?.status || "Absent";
                        
                        return (
                          <tr key={emp.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-3 font-bold text-gray-900">{emp.employeeId}</td>
                            <td className="px-3 py-3 font-semibold text-gray-800">{emp.name}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black uppercase text-[9px] border tracking-wider ${
                                currentStatus === "Present" ? "bg-green-50 text-green-700 border-green-100" :
                                currentStatus === "Late" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                currentStatus === "On Leave" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                "bg-red-50 text-red-700 border-red-100"
                              }`}>
                                {currentStatus}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-gray-500 font-semibold">{log?.logInTime || "-"}</td>
                            <td className="px-3 py-3 text-gray-500 font-semibold">{log?.logOutTime || "-"}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleMarkAttendance(emp, "Present")}
                                  className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    currentStatus === "Present"
                                      ? "bg-green-600 text-white shadow-sm"
                                      : "bg-green-50 text-green-600 hover:bg-green-100"
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(emp, "Late")}
                                  className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    currentStatus === "Late"
                                      ? "bg-amber-500 text-white shadow-sm"
                                      : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                  }`}
                                >
                                  Late
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(emp, "Absent")}
                                  className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    currentStatus === "Absent"
                                      ? "bg-red-600 text-white shadow-sm"
                                      : "bg-red-50 text-red-600 hover:bg-red-100"
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(emp, "On Leave")}
                                  className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    currentStatus === "On Leave"
                                      ? "bg-blue-600 text-white shadow-sm"
                                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  }`}
                                >
                                  Leave
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
  
          {/* Leave Requests Management Panel (col-span-1) */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 border-b border-gray-50 pb-3">
                <FiFileText className="text-purple-600" />
                Leave Applications Review
              </h3>
  
              {leaveRequests.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <FiFileText size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">No leave applications submitted.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {leaveRequests.map((req) => (
                    <div key={req.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2 text-xs relative overflow-hidden transition-all hover:bg-gray-100/50">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900 text-sm leading-none">{req.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{req.employeeId} • {req.department}</p>
                        </div>
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-black text-[9px] uppercase border tracking-wider ${
                          req.status === "Approved" ? "bg-green-50 text-green-700 border-green-100" :
                          req.status === "Rejected" ? "bg-red-50 text-red-700 border-red-100" :
                          "bg-purple-50 text-purple-700 border-purple-100 animate-pulse"
                        }`}>
                          {req.status}
                        </span>
                      </div>
  
                      <div className="pt-1.5 border-t border-gray-200/50 space-y-1">
                        <p className="text-[10px] text-gray-500 font-bold">
                          <span className="text-gray-900 font-black">Type:</span> {req.leaveType}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold">
                          <span className="text-gray-900 font-black">Duration:</span> {new Date(req.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} to {new Date(req.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-[10px] text-gray-600 font-medium italic mt-1 leading-relaxed bg-white p-2 rounded-lg border border-gray-100">
                          "{req.reason}"
                        </p>
                      </div>
  
                      {req.status === "Pending" && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleUpdateLeaveStatus(req.id, "Approved")}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer uppercase tracking-wider shadow-sm"
                          >
                            <FiCheck size={11} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateLeaveStatus(req.id, "Rejected")}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] rounded-lg border border-red-100 transition-colors cursor-pointer uppercase tracking-wider"
                          >
                            <FiX size={11} />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
  
        </div>
      )}

      {activeTab === "timesheets" && (
        <div className="card p-5 space-y-4 animate-fadeIn bg-white border border-gray-200 rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-50 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <FiClock className="text-[#1d4ed8]" />
                Employee Timesheet Activity Registry
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Auditing logged work hours and daily activity records across all departments.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search timesheets (Name, Project, Task)..."
                value={timesheetSearch}
                onChange={(e) => setTimesheetSearch(e.target.value)}
                className="input-field pl-8 text-xs py-1.5"
              />
            </div>
          </div>

          {(() => {
            const filteredTimesheets = timesheetEntries.filter((entry) => {
              const query = timesheetSearch.toLowerCase();
              return (
                entry.name.toLowerCase().includes(query) ||
                entry.employeeId.toLowerCase().includes(query) ||
                entry.project.toLowerCase().includes(query) ||
                (entry.description || "").toLowerCase().includes(query)
              );
            });

            if (filteredTimesheets.length === 0) {
              return (
                <div className="py-12 text-center text-gray-400">
                  <FiAlertCircle size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">No timesheet records found.</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Either no hours have been logged or search query didn't match any results.</p>
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[750px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">Employee Name</th>
                      <th className="px-3 py-2.5">Department</th>
                      <th className="px-3 py-2.5">Project / Task</th>
                      <th className="px-3 py-2.5">Logged Hours</th>
                      <th className="px-3 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {filteredTimesheets.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-3 font-bold text-gray-900">
                          {new Date(entry.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="px-3 py-3 font-bold text-gray-500">{entry.employeeId}</td>
                        <td className="px-3 py-3 font-semibold text-gray-800">{entry.name}</td>
                        <td className="px-3 py-3 text-gray-500 font-semibold">{entry.department}</td>
                        <td className="px-3 py-3">
                          <span className="inline-block bg-blue-50 border border-blue-100/50 text-[#1d4ed8] font-black px-2 py-0.5 rounded text-[10px]">
                            {entry.project}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-emerald-600">{entry.hours.toFixed(1)} hrs</td>
                        <td className="px-3 py-3 text-gray-500 font-medium max-w-sm truncate" title={entry.description}>
                          {entry.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
