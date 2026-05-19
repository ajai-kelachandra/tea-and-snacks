"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiPlus,
  FiTrash2,
  FiBriefcase,
  FiMail,
  FiCalendar,
  FiUserPlus,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  joinDate: string;
  createdAt: any;
}

const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Operations",
  "Marketing",
  "Finance",
  "QA",
];

const MOCK_EMPLOYEES = [
  { employeeId: "EMP-101", name: "Alice Vance", email: "alice.v@iro.com", department: "Engineering", joinDate: "2024-01-15" },
  { employeeId: "EMP-102", name: "Bob Peterson", email: "bob.p@iro.com", department: "Operations", joinDate: "2024-03-10" },
  { employeeId: "EMP-103", name: "Carol Smith", email: "carol.s@iro.com", department: "Human Resources", joinDate: "2023-11-05" },
  { employeeId: "EMP-104", name: "David Miller", email: "david.m@iro.com", department: "Marketing", joinDate: "2025-02-28" },
  { employeeId: "EMP-105", name: "Emily Watson", email: "emily.w@iro.com", department: "QA", joinDate: "2024-08-20" },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);

  // Form States
  const [empId, setEmpId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [joinDate, setJoinDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "employees"), orderBy("employeeId", "asc"));
    
    const unsub = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed default employees to make the page instantly premium on first load
        for (const emp of MOCK_EMPLOYEES) {
          await addDoc(collection(db, "employees"), {
            ...emp,
            createdAt: serverTimestamp(),
          });
        }
        setLoading(false);
        return;
      }

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
      
      setEmployees(data);
      setLoading(false);
    }, (err) => {
      console.error("Failed to load employees:", err);
      toast.error("Could not fetch employee database");
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim() || !name.trim() || !email.trim() || !joinDate) {
      toast.error("Please fill in all employee fields.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "employees"), {
        employeeId: empId.toUpperCase(),
        name,
        email: email.toLowerCase(),
        department,
        joinDate,
        createdAt: serverTimestamp(),
      });
      
      toast.success(`${name} added to the HR directory! 🎉`);
      // Reset form
      setEmpId("");
      setName("");
      setEmail("");
      setDepartment("Engineering");
      setJoinDate("");
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add employee.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setTargetDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!targetDeleteId) return;
    try {
      await deleteDoc(doc(db, "employees", targetDeleteId));
      toast.success("Employee removed successfully. 🧹");
      setIsDeleteModalOpen(false);
      setTargetDeleteId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove employee record.");
    }
  };

  // Filter Logic
  const filtered = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase());
    
    const matchDept = deptFilter === "all" || emp.department === deptFilter;
    return matchSearch && matchDept;
  });

  // Stats Counters
  const totalEmployees = employees.length;
  const engineeringCount = employees.filter((e) => e.department === "Engineering").length;
  const hrCount = employees.filter((e) => e.department === "Human Resources").length;
  const operationsCount = employees.filter((e) => e.department === "Operations").length;

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarBg = (dept: string) => {
    switch (dept) {
      case "Engineering": return "bg-blue-50 text-blue-600 border border-blue-100";
      case "Human Resources": return "bg-purple-50 text-purple-600 border border-purple-100";
      case "Operations": return "bg-amber-50 text-amber-600 border border-amber-100";
      case "Marketing": return "bg-pink-50 text-pink-600 border border-pink-100";
      case "Finance": return "bg-teal-50 text-teal-600 border border-teal-100";
      default: return "bg-gray-50 text-gray-600 border border-gray-100";
    }
  };

  return (
    <div className="space-y-6 font-dm-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiUsers className="text-[#1d4ed8]" />
            Employee Directory
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage employee databases and department allocations.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
        >
          <FiUserPlus size={14} />
          Add New Employee
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Total Staff</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{totalEmployees}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Registered Employees</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Engineering</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{engineeringCount}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Developers & Tech</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Operations</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{operationsCount}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Facilities & Support</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">HR & Admin</p>
          <p className="text-3xl font-black text-purple-600 mt-1">{hrCount}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Talent & Operations</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <FiSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees by ID, name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FiFilter size={14} className="text-gray-400 shrink-0" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="input-field text-xs bg-white py-2 px-3 border border-gray-100 rounded-xl cursor-pointer"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee List Grid/Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-16 bg-white border border-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 border border-gray-100">
          <FiUsers size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">No employees found.</p>
          <p className="text-xs mt-1">Try modifying your search or department filter query.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee Info</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joining Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-black bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                      {emp.employeeId}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${getAvatarBg(emp.department)}`}>
                        {getInitials(emp.name)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-none">{emp.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      emp.department === "Engineering" ? "bg-blue-50 text-blue-700" :
                      emp.department === "Human Resources" ? "bg-purple-50 text-purple-700" :
                      emp.department === "Operations" ? "bg-amber-50 text-amber-700" :
                      "bg-gray-50 text-gray-700"
                    }`}>
                      {emp.department}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 font-bold">
                    {new Date(emp.joinDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDeleteClick(emp.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Employee"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 animate-scaleUp">
            <div className="flex items-center gap-2.5 text-[#1d4ed8] mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <FiUserPlus size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Add New Employee</h3>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Employee ID</label>
                <input
                  type="text"
                  placeholder="e.g. EMP-106"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="input-field text-xs font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. sarah.j@iro.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="input-field text-xs bg-white font-bold"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Joining Date</label>
                  <input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="input-field text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1d4ed8] text-white text-xs font-bold hover:bg-[#1e40af] transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-100"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Save Employee"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <FiTrash2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Remove Employee</h3>
            </div>
            
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
              Are you sure you want to remove this employee? This will permanently delete their account profile from the HR Portal directory.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEmployee}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-100"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
