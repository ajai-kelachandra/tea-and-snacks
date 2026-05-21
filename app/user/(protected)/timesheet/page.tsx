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
  FiClock,
  FiCalendar,
  FiBriefcase,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2
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

interface TimesheetEntry {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  date: string;
  project: string;
  hours: number;
  description: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: any;
}

export default function TimesheetPage() {
  const { userEmail } = useAppSelector((s) => s.auth);

  // States
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [project, setProject] = useState("Software Engineering");
  const [hours, setHours] = useState<number>(8);
  const [description, setDescription] = useState("");
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
        console.error("Failed to load employee details:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userEmail]);

  // 2. Fetch timesheet logs once employee profile is loaded
  useEffect(() => {
    if (!employee) return;

    setLoading(true);

    const unsubTimesheets = onSnapshot(
      collection(db, "timesheets"),
      (snapshot) => {
        const list = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as any))
          .filter((req) => req.employeeId === employee.employeeId);

        // Sort descending by date
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setEntries(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load timesheet entries:", err);
        setLoading(false);
      }
    );

    return () => unsubTimesheets();
  }, [employee]);

  // Log Hours Submission
  const handleSubmitHours = async (e: FormEvent) => {
    e.preventDefault();
    if (!employee) {
      toast.error("Profile not found in directory. Contact administrator.");
      return;
    }
    if (!date || !project.trim() || hours <= 0 || !description.trim()) {
      toast.error("Please fill in all timesheet fields.");
      return;
    }
    if (hours > 24) {
      toast.error("Hours logged cannot exceed 24 hours per day.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "timesheets"), {
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        date,
        project: project.trim(),
        hours,
        description: description.trim(),
        status: "Logged",
        createdAt: serverTimestamp(),
      });

      // Dispatch automated Resend notification email
      try {
        await fetch("/api/send-timesheet-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId: employee.employeeId,
            name: employee.name,
            department: employee.department,
            date,
            project: project.trim(),
            hours,
            description: description.trim(),
          }),
        });
      } catch (emailErr) {
        console.error("Failed to dispatch timesheet notification email:", emailErr);
      }

      toast.success("Timesheet hours submitted successfully! 🚀");
      // Reset form fields
      setDescription("");
      setHours(8);
      setDate(new Date().toISOString().split("T")[0]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to log timesheet hours.");
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke/Delete Timesheet Entry
  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, "timesheets", id));
      toast.success("Hours entry revoked successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to revoke entry.");
    }
  };

  // Summary Metrics
  const totalLoggedHours = entries.reduce((sum, item) => sum + item.hours, 0);
  const totalDays = new Set(entries.map((item) => item.date)).size;
  const avgHours = totalLoggedHours / (totalDays || 1);

  return (
    <div className="space-y-6 font-dm-sans text-[var(--text-primary)] animate-fadeIn">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FiClock className="text-[#1d4ed8]" />
          Timesheet Logs
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Log daily project activities and track weekly workspace hours.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Total Hours Logged</span>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{totalLoggedHours.toFixed(1)}</p>
          <span className="text-[9px] text-[var(--text-muted)] font-medium block mt-0.5">Accumulated hours</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Days Logged</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{totalDays}</p>
          <span className="text-[9px] text-[var(--text-muted)] font-medium block mt-0.5">Unique working days</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Average Hours / Day</span>
          <p className="text-2xl font-black text-[#1d4ed8] mt-1">{avgHours.toFixed(1)}</p>
          <span className="text-[9px] text-[var(--text-muted)] font-medium block mt-0.5">Average logged active hours</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Log Hours Form Panel */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <FiPlus className="text-[#1d4ed8]" size={16} />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Log Daily Hours</h2>
          </div>

          <form onSubmit={handleSubmitHours} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent [color-scheme:light_dark]"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Project / Task</label>
              <input
                type="text"
                placeholder="e.g. Software Engineering"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Hours Logged</label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Activity Description</label>
              <textarea
                rows={3}
                placeholder="Brief summary of tasks accomplished..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent placeholder:text-gray-400 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !employee}
              className="w-full bg-[#1d4ed8] text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#1e40af] transition-colors disabled:opacity-50 active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Submit Hours Log"
              )}
            </button>
          </form>
        </div>

        {/* Timesheet Registry Log */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 mb-4">
              <FiBriefcase className="text-[#1d4ed8]" size={16} />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Activity Registry</h2>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <FiAlertCircle size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold">No hours logged yet</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Your timesheet registry is currently empty.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 bg-[var(--bg-hover)] border border-[var(--border)] rounded-2xl flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{entry.project}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider flex items-center gap-1">
                          <FiCalendar size={10} />
                          {new Date(entry.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed truncate max-w-lg">
                        {entry.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-[var(--text-primary)] block">{entry.hours.toFixed(1)} hrs</span>
                      </div>

                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50/10 rounded-lg transition-colors cursor-pointer"
                        title="Revoke entry"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
