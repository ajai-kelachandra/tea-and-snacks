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
  FiUploadCloud,
  FiDownload,
  FiCheckCircle,
  FiX,
  FiPhone,
} from "react-icons/fi";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  phone: string;
  joinDate: string;
  status: string;
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
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [status, setStatus] = useState("Active");
  const [saving, setSaving] = useState(false);

  // Bulk Import States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<Omit<Employee, "id" | "createdAt">[]>([]);
  const [importing, setImporting] = useState(false);

  // Clear Database States
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "employees"), orderBy("employeeId", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setEmployees([]);
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
    if (!empId.trim() || !name.trim() || !email.trim() || !joinDate || !jobTitle.trim() || !phone.trim()) {
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
        jobTitle,
        phone,
        joinDate,
        status,
        createdAt: serverTimestamp(),
      });

      toast.success(`${name} added to the HR directory! 🎉`);
      // Reset form
      setEmpId("");
      setName("");
      setEmail("");
      setDepartment("Engineering");
      setJobTitle("");
      setPhone("");
      setJoinDate("");
      setStatus("Active");
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

  const handleDownloadTemplate = () => {
    const wsData = [
      ["employeeId", "name", "department", "jobTitle", "email", "phone", "joinDate", "status"],
      ["EMP-106", "Sarah Jenkins", "Engineering", "Software Engineer", "sarah.j@iro.com", "+91 98765 43210", "2026-05-19", "Active"],
      ["EMP-107", "Emily Watson", "Human Resources", "HR Manager", "emily.w@iro.com", "+91 99999 88888", "2026-04-10", "Active"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees Template");
    XLSX.writeFile(wb, "employees_import_template.xlsx");
    toast.success("Excel template downloaded! 📁");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length === 0) {
          toast.error("The Excel sheet is empty.");
          return;
        }

        const parsed: Omit<Employee, "id" | "createdAt">[] = data.map((row: any) => {
          const employeeId = (row.employeeId || row.id || row.EmployeeID || row["Employee ID"] || row["Employee Id"] || "").toString().trim().toUpperCase();
          const name = (row.name || row.Name || row["Full Name"] || row["FullName"] || "").toString().trim();
          const email = (row.email || row.Email || row["Email Address"] || "").toString().trim().toLowerCase();
          const department = (row.department || row.Department || "Engineering").toString().trim();
          const jobTitle = (row.jobTitle || row.JobTitle || row["Job Title"] || "Staff").toString().trim();
          const phone = (row.phone || row.Phone || row["Phone Number"] || "-").toString().trim();
          const status = (row.status || row.Status || "Active").toString().trim();
          
          let joinDate = row.joinDate || row["Join Date"] || row.joiningDate || row["Joining Date"] || row.dateJoined || row["Date Joined"];
          if (typeof joinDate === "number") {
            const date = new Date((joinDate - 25569) * 86400 * 1000);
            joinDate = date.toISOString().split("T")[0];
          } else if (joinDate) {
            joinDate = new Date(joinDate).toISOString().split("T")[0];
          } else {
            joinDate = new Date().toISOString().split("T")[0];
          }

          return { employeeId, name, email, department, jobTitle, phone, joinDate, status };
        });

        setPreviewData(parsed);
        toast.success(`Successfully parsed ${parsed.length} employees from Excel!`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse Excel file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportSubmit = async () => {
    if (previewData.length === 0) return;
    setImporting(true);
    try {
      const { writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);

      previewData.forEach((emp) => {
        const docRef = doc(collection(db, "employees"));
        batch.set(docRef, {
          ...emp,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
      toast.success(`Successfully imported ${previewData.length} employees! 🚀`);
      setPreviewData([]);
      setIsBulkModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to bulk import employee records.");
    } finally {
      setImporting(false);
    }
  };

  const handleClearAllEmployees = async () => {
    setIsClearingAll(true);
    try {
      const { writeBatch, getDocs, collection } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "employees"));
      if (snap.empty) {
        toast.success("Employee database is already empty!");
        setIsClearAllModalOpen(false);
        return;
      }

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });

      await batch.commit();
      toast.success("Entire employee directory cleared! 🧹");
      setIsClearAllModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear employee database.");
    } finally {
      setIsClearingAll(false);
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsClearAllModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-bold rounded-xl border border-red-100 transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
          >
            <FiTrash2 size={14} />
            Clear Directory
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
          >
            <FiUploadCloud size={14} />
            Bulk Import (Excel)
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
          >
            <FiUserPlus size={14} />
            Add New Employee
          </button>
        </div>
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
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="text-xs font-black bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                      {emp.employeeId}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${getAvatarBg(emp.department)}`}>
                        {getInitials(emp.name)}
                      </div>
                      <p className="font-bold text-gray-900 text-xs leading-none">{emp.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      emp.department === "Engineering" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                      emp.department === "Human Resources" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                      emp.department === "Operations" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                      emp.department === "Marketing" ? "bg-pink-50 text-pink-700 border border-pink-100" :
                      emp.department === "Finance" ? "bg-teal-50 text-teal-700 border border-teal-100" :
                      "bg-gray-50 text-gray-700 border border-gray-100"
                    }`}>
                      {emp.department}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-gray-700">
                    {emp.jobTitle || "Staff"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500 font-semibold">
                    {emp.email}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 font-medium">
                    {emp.phone || "-"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500 font-bold">
                    {new Date(emp.joinDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      (emp.status || "Active").toLowerCase() === "active" 
                        ? "bg-green-50 text-green-700 border border-green-100" 
                        : "bg-red-50 text-red-700 border border-red-100"
                    }`}>
                      {emp.status || "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="input-field text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field text-xs font-bold"
                    required
                  />
                </div>
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

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input-field text-xs bg-white font-bold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
              Are you sure you want to remove this employee? This will permanently delete their account profile from the IRO People directory.
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

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsBulkModalOpen(false); setPreviewData([]); }} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 animate-scaleUp overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-50 mb-4">
              <div className="flex items-center gap-2.5 text-emerald-600">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <FiUploadCloud size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Bulk Import via Excel</h3>
                  <p className="text-xs text-gray-400">Import hundreds of employees in one-click.</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsBulkModalOpen(false); setPreviewData([]); }}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Step 1 */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#1d4ed8]">Step 1</span>
                  <h4 className="font-bold text-gray-900 text-sm mt-1">Download Template</h4>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">Get our pre-formatted Excel template with correct header definitions to prevent mapping mismatches.</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
                >
                  <FiDownload size={13} />
                  Download Template (.xlsx)
                </button>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Step 2</span>
                  <h4 className="font-bold text-gray-900 text-sm mt-1">Upload Excel File</h4>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">Select or drop your populated excel spreadsheet or CSV file below to instantly validate the data.</p>
                </div>
                <label className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all duration-150 active:scale-95 cursor-pointer shadow-sm">
                  <FiUploadCloud size={13} />
                  Select File
                  <input 
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* Preview Section */}
            {previewData.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Preview Parsed Records ({previewData.length})</h4>
                  <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Format Valid</span>
                </div>
                
                <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-bold text-gray-500 uppercase">ID</th>
                        <th className="px-3 py-2 font-bold text-gray-500 uppercase">Name</th>
                        <th className="px-3 py-2 font-bold text-gray-500 uppercase">Department</th>
                        <th className="px-3 py-2 font-bold text-gray-500 uppercase">Job Title</th>
                        <th className="px-3 py-2 font-bold text-gray-500 uppercase">Email</th>
                        <th className="px-3 py-2 font-bold text-gray-500 uppercase">Phone</th>
                        <th className="px-3 py-2 font-bold text-gray-500 uppercase">Join Date</th>
                        <th className="px-3 py-2 font-bold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {previewData.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-bold text-gray-950">{emp.employeeId}</td>
                          <td className="px-3 py-2 text-gray-700 font-medium">{emp.name}</td>
                          <td className="px-3 py-2 text-gray-700">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-50 border border-gray-100 text-gray-600">{emp.department}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-700 font-medium">{emp.jobTitle}</td>
                          <td className="px-3 py-2 text-gray-500">{emp.email}</td>
                          <td className="px-3 py-2 text-gray-600 font-medium">{emp.phone}</td>
                          <td className="px-3 py-2 text-gray-500 font-medium">{emp.joinDate}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                              (emp.status || "Active").toLowerCase() === "active" 
                                ? "bg-green-50 text-green-700" 
                                : "bg-red-50 text-red-700"
                            }`}>
                              {emp.status || "Active"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => { setIsBulkModalOpen(false); setPreviewData([]); }}
                disabled={importing}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={importing || previewData.length === 0}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-100"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheckCircle size={14} />
                    Import All Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Employees Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsClearAllModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <FiTrash2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Clear Employee Directory?</h3>
            </div>
            
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
              Are you sure you want to clear the entire employee database? This will permanently delete all records, including any dummy data, from the Firestore directory. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                disabled={isClearingAll}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllEmployees}
                disabled={isClearingAll}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-100"
              >
                {isClearingAll ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Clear Directory"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
