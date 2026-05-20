"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/hooks";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiCoffee,
  FiAlertCircle,
  FiArrowRight,
  FiPlus,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiArrowLeft,
  FiUsers,
  FiMoreVertical
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

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  status: "todo" | "in_progress" | "in_review" | "done";
  assigneeName: string;
  assigneeEmail: string;
  assigneeInitials: string;
  project?: string;
  createdAt?: any;
}

interface Project {
  id: string;
  name: string;
}

export default function JiraTasksPage() {
  const router = useRouter();
  const { userEmail } = useAppSelector((s) => s.auth);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Projects — live from Firestore (read-only for employees)
  const [projects, setProjects] = useState<Project[]>([]);

  // Project Selection state
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Drag states for visual cues
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Dropdown states for 3-dot popover menu
  const [activeDropdownTaskId, setActiveDropdownTaskId] = useState<string | null>(null);

  // Close task dropdowns when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownTaskId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // 0. Load projects from Firestore (read-only for employees)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as Project))
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setProjects(list);
        setSelectedProject((prev) => {
          if (prev && list.find((p) => p.name === prev)) return prev;
          return list[0]?.name || "";
        });
      },
      (err) => console.error("Failed to load projects:", err)
    );
    return () => unsub();
  }, []);

  // 1. Load active employee and all registered employees (assignees)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployeesList(list);

        if (userEmail) {
          const match = list.find((emp) => emp.email?.toLowerCase() === userEmail.toLowerCase());
          if (match) {
            setEmployee(match);
          }
        }
      },
      (err) => {
        console.error("Failed to load employee list:", err);
      }
    );

    return () => unsub();
  }, [userEmail]);

  // 2. Load and seed tasks in real-time from Firestore tasks collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "tasks"),
      async (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
        
        // Seed default dummy tasks in database if it is empty so it looks breathtaking immediately
        if (snapshot.empty) {
          const initialSeeds = [
            {
              title: "Design Snack Ordering System Flow",
              description: "Map out the complete registration and purchase steps for snack selection.",
              priority: "High",
              status: "in_progress",
              assigneeName: "Ajai Kc",
              assigneeEmail: "ajai.kc@iroidtechnologies.com",
              assigneeInitials: "AK",
              createdAt: serverTimestamp()
            },
            {
              title: "Implement Leave Balance Dashboard View",
              description: "Develop the frontend visual calendar block with balance numbers.",
              priority: "Medium",
              status: "todo",
              assigneeName: "Rahul S",
              assigneeEmail: "rahul.s@iroidtechnologies.com",
              assigneeInitials: "RS",
              createdAt: serverTimestamp()
            },
            {
              title: "Firebase Firestore Migration",
              description: "Migrate the static local user states into live Firestore onSnapshot list.",
              priority: "Low",
              status: "done",
              assigneeName: "Nisha P",
              assigneeEmail: "nisha.p@iroidtechnologies.com",
              assigneeInitials: "NP",
              createdAt: serverTimestamp()
            }
          ];

          for (const task of initialSeeds) {
            await addDoc(collection(db, "tasks"), task);
          }
        } else {
          // Sort tasks by date created if possible
          setTasks(list);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Tasks subscription failed:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverColumn(colKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: "todo" | "in_progress" | "in_review" | "done") => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    try {
      await updateDoc(doc(db, "tasks", taskId), { status: targetStatus });
      toast.success(`Task moved to ${targetStatus.toUpperCase().replace("_", " ")}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to move task");
    }
  };

  // Keyboard/button action fallback status shifts
  const moveTask = async (taskId: string, currentStatus: string, direction: "prev" | "next") => {
    const statusOrder: ("todo" | "in_progress" | "in_review" | "done")[] = [
      "todo",
      "in_progress",
      "in_review",
      "done"
    ];
    const currentIndex = statusOrder.indexOf(currentStatus as any);
    let newIndex = currentIndex;
    
    if (direction === "next" && currentIndex < statusOrder.length - 1) {
      newIndex++;
    } else if (direction === "prev" && currentIndex > 0) {
      newIndex--;
    }

    if (newIndex !== currentIndex) {
      try {
        await updateDoc(doc(db, "tasks", taskId), { status: statusOrder[newIndex] });
        toast.success(`Task shifted to ${statusOrder[newIndex].toUpperCase().replace("_", " ")}`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to shift task status");
      }
    }
  };

  const changeTaskStatus = async (taskId: string, newStatus: "todo" | "in_progress" | "in_review" | "done") => {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
      toast.success(`Task status changed to ${newStatus.toUpperCase().replace("_", " ")}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to change task status");
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Retrieving task board database…</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto bg-white border border-gray-150 shadow-sm mt-8 space-y-4">
        <FiAlertCircle size={40} className="mx-auto text-red-500 animate-pulse" />
        <h2 className="text-lg font-bold text-gray-900">Task Board Access Restricted</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your active email <span className="font-semibold text-gray-900">{userEmail}</span> is not registered in the directory. Please request your HR administrator to set up your directory card first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-dm-sans text-gray-800 animate-fadeIn pb-12">
      
      {/* Upper Header Greetings - Minimal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/user/home")}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors tracking-wider"
          >
            <FiArrowLeft size={12} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2 mt-1">
            <span>Jira Workspace Board</span>
            <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200/50 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full select-none">
              LIVE SYNC
            </span>
          </h1>
          <p className="text-[11px] text-gray-400 font-medium">
            Manage your daily tasks, team collaborations, and updates in real-time. Drag and drop cards to change status!
          </p>
        </div>
        <div className="text-[10px] text-gray-455 font-semibold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm shrink-0 w-max select-none">
          📅 {new Date().toLocaleDateString("en-IN", { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* Jira Kanban Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search tasks or assignee…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        {/* Project Selection Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider select-none">
            Project:
          </span>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="pl-3 pr-8 py-2 text-xs font-bold border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 cursor-pointer appearance-none relative text-gray-800 shadow-sm"
            style={{ 
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, 
              backgroundRepeat: "no-repeat", 
              backgroundPosition: "right 10px center", 
              backgroundSize: "12px" 
            }}
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.name}>
                📁 {proj.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {/* Columns Mapping */}
        {(
          [
            { key: "todo", label: "To Do", border: "border-t-gray-300", bg: "bg-gray-50/50" },
            { key: "in_progress", label: "In Progress", border: "border-t-blue-500", bg: "bg-blue-50/5" },
            { key: "in_review", label: "In Review", border: "border-t-amber-500", bg: "bg-amber-55/5" },
            { key: "done", label: "Done", border: "border-t-emerald-500", bg: "bg-emerald-50/5" }
          ] as const
        ).map(col => {
          const colTasks = tasks.filter(t => {
            if (t.status !== col.key) return false;
            
            // Filter dynamically by project selection
            const taskProject = t.project || "Software Engineering";
            if (taskProject !== selectedProject) return false;

            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
              t.title.toLowerCase().includes(query) ||
              t.description.toLowerCase().includes(query) ||
              t.assigneeName.toLowerCase().includes(query)
            );
          });

          const isOver = dragOverColumn === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`border rounded-2xl p-4 flex flex-col min-h-[500px] space-y-4 border-t-2 transition-all duration-200 ${col.border} ${
                isOver ? "bg-blue-50/40 border-dashed border-blue-400 scale-[1.01]" : `${col.bg} border-gray-100`
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-gray-100/50 pb-2">
                <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">{col.label}</span>
                <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded-full shadow-sm">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards List */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="h-28 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-center p-3 select-none">
                    <span className="text-[10px] text-gray-400 font-medium">No tasks here</span>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="bg-white border border-gray-150 rounded-xl p-3.5 shadow-sm space-y-3 hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing relative group active:scale-[0.98] select-none hover:shadow"
                    >
                      {/* Title & 3-Dot Status trigger */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-gray-900 leading-snug group-hover:text-[#1d4ed8] transition-colors pr-2">
                          {task.title}
                        </h4>
                        
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownTaskId(prev => (prev === task.id ? null : task.id));
                            }}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors shrink-0 flex items-center justify-center border border-transparent hover:border-gray-150 active:scale-95"
                            title="Task status actions"
                          >
                            <FiMoreVertical size={14} />
                          </button>

                          {activeDropdownTaskId === task.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full right-0 mt-1 z-35 bg-white border border-gray-150 rounded-xl shadow-xl p-1 min-w-[130px] flex flex-col space-y-0.5 animate-fadeIn"
                            >
                              <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-2.5 py-1 select-none border-b border-gray-50 pb-1 mb-1">
                                Move Task To:
                              </div>
                              {(
                                [
                                  { key: "todo", label: "To Do" },
                                  { key: "in_progress", label: "In Progress" },
                                  { key: "in_review", label: "In Review" },
                                  { key: "done", label: "Done" }
                                ] as const
                              ).map((statusOption) => {
                                const isActive = task.status === statusOption.key;
                                return (
                                  <button
                                    key={statusOption.key}
                                    onClick={() => {
                                      changeTaskStatus(task.id, statusOption.key);
                                      setActiveDropdownTaskId(null);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between ${
                                      isActive 
                                        ? "bg-blue-50 text-blue-700" 
                                        : "text-gray-655 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                  >
                                    <span>{statusOption.label}</span>
                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-[10px] text-gray-505 leading-relaxed line-clamp-3">
                          {task.description}
                        </p>
                      )}

                      {/* Priority & Assignee */}
                      <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 mt-1">
                        {/* Priority Tag */}
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          task.priority === "High"
                            ? "bg-rose-50 text-rose-600 border border-rose-100/30"
                            : task.priority === "Medium"
                            ? "bg-amber-50 text-amber-600 border border-amber-100/30"
                            : "bg-gray-50 text-gray-500 border border-gray-100"
                        }`}>
                          {task.priority}
                        </span>

                        {/* Assignee Avatar */}
                        <div
                          className="w-5.5 h-5.5 bg-blue-50 text-[#1d4ed8] border border-blue-100 rounded-full flex items-center justify-center text-[9px] font-bold select-none cursor-help shrink-0"
                          title={`Assignee: ${task.assigneeName} (${task.assigneeEmail})`}
                        >
                          {task.assigneeInitials}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>


    </div>
  );
}
