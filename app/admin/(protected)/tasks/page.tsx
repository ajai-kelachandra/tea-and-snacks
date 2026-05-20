"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  FiBriefcase,
  FiCalendar,
  FiPlus,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiAlertCircle,
  FiList,
  FiMoreVertical,
  FiEdit2,
  FiCheck,
  FiX,
  FiFolder,
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
  createdAt?: any;
}

export default function AdminTasksPage() {
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Project states (live from Firestore)
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Project management
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Modal / form states
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [newTaskProject, setNewTaskProject] = useState<string>("Software Engineering");
  
  // Assignee states (defaults to first employee in list if available)
  const [newTaskAssigneeEmail, setNewTaskAssigneeEmail] = useState("");
  const [newTaskAssigneeName, setNewTaskAssigneeName] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Drag states for columns
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Dropdown states for 3-dot popover menu
  const [activeDropdownTaskId, setActiveDropdownTaskId] = useState<string | null>(null);

  // Close task dropdowns when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownTaskId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // 0. Fetch projects from Firestore (live)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as Project))
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setProjects(list);
        // Auto-select first project if none selected
        setSelectedProject((prev) => {
          if (prev && list.find((p) => p.name === prev)) return prev;
          return list[0]?.name || "";
        });
      },
      (err) => console.error("Failed to load projects:", err)
    );
    return () => unsub();
  }, []);

  // 1. Fetch employees list dynamically
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployeesList(list);
        if (list.length > 0) {
          setNewTaskAssigneeEmail(list[0].email);
          setNewTaskAssigneeName(list[0].name);
        }
      },
      (err) => {
        console.error("Failed to fetch employees:", err);
      }
    );
    return () => unsub();
  }, []);

  // 2. Fetch tasks and support seeding if empty
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "tasks"),
      async (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load tasks:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Drag and Drop
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
      toast.success(`Task status shifted to ${targetStatus.toUpperCase().replace("_", " ")}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

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
        toast.error("Failed to shift status");
      }
    }
  };

  const changeTaskStatus = async (taskId: string, newStatus: "todo" | "in_progress" | "in_review" | "done") => {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
      toast.success(`Task status changed to ${newStatus.toUpperCase().replace("_", " ")}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to change status");
    }
  };

  // ── Project CRUD handlers ──────────────────────────────────────
  const handleAddProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    try {
      await addDoc(collection(db, "projects"), { name, createdAt: serverTimestamp() });
      setNewProjectName("");
      setShowAddProject(false);
      toast.success(`Project "${name}" created.`);
    } catch {
      toast.error("Failed to create project.");
    }
  };

  const handleStartEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveProjectName = async (project: Project) => {
    const name = editingProjectName.trim();
    if (!name || name === project.name) {
      setEditingProjectId(null);
      return;
    }
    try {
      await updateDoc(doc(db, "projects", project.id), { name });
      // Update selectedProject if it was this one
      if (selectedProject === project.name) setSelectedProject(name);
      toast.success(`Renamed to "${name}".`);
    } catch {
      toast.error("Failed to rename project.");
    } finally {
      setEditingProjectId(null);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Delete project "${project.name}"? Tasks won't be deleted.`)) return;
    try {
      await deleteDoc(doc(db, "projects", project.id));
      toast.success(`Project "${project.name}" deleted.`);
    } catch {
      toast.error("Failed to delete project.");
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      toast.success("Task deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete task");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    // Find assignee details
    const chosenAssignee = employeesList.find(emp => emp.email === newTaskAssigneeEmail);
    const nameToAssign = chosenAssignee ? chosenAssignee.name : "Unassigned";
    const emailToAssign = chosenAssignee ? chosenAssignee.email : "";
    
    const initials = nameToAssign
      .split(" ")
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join("");

    const newTaskData = {
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      priority: newTaskPriority,
      status: "todo", // ADMIN ADDED TASKS ALWAYS GO TO TODO COLUMN FIRST
      assigneeName: nameToAssign,
      assigneeEmail: emailToAssign,
      assigneeInitials: initials || "UA",
      project: newTaskProject,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "tasks"), newTaskData);
      toast.success("New task created and assigned successfully!");
      
      // Reset form
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("Medium");
      setNewTaskProject(projects[0]?.name || "");
      setShowNewTaskModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create task in database.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Retrieving administrator task board…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-dm-sans text-gray-800 animate-fadeIn">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FiList className="text-[#1d4ed8]" />
            <span>Jira Workspace Board (Admin Mode)</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Create tasks, delegate them to employees, and monitor active project statuses in real-time. Drag and drop cards to change status!
          </p>
        </div>
      </div>

      {/* ── Project Management Panel ─────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiFolder size={13} className="text-[#1d4ed8]" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Projects</span>
            <span className="text-[9px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">{projects.length}</span>
          </div>
          <button
            onClick={() => setShowAddProject((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-[#1d4ed8] text-white hover:bg-blue-700 transition-all active:scale-95"
          >
            <FiPlus size={11} />
            New Project
          </button>
        </div>

        {/* Add project inline input */}
        {showAddProject && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-blue-50/40">
            <FiFolder size={12} className="text-blue-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddProject(); if (e.key === "Escape") setShowAddProject(false); }}
              placeholder="Project name…"
              className="flex-1 text-xs font-semibold bg-transparent outline-none placeholder-blue-300 text-gray-800"
            />
            <button onClick={handleAddProject} className="p-1 rounded text-blue-600 hover:bg-blue-100 transition-colors">
              <FiCheck size={13} />
            </button>
            <button onClick={() => setShowAddProject(false)} className="p-1 rounded text-gray-400 hover:bg-gray-100 transition-colors">
              <FiX size={13} />
            </button>
          </div>
        )}

        {/* Project list */}
        {projects.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6 font-medium">No projects yet. Create one above.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => { if (editingProjectId !== project.id) setSelectedProject(project.name); }}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${
                  selectedProject === project.name
                    ? "bg-blue-50 border-l-2 border-[#1d4ed8]"
                    : "hover:bg-gray-50 border-l-2 border-transparent"
                }`}
              >
                <FiFolder size={13} className={selectedProject === project.name ? "text-[#1d4ed8]" : "text-gray-300"} />

                {/* Inline edit */}
                {editingProjectId === project.id ? (
                  <input
                    ref={editInputRef}
                    value={editingProjectName}
                    onChange={(e) => setEditingProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveProjectName(project);
                      if (e.key === "Escape") setEditingProjectId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs font-bold bg-white border border-blue-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                ) : (
                  <span className={`flex-1 text-xs font-bold truncate ${
                    selectedProject === project.name ? "text-[#1d4ed8]" : "text-gray-700"
                  }`}>
                    {project.name}
                  </span>
                )}

                {/* Action buttons — only visible on hover / when editing */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {editingProjectId === project.id ? (
                    <>
                      <button onClick={() => handleSaveProjectName(project)} className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors" title="Save">
                        <FiCheck size={12} />
                      </button>
                      <button onClick={() => setEditingProjectId(null)} className="p-1 rounded text-gray-400 hover:bg-gray-100 transition-colors" title="Cancel">
                        <FiX size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleStartEdit(project)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Rename">
                        <FiEdit2 size={12} />
                      </button>
                      <button onClick={() => handleDeleteProject(project)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                        <FiTrash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanban controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search active tasks or assignee name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
            📂 {selectedProject || "No project selected"}
          </span>
          <button
            onClick={() => setShowNewTaskModal(true)}
            disabled={!selectedProject}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1d4ed8] text-white hover:bg-blue-700 text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPlus size={14} />
            <span>Add Task to To-Do</span>
          </button>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {(
          [
            { key: "todo", label: "To Do", border: "border-t-gray-300", bg: "bg-gray-50/50" },
            { key: "in_progress", label: "In Progress", border: "border-t-blue-500", bg: "bg-blue-50/5" },
            { key: "in_review", label: "In Review", border: "border-t-amber-500", bg: "bg-amber-50/5" },
            { key: "done", label: "Done", border: "border-t-emerald-500", bg: "bg-emerald-50/5" }
          ] as const
        ).map(col => {
          const colTasks = tasks.filter(t => {
            if (t.status !== col.key) return false;
            
            // Dynamic project filtering
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
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100/50 pb-2">
                <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">{col.label}</span>
                <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded-full shadow-sm">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
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
                      className="bg-white border border-gray-150 rounded-xl p-3.5 shadow-sm space-y-3 hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing relative group select-none hover:shadow"
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

                              {/* Admin delete action nested cleanly in popup */}
                              <div className="border-t border-gray-100 my-1 pt-1" />
                              <button
                                onClick={() => {
                                  deleteTask(task.id);
                                  setActiveDropdownTaskId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold rounded-lg text-red-650 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                              >
                                <FiTrash2 size={11} className="text-red-550" />
                                <span>Delete Task</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-[10px] text-gray-505 leading-relaxed line-clamp-3">
                          {task.description}
                        </p>
                      )}

                      {/* Footer controls */}
                      <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 mt-1">
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          task.priority === "High"
                            ? "bg-rose-50 text-rose-600 border border-rose-100/30"
                            : task.priority === "Medium"
                            ? "bg-amber-50 text-amber-600 border border-amber-100/30"
                            : "bg-gray-50 text-gray-500 border border-gray-150"
                        }`}>
                          {task.priority}
                        </span>

                        <div
                          className="w-5.5 h-5.5 bg-blue-50 text-[#1d4ed8] border border-blue-100 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help shrink-0"
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

      {/* Creation Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-gray-150 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <FiPlus className="text-[#1d4ed8]" />
                <span>Create New Task</span>
              </h3>
              <button 
                onClick={() => setShowNewTaskModal(false)}
                className="text-gray-400 hover:text-gray-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Map Snack Inventory"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Description</label>
                <textarea
                  placeholder="Details of what this staff member needs to do…"
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-white cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Initial Status</label>
                  <input
                    type="text"
                    disabled
                    value="To Do (Fixed for Admin)"
                    className="w-full px-3 py-2 text-xs border border-gray-100 bg-gray-50 text-gray-400 rounded-xl select-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Delegate Assignee</label>
                <select
                  value={newTaskAssigneeEmail}
                  onChange={e => {
                    setNewTaskAssigneeEmail(e.target.value);
                    const match = employeesList.find(emp => emp.email === e.target.value);
                    if (match) setNewTaskAssigneeName(match.name);
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-white cursor-pointer"
                >
                  {employeesList.length === 0 ? (
                    <option value="">No registered employees found</option>
                  ) : (
                    employeesList.map((emp) => (
                      <option key={emp.id} value={emp.email}>
                        {emp.name} ({emp.department} - {emp.jobTitle})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Target Project</label>
                <select
                  value={newTaskProject}
                  onChange={e => setNewTaskProject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-white cursor-pointer"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.name}>
                      📂 {proj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={employeesList.length === 0}
                  className="px-4 py-2 bg-[#1d4ed8] text-white hover:bg-blue-700 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  Create & Delegate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
